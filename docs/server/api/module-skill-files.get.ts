import { getSkillFolders, resolveSkillFolder } from '../utils/skill-discovery'

const REPO = 'onmax/nuxt-skills'
const BRANCH = 'main'
const EXCLUDED_DIRS = new Set(['scripts', 'node_modules', '.git'])

interface GitHubTreeItem { path: string, type: 'blob' | 'tree', sha: string, url: string }
interface CacheEntry { paths: string[], files: Record<string, string>, at: number }

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 1000 * 60 * 60 // 1h

async function fetchFileContent(skillName: string, filePath: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/skills/${skillName}/${filePath}`
  return await $fetch<string>(url, { responseType: 'text' })
}

async function fetchSkillTree(skillName: string): Promise<string[]> {
  const url = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`
  const data = await $fetch<{ tree: GitHubTreeItem[] }>(url)
  const prefix = `skills/${skillName}/`
  return data.tree
    .filter(item => item.type === 'blob' && item.path.startsWith(prefix))
    .map(item => item.path.slice(prefix.length))
    .filter(p => !EXCLUDED_DIRS.has(p.split('/')[0]!) && (p.endsWith('.md') || p.endsWith('.json')))
}

async function fetchModuleSkillIndex(skillName: string): Promise<CacheEntry> {
  const cached = cache.get(skillName)
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached

  const entry: CacheEntry = { paths: await fetchSkillTree(skillName), files: {}, at: Date.now() }
  cache.set(skillName, entry)
  return entry
}

async function fetchModuleSkillFile(skillName: string, filePath: string): Promise<string | null> {
  const entry = await fetchModuleSkillIndex(skillName)
  if (!entry.paths.includes(filePath)) return null
  if (entry.files[filePath]) return entry.files[filePath]

  try {
    const content = await fetchFileContent(skillName, filePath)
    entry.files[filePath] = content
    entry.at = Date.now()
    cache.set(skillName, entry)
    return content
  }
  catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const moduleId = query.module as string
  const filePath = query.path as string | undefined

  if (!moduleId) {
    return { files: {}, paths: [] }
  }

  // Resolve module ID → skill folder dynamically
  const skillFolders = await getSkillFolders()
  const skillName = resolveSkillFolder(moduleId, skillFolders)
  if (!skillName) {
    return { files: {}, paths: [] }
  }

  if (filePath) {
    const content = await fetchModuleSkillFile(skillName, filePath)
    return { path: filePath, content }
  }

  const entry = await fetchModuleSkillIndex(skillName)
  return { files: {}, paths: entry.paths }
})
