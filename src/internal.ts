import { createRequire } from 'node:module'
import { promises as fsp } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { transform } from 'automd'
import type {
  AgentSkillDeclaration,
  IncludeScriptsMode,
  ResolvedContribution,
  SkillHubContribution,
  SkillManifest,
  SkillManifestSkipped,
  SkillSourceKind,
  ValidationIssue,
  ValidatedContribution,
} from './types'
import { loadCoreIndexTemplate, loadCoreRuleFiles } from './core-content'
import type { InvalidTarget, SkillHubTarget } from './agents'
import { detectInstalledTargets, resolveAgentTargetConfig, validateTargets } from './agents'

const require = createRequire(import.meta.url)
const MANAGED_HINT_START = '<!-- nuxt-skill-hub:start -->'
const MANAGED_HINT_END = '<!-- nuxt-skill-hub:end -->'
const SKILL_NAME_MAX_LENGTH = 64
const SKILL_NAME_PATTERN = /^[a-z0-9-]+$/

export interface PackageSkillDiscovery {
  packageName: string
  version?: string
  packageRoot: string
  skills: AgentSkillDeclaration[]
  issues: ValidationIssue[]
}

export interface InstalledPackageMetadata {
  packageName: string
  version?: string
  packageRoot: string
  repository?: string
  homepage?: string
  packageData: unknown
}

export interface GeneratedModuleEntry {
  packageName: string
  version?: string
  skillName: string
  sourceDir: string
  destination: string
  scriptsIncluded: boolean
  sourceKind: SkillSourceKind
  sourceRepo?: string
  sourceRef?: string
  sourcePath?: string
  official: boolean
  resolver: 'agentsField' | 'githubHeuristic' | 'mapEntry'
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await fsp.access(path)
    return true
  }
  catch {
    return false
  }
}

export async function ensureDir(path: string): Promise<void> {
  await fsp.mkdir(path, { recursive: true })
}

export async function emptyDir(path: string): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await fsp.rm(path, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 })
      break
    }
    catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if ((code === 'ENOTEMPTY' || code === 'EBUSY') && attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 50))
        continue
      }
      throw error
    }
  }
  await ensureDir(path)
}

export async function writeFileIfChanged(path: string, contents: string): Promise<void> {
  const previous = await pathExists(path) ? await fsp.readFile(path, 'utf8') : null
  if (previous === contents) {
    return
  }
  await ensureDir(dirname(path))
  await fsp.writeFile(path, contents, 'utf8')
}

function readPackageName(pkg: unknown, fallback: string): string {
  if (pkg && typeof pkg === 'object' && typeof (pkg as { name?: unknown }).name === 'string') {
    return (pkg as { name: string }).name
  }
  return fallback
}

function readPackageVersion(pkg: unknown): string | undefined {
  if (pkg && typeof pkg === 'object' && typeof (pkg as { version?: unknown }).version === 'string') {
    return (pkg as { version: string }).version
  }
  return undefined
}

function createValidationIssue(packageName: string, skillName: string, reason: string, sourceKind?: SkillSourceKind): ValidationIssue {
  return {
    severity: 'warning',
    packageName,
    skillName,
    reason,
    sourceKind,
  }
}

export function isValidSkillName(name: string): boolean {
  if (!name || name.length > SKILL_NAME_MAX_LENGTH) {
    return false
  }

  if (!SKILL_NAME_PATTERN.test(name)) {
    return false
  }

  if (name.startsWith('-') || name.endsWith('-') || name.includes('--')) {
    return false
  }

  return true
}

export interface ParsedAgentSkillDeclarations {
  skills: AgentSkillDeclaration[]
  issues: ValidationIssue[]
}

