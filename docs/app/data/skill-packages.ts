export type SkillAvailability = 'real' | 'generated' | 'unavailable'

export function resolveSkillAvailability(packageName: string, repoUrl?: string, docsUrl?: string): SkillAvailability {
  // 'real' is now determined server-side via dynamic discovery.
  // Client-side fallback only resolves generated vs unavailable.
  if (repoUrl || docsUrl) return 'generated'
  return 'unavailable'
}
