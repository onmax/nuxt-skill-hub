import { createRequire } from 'node:module'
import { promises as fsp } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { transform } from 'automd'
import type {
  AgentSkillDeclaration,
  IncludeScriptsMode,
  ResolvedContribution,
  SkillHubContribution,
  SkillManifest,
} from './types'
import { CORE_INDEX_TEMPLATE, CORE_RULE_FILES } from './core-content'
import type { SkillHubTarget } from './agents'
import { AGENT_TARGETS, detectInstalledTargets } from './agents'

const require = createRequire(import.meta.url)
const MANAGED_HINT_START = '<!-- nuxt-skill-hub:start -->'
const MANAGED_HINT_END = '<!-- nuxt-skill-hub:end -->'

export interface PackageSkillDiscovery {
  packageName: string
  version?: string
  packageRoot: string
  skills: AgentSkillDeclaration[]
}

export interface GeneratedModuleEntry {
  packageName: string
  version?: string
  skillName: string
  sourceDir: string
  destination: string
  scriptsIncluded: boolean
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

export function parseAgentSkillDeclarations(pkg: unknown): AgentSkillDeclaration[] {
  const raw = pkg && typeof pkg === 'object'
    ? (pkg as { agents?: { skills?: unknown } }).agents?.skills
    : undefined

  if (!Array.isArray(raw)) {
    return []
  }

  const output: AgentSkillDeclaration[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue
    }

    const name = typeof entry.name === 'string' ? entry.name.trim() : ''
    const path = typeof entry.path === 'string' ? entry.path.trim() : ''

    if (!name || !path) {
      continue
    }

    output.push({ name, path })
  }

  return output
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

export async function discoverPackageSkillsFromSpecifier(specifier: string, rootDir: string): Promise<PackageSkillDiscovery | null> {
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
  const skills = parseAgentSkillDeclarations(pkg)

  if (!skills.length) {
    return null
  }

  return {
    packageName,
    version,
    packageRoot,
    skills,
  }
}

export async function discoverLocalPackageSkills(rootDir: string): Promise<PackageSkillDiscovery | null> {
  const packageJsonPath = join(rootDir, 'package.json')
  if (!(await pathExists(packageJsonPath))) {
    return null
  }

  const pkg = await readJson(packageJsonPath)
  const skills = parseAgentSkillDeclarations(pkg)
  if (!skills.length) {
    return null
  }

  return {
    packageName: readPackageName(pkg, 'local-project'),
    version: readPackageVersion(pkg),
    packageRoot: rootDir,
    skills,
  }
}

export async function resolveContributions(discoveries: PackageSkillDiscovery[]): Promise<ResolvedContribution[]> {
  const contributions: ResolvedContribution[] = []

  for (const discovery of discoveries) {
    for (const skill of discovery.skills) {
      const sourceDir = resolve(discovery.packageRoot, skill.path)

      if (!isSubPath(discovery.packageRoot, sourceDir)) {
        continue
      }

      if (!(await pathExists(join(sourceDir, 'SKILL.md')))) {
        continue
      }

      contributions.push({
        packageName: discovery.packageName,
        version: discovery.version,
        sourceDir,
        sourceRoot: discovery.packageRoot,
        skillName: skill.name,
      })
    }
  }

  return sortAndDedupeContributions(contributions)
}

export function sortAndDedupeContributions(contributions: ResolvedContribution[]): ResolvedContribution[] {
  const byKey = new Map<string, ResolvedContribution>()

  for (const contribution of contributions) {
    const key = [
      contribution.packageName,
      contribution.skillName || '',
      contribution.sourceDir,
    ].join('::')
    byKey.set(key, contribution)
  }

  return Array.from(byKey.values())
    .sort((a, b) => {
      const left = `${a.packageName}::${a.skillName || ''}::${a.sourceDir}`
      const right = `${b.packageName}::${b.skillName || ''}::${b.sourceDir}`
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

export function resolveTargets(targetMode: 'detected' | 'explicit' | 'all', explicitTargets: SkillHubTarget[]): SkillHubTarget[] {
  if (targetMode === 'all') {
    return Object.keys(AGENT_TARGETS) as SkillHubTarget[]
  }

  if (targetMode === 'explicit') {
    return Array.from(new Set(explicitTargets))
  }

  return detectInstalledTargets()
}

export function buildCoreTemplateFiles(coreDir: string): Array<{ path: string, contents: string }> {
  const files = Object.entries(CORE_RULE_FILES).map(([name, contents]) => ({
    path: join(coreDir, name),
    contents,
  }))

  files.push({
    path: join(coreDir, 'index.template.md'),
    contents: CORE_INDEX_TEMPLATE,
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

export function createModulesListMarkdown(entries: GeneratedModuleEntry[]): string {
  if (!entries.length) {
    return '_No module skills discovered._\n'
  }

  return entries
    .map((entry) => {
      const packageDir = sanitizeSegment(entry.packageName)
      const skillDir = sanitizeSegment(entry.skillName)
      const version = entry.version ? ` \`v${entry.version}\`` : ''
      return `- **${entry.packageName}**${version} (scope: \`${entry.packageName}\`) -> [${entry.skillName}](./modules/${packageDir}/${skillDir}/SKILL.md)`
    })
    .join('\n') + '\n'
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
      })),
  }
}

export function getTargetSkillRoot(rootDir: string, target: SkillHubTarget, skillName: string): { targetDir: string, skillRoot: string } {
  const targetDir = resolve(rootDir, AGENT_TARGETS[target].projectSkillsDir)
  const skillRoot = join(targetDir, skillName)
  return { targetDir, skillRoot }
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