export function parseAgentSkillDeclarations(pkg: unknown, packageName: string, sourceKind?: SkillSourceKind): ParsedAgentSkillDeclarations {
  const raw = pkg && typeof pkg === 'object'
    ? (pkg as { agents?: { skills?: unknown } }).agents?.skills
    : undefined

  if (!Array.isArray(raw)) {
    return { skills: [], issues: [] }
  }

  const skills: AgentSkillDeclaration[] = []
  const issues: ValidationIssue[] = []

  for (const [index, entry] of raw.entries()) {
    if (!entry || typeof entry !== 'object') {
      issues.push(createValidationIssue(packageName, `entry-${index + 1}`, 'agents.skills entry must be an object', sourceKind))
      continue
    }

    const name = typeof entry.name === 'string' ? entry.name.trim() : ''
    const path = typeof entry.path === 'string' ? entry.path.trim() : ''

    if (!name) {
      issues.push(createValidationIssue(packageName, `entry-${index + 1}`, 'agents.skills entry is missing a non-empty "name"', sourceKind))
      continue
    }

    if (!path) {
      issues.push(createValidationIssue(packageName, name, 'agents.skills entry is missing a non-empty "path"', sourceKind))
      continue
    }

    if (!isValidSkillName(name)) {
      issues.push(createValidationIssue(packageName, name, 'skill name must be hyphen-case, lowercase, <=64 chars, and cannot contain consecutive hyphens', sourceKind))
      continue
    }

    skills.push({ name, path })
  }

  return { skills, issues }
}

interface SkillFrontmatter {
  name?: string
  description?: string
}

function parseFrontmatterValue(raw: string): string {
  const value = raw.trim()
  if (!value) {
    return ''
  }

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
    return value.slice(1, -1).trim()
  }

  return value
}

export function parseSkillFrontmatter(contents: string): SkillFrontmatter | null {
  const lines = contents.split(/\r?\n/)
  if (lines[0]?.trim() !== '---') {
    return null
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
  if (endIndex === -1) {
    return null
  }

  const frontmatter: SkillFrontmatter = {}
  const body = lines.slice(1, endIndex)

  for (const line of body) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmed.indexOf(':')
    if (separatorIndex <= 0) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    if (!/^[\w-]+$/.test(key)) {
      continue
    }

    const value = parseFrontmatterValue(trimmed.slice(separatorIndex + 1))

    if (key === 'name') {
      frontmatter.name = value
    }
    else if (key === 'description') {
      frontmatter.description = value
    }
  }

  return frontmatter
}

function packageNameFromSpecifier(specifier: string): string {
  if (specifier.startsWith('@')) {
    const [scope, name] = specifier.split('/')
    return name ? `${scope}/${name}` : specifier
  }
  return specifier.split('/')[0] || specifier
}

export function extractModuleSpecifier(moduleEntry: unknown): string | null {
  if (typeof moduleEntry === 'string') {
    return moduleEntry
  }

  if (Array.isArray(moduleEntry) && typeof moduleEntry[0] === 'string') {
    return moduleEntry[0]
  }

  return null
}

function isPackageSpecifier(specifier: string): boolean {
  if (!specifier) {
    return false
  }

  if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('file:')) {
    return false
  }

  return true
}

