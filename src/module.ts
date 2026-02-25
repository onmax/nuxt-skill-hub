import { promises as fsp } from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { defineNuxtModule, useLogger } from '@nuxt/kit'
import { createSkillEntrypoint } from './core-content'
import {
  buildCoreTemplateFiles,
  copySkillTree,
  createManifest,
  createModuleDestination,
  createModulesListMarkdown,
  createReferencesIndexTemplate,
  discoverInstalledPackageFromSpecifier,
  discoverLocalPackageSkills,
  discoverPackageSkillsFromInstalledPackage,
  emptyDir,
  ensureDir,
  extractModuleSpecifier,
  type GeneratedModuleEntry,
  getTargetSkillRoot,
  isValidSkillName,
  normalizeContribution,
  pathExists,
  renderAutomdTemplate,
  resolveContributions,
  resolveTargets,
  shouldIncludeScripts,
  sortAndDedupeContributions,
  validateResolvedContributions,
  upsertAgentsHint,
  writeFileIfChanged,
} from './internal'
import { resolveRemoteContributionsForPackage } from './remote-resolver'
import type {
  ModuleOptions,
  ResolvedContribution,
  SkillManifestSkipped,
  SkillHubContribution,
  SkillHubContributionContext,
  ValidationIssue,
} from './types'

function toPosix(path: string): string {
  return path.split(sep).join('/')
}

async function resolveManualContribution(rootDir: string, contribution: SkillHubContribution): Promise<ResolvedContribution> {
  const sourceDir = isAbsolute(contribution.sourceDir)
    ? contribution.sourceDir
    : resolve(rootDir, contribution.sourceDir)

  return normalizeContribution(contribution, sourceDir, sourceDir)
}

function issuesToSkipped(issues: ValidationIssue[]): SkillManifestSkipped[] {
  const byKey = new Map<string, SkillManifestSkipped>()

  for (const issue of issues) {
    const key = `${issue.packageName}::${issue.skillName}`
    const previous = byKey.get(key)
    if (!previous) {
      byKey.set(key, {
        packageName: issue.packageName,
        skillName: issue.skillName,
        reason: issue.reason,
        sourceKind: issue.sourceKind,
      })
      continue
    }

    const reasons = new Set(previous.reason.split('; ').filter(Boolean))
    reasons.add(issue.reason)
    previous.reason = Array.from(reasons).join('; ')
  }

  return Array.from(byKey.values())
    .sort((a, b) => `${a.packageName}::${a.skillName}`.localeCompare(`${b.packageName}::${b.skillName}`))
}

