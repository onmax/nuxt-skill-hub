export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@vueuse/nuxt', 'motion-v/nuxt', '@nuxtjs/mdc'],
  app: {
    head: {
      title: 'nuxt-skill-hub — Teach your AI agent the Nuxt way.',
      meta: [
        { name: 'description', content: 'Install one module. Your agent gets Nuxt best practices, module APIs, and project-specific guidance before it changes your code.' },
        { property: 'og:title', content: 'nuxt-skill-hub — Teach your AI agent the Nuxt way.' },
        { property: 'og:description', content: 'Install one module. Your agent gets Nuxt best practices, module APIs, and project-specific guidance before it changes your code.' },
        { property: 'og:image', content: 'https://nuxt-skill.onmax.me/og-image.png' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: 'https://nuxt-skill.onmax.me/og-image.png' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap' },
      ],
    },
  },
  css: ['~/assets/css/main.css'],
  colorMode: { preference: 'system' },
  compatibilityDate: '2025-01-01',
  icon: {
    customCollections: [{
      prefix: 'skill-logos',
      dir: './app/assets/icons',
    }],
  },
})