function isSubPath(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

function resolvePackageJsonPath(specifier: string, rootDir: string): string | null {
  const attempts = [specifier, packageNameFromSpecifier(specifier)]
  for (const attempt of attempts) {
    try {
      return require.resolve(`${attempt}/package.json`, { paths: [rootDir] })
    }
    catch {
      // continue
    }
  }

  return null
}

async function readJson(path: string): Promise<unknown> {
  const raw = await fsp.readFile(path, 'utf8')
  return JSON.parse(raw) as unknown
}

function readRepositoryUrl(pkg: unknown): string | undefined {
  if (!pkg || typeof pkg !== 'object') {
    return undefined
  }

  const repository = (pkg as { repository?: unknown }).repository
  if (typeof repository === 'string') {
    return repository
  }

  if (repository && typeof repository === 'object' && typeof (repository as { url?: unknown }).url === 'string') {
    return (repository as { url: string }).url
  }

  return undefined
}

function readHomepage(pkg: unknown): string | undefined {
  if (!pkg || typeof pkg !== 'object') {
    return undefined
  }

  return typeof (pkg as { homepage?: unknown }).homepage === 'string'
    ? (pkg as { homepage: string }).homepage
    : undefined
}

export async function discoverInstalledPackageFromSpecifier(specifier: string, rootDir: string): Promise<InstalledPackageMetadata | null> {
  if (!isPackageSpecifier(specifier)) {
    return null
  }

  const packageJsonPath = resolvePackageJsonPath(specifier, rootDir)
  if (!packageJsonPath) {
    return null
  }

  const packageRoot = dirname(packageJsonPath)
  const pkg = await readJson(packageJsonPath)
  const packageName = readPackageName(pkg, packageNameFromSpecifier(specifier))
  const version = readPackageVersion(pkg)
  return {
    packageName,
    version,
    packageRoot,
    repository: readRepositoryUrl(pkg),
    homepage: readHomepage(pkg),
    packageData: pkg,
  }
}

export function discoverPackageSkillsFromInstalledPackage(
  installedPackage: InstalledPackageMetadata,
  sourceKind: SkillSourceKind = 'dist',
): PackageSkillDiscovery | null {
  const parsed = parseAgentSkillDeclarations(installedPackage.packageData, installedPackage.packageName, sourceKind)
  const skills = parsed.skills

  if (!skills.length && !parsed.issues.length) {
    return null
  }

  return {
    packageName: installedPackage.packageName,
    version: installedPackage.version,
    packageRoot: installedPackage.packageRoot,
    skills,
    issues: parsed.issues,
  }
}

export async function discoverPackageSkillsFromSpecifier(specifier: string, rootDir: string): Promise<PackageSkillDiscovery | null> {
  const installedPackage = await discoverInstalledPackageFromSpecifier(specifier, rootDir)
  if (!installedPackage) {
    return null
  }

  return discoverPackageSkillsFromInstalledPackage(installedPackage, 'dist')
}

export async function discoverLocalPackageSkills(rootDir: string): Promise<PackageSkillDiscovery | null> {
  const packageJsonPath = join(rootDir, 'package.json')
  if (!(await pathExists(packageJsonPath))) {
    return null
  }

  const pkg = await readJson(packageJsonPath)
  const packageName = readPackageName(pkg, 'local-project')
  const parsed = parseAgentSkillDeclarations(pkg, packageName, 'dist')
  const skills = parsed.skills
  if (!skills.length && !parsed.issues.length) {
    return null
  }

  return {
    packageName,
    version: readPackageVersion(pkg),
    packageRoot: rootDir,
    skills,
    issues: parsed.issues,
  }
}

function normalizeSkillName(rawSkillName: string | undefined, sourceDir: string): string {
  return rawSkillName?.trim() || basename(sourceDir).trim()
}

export function normalizeContribution(contribution: SkillHubContribution, sourceDir: string, sourceRoot: string): ResolvedContribution {
  return {
    packageName: contribution.packageName,
    version: contribution.version,
    sourceDir,
    sourceRoot,
    skillName: normalizeSkillName(contribution.skillName, sourceDir),
    sourceKind: contribution.sourceKind || 'dist',
    sourceRepo: contribution.sourceRepo,
    sourceRef: contribution.sourceRef,
    sourcePath: contribution.sourcePath,
    official: contribution.official ?? true,
    resolver: contribution.resolver || 'agentsField',
    forceIncludeScripts: contribution.forceIncludeScripts ?? false,
  }
}

async function validateContribution(contribution: ResolvedContribution): Promise<ValidatedContribution> {
  const issues: ValidationIssue[] = []

  if (!isSubPath(contribution.sourceRoot, contribution.sourceDir)) {
    issues.push(createValidationIssue(contribution.packageName, contribution.skillName, 'skill path must stay within package root', contribution.sourceKind))
  }

  if (!isValidSkillName(contribution.skillName)) {
    issues.push(createValidationIssue(contribution.packageName, contribution.skillName, 'skill name must be hyphen-case, lowercase, <=64 chars, and cannot contain consecutive hyphens', contribution.sourceKind))
  }

  const sourceDirName = basename(contribution.sourceDir)
  if (sourceDirName !== contribution.skillName) {
    issues.push(createValidationIssue(contribution.packageName, contribution.skillName, `skill directory name "${sourceDirName}" must match declared skill name`, contribution.sourceKind))
  }

  const skillFilePath = join(contribution.sourceDir, 'SKILL.md')
  if (!(await pathExists(skillFilePath))) {
    issues.push(createValidationIssue(contribution.packageName, contribution.skillName, 'SKILL.md is required at skill root', contribution.sourceKind))
    return { contribution, issues }
  }

  const skillContents = await fsp.readFile(skillFilePath, 'utf8')
  const frontmatter = parseSkillFrontmatter(skillContents)
  if (!frontmatter) {
    issues.push(createValidationIssue(contribution.packageName, contribution.skillName, 'SKILL.md must include YAML frontmatter', contribution.sourceKind))
    return { contribution, issues }
  }

  if (!frontmatter.name) {
    issues.push(createValidationIssue(contribution.packageName, contribution.skillName, 'SKILL.md frontmatter must include non-empty "name"', contribution.sourceKind))
  }
  else if (frontmatter.name !== contribution.skillName) {
    issues.push(createValidationIssue(contribution.packageName, contribution.skillName, `SKILL.md frontmatter name "${frontmatter.name}" must match declared skill name`, contribution.sourceKind))
  }

  if (!frontmatter.description) {
    issues.push(createValidationIssue(contribution.packageName, contribution.skillName, 'SKILL.md frontmatter must include non-empty "description"', contribution.sourceKind))
  }

  return { contribution, issues }
}

export interface ResolveContributionsResult {
  contributions: ResolvedContribution[]
  issues: ValidationIssue[]
}

export async function validateResolvedContributions(contributions: ResolvedContribution[]): Promise<ResolveContributionsResult> {
  const valid: ResolvedContribution[] = []
  const issues: ValidationIssue[] = []

  for (const contribution of contributions) {
    const validation = await validateContribution(contribution)
    if (!validation.issues.length) {
      valid.push(validation.contribution)
      continue
    }

    issues.push(...validation.issues)
  }

  return {
    contributions: sortAndDedupeContributions(valid),
    issues,
  }
}

export async function resolveContributions(discoveries: PackageSkillDiscovery[]): Promise<ResolveContributionsResult> {
  const contributions: ResolvedContribution[] = []
  const issues: ValidationIssue[] = []

  for (const discovery of discoveries) {
    issues.push(...discovery.issues)

    for (const skill of discovery.skills) {
      const sourceDir = resolve(discovery.packageRoot, skill.path)
      contributions.push(normalizeContribution({
        packageName: discovery.packageName,
        version: discovery.version,
        sourceDir,
        skillName: skill.name,
      }, sourceDir, discovery.packageRoot))
    }
  }

  const validated = await validateResolvedContributions(contributions)

  return {
    contributions: validated.contributions,
    issues: [...issues, ...validated.issues],
  }
}

export function sortAndDedupeContributions(contributions: ResolvedContribution[]): ResolvedContribution[] {
  const byKey = new Map<string, ResolvedContribution>()

  for (const contribution of contributions) {
    const key = [
      contribution.packageName,
      contribution.skillName,
      contribution.sourceDir,
    ].join('::')
    byKey.set(key, contribution)
  }

  return Array.from(byKey.values())
    .sort((a, b) => {
      const left = `${a.packageName}::${a.skillName}::${a.sourceDir}`
      const right = `${b.packageName}::${b.skillName}::${b.sourceDir}`
      return left.localeCompare(right)
    })
}

export function shouldIncludeScripts(mode: IncludeScriptsMode, scriptAllowlist: string[], packageName: string): boolean {
  if (mode === 'always') {
    return true
  }

  if (mode === 'allowlist') {
    return scriptAllowlist.includes(packageName)
  }

  return false
}

export function resolveGuidancePrecedence(taskModuleScope: string | undefined, candidateModuleScope: string | undefined): 'core' | 'module' {
  if (taskModuleScope && candidateModuleScope && taskModuleScope === candidateModuleScope) {
    return 'module'
  }
  return 'core'
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown'
}

function normalizeRelativePath(path: string): string {
  return path.split(sep).join('/')
}

export async function copySkillTree(sourceDir: string, destinationDir: string, includeScripts: boolean): Promise<void> {
  await ensureDir(destinationDir)
  await copySkillTreeRecursive(sourceDir, sourceDir, destinationDir, includeScripts)
}

async function copySkillTreeRecursive(sourceRoot: string, sourceDir: string, destinationDir: string, includeScripts: boolean): Promise<void> {
  const entries = await fsp.readdir(sourceDir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue
    }

    const sourcePath = join(sourceDir, entry.name)
    const relativePath = normalizeRelativePath(relative(sourceRoot, sourcePath))

    if (relativePath.split('/').includes('..')) {
      continue
    }

    if (!includeScripts && (relativePath === 'scripts' || relativePath.startsWith('scripts/'))) {
      continue
    }

    const destinationPath = join(destinationDir, entry.name)

    if (entry.isDirectory()) {
      await ensureDir(destinationPath)
      await copySkillTreeRecursive(sourceRoot, sourcePath, destinationPath, includeScripts)
      continue
    }

    if (entry.isFile()) {
      await fsp.copyFile(sourcePath, destinationPath)
    }
  }
}

