const REPO = 'onmax/nuxt-skills'
const BRANCH = 'main'
const CACHE_TTL = 1000 * 60 * 60 // 1h

// Module ID → skill folder name in the repo
const MODULE_SKILL_MAP: Record<string, string> = {
  'nuxt-ui': 'nuxt-ui',
  'nuxt-content': 'nuxt-content',
  'nuxthub': 'nuxthub',
  'nuxt-seo': 'nuxt-seo',
  'reka-ui': 'reka-ui',
  'motion': 'motion',
}

const EXCLUDED_DIRS = new Set(['scripts', 'node_modules', '.git'])

interface GitHubTreeItem {
  path: string
  type: 'blob' | 'tree'
  sha: string
  url: string
}

interface CacheEntry {
  paths: string[]
  files: Record<string, string>
  at: number
}

const cache = new Map<string, CacheEntry>()

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

async function fetchModuleSkillIndex(moduleId: string): Promise<CacheEntry> {
  const skillName = MODULE_SKILL_MAP[moduleId]
  if (!skillName) {
    return { paths: [], files: {}, at: Date.now() }
  }

  const cached = cache.get(moduleId)
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return cached
  }

  const entry: CacheEntry = {
    paths: await fetchSkillTree(skillName),
    files: {},
    at: Date.now(),
  }
  cache.set(moduleId, entry)
  return entry
}

async function fetchModuleSkillFile(moduleId: string, filePath: string): Promise<string | null> {
  const skillName = MODULE_SKILL_MAP[moduleId]
  if (!skillName) {
    return null
  }

  const entry = await fetchModuleSkillIndex(moduleId)
  if (!entry.paths.includes(filePath)) {
    return null
  }

  if (entry.files[filePath]) {
    return entry.files[filePath]
  }

  try {
    const content = await fetchFileContent(skillName, filePath)
    entry.files[filePath] = content
    entry.at = Date.now()
    cache.set(moduleId, entry)
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

  if (!moduleId || !MODULE_SKILL_MAP[moduleId]) {
    return { files: {}, paths: [], availableModules: Object.keys(MODULE_SKILL_MAP) }
  }

  if (filePath) {
    const content = await fetchModuleSkillFile(moduleId, filePath)
    return { path: filePath, content }
  }

  const entry = await fetchModuleSkillIndex(moduleId)
  return { files: {}, paths: entry.paths }
})
