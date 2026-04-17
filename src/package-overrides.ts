export interface PackageOverride {
  packageName: string
  repo?: string
  ref?: string
  path?: string
  skillName?: string
  docsUrls?: string[]
}

export const PACKAGE_OVERRIDES: PackageOverride[] = [
  {
    packageName: '@nuxt/ui',
    repo: 'nuxt/ui',
    ref: 'v4',
    path: 'skills/nuxt-ui',
    skillName: 'nuxt-ui',
  },
  {
    packageName: '@vueuse/core',
    repo: 'vueuse/vueuse',
    ref: 'main',
    path: 'skills/vueuse-functions',
    skillName: 'vueuse-functions',
  },
  {
    packageName: 'docus',
    repo: 'nuxt-content/docus',
    docsUrls: ['https://docus.dev/'],
  },
]

export function findPackageOverride(packageName: string): PackageOverride | undefined {
  return PACKAGE_OVERRIDES.find(entry => entry.packageName === packageName)
}