export function resolveTargets(
  targetMode: 'detected' | 'explicit',
  explicitTargets: SkillHubTarget[],
  rootDir: string,
): { targets: SkillHubTarget[], invalidTargets: InvalidTarget[] } {
  if (targetMode === 'explicit') {
    const { valid, invalid } = validateTargets(explicitTargets)
    return {
      targets: valid,
      invalidTargets: invalid,
    }
  }

  return {
    targets: detectInstalledTargets(rootDir),
    invalidTargets: [],
  }
}

export async function buildCoreTemplateFiles(coreDir: string): Promise<Array<{ path: string, contents: string }>> {
  const coreRuleFiles = await loadCoreRuleFiles()
  const coreIndexTemplate = await loadCoreIndexTemplate()

  const files = Object.entries(coreRuleFiles).map(([name, contents]) => ({
    path: join(coreDir, name),
    contents,
  }))

  files.push({
    path: join(coreDir, 'index.template.md'),
    contents: coreIndexTemplate,
  })

  return files
}

export function createReferencesIndexTemplate(): string {
  return `# Nuxt Skill Map

This map routes you to the smallest relevant guidance set.

## Core guidance
- [Nuxt Best Practices](./core/index.md)

## Installed module guides (auto-generated)

<!-- automd:file src="./modules/_list.md" -->
<!-- /automd -->

---

_Generated by nuxt-skill-hub. Do not edit this file manually._
`
}

