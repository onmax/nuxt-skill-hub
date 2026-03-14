import { loadNuxtMetadata, loadNuxtRuleFiles } from '../utils/nuxt-content'
import { loadVueSkillFiles } from '../utils/vue-content'
import { createSkillEntrypoint } from '~~/shared/skill-preview'

export default defineEventHandler(async () => {
  const nuxtFiles = Object.entries(await loadNuxtRuleFiles())
    .sort((a, b) => a[0].localeCompare(b[0]))
  const vueFiles = Object.entries(await loadVueSkillFiles())
    .sort((a, b) => a[0].localeCompare(b[0]))
  const metadata = await loadNuxtMetadata()

  const skillEntrypoint = createSkillEntrypoint('nuxt', metadata)
  return {
    metadata,
    skillEntrypoint,
    nuxtFiles: Object.fromEntries(nuxtFiles),
    vueFiles: Object.fromEntries(vueFiles),
  }
})
