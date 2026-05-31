import { getSkillFolders, resolveSkillFolder } from '../utils/skill-discovery'
import type { SkillAvailability } from '../../app/data/skill-packages'
import { resolveMetadataRouterSkillName } from '~~/shared/skill-preview'

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
  skillName: string
  type: string
}

let cachedModules: NuxtModuleResult[] | null = null
let cachedAt = 0
const CACHE_TTL = 1000 * 60 * 60 // 1 hour

function resolveSkill(npm: string, skillFolders: Set<string>, github?: string, website?: string): { availability: SkillAvailability, skillName: string } {
  const realSkillName = resolveSkillFolder(npm, skillFolders)
  if (realSkillName) return { availability: 'real', skillName: realSkillName }
  if (github || website) return { availability: 'generated', skillName: resolveMetadataRouterSkillName(npm) }
  return { availability: 'unavailable', skillName: resolveMetadataRouterSkillName(npm) }
}

export default defineEventHandler(async () => {
  if (cachedModules && Date.now() - cachedAt < CACHE_TTL) {
    return { modules: cachedModules }
  }

  const [data, skillFolders] = await Promise.all([
    $fetch<{ modules: NuxtApiModule[] }>('https://api.nuxt.com/modules'),
    getSkillFolders(),
  ])

  cachedModules = data.modules.map((m) => {
    const resolved = resolveSkill(m.npm, skillFolders, m.github, m.website)
    return {
      name: m.name,
      npm: m.npm,
      description: m.description,
      icon: m.icon,
      downloads: m.stats?.downloads ?? 0,
      stars: m.stats?.stars ?? 0,
      github: m.github,
      website: m.website,
      skillAvailability: resolved.availability,
      skillName: resolved.skillName,
      type: m.type,
    }
  })
  cachedAt = Date.now()

  return { modules: cachedModules }
})
