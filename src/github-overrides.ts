export interface GitHubOverride {
  packageName: string
  repo?: string
  ref?: string
  path?: string
  skillName?: string
}

export const GITHUB_OVERRIDES: GitHubOverride[] = [
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
]

export function findGitHubOverride(packageName: string): GitHubOverride | undefined {
  return GITHUB_OVERRIDES.find(entry => entry.packageName === packageName)
}