export function createModulesListMarkdown(entries: GeneratedModuleEntry[], skipped: SkillManifestSkipped[] = []): string {
  let discovered = '_No module skills discovered._'

  if (entries.length) {
    discovered = entries
      .map((entry) => {
        const packageDir = sanitizeSegment(entry.packageName)
        const skillDir = sanitizeSegment(entry.skillName)
        const version = entry.version ? ` \`v${entry.version}\`` : ''
        const source = `source: \`${entry.sourceKind}\``
        return `- **${entry.packageName}**${version} (${source}, scope: \`${entry.packageName}\`) -> [${entry.skillName}](./modules/${packageDir}/${skillDir}/SKILL.md)`
      })
      .join('\n')
  }

  if (!skipped.length) {
    return `${discovered}\n`
  }

  const skippedList = skipped
    .map((entry) => {
      const source = entry.sourceKind ? ` (\`${entry.sourceKind}\`)` : ''
      return `- **${entry.packageName}**${source} / \`${entry.skillName}\`: ${entry.reason}`
    })
    .join('\n')

  return `${discovered}\n\n## Skipped module skills (validation)\n${skippedList}\n`
}

export async function renderAutomdTemplate(contents: string, dir: string): Promise<string> {
  const result = await transform(contents, { dir })
  return result.contents
}

