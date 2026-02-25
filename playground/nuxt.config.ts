export default defineNuxtConfig({
  modules: ['nuxt-skill-hub'],
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  skillHub: {
    targetMode: 'explicit',
    targets: ['claude-code'],
  },
})
