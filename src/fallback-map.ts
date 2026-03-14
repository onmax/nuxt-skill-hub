export const FALLBACK_REPO = 'onmax/nuxt-skills'
export const FALLBACK_REF = 'main'

export interface FallbackMapEntry {
  packageName: string
  skillName: string
  path: string
}

const FALLBACK_MAP: FallbackMapEntry[] = [
  {
    packageName: 'nuxt',
    skillName: 'nuxt',
    path: 'skills/nuxt',
  },
  {
    packageName: '@nuxt/ui',
    skillName: 'nuxt-ui',
    path: 'skills/nuxt-ui',
  },
  {
    packageName: '@nuxt/content',
    skillName: 'nuxt-content',
    path: 'skills/nuxt-content',
  },
  {
    packageName: 'nuxt-seo',
    skillName: 'nuxt-seo',
    path: 'skills/nuxt-seo',
  },
  {
    packageName: '@nuxtjs/seo',
    skillName: 'nuxt-seo',
    path: 'skills/nuxt-seo',
  },
  {
    packageName: '@onmax/nuxt-better-auth',
    skillName: 'nuxt-better-auth',
    path: 'skills/nuxt-better-auth',
  },
  {
    packageName: '@nuxthub/core',
    skillName: 'nuxthub',
    path: 'skills/nuxthub',
  },
  {
    packageName: 'reka-ui',
    skillName: 'reka-ui',
    path: 'skills/reka-ui',
  },
  {
    packageName: 'reka-ui/nuxt',
    skillName: 'reka-ui',
    path: 'skills/reka-ui',
  },
  {
    packageName: '@vueuse/core',
    skillName: 'vueuse',
    path: 'skills/vueuse',
  },
  {
    packageName: '@vueuse/nuxt',
    skillName: 'vueuse',
    path: 'skills/vueuse',
  },
  {
    packageName: 'motion-v',
    skillName: 'motion',
    path: 'skills/motion',
  },
  {
    packageName: 'motion-v/nuxt',
    skillName: 'motion',
    path: 'skills/motion',
  },
  {
    packageName: 'nuxt-studio',
    skillName: 'nuxt-studio',
    path: 'skills/nuxt-studio',
  },
  {
    packageName: 'vue',
    skillName: 'vue',
    path: 'skills/vue',
  },
]

export function findFallbackMapEntry(packageName: string): FallbackMapEntry | undefined {
  return FALLBACK_MAP.find(entry => entry.packageName === packageName)
}
