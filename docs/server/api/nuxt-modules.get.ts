import { resolveSkillAvailability, type SkillAvailability } from '../../app/data/skill-packages'

// Packages with skills available (mirror of app/data/skill-packages.ts)
const SKILL_PACKAGES = new Set([
  'nuxt', '@nuxt/ui', '@nuxt/content', 'nuxt-seo', '@nuxtjs/seo',
  '@onmax/nuxt-better-auth', '@nuxthub/core', 'reka-ui', 'reka-ui/nuxt',
  '@vueuse/core', '@vueuse/nuxt', 'motion-v', 'motion-v/nuxt',
  'nuxt-studio', 'vue',
])

interface NuxtApiModule {
  name: string
  npm: string
  description: string
  icon: string
  github?: string
  website?: string
  category: string
  type: string
  stats: { downloads: number, stars: number }
}

export interface NuxtModuleResult {
  name: string
  npm: string
  description: string
  icon: string
  downloads: number
  github?: string
  website?: string
  skillAvailability: SkillAvailability
  type: string
}

let cachedModules: NuxtModuleResult[] | null = null
let cachedAt = 0
const CACHE_TTL = 1000 * 60 * 60 // 1 hour

export default defineEventHandler(async () => {
  if (cachedModules && Date.now() - cachedAt < CACHE_TTL) {
    return { modules: cachedModules }
  }

  const data = await $fetch<{ modules: NuxtApiModule[] }>('https://api.nuxt.com/modules')

  cachedModules = data.modules.map(m => ({
    name: m.name,
    npm: m.npm,
    description: m.description,
    icon: m.icon,
    downloads: m.stats?.downloads ?? 0,
    github: m.github,
    website: m.website,
    skillAvailability: SKILL_PACKAGES.has(m.npm)
      ? 'real'
      : resolveSkillAvailability(m.npm, m.github, m.website),
    type: m.type,
  }))
  cachedAt = Date.now()

  return { modules: cachedModules }
})