export function createModuleDestination(baseModulesDir: string, contribution: SkillHubContribution): string {
  return join(
    baseModulesDir,
    sanitizeSegment(contribution.packageName),
    sanitizeSegment(contribution.skillName || basename(contribution.sourceDir)),
  )
}

export function createManifest(
  generatedAt: string,
  skillName: string,
  target: SkillHubTarget,
  targetDir: string,
  modules: GeneratedModuleEntry[],
  skipped: SkillManifestSkipped[],
): SkillManifest {
  return {
    version: 1,
    generatedAt,
    skillName,
    target,
    targetDir,
    modules: modules
      .slice()
      .sort((a, b) => a.destination.localeCompare(b.destination))
      .map(entry => ({
        packageName: entry.packageName,
        version: entry.version,
        skillName: entry.skillName,
        sourceDir: entry.sourceDir,
        destination: entry.destination,
        scriptsIncluded: entry.scriptsIncluded,
        sourceKind: entry.sourceKind,
        sourceRepo: entry.sourceRepo,
        sourceRef: entry.sourceRef,
        sourcePath: entry.sourcePath,
        official: entry.official,
        resolver: entry.resolver,
      })),
    skipped: skipped
      .slice()
      .sort((a, b) => `${a.packageName}::${a.skillName}`.localeCompare(`${b.packageName}::${b.skillName}`)),
  }
}

export function getTargetSkillRoot(
  rootDir: string,
  target: SkillHubTarget,
  skillName: string,
): { targetDir: string, skillRoot: string, warning?: string } {
  const targetConfig = resolveAgentTargetConfig(target)
  if (!targetConfig) {
    const targetDir = resolve(rootDir, `.${sanitizeSegment(target)}`, 'skills')
    const skillRoot = join(targetDir, skillName)
    return {
      targetDir,
      skillRoot,
      warning: `Target "${target}" cannot be resolved from unagent; using fallback path "${normalizeRelativePath(relative(rootDir, targetDir))}".`,
    }
  }

  const home = homedir()
  const relativeConfigDir = normalizeRelativePath(relative(home, targetConfig.configDir))
  const canMirrorConfigDir = !relativeConfigDir.startsWith('..')
    && !relativeConfigDir.includes('/../')
    && !isAbsolute(relativeConfigDir)

  if (canMirrorConfigDir) {
    const targetDir = resolve(rootDir, relativeConfigDir, targetConfig.skillsDir)
    const skillRoot = join(targetDir, skillName)
    return { targetDir, skillRoot }
  }

  const targetDir = resolve(rootDir, `.${sanitizeSegment(target)}`, targetConfig.skillsDir)
  const skillRoot = join(targetDir, skillName)
  return {
    targetDir,
    skillRoot,
    warning: `Target "${target}" configDir "${targetConfig.configDir}" is not under home "${home}"; using fallback path "${normalizeRelativePath(relative(rootDir, targetDir))}".`,
  }
}

export async function upsertAgentsHint(rootDir: string, skillName: string): Promise<void> {
  const path = join(rootDir, 'AGENTS.md')
  const hintBlock = `${MANAGED_HINT_START}\nUse the \`${skillName}\` skill as the first entrypoint for Nuxt tasks in this repository.\n${MANAGED_HINT_END}`

  if (!(await pathExists(path))) {
    await writeFileIfChanged(path, `${hintBlock}\n`)
    return
  }

  const current = await fsp.readFile(path, 'utf8')
  const regex = new RegExp(`${MANAGED_HINT_START}[\\s\\S]*?${MANAGED_HINT_END}`)
  const next = regex.test(current)
    ? current.replace(regex, hintBlock)
    : `${current.trimEnd()}\n\n${hintBlock}\n`

  await writeFileIfChanged(path, next)
}
