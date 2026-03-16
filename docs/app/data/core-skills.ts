export interface CoreSkill {
  id: string
  title: string
  description: string
  icon: string
  tag: string
  links?: { label: string, href: string }[]
}

export const coreSkills: CoreSkill[] = [
  { id: 'always-on-index', title: 'Always-on Index', description: 'Keeps agents aligned with your Nuxt version and installed modules before they dive deeper', icon: 'i-lucide-compass', tag: 'core' },
  { id: 'disambiguation-packs', title: 'Disambiguation Packs', description: 'Focused Nuxt packs help agents pick the right framework API before they fall back to generic Vue patterns', icon: 'i-lucide-layers-3', tag: 'core', links: [{ label: 'Nuxt best practices', href: 'https://github.com/onmax/nuxt-skill-hub/tree/main/nuxt-best-practices' }] },
  { id: 'vue-guidance', title: 'Vue Guidance', description: 'A sibling Vue skill covers SFC structure, reactivity, props/emits, and composables after the Nuxt decision is settled', icon: 'i-lucide-file-code-2', tag: 'core', links: [{ label: 'Vue skill', href: 'https://github.com/vuejs-ai/skills/tree/main/skills/vue-best-practices' }] },
  { id: 'ssr-server', title: 'Server & SSR', description: 'Data fetching, hydration safety, runtime config, Nitro, and request boundaries where Nuxt-specific mistakes compound quickly', icon: 'i-lucide-server', tag: 'core' },
  { id: 'module-authored', title: 'Module Skills', description: 'Each module adds scoped guidance on top of the Nuxt packs instead of replacing broad framework rules', icon: 'i-lucide-puzzle', tag: 'modules' },
  { id: 'static-routing', title: 'Static Upstream Routing', description: 'When a module lacks a shipped skill, generated wrappers route agents to official docs and repo links', icon: 'i-lucide-link', tag: 'meta' },
]