function mergeSkippedEntries(entries: SkillManifestSkipped[]): SkillManifestSkipped[] {
  const byKey = new Map<string, SkillManifestSkipped>()

  for (const entry of entries) {
    const key = `${entry.packageName}::${entry.skillName}::${entry.sourceKind || ''}`
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

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-skill-hub',
    configKey: 'skillHub',
    compatibility: {
      nuxt: '>=4.3.0',
    },
  },
  defaults: {
    enabled: true,
    skillName: 'nuxt',
    targets: [],
    targetMode: 'detected',
    discoverDependencySkills: true,
    enableGithubLookup: true,
    githubLookupTimeoutMs: 1500,
    includeScripts: 'never',
    scriptAllowlist: [],
    writeAgentsHint: false,
  },
  async setup(options, nuxt) {
    if (!options.enabled) {
      return
    }

    const logger = useLogger('nuxt-skill-hub')
    const configuredSkillName = options.skillName?.trim() || 'nuxt'
    const resolvedSkillName = isValidSkillName(configuredSkillName)
      ? configuredSkillName
      : 'nuxt'

    if (resolvedSkillName !== configuredSkillName) {
      logger.warn(`Invalid skillHub.skillName "${configuredSkillName}". Falling back to "${resolvedSkillName}".`)
    }

    nuxt.hook('modules:done', async () => {
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

      const discoveries = []
      const installedPackages = []

      if (options.discoverDependencySkills) {
        const moduleSpecifiers = (nuxt.options.modules || [])
          .map(entry => extractModuleSpecifier(entry))
          .filter((entry): entry is string => Boolean(entry))

        const seenSpecifiers = Array.from(new Set(moduleSpecifiers))
        for (const specifier of seenSpecifiers) {
          const installedPackage = await discoverInstalledPackageFromSpecifier(specifier, nuxt.options.rootDir)
          if (!installedPackage) {
            continue
          }

          installedPackages.push(installedPackage)
          const discovered = discoverPackageSkillsFromInstalledPackage(installedPackage, 'dist')
          if (discovered) {
            discoveries.push(discovered)
          }
        }
      }

      const localPackageSkills = await discoverLocalPackageSkills(nuxt.options.rootDir)
      if (localPackageSkills) {
        discoveries.push(localPackageSkills)
      }

      const discoveredContributions = await resolveContributions(discoveries)
      const distResolvedPackages = new Set(discoveredContributions.contributions.map(item => item.packageName))

      const remoteIssues: ValidationIssue[] = []
      const remoteSkipped: SkillManifestSkipped[] = []
      const remoteContributions: ResolvedContribution[] = []
      const remoteCacheRoot = join(nuxt.options.rootDir, '.nuxt', 'skill-hub-cache')
      await emptyDir(remoteCacheRoot)

      for (const pkg of installedPackages) {
        if (distResolvedPackages.has(pkg.packageName)) {
          continue
        }

        const remote = await resolveRemoteContributionsForPackage(pkg, {
          cacheRoot: remoteCacheRoot,
          githubLookupTimeoutMs: options.githubLookupTimeoutMs || 1500,
          enableGithubLookup: options.enableGithubLookup !== false,
        })

        remoteIssues.push(...remote.issues)
        remoteSkipped.push(...remote.skipped)
        remoteContributions.push(...remote.contributions)
      }

      const validatedRemote = await validateResolvedContributions(sortAndDedupeContributions(remoteContributions))

      const resolvedManual = await Promise.all(
        manualContributions.map(contribution => resolveManualContribution(nuxt.options.rootDir, contribution)),
      )
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
      const skipped = mergeSkippedEntries([
        ...issuesToSkipped(validationIssues),
        ...remoteSkipped,
      ])

      for (const issue of validationIssues) {
        logger.warn(`[validation] ${issue.packageName}/${issue.skillName}: ${issue.reason}`)
      }

      const targetResolution = resolveTargets(
        options.targetMode || 'detected',
        options.targets || [],
        nuxt.options.rootDir,
      )
      const targets = targetResolution.targets

      for (const invalidTarget of targetResolution.invalidTargets) {
        if (invalidTarget.reason === 'unknown-target') {
          logger.warn(`Target "${invalidTarget.target}" is unknown in unagent and was skipped.`)
          continue
        }
        logger.warn(`Target "${invalidTarget.target}" has no skillsDir in unagent and was skipped.`)
      }

      if (!targets.length) {
        logger.warn('No detected targets. Set skillHub.targetMode="explicit" with skillHub.targets to force export.')
        return
      }

      const generatedAt = new Date().toISOString()

      for (const target of targets) {
        const { targetDir, skillRoot, warning } = getTargetSkillRoot(nuxt.options.rootDir, target, resolvedSkillName)
        if (warning) {
          logger.warn(warning)
        }
        const referencesRoot = join(skillRoot, 'references')
        const coreRoot = join(referencesRoot, 'core')
        const modulesRoot = join(referencesRoot, 'modules')

        await emptyDir(skillRoot)
        await ensureDir(coreRoot)
        await ensureDir(modulesRoot)

        await writeFileIfChanged(join(skillRoot, 'SKILL.md'), createSkillEntrypoint(resolvedSkillName))

        const coreTemplateFiles = await buildCoreTemplateFiles(coreRoot)
        for (const file of coreTemplateFiles) {
          await writeFileIfChanged(file.path, file.contents)
        }

        const coreIndexTemplatePath = join(coreRoot, 'index.template.md')
        const coreIndexTemplate = await pathExists(coreIndexTemplatePath)
          ? await fsp.readFile(coreIndexTemplatePath, 'utf8')
          : ''
        const coreIndexContent = await renderAutomdTemplate(coreIndexTemplate, coreRoot)
        await writeFileIfChanged(join(coreRoot, 'index.md'), coreIndexContent)

        const generatedEntries: GeneratedModuleEntry[] = []

        for (const contribution of contributions) {
          const includeScripts = contribution.forceIncludeScripts
            ? true
            : shouldIncludeScripts(
                options.includeScripts || 'never',
                options.scriptAllowlist || [],
                contribution.packageName,
              )

          const destination = createModuleDestination(modulesRoot, contribution)
          await copySkillTree(contribution.sourceDir, destination, includeScripts)

          generatedEntries.push({
            packageName: contribution.packageName,
            version: contribution.version,
            skillName: contribution.skillName,
            sourceDir: contribution.sourceDir,
            destination: toPosix(relative(skillRoot, destination)),
            scriptsIncluded: includeScripts,
            sourceKind: contribution.sourceKind,
            sourceRepo: contribution.sourceRepo,
            sourceRef: contribution.sourceRef,
            sourcePath: contribution.sourcePath,
            official: contribution.official,
            resolver: contribution.resolver,
          })
        }

        const modulesListPath = join(modulesRoot, '_list.md')
        await writeFileIfChanged(modulesListPath, createModulesListMarkdown(generatedEntries, skipped))

        const referencesIndexTemplate = createReferencesIndexTemplate()
        const referencesIndexTemplatePath = join(referencesRoot, 'index.template.md')
        await writeFileIfChanged(referencesIndexTemplatePath, referencesIndexTemplate)
        const renderedIndex = await renderAutomdTemplate(referencesIndexTemplate, referencesRoot)
        await writeFileIfChanged(join(referencesRoot, 'index.md'), renderedIndex)

        const manifest = createManifest(
          generatedAt,
          resolvedSkillName,
          target,
          toPosix(targetDir),
          generatedEntries,
          skipped,
        )
        await writeFileIfChanged(join(skillRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

        logger.success(`Generated ${resolvedSkillName} skill at ${toPosix(skillRoot)}`)
      }

      if (options.writeAgentsHint) {
        await upsertAgentsHint(nuxt.options.rootDir, resolvedSkillName)
      }
    })
  },
})

export type { ModuleOptions, SkillHubContribution, SkillHubContributionContext } from './types'
export type { SkillHubTarget } from './agents'

// Nuxt type augmentation for config and custom hook.
declare module '@nuxt/schema' {
  interface NuxtHooks {
    'skill-hub:contribute': (ctx: SkillHubContributionContext) => void | Promise<void>
  }
}
