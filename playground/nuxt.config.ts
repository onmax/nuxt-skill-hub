export default defineNuxtConfig({
  modules: [
    'nuxt-skill-hub',
    '@nuxt/ui',
    '@nuxthub/core',
    '@onmax/nuxt-better-auth',
  ],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  auth: {
    clientOnly: true,
  },
  runtimeConfig: {
    betterAuthSecret: 'dev-secret-for-playground-minimum-32-characters',
    public: {
      siteUrl: 'http://localhost:3000',
    },
  },
  skillHub: {
    targetMode: 'explicit',
    targets: ['claude-code'],
  },
})
