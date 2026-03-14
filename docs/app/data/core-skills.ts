export interface CoreSkill {
  id: string
  title: string
  description: string
  icon: string
  tag: string
}

export const coreSkills: CoreSkill[] = [
  { id: 'nuxt-patterns', title: 'Nuxt Patterns', description: 'Composable structure, directory conventions, lifecycle hooks - the full-stack patterns agents should follow', icon: 'i-lucide-check-circle', tag: 'core' },
  { id: 'ssr-server', title: 'Server & SSR', description: 'Server vs client isolation, Nitro, H3, API routes, runtime config - where secrets leak and agents get lost', icon: 'i-lucide-server', tag: 'core' },
  { id: 'footguns', title: 'Footguns & Migrations', description: 'SSR pitfalls, hydration mismatches, payload leaks, and safe upgrade paths for major transitions', icon: 'i-lucide-shield-alert', tag: 'safety' },
  { id: 'performance', title: 'Performance', description: 'Rendering strategies, lazy loading, cost-aware patterns - context-dependent choices', icon: 'i-lucide-zap', tag: 'optimization' },
  { id: 'module-authored', title: 'Module-authored', description: 'Each module ships its own skill, maintained by the author and version-matched to your install', icon: 'i-lucide-puzzle', tag: 'modules' },
  { id: 'zero-maintenance', title: 'Zero Maintenance', description: 'Auto-generated from your dependencies - no config files to write, no docs to commit', icon: 'i-lucide-sparkles', tag: 'meta' },
]
