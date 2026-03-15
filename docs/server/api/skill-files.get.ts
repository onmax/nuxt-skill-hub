import { loadNuxtMetadata, loadNuxtRuleFiles } from '../utils/nuxt-content'
import { loadVueSkillFiles } from '../utils/vue-content'
import { createSkillEntrypoint } from '~~/shared/skill-preview'
import { MODULE_SKILL_MAP } from './module-skill-files.get'

const REPO = 'onmax/nuxt-skills'
const BRANCH = 'main'
const EXCLUDED_DIRS = new Set(['scripts', 'node_modules', '.git'])

interface GitHubTreeItem { path: string, type: 'blob' | 'tree', sha: string, url: string }

async function fetchAllModuleSkills(): Promise<Record<string, { skillName: string, paths: string[], files: Record<string, string> }>> {
  const treeUrl = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`
  let tree: GitHubTreeItem[]
  try {
    const data = await $fetch<{ tree: GitHubTreeItem[] }>(treeUrl)
    tree = data.tree
  }
  catch (error) {
    console.warn('Failed to fetch GitHub tree for module skills:', error)
    return {}
  }

  const result: Record<string, { skillName: string, paths: string[], files: Record<string, string> }> = {}
  const resolved = new Map<string, { paths: string[], files: Record<string, string> }>()

  for (const [moduleId, skillName] of Object.entries(MODULE_SKILL_MAP)) {
    if (resolved.has(skillName)) {
      const cached = resolved.get(skillName)!
      result[moduleId] = { skillName, ...cached }
      continue
    }

    const prefix = `skills/${skillName}/`
    const paths = tree
      .filter(item => item.type === 'blob' && item.path.startsWith(prefix))
      .map(item => item.path.slice(prefix.length))
      .filter(p => !EXCLUDED_DIRS.has(p.split('/')[0]!) && (p.endsWith('.md') || p.endsWith('.json')))

    if (!paths.length) {
      resolved.set(skillName, { paths: [], files: {} })
      continue
    }

    const files: Record<string, string> = {}
    if (paths.includes('SKILL.md')) {
      try {
        files['SKILL.md'] = await $fetch<string>(
          `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${prefix}SKILL.md`,
          { responseType: 'text' },
        )
      }
      catch { /* skip */ }
    }

    resolved.set(skillName, { paths, files })
    result[moduleId] = { skillName, paths, files }
  }

  return result
}

export default defineEventHandler(async () => {
  const [nuxtFilesRaw, vueFilesRaw, metadata, moduleSkills] = await Promise.all([
    loadNuxtRuleFiles(),
    loadVueSkillFiles(),
    loadNuxtMetadata(),
    fetchAllModuleSkills(),
  ])

  const nuxtFiles = Object.fromEntries(
    Object.entries(nuxtFilesRaw).sort((a, b) => a[0].localeCompare(b[0])),
  )
  const vueFiles = Object.fromEntries(
    Object.entries(vueFilesRaw).sort((a, b) => a[0].localeCompare(b[0])),
  )

  const skillEntrypoint = createSkillEntrypoint('nuxt', metadata)
  return {
    metadata,
    skillEntrypoint,
    nuxtFiles,
    vueFiles,
    moduleSkills,
  }
})
