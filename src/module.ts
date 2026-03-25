import { defineNuxtModule, useLogger } from '@nuxt/kit'
import { isCI, isTest } from 'std-env'
import { ensureStableSkillWrappers, generateSkillTree } from './generator'
import { resolveExportRoot, deriveSkillName, detectConflictingSkills, formatConflictWarning, isValidSkillName, resolveTargets } from './internal'
import { PACKAGE_VERSION } from './package-info'
import { runInstallWizard } from './install'
import { DEFAULT_SKILL_HUB_GENERATION_MODE, normalizeGenerationMode } from './types'
import type { ModuleOptions, SkillHubContributionContext } from './types'

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
    generationMode: DEFAULT_SKILL_HUB_GENERATION_MODE,
  },
  async setup(options, nuxt) {
    const logger = useLogger('nuxt-skill-hub')

    if (isCI && !isTest) {
      logger.info('Skipping skill generation in CI')
      return
    }

    if (process.argv.slice(2).includes('typecheck')) {
      logger.info('Skipping skill generation during typecheck')
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

    const exportRoot = await resolveExportRoot(nuxt.options.rootDir)
    const rawGenerationMode = options.generationMode
    const generationMode = normalizeGenerationMode(rawGenerationMode)
    const { targets, invalidTargets } = resolveTargets(options.targets || [])

    if (rawGenerationMode && rawGenerationMode !== generationMode) {
      logger.warn(`Invalid skillHub.generationMode "${rawGenerationMode}". Falling back to "prepare".`)
    }
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

    await ensureStableSkillWrappers({
      rootDir: nuxt.options.rootDir,
      exportRoot,
      buildDir: nuxt.options.buildDir,
      skillName: resolvedSkillName,
      targets,
      generationMode,
    })

    for (const conflict of detectConflictingSkills(targets, resolvedSkillName)) {
      logger.warn(formatConflictWarning(conflict))
    }

    if (generationMode === 'manual') {
      return
    }

    const runGeneration = async () => {
      await generateSkillTree({
        nuxt,
        logger,
        options,
        skillName: resolvedSkillName,
        exportRoot,
        generationMode,
      })
    }

    if (generationMode !== 'prepare' || !nuxt.options._prepare) {
      return
    }

    nuxt.hook('prepare:types', runGeneration)
  },
})

export type { ModuleOptions, SkillHubContribution, SkillHubContributionContext } from './types'
export type { SkillHubTarget } from './agents'

declare module '@nuxt/schema' {
  interface NuxtHooks {
    'skill-hub:contribute': (ctx: SkillHubContributionContext) => void | Promise<void>
  }
}
