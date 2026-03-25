import { createHash } from 'node:crypto'
import { promises as fsp } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'pathe'
import type { Nuxt } from '@nuxt/schema'
import { PACKAGE_VERSION } from './package-info'
import { loadNuxtMetadata } from './nuxt-content'
import {
  copySkillTree,
  createModuleDestination,
  buildNuxtTemplateFiles,
  buildVueTemplateFiles,
  discoverPackageSkillsFromInstalledPackage,
  discoverInstalledPackageFromDirectory,
  discoverInstalledPackageFromSpecifier,
  discoverLocalPackageSkills,
  emptyDir,
  ensureDir,
  extractModuleSpecifier,
  getTargetSkillRoot,
  normalizeContribution,
  pathExists,
  type PackageSkillDiscovery,
  renderAutomdTemplate,
  resolveContributions,
  resolveMonorepoScopePath,
  sortAndDedupeContributions,
  validateResolvedContributions,
  writeFileIfChanged,
  type GeneratedModuleEntry,
  type InstalledPackageMetadata,
} from './internal'
import { resolveRemoteContributionsForPackage } from './remote-resolver'
import {
  createSkillEntrypoint,
  createStableSkillWrapper,
  getSourceLabel,
  getTrustLevel,
} from './render-content'
import type {
  ModuleOptions,
  ResolvedContribution,
  SkillHubContribution,
  SkillHubContributionContext,
  SkillManifestSkipped,
  ValidationIssue,
  SkillHubGenerationMode,
} from './types'
import type { SkillHubTarget } from './agents'

const GITHUB_LOOKUP_TIMEOUT_MS = 1500
const GENERATION_STATE_FILE = '.state.json'

export interface SkillHubLogger {
  start: (message: string) => void
  success: (message: string) => void
  warn: (message: string) => void
  info: (message: string) => void
}

interface GenerationState {
  fingerprint: string
  generatedAt: string
  packageVersion: string
}

export function resolveStableSkillBuildDir(rootDir: string, buildDir: string): string {
  const rel = relative(resolve(rootDir), resolve(buildDir)).replaceAll('\\', '/')
  if (rel === '.nuxt' || rel.startsWith('.nuxt/')) {
    return join(resolve(rootDir), '.nuxt')
  }

  return buildDir
}

function normalizeRelativePath(from: string, to: string): string {
  const rel = relative(from, to).replaceAll('\\', '/')
  if (!rel || rel === '.') {
    return './'
  }

  return rel.startsWith('.') ? rel : `./${rel}`
}

function getGeneratedSkillRoot(buildDir: string, skillName: string): string {
  return join(buildDir, 'skill-hub', skillName)
}

function getGenerationStatePath(generatedSkillRoot: string): string {
  return join(generatedSkillRoot, GENERATION_STATE_FILE)
}

async function resolveManualContribution(rootDir: string, contribution: SkillHubContribution): Promise<ResolvedContribution> {
  const sourceDir = isAbsolute(contribution.sourceDir)
    ? contribution.sourceDir
    : resolve(rootDir, contribution.sourceDir)

  return normalizeContribution(contribution, sourceDir, sourceDir)
}

function mergeSkipped(entries: SkillManifestSkipped[], keyFn: (entry: SkillManifestSkipped) => string): SkillManifestSkipped[] {
  const byKey = new Map<string, SkillManifestSkipped>()

  for (const entry of entries) {
    const key = keyFn(entry)
    const previous = byKey.get(key)
    if (!previous) {
      byKey.set(key, { ...entry })
      continue
    }

    const reasons = new Set(previous.reason.split('; ').filter(Boolean))
    reasons.add(entry.reason)
    previous.reason = Array.from(reasons).join('; ')
  }

  return Array.from(byKey.values())
    .sort((a, b) => `${a.packageName}::${a.skillName}`.localeCompare(`${b.packageName}::${b.skillName}`))
}

