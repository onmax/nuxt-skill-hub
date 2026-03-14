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

async function fetchModuleSkillFiles(moduleId: string): Promise<Record<string, string>> {
  const skillName = MODULE_SKILL_MAP[moduleId]
  if (!skillName) return {}

  const cached = cache.get(moduleId)
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.files

  const paths = await fetchSkillTree(skillName)
  const files: Record<string, string> = {}
  // Fetch in parallel with concurrency limit
  const chunks = []
  for (let i = 0; i < paths.length; i += 10) {
    chunks.push(paths.slice(i, i + 10))
  }
  for (const chunk of chunks) {
    const results = await Promise.all(chunk.map(async (p) => {
      try { return [p, await fetchFileContent(skillName, p)] as const }
      catch { return null }
    }))
    for (const r of results) { if (r) files[r[0]] = r[1] }
  }

  cache.set(moduleId, { files, at: Date.now() })
  return files
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const moduleId = query.module as string
  if (!moduleId || !MODULE_SKILL_MAP[moduleId]) {
    return { files: {}, availableModules: Object.keys(MODULE_SKILL_MAP) }
  }

  const files = await fetchModuleSkillFiles(moduleId)
  return { files }
})
