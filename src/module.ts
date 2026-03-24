import { promises as fsp } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'pathe'
import { defineNuxtModule, useLogger } from '@nuxt/kit'
import { isCI, isTest } from 'std-env'
import { PACKAGE_VERSION } from './package-info'
import { runInstallWizard } from './install'
import { loadNuxtMetadata } from './nuxt-content'
import {
  discoverInstalledPackageFromDirectory,
  copySkillTree,
  createModuleDestination,
  buildNuxtTemplateFiles,
  buildVueTemplateFiles,
  discoverInstalledPackageFromSpecifier,
  discoverLocalPackageSkills,
  discoverPackageSkillsFromInstalledPackage,
  emptyDir,
  ensureDir,
  extractModuleSpecifier,
  deriveSkillName,
  detectConflictingSkills,
  formatConflictWarning,
  type GeneratedModuleEntry,
  getTargetSkillRoot,
  isValidSkillName,
  normalizeContribution,
  pathExists,
  renderAutomdTemplate,
  resolveContributions,
  resolveExportRoot,
  resolveMonorepoScopePath,
  resolveTargets,
  sortAndDedupeContributions,
  validateResolvedContributions,
  writeFileIfChanged,
  type InstalledPackageMetadata,
} from './internal'
import { resolveRemoteContributionsForPackage } from './remote-resolver'
import {
  createSkillEntrypoint,
  getSourceLabel,
  getTrustLevel,
} from './render-content'
import type {
  ModuleOptions,
  ResolvedContribution,
  SkillManifestSkipped,
  SkillHubContribution,
  SkillHubContributionContext,
  ValidationIssue,
} from './types'

const GITHUB_LOOKUP_TIMEOUT_MS = 1500

async function resolveManualContribution(rootDir: string, contribution: SkillHubContribution): Promise<ResolvedContribution> {
  const sourceDir = isAbsolute(contribution.sourceDir)
    ? contribution.sourceDir
    : resolve(rootDir, contribution.sourceDir)

  return normalizeContribution(contribution, sourceDir, sourceDir)
}

function mergeSkipped(entries: SkillManifestSkipped[], keyFn: (e: SkillManifestSkipped) => string): SkillManifestSkipped[] {
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

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-skill-hub',
    version: PACKAGE_VERSION,
    configKey: 'skillHub',
    compatibility: {
      nuxt: '>=4.3.0',
    },
  },
  async onInstall(nuxt) {
    await runInstallWizard(nuxt)
  },
  defaults: {
    skillName: '',
    targets: [],
    moduleAuthoring: false,
  },
  async setup(options, nuxt) {
    const logger = useLogger('nuxt-skill-hub')

    if (isCI && !isTest) {
      logger.info('Skipping skill generation in CI')
      return
    }

    if (nuxt.options._prepare) {
      return
    }

    const configuredSkillName = options.skillName?.trim()
    let resolvedSkillName: string

    if (configuredSkillName && isValidSkillName(configuredSkillName)) {
      resolvedSkillName = configuredSkillName
    }
    else {
      if (configuredSkillName) {
        logger.warn(`Invalid skillHub.skillName "${configuredSkillName}". Deriving from package.json.`)
      }
      resolvedSkillName = await deriveSkillName(nuxt.options.rootDir)
    }

    nuxt.hook('modules:done', async () => {
      const exportRoot = await resolveExportRoot(nuxt.options.rootDir)
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

      const discoveredContributions = await resolveContributions(discoveries)
      const distResolvedPackages = new Set(discoveredContributions.contributions.map(item => item.packageName))

      const remoteIssues: ValidationIssue[] = []
      const remoteSkipped: SkillManifestSkipped[] = []
      const remoteContributions: ResolvedContribution[] = []
      const remoteCacheRoot = join(nuxt.options.rootDir, '.nuxt', 'skill-hub-cache')
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
      const issuesToSkipped = mergeSkipped(
        validationIssues.map(i => ({ packageName: i.packageName, skillName: i.skillName, reason: i.reason, sourceKind: i.sourceKind })),
        e => `${e.packageName}::${e.skillName}`,
      )
      const skipped = mergeSkipped(
        [...issuesToSkipped, ...remoteSkipped],
        e => `${e.packageName}::${e.skillName}::${e.sourceKind || ''}`,
      )

      for (const issue of validationIssues) {
        logger.warn(`[validation] ${issue.packageName}/${issue.skillName}: ${issue.reason}`)
      }

      const { targets, invalidTargets } = resolveTargets(options.targets || [])

      for (const invalidTarget of invalidTargets) {
        if (invalidTarget.reason === 'unknown-target') {
          logger.warn(`Target "${invalidTarget.target}" is unknown in unagent and was skipped.`)
          continue
        }
        logger.warn(`Target "${invalidTarget.target}" has no skillsDir in unagent and was skipped.`)
      }

      if (!targets.length) {
        logger.warn('No detected targets. Set skillHub.targets to force generation for specific agents.')
        return
      }

      for (const conflict of detectConflictingSkills(targets, resolvedSkillName)) {
        logger.warn(formatConflictWarning(conflict))
      }

      const nuxtMetadata = await loadNuxtMetadata()

      for (let targetIdx = 0; targetIdx < targets.length; targetIdx++) {
        const target = targets[targetIdx]
        const { skillRoot } = getTargetSkillRoot(exportRoot, target, resolvedSkillName)
        const referencesRoot = join(skillRoot, 'references')
        const nuxtRoot = join(referencesRoot, 'nuxt')
        const vueRoot = join(referencesRoot, 'vue')
        const modulesRoot = join(referencesRoot, 'modules')

        await emptyDir(skillRoot)
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

        if (targetIdx === 0)
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
          const entryPath = relative(skillRoot, join(destination, 'SKILL.md'))

          generatedEntries.push({
            packageName: contribution.packageName,
            version: contribution.version,
            skillName: contribution.skillName,
            entryPath,
            sourceDir: contribution.sourceDir,
            destination: (relative(skillRoot, destination)),
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

        await writeFileIfChanged(join(skillRoot, 'SKILL.md'), createSkillEntrypoint(
          resolvedSkillName,
          nuxtMetadata,
          monorepoScopePath,
          Boolean(options.moduleAuthoring),
          generatedEntries,
          skipped,
        ))

        logger.success(`Generated ${resolvedSkillName} skill at ${(skillRoot)}`)
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