async function removeLegacyRootArtifacts(skillRoot: string): Promise<void> {
  await Promise.all([
    fsp.rm(join(skillRoot, 'references'), { recursive: true, force: true }),
    fsp.rm(join(skillRoot, 'manifest.json'), { force: true }),
  ])
}

async function readGenerationState(generatedSkillRoot: string): Promise<GenerationState | null> {
  const statePath = getGenerationStatePath(generatedSkillRoot)
  if (!(await pathExists(statePath))) {
    return null
  }

  try {
    return JSON.parse(await fsp.readFile(statePath, 'utf8')) as GenerationState
  }
  catch {
    return null
  }
}

async function writeGenerationState(generatedSkillRoot: string, fingerprint: string): Promise<void> {
  const statePath = getGenerationStatePath(generatedSkillRoot)
  const state: GenerationState = {
    fingerprint,
    generatedAt: new Date().toISOString(),
    packageVersion: PACKAGE_VERSION,
  }

  await writeFileIfChanged(statePath, `${JSON.stringify(state, null, 2)}\n`)
}

async function hashFileIfExists(path: string): Promise<string | null> {
  if (!(await pathExists(path))) {
    return null
  }

  const contents = await fsp.readFile(path)
  return createHash('sha256').update(contents).digest('hex')
}

async function hashDirectoryTreeIfExists(path: string): Promise<string | null> {
  if (!(await pathExists(path))) {
    return null
  }

  const hash = createHash('sha256')

  const visit = async (currentPath: string, basePath: string) => {
    const stat = await fsp.lstat(currentPath)
    const relativePath = relative(basePath, currentPath).replaceAll('\\', '/') || '.'

    if (stat.isSymbolicLink()) {
      hash.update(`symlink:${relativePath}:`)
      hash.update(await fsp.readlink(currentPath))
      return
    }

    if (stat.isDirectory()) {
      hash.update(`dir:${relativePath}\n`)
      const entries = await fsp.readdir(currentPath, { withFileTypes: true })
      entries.sort((a, b) => a.name.localeCompare(b.name))

      for (const entry of entries) {
        await visit(join(currentPath, entry.name), basePath)
      }
      return
    }

    hash.update(`file:${relativePath}:`)
    hash.update(await fsp.readFile(currentPath))
    hash.update('\n')
  }

  await visit(path, path)
  return hash.digest('hex')
}

async function resolveLockfileInfo(exportRoot: string): Promise<{ path: string, hash: string } | null> {
  const candidates = [
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    'bun.lock',
    'bun.lockb',
  ]

  for (const candidate of candidates) {
    const lockfilePath = join(exportRoot, candidate)
    const hash = await hashFileIfExists(lockfilePath)
    if (hash) {
      return {
        path: candidate,
        hash,
      }
    }
  }

  return null
}

