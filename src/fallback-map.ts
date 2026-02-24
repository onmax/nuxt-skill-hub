export interface FallbackMapEntry {
  packageName: string
  skillName: string
  path: string
}

export const FALLBACK_MAP: FallbackMapEntry[] = [
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
