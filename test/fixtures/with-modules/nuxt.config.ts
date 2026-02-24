import SkillHubModule from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    SkillHubModule,
    'test-nuxt-ui',
    'test-nuxt-seo',
  ],
  skillHub: {
    targetMode: 'explicit',
    targets: ['github-copilot'],
    includeScripts: 'allowlist',
    scriptAllowlist: ['test-nuxt-seo'],
  },
})
