import { existsSync, lstatSync, promises as fsp } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'pathe'
import matter from 'gray-matter'
import { readPackageJSON, resolvePackageJSON } from 'pkg-types'
import { transform } from 'automd'
import type {
  AgentSkillDeclaration,
  ResolvedContribution,
  SkillHubContribution,
  SkillSourceKind,
  ValidationIssue,
  ValidatedContribution,
} from './types'
import { loadNuxtIndexTemplate, loadNuxtRuleFiles } from './nuxt-content'
import { loadVueSkillFiles } from './vue-content'
import type { InvalidTarget, SkillHubTarget } from './agents'
import { detectInstalledTargets, resolveAgentTargetConfig, validateTargets } from './agents'

export const MANAGED_HINT_START = '<!-- nuxt-skill-hub:start -->'
export const MANAGED_HINT_END = '<!-- nuxt-skill-hub:end -->'

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
  description?: string
  packageRoot: string
  repository?: string
  homepage?: string
  packageData: unknown
}

export interface GeneratedModuleEntry {
  packageName: string
  version?: string
  skillName: string
  entryPath?: string
  sourceDir: string
  destination: string
  scriptsIncluded: boolean
  description?: string
  sourceKind: SkillSourceKind
  sourceLabel: string
  sourceRepo?: string
  sourceRef?: string
  sourcePath?: string
  repoUrl?: string
  docsUrl?: string
  official: boolean
  trustLevel: 'official' | 'community'
  resolver: 'agentsField' | 'githubHeuristic' | 'metadataRouter'
  wrapperPath?: string
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

async function hasWorkspacePackageConfig(path: string): Promise<boolean> {
  const packageJsonPath = join(path, 'package.json')
  if (!(await pathExists(packageJsonPath))) {
    return false
  }

  try {
    const packageJson = JSON.parse(await fsp.readFile(packageJsonPath, 'utf8')) as { workspaces?: unknown }
    return Array.isArray(packageJson.workspaces) || (!!packageJson.workspaces && typeof packageJson.workspaces === 'object')
  }
  catch {
    return false
  }
}

export async function resolveExportRoot(rootDir: string): Promise<string> {
  const appRoot = resolve(rootDir)
  let current = appRoot

  while (true) {
    if (await pathExists(join(current, 'pnpm-workspace.yaml')) || await hasWorkspacePackageConfig(current)) {
      return current
    }

    const parent = dirname(current)
    if (parent === current) {
      return appRoot
    }
    current = parent
  }
}

export function resolveMonorepoScopePath(rootDir: string, exportRoot: string): string | undefined {
  const appRoot = resolve(rootDir)
  const resolvedExportRoot = resolve(exportRoot)

  if (appRoot === resolvedExportRoot) {
    return undefined
  }

  const scopePath = relative(resolvedExportRoot, appRoot).replace(/\/+$/, '')
  return scopePath || undefined
}

export function createValidationIssue(packageName: string, skillName: string, reason: string, sourceKind?: SkillSourceKind): ValidationIssue {
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

function readRepositoryUrl(repository: string | { url?: string } | undefined): string | undefined {
  if (typeof repository === 'string') return repository
  if (repository && typeof repository.url === 'string') return repository.url
  return undefined
}

export async function discoverInstalledPackageFromSpecifier(specifier: string, rootDir: string): Promise<InstalledPackageMetadata | null> {
  if (!isPackageSpecifier(specifier)) {
    return null
  }

  let packageJsonPath: string
  try {
    packageJsonPath = await resolvePackageJSON(specifier, { url: rootDir })
  }
  catch {
    const fallback = join(rootDir, 'node_modules', packageNameFromSpecifier(specifier), 'package.json')
    if (!existsSync(fallback)) return null
    packageJsonPath = fallback
  }

  return readInstalledPackageMetadata(packageJsonPath, specifier)
}

export async function discoverInstalledPackageFromDirectory(directory: string): Promise<InstalledPackageMetadata | null> {
  const packageJsonPath = join(directory, 'package.json')
  if (!(await pathExists(packageJsonPath))) {
    return null
  }

  return readInstalledPackageMetadata(packageJsonPath)
}

async function readInstalledPackageMetadata(packageJsonPath: string, fallbackSpecifier?: string): Promise<InstalledPackageMetadata> {
  const pkg = await readPackageJSON(packageJsonPath)
  return {
    packageName: pkg.name || (fallbackSpecifier ? packageNameFromSpecifier(fallbackSpecifier) : basename(dirname(packageJsonPath))),
    version: pkg.version,
    description: pkg.description,
    packageRoot: dirname(packageJsonPath),
    repository: readRepositoryUrl(pkg.repository as string | { url?: string } | undefined),
    homepage: pkg.homepage,
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

export async function discoverLocalPackageSkills(rootDir: string): Promise<PackageSkillDiscovery | null> {
  const packageJsonPath = join(rootDir, 'package.json')
  if (!(await pathExists(packageJsonPath))) {
    return null
  }

  const pkg = await readPackageJSON(packageJsonPath)
  const packageName = pkg.name || 'local-project'
  const parsed = parseAgentSkillDeclarations(pkg, packageName, 'dist')
  if (!parsed.skills.length && !parsed.issues.length) {
    return null
  }

  return {
    packageName,
    version: pkg.version,
    packageRoot: rootDir,
    skills: parsed.skills,
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
    description: contribution.description,
    sourceRepo: contribution.sourceRepo,
    sourceRef: contribution.sourceRef,
    sourcePath: contribution.sourcePath,
    repoUrl: contribution.repoUrl,
    docsUrl: contribution.docsUrl,
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
  if (!matter.test(skillContents)) {
    issues.push(createValidationIssue(contribution.packageName, contribution.skillName, 'SKILL.md must include YAML frontmatter', contribution.sourceKind))
    return { contribution, issues }
  }

  let frontmatter: { name?: string, description?: string }
  try {
    const parsed = matter(skillContents).data
    frontmatter = {
      name: typeof parsed.name === 'string' ? parsed.name.trim() : undefined,
      description: typeof parsed.description === 'string' ? parsed.description.trim() : undefined,
    }
  }
  catch {
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

  return {
    contribution: {
      ...contribution,
      description: frontmatter.description || contribution.description,
    },
    issues,
  }
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

export function sanitizeSegment(value: string): string {
  return value.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown'
}

export async function copySkillTree(sourceDir: string, destinationDir: string, includeScripts: boolean): Promise<void> {
  await ensureDir(destinationDir)
  await fsp.cp(sourceDir, destinationDir, {
    recursive: true,
    force: true,
    filter: (source) => {
      const relativePath = relative(sourceDir, source)
      if (!relativePath || relativePath === '') {
        return true
      }

      if (relativePath.split('/').includes('..')) {
        return false
      }

      if (!includeScripts && (relativePath === 'scripts' || relativePath.startsWith('scripts/'))) {
        return false
      }

      return !lstatSync(source).isSymbolicLink()
    },
  })
}

export function resolveTargets(
  explicitTargets: SkillHubTarget[],
  rootDir: string,
): { targets: SkillHubTarget[], invalidTargets: InvalidTarget[] } {
  if (explicitTargets.length) {
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

export async function buildNuxtTemplateFiles(nuxtDir: string): Promise<Array<{ path: string, contents: string }>> {
  const nuxtRuleFiles = await loadNuxtRuleFiles()
  const nuxtIndexTemplate = await loadNuxtIndexTemplate()

  const files = Object.entries(nuxtRuleFiles).map(([name, contents]) => ({
    path: join(nuxtDir, name),
    contents,
  }))

  files.push({
    path: join(nuxtDir, 'index.template.md'),
    contents: nuxtIndexTemplate,
  })

  return files
}

export async function buildVueTemplateFiles(vueDir: string, cacheRoot: string): Promise<Array<{ path: string, contents: string }>> {
  const vueFiles = await loadVueSkillFiles(cacheRoot)

  return Object.entries(vueFiles).map(([name, contents]) => ({
    path: join(vueDir, name),
    contents,
  }))
}

export const buildCoreTemplateFiles = buildNuxtTemplateFiles

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

export function getTargetSkillRoot(
  rootDir: string,
  target: SkillHubTarget,
  skillName: string,
): { targetDir: string, skillRoot: string } {
  const targetConfig = resolveAgentTargetConfig(target)
  if (!targetConfig) {
    throw new Error(`Target "${target}" could not be resolved from unagent.`)
  }

  const home = homedir()
  const relativeConfigDir = (relative(home, targetConfig.configDir))
  const canMirrorConfigDir = !relativeConfigDir.startsWith('..')
    && !relativeConfigDir.includes('/../')
    && !isAbsolute(relativeConfigDir)

  if (canMirrorConfigDir) {
    const targetDir = resolve(rootDir, relativeConfigDir, targetConfig.skillsDir)
    const skillRoot = join(targetDir, skillName)
    return { targetDir, skillRoot }
  }

  throw new Error(`Target "${target}" configDir "${targetConfig.configDir}" is not under home "${home}".`)
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
