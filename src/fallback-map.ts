export const FALLBACK_REPO = 'onmax/nuxt-skills'
export const FALLBACK_REF = 'main'

export interface FallbackMapEntry {
  packageName: string
  skillName: string
  path: string
}

const FALLBACK_MAP: FallbackMapEntry[] = [
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
    packageName: '@vueuse/core',
    skillName: 'vueuse',
    path: 'skills/vueuse',
  },
]

export function findFallbackMapEntry(packageName: string): FallbackMapEntry | undefined {
  return FALLBACK_MAP.find(entry => entry.packageName === packageName)
}
