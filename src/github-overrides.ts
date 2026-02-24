export interface GitHubOverride {
  packageName: string
  repo?: string
  ref?: string
  path?: string
  skillName?: string
}

export const GITHUB_OVERRIDES: GitHubOverride[] = [
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
