export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@vueuse/nuxt', 'motion-v/nuxt', '@nuxtjs/mdc', 'nuxt-og-image'],
  app: {
    head: {
      title: 'nuxt-skill-hub — Teach your AI agent Nuxt.',
      meta: [
        { name: 'description', content: 'Install one module. Your agent gets best practices, module APIs, and patterns for every Nuxt module in your project.' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap' },
      ],
    },
  },
  css: ['~/assets/css/main.css'],
  site: { url: 'https://nuxt-skill.onmax.me' },
  colorMode: { preference: 'system' },
  compatibilityDate: '2025-01-01',
  icon: {
    customCollections: [{
      prefix: 'skill-logos',
      dir: './app/assets/icons',
    }],
  },
  ogImage: {
    fonts: ['Geist:400', 'Geist:500', 'Geist:600', 'Geist:700', 'JetBrains+Mono:400', 'JetBrains+Mono:500', 'JetBrains+Mono:600', 'JetBrains+Mono:700'],
  } as any,
})
