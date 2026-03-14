import { resolveSkillAvailability, type SkillAvailability } from './skill-packages'

export interface SkillModule {
  id: string
  packageName: string
  label: string
  description?: string
  icon: string
  iconUrl?: string
  color?: string
  defaultEnabled: boolean
  skillAvailability: SkillAvailability
  repoUrl?: string
  docsUrl?: string
  locked?: boolean
  note?: string
  moduleType?: string
}

export interface SelectedModule {
  id: string
  packageName: string
  label: string
  description?: string
  icon: string
  iconUrl?: string
  color?: string
  enabled: boolean
  skillAvailability: SkillAvailability
  repoUrl?: string
  docsUrl?: string
  locked?: boolean
  note?: string
  moduleType?: string
}

const baseModules: Array<Omit<SkillModule, 'skillAvailability'>> = [
  { id: 'nuxt-ui', packageName: '@nuxt/ui', label: 'Nuxt UI', icon: 'i-skill-logos-nuxt-ui', color: 'text-green-400', defaultEnabled: true, moduleType: 'official' },
  { id: 'nuxt-content', packageName: '@nuxt/content', label: 'Nuxt Content', icon: 'i-skill-logos-nuxt-content', color: 'text-green-400', defaultEnabled: true, moduleType: 'official' },
  { id: 'nuxthub', packageName: '@nuxthub/core', label: 'NuxtHub', icon: 'i-skill-logos-nuxthub', color: 'text-yellow-400', defaultEnabled: false, moduleType: 'official' },
  { id: 'tailwindcss', packageName: 'tailwindcss', label: 'tailwindcss', icon: 'i-simple-icons-tailwindcss', color: 'text-sky-400', defaultEnabled: false, note: 'Uses generated router links when module skill content is missing', moduleType: 'official' },
]

export const modules: SkillModule[] = baseModules.map(m => ({
  ...m,
  skillAvailability: resolveSkillAvailability(m.packageName, m.repoUrl, m.docsUrl),
}))

export function moduleToSelected(m: SkillModule): SelectedModule {
  return {
    id: m.id,
    packageName: m.packageName,
    label: m.label,
    description: m.description,
    icon: m.icon,
    iconUrl: m.iconUrl,
    color: m.color,
    enabled: m.defaultEnabled,
    skillAvailability: m.skillAvailability,
    repoUrl: m.repoUrl,
    docsUrl: m.docsUrl,
    locked: m.locked,
    note: m.note,
    moduleType: m.moduleType,
  }
}

export const defaultSelectedModules: SelectedModule[] = modules.map(moduleToSelected)
