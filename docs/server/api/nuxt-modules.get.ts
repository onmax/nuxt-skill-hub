import { getSkillFolders, resolveSkillFolder } from '../utils/skill-discovery'
import type { SkillAvailability } from '../../app/data/skill-packages'

interface NuxtApiModule {
  name: string
  npm: string
  description: string
  icon: string
  github?: string
  website?: string
  category: string
  type: string
  stats: { downloads: number, stars: number }
}

export interface NuxtModuleResult {
  name: string
  npm: string
  description: string
  icon: string
  downloads: number
  stars: number
  github?: string
  website?: string
  skillAvailability: SkillAvailability
  type: string
}

let cachedModules: NuxtModuleResult[] | null = null
let cachedAt = 0
const CACHE_TTL = 1000 * 60 * 60 // 1 hour

function resolveAvailability(npm: string, skillFolders: Set<string>, github?: string, website?: string): SkillAvailability {
  if (resolveSkillFolder(npm, skillFolders)) return 'real'
  if (github || website) return 'generated'
  return 'unavailable'
}

export default defineEventHandler(async () => {
  if (cachedModules && Date.now() - cachedAt < CACHE_TTL) {
    return { modules: cachedModules }
  }

  const [data, skillFolders] = await Promise.all([
    $fetch<{ modules: NuxtApiModule[] }>('https://api.nuxt.com/modules'),
    getSkillFolders(),
  ])

  cachedModules = data.modules.map(m => ({
    name: m.name,
    npm: m.npm,
    description: m.description,
    icon: m.icon,
    downloads: m.stats?.downloads ?? 0,
    stars: m.stats?.stars ?? 0,
    github: m.github,
    website: m.website,
    skillAvailability: resolveAvailability(m.npm, skillFolders, m.github, m.website),
    type: m.type,
  }))
  cachedAt = Date.now()

  return { modules: cachedModules }
})
