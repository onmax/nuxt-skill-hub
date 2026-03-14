export interface CoreSkill {
  id: string
  title: string
  description: string
  icon: string
  tag: string
}

export const coreSkills: CoreSkill[] = [
  { id: 'always-on-index', title: 'Always-on Index', description: 'A tiny Nuxt decision layer stays in context so agents choose the right abstraction before opening deeper packs', icon: 'i-lucide-compass', tag: 'core' },
  { id: 'disambiguation-packs', title: 'Disambiguation Packs', description: 'High-priority packs for meta vs head, content modeling, error surfaces, Nuxt UI primitives, and finish checks', icon: 'i-lucide-layers-3', tag: 'core' },
  { id: 'ssr-server', title: 'Server & SSR', description: 'Data fetching, hydration safety, runtime config, Nitro, and request boundaries where Nuxt-specific mistakes compound quickly', icon: 'i-lucide-server', tag: 'core' },
  { id: 'content-ui', title: 'Content & UI', description: 'Nuxt Content and Nuxt UI guidance that steers agents away from hand-built lookalikes and stale API shapes', icon: 'i-lucide-layout-template', tag: 'safety' },
  { id: 'module-authored', title: 'Module Delta Skills', description: 'Each module adds scoped guidance on top of the Nuxt core packs instead of replacing broad framework rules', icon: 'i-lucide-puzzle', tag: 'modules' },
  { id: 'static-routing', title: 'Static Upstream Routing', description: 'When a module lacks a shipped skill, generated wrappers route agents to official docs and repo links without MCP', icon: 'i-lucide-link', tag: 'meta' },
]
