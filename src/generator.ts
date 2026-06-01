import { promises as fsp } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { join, relative, resolve } from 'pathe'
import type { Nuxt } from '@nuxt/schema'
import { PACKAGE_VERSION } from './package-info'
import { loadNuxtMetadata } from './nuxt-content'
import {
  collectInstalledModulePackages,
  copySkillTree,
  createModuleDestination,
  buildNuxtTemplateFiles,
  buildVueTemplateFiles,
  discoverPackageSkillsFromInstalledPackage,
  discoverInstalledPackageFromDirectory,
  discoverLocalPackageSkills,
  emptyDir,
  ensureDir,
  getTargetSkillRoot,
  mapWithConcurrency,
  pathExists,
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
  createModuleIndex,
  getSourceLabel,
  getTrustLevel,
} from './render-content'
import { createGenerationFingerprint } from './generation/fingerprint'
import {
  collectWorkspaceDiscoverySources,
  createLocalSourceFingerprints,
  resolveManualContribution,
} from './generation/sources'
import { isGeneratedSkillFreshWithOptions, writeGenerationState } from './generation/state'
import {
  normalizeRemoteOptions,
  type ModuleOptions,
  type ResolvedContribution,
  type SkillHubResolveDoneContext,
  type SkillHubResolvePackageContext,
  type SkillHubResolveStartContext,
  type SkillHubContribution,
  type SkillHubContributionContext,
  type SkillManifestSkipped,
  type ValidationIssue,
  type SkillHubGenerationMode,
} from './types'
import type { SkillHubTarget } from './agents'

interface NuxtPerfProfiler {
  startPhase: (name: string) => void
  endPhase: (name?: string) => void
}

type NuxtWithPerf = Nuxt & {
  _perf?: NuxtPerfProfiler
}

