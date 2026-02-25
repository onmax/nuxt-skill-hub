export default defineNuxtConfig({
  modules: [
    'nuxt-skill-hub',
    '@nuxt/ui',
    '@nuxthub/core',
    '@onmax/nuxt-better-auth',
  ],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    betterAuthSecret: 'dev-secret-for-playground-minimum-32-characters',
    public: {
      siteUrl: 'http://localhost:3000',
    },
  },
  compatibilityDate: 'latest',
  auth: {
    clientOnly: true,
  },
  skillHub: {
    targetMode: 'explicit',
    targets: ['claude-code'],
  },
})
