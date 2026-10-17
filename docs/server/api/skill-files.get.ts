import { loadNuxtRuleFiles } from '../utils/nuxt-content'
import { loadVueSkillFiles } from '../utils/vue-content'
import { discoverModuleSkills } from '../utils/skill-discovery'
import { createSkillEntrypoint, DEFAULT_NUXT_CONTENT_METADATA } from '~~/shared/skill-preview'

export default defineEventHandler(async () => {
  const metadata = DEFAULT_NUXT_CONTENT_METADATA
  const [nuxtFilesRaw, vueFilesRaw, discovery] = await Promise.all([
    loadNuxtRuleFiles(),
    loadVueSkillFiles(),
    discoverModuleSkills(),
  ])

  const nuxtFiles = Object.fromEntries(
    Object.entries(nuxtFilesRaw).sort((a, b) => a[0].localeCompare(b[0])),
  )
  const vueFiles = Object.fromEntries(
    Object.entries(vueFilesRaw).sort((a, b) => a[0].localeCompare(b[0])),
  )

  return {
    metadata,
    skillEntrypoint: createSkillEntrypoint('nuxt', metadata),
    nuxtFiles,
    vueFiles,
    moduleSkills: discovery.moduleSkills,
    skillFolders: [...discovery.skillFolders],
  }
})
