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
  discoverLocalPackageSkills,
  discoverPackageSkillsFromSpecifier,
  emptyDir,
  ensureDir,
  extractModuleSpecifier,
  getTargetSkillRoot,
  pathExists,
  renderAutomdTemplate,
  resolveContributions,
  resolveTargets,
  shouldIncludeScripts,
  sortAndDedupeContributions,
  upsertAgentsHint,
  writeFileIfChanged,
} from './internal'
import type {
  ModuleOptions,
  ResolvedContribution,
  SkillHubContribution,
  SkillHubContributionContext,
} from './types'

function toPosix(path: string): string {
  return path.split(sep).join('/')
}

async function resolveManualContribution(rootDir: string, contribution: SkillHubContribution): Promise<ResolvedContribution | null> {
  const sourceDir = isAbsolute(contribution.sourceDir)
    ? contribution.sourceDir
    : resolve(rootDir, contribution.sourceDir)

  if (!(await pathExists(join(sourceDir, 'SKILL.md')))) {
    return null
  }

  return {
    packageName: contribution.packageName,
    version: contribution.version,
    sourceDir,
    sourceRoot: sourceDir,
    skillName: contribution.skillName,
  }
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
    includeScripts: 'never',
    scriptAllowlist: [],
    writeAgentsHint: false,
  },
  async setup(options, nuxt) {
    if (!options.enabled) {
      return
    }

    const logger = useLogger('nuxt-skill-hub')

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

      if (options.discoverDependencySkills) {
        const moduleSpecifiers = (nuxt.options.modules || [])
          .map(entry => extractModuleSpecifier(entry))
          .filter((entry): entry is string => Boolean(entry))

        const seenSpecifiers = Array.from(new Set(moduleSpecifiers))
        for (const specifier of seenSpecifiers) {
          const discovered = await discoverPackageSkillsFromSpecifier(specifier, nuxt.options.rootDir)
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

      const resolvedManual = (
        await Promise.all(
          manualContributions.map(contribution => resolveManualContribution(nuxt.options.rootDir, contribution)),
        )
      ).filter((entry): entry is ResolvedContribution => Boolean(entry))

      const contributions = sortAndDedupeContributions([
        ...discoveredContributions,
        ...resolvedManual,
      ])

      const targets = resolveTargets(
        options.targetMode || 'detected',
        options.targets || [],
      )

      if (!targets.length) {
        logger.warn('No detected targets. Set skillHub.targetMode="explicit" with skillHub.targets to force export.')
        return
      }

      const generatedAt = new Date().toISOString()

      for (const target of targets) {
        const { targetDir, skillRoot } = getTargetSkillRoot(nuxt.options.rootDir, target, options.skillName || 'nuxt')
        const referencesRoot = join(skillRoot, 'references')
        const coreRoot = join(referencesRoot, 'core')
        const modulesRoot = join(referencesRoot, 'modules')

        await emptyDir(skillRoot)
        await ensureDir(coreRoot)
        await ensureDir(modulesRoot)

        await writeFileIfChanged(join(skillRoot, 'SKILL.md'), createSkillEntrypoint(options.skillName || 'nuxt'))

        const coreTemplateFiles = buildCoreTemplateFiles(coreRoot)
        for (const file of coreTemplateFiles) {
          await writeFileIfChanged(file.path, file.contents)
        }

        const coreIndexTemplatePath = join(coreRoot, 'index.template.md')
        const coreIndexTemplate = await pathExists(coreIndexTemplatePath)
          ? await fsp.readFile(coreIndexTemplatePath, 'utf8')
          : ''
        const coreIndexContent = await renderAutomdTemplate(coreIndexTemplate, coreRoot)
        await writeFileIfChanged(join(coreRoot, 'index.md'), coreIndexContent)

        const generatedEntries: Array<{
          packageName: string
          version?: string
          skillName: string
          sourceDir: string
          destination: string
          scriptsIncluded: boolean
        }> = []

        for (const contribution of contributions) {
          const includeScripts = shouldIncludeScripts(
            options.includeScripts || 'never',
            options.scriptAllowlist || [],
            contribution.packageName,
          )

          const destination = createModuleDestination(modulesRoot, contribution)
          await copySkillTree(contribution.sourceDir, destination, includeScripts)

          generatedEntries.push({
            packageName: contribution.packageName,
            version: contribution.version,
            skillName: contribution.skillName || 'skill',
            sourceDir: contribution.sourceDir,
            destination: toPosix(relative(skillRoot, destination)),
            scriptsIncluded: includeScripts,
          })
        }

        const modulesListPath = join(modulesRoot, '_list.md')
        await writeFileIfChanged(modulesListPath, createModulesListMarkdown(generatedEntries))

        const referencesIndexTemplate = createReferencesIndexTemplate()
        const referencesIndexTemplatePath = join(referencesRoot, 'index.template.md')
        await writeFileIfChanged(referencesIndexTemplatePath, referencesIndexTemplate)
        const renderedIndex = await renderAutomdTemplate(referencesIndexTemplate, referencesRoot)
        await writeFileIfChanged(join(referencesRoot, 'index.md'), renderedIndex)

        const manifest = createManifest(
          generatedAt,
          options.skillName || 'nuxt',
          target,
          toPosix(targetDir),
          generatedEntries,
        )
        await writeFileIfChanged(join(skillRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

        logger.success(`Generated ${options.skillName || 'nuxt'} skill at ${toPosix(skillRoot)}`)
      }

      if (options.writeAgentsHint) {
        await upsertAgentsHint(nuxt.options.rootDir, options.skillName || 'nuxt')
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
