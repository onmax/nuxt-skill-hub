import { promises as fsp } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { basename, dirname, join, relative, resolve } from 'pathe'
import type { Nuxt } from '@nuxt/schema'
import { PACKAGE_VERSION } from '../shared/package-info'
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
  replaceSkillTree,
  resolveContributions,
  resolveMonorepoScopePath,
  sortAndDedupeContributions,
  swapDir,
  validateResolvedContributions,
  writeFileIfChanged,
  type GeneratedModuleEntry,
  type InstalledPackageMetadata,
} from './internal'
import { resolveRemoteContributionsForPackage } from './remote-resolver'
import {
  createSkillEntrypoint,
  createSkillPointer,
  createModuleIndex,
  DEFAULT_NUXT_CONTENT_METADATA,
  getSourceLabel,
  getTrustLevel,
  selectLinkedPacks,
  type SkillEntrypointOptions,
} from '../shared/skill-render'
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
} from './types'
import { loadsSkillFolders, type SkillHubTarget } from './agents'

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

function normalizeRelativePath(from: string, to: string): string {
  const rel = relative(from, to).replaceAll('\\', '/')
  if (!rel || rel === '.') {
    return './'
  }

  return rel.startsWith('.') ? rel : `./${rel}`
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

const GENERATED_GITIGNORE = '# Written by nuxt-skill-hub on `nuxt prepare`. Do not commit or edit.\n*\n'

/** True when the folder is free, or holds a skill this module wrote (the tree, a pointer, or an older version's wrapper). */
async function canReplaceSkillDir(skillRoot: string): Promise<boolean> {
  const entry = join(skillRoot, 'SKILL.md')
  if (!(await pathExists(entry))) {
    return !(await pathExists(skillRoot)) || (await fsp.readdir(skillRoot)).length === 0
  }

  const contents = await fsp.readFile(entry, 'utf8')
  return contents.includes('_Generated by nuxt-skill-hub.') || contents.includes('# Nuxt Skill Wrapper')
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

/**
 * Puts the generated tree where each agent loads skills. Agents that load skill folders get the
 * whole tree. Agents with a rules directory get one pointer file, so they don't load every
 * reference as a rule.
 */
export async function publishSkill(input: {
  logger: SkillHubLogger
  rootDir: string
  exportRoot: string
  skillName: string
  targets: SkillHubTarget[]
  generatedSkillRoot: string
}): Promise<void> {
  const { logger, generatedSkillRoot } = input
  const projectPath = relative(input.exportRoot, input.rootDir).replaceAll('\\', '/')
  // Through the project's own node_modules link, not the resolved store path, so the pointer stays stable across versions.
  const bundledRulesDir = join(input.rootDir, 'node_modules', 'nuxt-skill-hub', 'nuxt-best-practices', 'rules')
  const hasBundledRules = await pathExists(bundledRulesDir)
  const published = new Set<string>()

  for (const target of input.targets) {
    const { skillRoot } = getTargetSkillRoot(input.exportRoot, target, input.skillName)
    await ensureDir(dirname(skillRoot))
    // Two targets can share a folder through a symlink, e.g. `.claude/skills -> ../.agents/skills`.
    const realSkillRoot = join(await fsp.realpath(dirname(skillRoot)), basename(skillRoot))
    if (published.has(realSkillRoot)) {
      continue
    }
    published.add(realSkillRoot)

    if (!(await canReplaceSkillDir(skillRoot))) {
      logger.warn(`Skipped ${skillRoot}: it holds a skill nuxt-skill-hub didn't write. Set \`skillHub.skillName\` to use another name.`)
      continue
    }

    if (loadsSkillFolders(target)) {
      await replaceSkillTree(generatedSkillRoot, skillRoot)
      continue
    }

    await emptyDir(skillRoot)
    await ensureDir(skillRoot)
    await writeFileIfChanged(join(skillRoot, 'SKILL.md'), createSkillPointer(
      input.skillName,
      normalizeRelativePath(skillRoot, join(generatedSkillRoot, 'SKILL.md')),
      {
        projectPath,
        bundledRulesPath: hasBundledRules ? normalizeRelativePath(skillRoot, bundledRulesDir) : undefined,
      },
    ))
  }
}

export async function generateSkillTree(input: {
  nuxt: Nuxt
  logger: SkillHubLogger
  options: ModuleOptions
  skillName: string
  exportRoot: string
  targets: SkillHubTarget[]
}): Promise<void> {
  const { nuxt, logger, options, skillName, exportRoot, targets } = input
  const persistentCacheRoot = getPersistentCacheRoot(exportRoot)
  // The one generated copy. `publishSkill` copies it to each agent.
  const generatedSkillRoot = getCachedGeneratedSkillRoot(persistentCacheRoot, skillName)
  const publish = async () => {
    await publishSkill({ logger, rootDir: nuxt.options.rootDir, exportRoot, skillName, targets, generatedSkillRoot })
    // Older versions kept the tree in the build dir.
    await fsp.rm(join(nuxt.options.buildDir, 'skill-hub'), { recursive: true, force: true })
  }
  // Built here, then swapped in, so a failed run keeps the previous tree.
  const stagingRoot = `${generatedSkillRoot}.staging`
  const referencesRoot = join(stagingRoot, 'references')
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
    exportRoot,
    skillName,
    options,
    installedPackages,
    localSources: await createLocalSourceFingerprints([
      ...workspaceDiscoverySources,
      ...sortAndDedupeContributions(resolvedManual),
    ]),
  })

  if (await isGeneratedSkillFreshWithOptions(generatedSkillRoot, fingerprint, {
    refresh: remoteOptions.refresh,
    cacheTtlMs: remoteOptions.cacheTtlMs,
  })) {
    await publish()
    logger.info(`Reused cached ${skillName} skill from ${generatedSkillRoot}`)
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

  await emptyDir(stagingRoot)
  try {
    await ensureDir(nuxtRoot)
    await ensureDir(vueRoot)
    await ensureDir(modulesRoot)

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
      const entryPath = relative(stagingRoot, join(destination, 'SKILL.md')).replaceAll('\\', '/')

      generatedEntries.push({
        packageName: contribution.packageName,
        version: contribution.version,
        skillName: contribution.skillName,
        entryPath,
        sourceDir: contribution.sourceDir,
        destination: relative(stagingRoot, destination).replaceAll('\\', '/'),
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

    const entrypointOptions: SkillEntrypointOptions = {
      monorepoScopePath,
      moduleAuthoring: Boolean(options.moduleAuthoring),
      installedPackages: installedPackages.map(pkg => pkg.packageName),
      entries: generatedEntries,
      skipped,
    }
    // Copy only the packs the router links, so no pack sits in the tree unreachable.
    const nuxtTemplateFiles = await buildNuxtTemplateFiles(nuxtRoot, selectLinkedPacks(DEFAULT_NUXT_CONTENT_METADATA, entrypointOptions))
    for (const file of nuxtTemplateFiles) {
      await writeFileIfChanged(file.path, file.contents)
    }

    await writeFileIfChanged(join(stagingRoot, 'SKILL.md'), createSkillEntrypoint(skillName, DEFAULT_NUXT_CONTENT_METADATA, entrypointOptions))
    await writeFileIfChanged(join(stagingRoot, '.gitignore'), GENERATED_GITIGNORE)
    await writeGenerationState(stagingRoot, fingerprint)
    await swapDir(stagingRoot, generatedSkillRoot)
  }
  finally {
    await fsp.rm(stagingRoot, { recursive: true, force: true })
  }
  await publish()

  logger.success(`Generated ${skillName} skill for ${targets.join(', ')}`)
}