export interface SkillHubLogger {
  start: (message: string) => void
  success: (message: string) => void
  warn: (message: string) => void
  info: (message: string) => void
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

function getPersistentCacheRoot(exportRoot: string): string {
  return join(exportRoot, 'node_modules', '.cache', 'nuxt-skill-hub')
}

function getCachedGeneratedSkillRoot(cacheRoot: string, skillName: string): string {
  return join(cacheRoot, 'generated', skillName)
}

function roundMs(value: number): number {
  return Math.round(value * 10) / 10
}

function formatMs(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`
}

function shouldLogTimings(nuxt: Nuxt, explicit: boolean): boolean {
  return explicit || Boolean(nuxt.options.debug)
}

function startPerfPhase(nuxt: Nuxt, name: string): void {
  (nuxt as NuxtWithPerf)._perf?.startPhase(name)
}

function endPerfPhase(nuxt: Nuxt, name: string): void {
  (nuxt as NuxtWithPerf)._perf?.endPhase(name)
}

function countResolvers(contributions: ResolvedContribution[]): Partial<Record<ResolvedContribution['resolver'], number>> {
  const counts: Partial<Record<ResolvedContribution['resolver'], number>> = {}
  for (const contribution of contributions) {
    counts[contribution.resolver] = (counts[contribution.resolver] || 0) + 1
  }
  return counts
}

function formatResolverCounts(counts: Partial<Record<ResolvedContribution['resolver'], number>>): string {
  return Object.entries(counts)
    .map(([resolver, count]) => `${count} ${resolver}`)
    .join(', ')
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

function filterResolvedSkipped(entries: SkillManifestSkipped[], contributions: ResolvedContribution[]): SkillManifestSkipped[] {
  const resolvedKeys = new Set(contributions.map(contribution => `${contribution.packageName}::${contribution.skillName}`))
  return entries.filter(entry => !resolvedKeys.has(`${entry.packageName}::${entry.skillName}`))
}

async function removeLegacyRootArtifacts(skillRoot: string): Promise<void> {
  await Promise.all([
    fsp.rm(join(skillRoot, 'references'), { recursive: true, force: true }),
    fsp.rm(join(skillRoot, 'manifest.json'), { force: true }),
  ])
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

  const modulePackages = await collectInstalledModulePackages(nuxt.options.modules, nuxt.options.rootDir)
  for (const pkg of modulePackages) addInstalledPackage(pkg)

  const layerDirectories = Array.from(new Set(
    nuxt.options._layers
      .map(layer => resolve(layer.cwd || layer.config.rootDir || ''))
      .filter(layerDir => layerDir && layerDir !== resolve(nuxt.options.rootDir)),
  ))

  const layerPackages = await Promise.all(layerDirectories.map(dir => discoverInstalledPackageFromDirectory(dir)))
  for (const pkg of layerPackages) addInstalledPackage(pkg)

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
  const persistentCacheRoot = getPersistentCacheRoot(exportRoot)
  const cachedGeneratedSkillRoot = getCachedGeneratedSkillRoot(persistentCacheRoot, skillName)
  const generatedSkillRoot = getGeneratedSkillRoot(stableBuildDir, skillName)
  const referencesRoot = join(generatedSkillRoot, 'references')
  const nuxtRoot = join(referencesRoot, 'nuxt')
  const vueRoot = join(referencesRoot, 'vue')
  const modulesRoot = join(referencesRoot, 'modules')
  const monorepoScopePath = resolveMonorepoScopePath(nuxt.options.rootDir, exportRoot)
  const manualContributions: SkillHubContribution[] = []
  const remoteOptions = normalizeRemoteOptions(options.remote)

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

  const callResolveStartHook = nuxt.callHook as (
    name: 'skill-hub:resolve:start',
    ctx: SkillHubResolveStartContext,
  ) => Promise<void>
  const callResolvePackageHook = nuxt.callHook as (
    name: 'skill-hub:resolve:package',
    ctx: SkillHubResolvePackageContext,
  ) => Promise<void>
  const callResolveDoneHook = nuxt.callHook as (
    name: 'skill-hub:resolve:done',
    ctx: SkillHubResolveDoneContext,
  ) => Promise<void>

  const { discoveries, installedPackages } = await collectInstalledPackages(nuxt)
  const discoveredContributions = await resolveContributions(discoveries)
  const workspaceDiscoverySources = collectWorkspaceDiscoverySources(nuxt.options.rootDir, discoveries)
  const resolvedManual = await Promise.all(
    manualContributions.map(contribution => resolveManualContribution(nuxt.options.rootDir, contribution)),
  )
  const fingerprint = await createGenerationFingerprint({
    packageVersion: PACKAGE_VERSION,
    rootDir: nuxt.options.rootDir,
    buildDir: nuxt.options.buildDir,
    exportRoot,
    skillName,
    options,
    installedPackages,
    localSources: await createLocalSourceFingerprints([
      ...workspaceDiscoverySources,
      ...sortAndDedupeContributions(resolvedManual),
    ]),
  })

  if (generationMode === 'prepare' && await isGeneratedSkillFreshWithOptions(cachedGeneratedSkillRoot, fingerprint, {
    refresh: remoteOptions.refresh,
    cacheTtlMs: remoteOptions.cacheTtlMs,
  })) {
    await copySkillTree(cachedGeneratedSkillRoot, generatedSkillRoot, true)
    logger.info(`Restored cached ${skillName} skill from ${cachedGeneratedSkillRoot}`)
    return
  }

  const distResolvedPackages = new Set(discoveredContributions.contributions.map(item => item.packageName))

  const remoteIssues: ValidationIssue[] = []
  const remoteSkipped: SkillManifestSkipped[] = []
  const remoteContributions: ResolvedContribution[] = []
  const remoteCacheRoot = join(persistentCacheRoot, 'remote')
  await ensureDir(remoteCacheRoot)

  const packagesToResolve = installedPackages.filter(pkg => pkg.packageName !== 'nuxt-skill-hub' && !distResolvedPackages.has(pkg.packageName))
  const totalToResolve = packagesToResolve.length

  const remoteStart = performance.now()
  const logTimings = shouldLogTimings(nuxt, remoteOptions.timings)

  await callResolveStartHook('skill-hub:resolve:start', {
    skillName,
    packageCount: totalToResolve,
    concurrency: remoteOptions.concurrency,
    remoteEnabled: remoteOptions.enabled,
    githubHeuristics: remoteOptions.githubHeuristics,
  })

  startPerfPhase(nuxt, 'skill-hub:resolve')
  const remoteResults = await (async () => {
    try {
      return await mapWithConcurrency(
        packagesToResolve,
        remoteOptions.concurrency,
        async (pkg, index) => {
          logger.start(`Resolving skills for ${pkg.packageName} (${index + 1}/${totalToResolve})...`)
          const packageStart = performance.now()
          const phaseName = `skill-hub:resolve:${pkg.packageName}`
          startPerfPhase(nuxt, phaseName)
          try {
            const result = await resolveRemoteContributionsForPackage(pkg, {
              cacheRoot: remoteCacheRoot,
              githubLookupTimeoutMs: remoteOptions.timeoutMs,
              enableGithubLookup: remoteOptions.enabled,
              enableWellKnownLookup: remoteOptions.enabled,
              enableGithubHeuristics: remoteOptions.enabled && remoteOptions.githubHeuristics,
              wellKnownLimits: {
                maxFiles: remoteOptions.maxFiles,
                maxBytes: remoteOptions.maxBytes,
                maxFileBytes: remoteOptions.maxFileBytes,
              },
            })
            const durationMs = roundMs(performance.now() - packageStart)
            const firstContribution = result.contributions[0]
            await callResolvePackageHook('skill-hub:resolve:package', {
              skillName,
              packageName: pkg.packageName,
              packageIndex: index,
              packageCount: totalToResolve,
              durationMs,
              resolver: firstContribution?.resolver,
              sourceKind: firstContribution?.sourceKind,
              contributionCount: result.contributions.length,
              skippedCount: result.skipped.length,
            })
            if (logTimings) {
              const outcome = firstContribution
                ? `${firstContribution.resolver}/${firstContribution.sourceKind}`
                : 'unresolved'
              logger.info(`Resolved ${pkg.packageName} via ${outcome} in ${formatMs(durationMs)}`)
            }
            return result
          }
          finally {
            endPerfPhase(nuxt, phaseName)
          }
        },
      )
    }
    finally {
      endPerfPhase(nuxt, 'skill-hub:resolve')
    }
  })()

  for (const remote of remoteResults) {
    remoteIssues.push(...remote.issues)
    remoteSkipped.push(...remote.skipped)
    remoteContributions.push(...remote.contributions)
  }

  const remoteDurationMs = roundMs(performance.now() - remoteStart)
  const resolverCounts = countResolvers(remoteContributions)
  await callResolveDoneHook('skill-hub:resolve:done', {
    skillName,
    packageCount: totalToResolve,
    concurrency: remoteOptions.concurrency,
    remoteEnabled: remoteOptions.enabled,
    githubHeuristics: remoteOptions.githubHeuristics,
    durationMs: remoteDurationMs,
    contributionCount: remoteContributions.length,
    skippedCount: remoteSkipped.length,
    issueCount: remoteIssues.length,
    resolverCounts,
  })
  if (totalToResolve) {
    const summary = formatResolverCounts(resolverCounts)
    logger.info(`Resolved ${totalToResolve} module skill sources in ${formatMs(remoteDurationMs)}${summary ? ` (${summary})` : ''}.`)
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
  const skipped = filterResolvedSkipped(mergeSkipped(
    [...issuesToSkipped, ...remoteSkipped],
    entry => `${entry.packageName}::${entry.skillName}::${entry.sourceKind || ''}`,
  ), contributions)

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

  const moduleIndex = createModuleIndex(generatedEntries, skipped)
  if (moduleIndex) {
    await writeFileIfChanged(join(modulesRoot, 'index.md'), moduleIndex)
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
  await copySkillTree(generatedSkillRoot, cachedGeneratedSkillRoot, true)

  logger.success(`Generated ${skillName} skill at ${generatedSkillRoot}`)
}
