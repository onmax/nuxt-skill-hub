export type SkillAvailability = 'real' | 'generated' | 'unavailable'

// Packages that currently resolve to real skills in the docs playground.
export const REAL_SKILL_PACKAGE_NAMES = new Set([
  'nuxt', '@nuxt/ui', '@nuxt/content', 'nuxt-seo', '@nuxtjs/seo',
  '@onmax/nuxt-better-auth', '@nuxthub/core', 'reka-ui', 'reka-ui/nuxt',
  '@vueuse/core', '@vueuse/nuxt', 'motion-v', 'motion-v/nuxt',
  'nuxt-studio',
])

export function hasRealSkill(packageName: string): boolean {
  return REAL_SKILL_PACKAGE_NAMES.has(packageName)
}

export function resolveSkillAvailability(packageName: string, repoUrl?: string, docsUrl?: string): SkillAvailability {
  if (hasRealSkill(packageName)) {
    return 'real'
  }

  if (repoUrl || docsUrl) {
    return 'generated'
  }

  return 'unavailable'
}
