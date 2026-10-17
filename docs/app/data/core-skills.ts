export interface CoreSkill {
  id: string
  title: string
  description: string
  icon: string
  tag: string
  links?: { label: string, href: string }[]
}

export const coreSkills: CoreSkill[] = [
  { id: 'router', title: 'One Router Skill', description: 'A single SKILL.md sends each task to the smallest relevant guide, so agents read one pack instead of everything', icon: 'i-lucide-compass', tag: 'core' },
  { id: 'disambiguation', title: 'Nuxt Primitives First', description: 'Before editing, agents check whether Nuxt, Nuxt UI, or Nuxt Content already owns the surface instead of hand-rolling it', icon: 'i-lucide-layers-3', tag: 'core' },
  { id: 'rule-packs', title: 'Nuxt Rule Packs', description: 'Data fetching, hydration, page meta, errors, Nitro, plugins, and performance. Each rule says when it applies and how to verify it', icon: 'i-lucide-server', tag: 'core', links: [{ label: 'Browse the packs', href: 'https://github.com/onmax/nuxt-skill-hub/tree/main/nuxt-best-practices/rules' }] },
  { id: 'vue-guidance', title: 'Vue Guidance', description: 'A sibling Vue skill covers SFC structure, reactivity, props/emits, and composables once the Nuxt decision is settled', icon: 'i-lucide-file-code-2', tag: 'core', links: [{ label: 'Vue skill', href: 'https://github.com/vuejs-ai/skills/tree/main/skills/vue-best-practices' }] },
  { id: 'module-skills', title: 'Module Skills', description: 'Installed modules add their own skills from the package, its repository, or its docs site, scoped to that module', icon: 'i-lucide-puzzle', tag: 'modules' },
  { id: 'docs-routing', title: 'Docs Fallback', description: 'When a module ships no skill, a small generated router points agents to its official docs and source', icon: 'i-lucide-link', tag: 'meta' },
]