async function createGenerationFingerprint(
  nuxt: Nuxt,
  options: ModuleOptions,
  skillName: string,
  exportRoot: string,
  installedPackages: InstalledPackageMetadata[],
  localSources: Array<{
    packageName: string
    skillName: string
    sourceDir: string
    sourceRoot: string
    sourceKind: ResolvedContribution['sourceKind']
    hash: string | null
  }>,
): Promise<string> {
  const rootPackageHash = await hashFileIfExists(join(nuxt.options.rootDir, 'package.json'))
  const lockfile = await resolveLockfileInfo(exportRoot)
  const modules = installedPackages
    .filter(pkg => pkg.packageName !== 'nuxt-skill-hub')
    .map(pkg => ({ name: pkg.packageName, version: pkg.version || null }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const payload = {
    packageVersion: PACKAGE_VERSION,
    skillName,
    rootDir: nuxt.options.rootDir,
    buildDir: nuxt.options.buildDir,
    rootPackageHash,
    lockfile,
    modules,
    localSources,
    skillHub: {
      skillName: options.skillName?.trim() || null,
      targets: [...(options.targets || [])].sort(),
      moduleAuthoring: Boolean(options.moduleAuthoring),
      generationMode: options.generationMode || 'prepare',
    },
  }

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

async function isGeneratedSkillFresh(generatedSkillRoot: string, fingerprint: string): Promise<boolean> {
  const [state, entryExists] = await Promise.all([
    readGenerationState(generatedSkillRoot),
    pathExists(join(generatedSkillRoot, 'SKILL.md')),
  ])

  return Boolean(entryExists && state?.fingerprint === fingerprint)
}

function collectWorkspaceDiscoverySources(rootDir: string, discoveries: PackageSkillDiscovery[]): ResolvedContribution[] {
  const workspaceRoot = resolve(rootDir)
  const contributions: ResolvedContribution[] = []

  for (const discovery of discoveries) {
    if (resolve(discovery.packageRoot) !== workspaceRoot) {
      continue
    }

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

  return sortAndDedupeContributions(contributions)
}

async function createLocalSourceFingerprints(contributions: ResolvedContribution[]): Promise<Array<{
  packageName: string
  skillName: string
  sourceDir: string
  sourceRoot: string
  sourceKind: ResolvedContribution['sourceKind']
  hash: string | null
}>> {
  const fingerprints = await Promise.all(contributions.map(async contribution => ({
    packageName: contribution.packageName,
    skillName: contribution.skillName,
    sourceDir: resolve(contribution.sourceDir).replaceAll('\\', '/'),
    sourceRoot: resolve(contribution.sourceRoot).replaceAll('\\', '/'),
    sourceKind: contribution.sourceKind,
    hash: await hashDirectoryTreeIfExists(contribution.sourceDir),
  })))

  return fingerprints.sort((a, b) => {
    const left = `${a.packageName}::${a.skillName}::${a.sourceDir}`
    const right = `${b.packageName}::${b.skillName}::${b.sourceDir}`
    return left.localeCompare(right)
  })
}

async function collectInstalledPackages(nuxt: Nuxt) {
  const discoveries = []
  const installedPackages: InstalledPackageMetadata[] = []
  const seenPackageRoots = new Set<string>()

  const addInstalledPackage = (installedPackage: InstalledPackageMetadata | null) => {
    if (!installedPackage || seenPackageRoots.has(installedPackage.packageRoot)) {
      return
    }

    seenPackageRoots.add(installedPackage.packageRoot)
    installedPackages.push(installedPackage)

    const discovered = discoverPackageSkillsFromInstalledPackage(installedPackage, 'dist')
    if (discovered) {
      discoveries.push(discovered)
    }
  }

  const moduleSpecifiers = (nuxt.options.modules || [])
    .map(entry => extractModuleSpecifier(entry))
    .filter((entry): entry is string => Boolean(entry))

  const seenSpecifiers = Array.from(new Set(moduleSpecifiers))
  for (const specifier of seenSpecifiers) {
    addInstalledPackage(await discoverInstalledPackageFromSpecifier(specifier, nuxt.options.rootDir))
  }

  const layerDirectories = Array.from(new Set(
    nuxt.options._layers
      .map(layer => resolve(layer.cwd || layer.config.rootDir || ''))
      .filter(layerDir => layerDir && layerDir !== resolve(nuxt.options.rootDir)),
  ))

  for (const layerDirectory of layerDirectories) {
    addInstalledPackage(await discoverInstalledPackageFromDirectory(layerDirectory))
  }

  const localPackageSkills = await discoverLocalPackageSkills(nuxt.options.rootDir)
  if (localPackageSkills) {
    discoveries.push(localPackageSkills)
  }

  return {
    discoveries,
    installedPackages,
  }
}

export async function ensureStableSkillWrappers(input: {
  rootDir: string
  exportRoot: string
  buildDir: string
  skillName: string
  targets: SkillHubTarget[]
  generationMode: SkillHubGenerationMode
}): Promise<void> {
  const stableBuildDir = resolveStableSkillBuildDir(input.rootDir, input.buildDir)
  const generatedSkillRoot = getGeneratedSkillRoot(stableBuildDir, input.skillName)
  const generatedEntryPath = join(generatedSkillRoot, 'SKILL.md')

  for (const target of input.targets) {
    const { skillRoot } = getTargetSkillRoot(input.exportRoot, target, input.skillName)
    await ensureDir(skillRoot)
    await removeLegacyRootArtifacts(skillRoot)

    const wrapper = createStableSkillWrapper(
      input.skillName,
      normalizeRelativePath(skillRoot, generatedEntryPath),
      normalizeRelativePath(skillRoot, generatedSkillRoot),
      input.generationMode,
    )

    await writeFileIfChanged(join(skillRoot, 'SKILL.md'), wrapper)
  }
}

export async function generateSkillTree(input: {
  nuxt: Nuxt
  logger: SkillHubLogger
  options: ModuleOptions
  skillName: string
  exportRoot: string
  generationMode: SkillHubGenerationMode
}): Promise<void> {
  const { nuxt, logger, options, skillName, exportRoot, generationMode } = input
  const stableBuildDir = resolveStableSkillBuildDir(nuxt.options.rootDir, nuxt.options.buildDir)
  const generatedSkillRoot = getGeneratedSkillRoot(stableBuildDir, skillName)
  const referencesRoot = join(generatedSkillRoot, 'references')
  const nuxtRoot = join(referencesRoot, 'nuxt')
  const vueRoot = join(referencesRoot, 'vue')
  const modulesRoot = join(referencesRoot, 'modules')
  const monorepoScopePath = resolveMonorepoScopePath(nuxt.options.rootDir, exportRoot)
  const manualContributions: SkillHubContribution[] = []

  const contributionContext: SkillHubContributionContext = {
    add: (contribution) => {
      manualContributions.push(contribution)
    },
  }

  const callSkillContributeHook = nuxt.callHook as (
    name: 'skill-hub:contribute',
    ctx: SkillHubContributionContext,
  ) => Promise<void>
  await callSkillContributeHook('skill-hub:contribute', contributionContext)

  const { discoveries, installedPackages } = await collectInstalledPackages(nuxt)
  const discoveredContributions = await resolveContributions(discoveries)
  const workspaceDiscoverySources = collectWorkspaceDiscoverySources(nuxt.options.rootDir, discoveries)
  const resolvedManual = await Promise.all(
    manualContributions.map(contribution => resolveManualContribution(nuxt.options.rootDir, contribution)),
  )
  const fingerprint = await createGenerationFingerprint(
    nuxt,
    options,
    skillName,
    exportRoot,
    installedPackages,
    await createLocalSourceFingerprints([
      ...workspaceDiscoverySources,
      ...sortAndDedupeContributions(resolvedManual),
    ]),
  )

  if (generationMode === 'prepare' && await isGeneratedSkillFresh(generatedSkillRoot, fingerprint)) {
    logger.info(`Generated ${skillName} skill is already up to date at ${generatedSkillRoot}`)
    return
  }

  const distResolvedPackages = new Set(discoveredContributions.contributions.map(item => item.packageName))

  const remoteIssues: ValidationIssue[] = []
  const remoteSkipped: SkillManifestSkipped[] = []
  const remoteContributions: ResolvedContribution[] = []
  const remoteCacheRoot = join(stableBuildDir, 'skill-hub-cache')
  await emptyDir(remoteCacheRoot)

  const packagesToResolve = installedPackages.filter(pkg => pkg.packageName !== 'nuxt-skill-hub' && !distResolvedPackages.has(pkg.packageName))
  const totalToResolve = packagesToResolve.length

  for (let i = 0; i < packagesToResolve.length; i++) {
    const pkg = packagesToResolve[i]
    logger.start(`[${i + 1}/${totalToResolve}] Resolving skills for ${pkg.packageName}...`)

    const remote = await resolveRemoteContributionsForPackage(pkg, {
      cacheRoot: remoteCacheRoot,
      githubLookupTimeoutMs: GITHUB_LOOKUP_TIMEOUT_MS,
      enableGithubLookup: true,
    })

    remoteIssues.push(...remote.issues)
    remoteSkipped.push(...remote.skipped)
    remoteContributions.push(...remote.contributions)
  }

  const validatedRemote = await validateResolvedContributions(sortAndDedupeContributions(remoteContributions))

  const validatedManual = await validateResolvedContributions(sortAndDedupeContributions(resolvedManual))

  const contributions = sortAndDedupeContributions([
    ...discoveredContributions.contributions,
    ...validatedRemote.contributions,
    ...validatedManual.contributions,
  ])
  const validationIssues = [
    ...discoveredContributions.issues,
    ...remoteIssues,
    ...validatedRemote.issues,
    ...validatedManual.issues,
  ]
  const issuesToSkipped = mergeSkipped(
    validationIssues.map(issue => ({ packageName: issue.packageName, skillName: issue.skillName, reason: issue.reason, sourceKind: issue.sourceKind })),
    entry => `${entry.packageName}::${entry.skillName}`,
  )
  const skipped = mergeSkipped(
    [...issuesToSkipped, ...remoteSkipped],
    entry => `${entry.packageName}::${entry.skillName}::${entry.sourceKind || ''}`,
  )

  for (const issue of validationIssues) {
    logger.warn(`[validation] ${issue.packageName}/${issue.skillName}: ${issue.reason}`)
  }

  await emptyDir(generatedSkillRoot)
  await ensureDir(nuxtRoot)
  await ensureDir(vueRoot)
  await ensureDir(modulesRoot)

  const nuxtTemplateFiles = await buildNuxtTemplateFiles(nuxtRoot)
  for (const file of nuxtTemplateFiles) {
    await writeFileIfChanged(file.path, file.contents)
  }

  const nuxtIndexTemplatePath = join(nuxtRoot, 'index.template.md')
  const nuxtIndexTemplate = await pathExists(nuxtIndexTemplatePath)
    ? await fsp.readFile(nuxtIndexTemplatePath, 'utf8')
    : ''
  const nuxtIndexContent = await renderAutomdTemplate(nuxtIndexTemplate, nuxtRoot)
  await writeFileIfChanged(join(nuxtRoot, 'index.md'), nuxtIndexContent)

  logger.start('Fetching Vue best-practices content...')
  const vueTemplateFiles = await buildVueTemplateFiles(vueRoot, remoteCacheRoot)
  for (const file of vueTemplateFiles) {
    await writeFileIfChanged(file.path, file.contents)
  }

  const generatedEntries: GeneratedModuleEntry[] = []

  for (const contribution of contributions) {
    const includeScripts = contribution.forceIncludeScripts
    const destination = createModuleDestination(modulesRoot, contribution)
    await copySkillTree(contribution.sourceDir, destination, includeScripts)
    const entryPath = relative(generatedSkillRoot, join(destination, 'SKILL.md')).replaceAll('\\', '/')

    generatedEntries.push({
      packageName: contribution.packageName,
      version: contribution.version,
      skillName: contribution.skillName,
      entryPath,
      sourceDir: contribution.sourceDir,
      destination: relative(generatedSkillRoot, destination).replaceAll('\\', '/'),
      scriptsIncluded: includeScripts,
      description: contribution.description,
      sourceKind: contribution.sourceKind,
      sourceLabel: getSourceLabel(contribution.sourceKind),
      sourceRepo: contribution.sourceRepo,
      sourceRef: contribution.sourceRef,
      sourcePath: contribution.sourcePath,
      repoUrl: contribution.repoUrl,
      docsUrl: contribution.docsUrl,
      official: contribution.official,
      trustLevel: getTrustLevel(contribution.official),
      resolver: contribution.resolver,
    })
  }

  const nuxtMetadata = await loadNuxtMetadata()
  await writeFileIfChanged(join(generatedSkillRoot, 'SKILL.md'), createSkillEntrypoint(
    skillName,
    nuxtMetadata,
    monorepoScopePath,
    Boolean(options.moduleAuthoring),
    generatedEntries,
    skipped,
  ))
  await writeGenerationState(generatedSkillRoot, fingerprint)

  logger.success(`Generated ${skillName} skill at ${generatedSkillRoot}`)
}
