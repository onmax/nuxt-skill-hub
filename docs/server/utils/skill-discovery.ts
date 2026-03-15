import { slugCandidates } from '../../../src/remote-resolver'

const REPO = 'onmax/nuxt-skills'
const BRANCH = 'main'
const CACHE_TTL = 1000 * 60 * 60 // 1h
const EXCLUDED_DIRS = new Set(['scripts', 'node_modules', '.git'])

interface GitHubTreeItem { path: string, type: 'blob' | 'tree' }
interface SkillDiscoveryResult {
  /** All skill folder names found in the repo */
  skillFolders: Set<string>
  /** Module skills keyed by skill folder name */
  moduleSkills: Record<string, { skillName: string, paths: string[], files: Record<string, string> }>
  /** npm packages that resolved to a real skill folder */
  realSkillPackages: Set<string>
}

let cached: { result: SkillDiscoveryResult, at: number } | null = null

async function fetchTree(): Promise<GitHubTreeItem[]> {
  const url = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`
  const data = await $fetch<{ tree: GitHubTreeItem[] }>(url)
  return data.tree
}

// Framework skill folders that should not match arbitrary scoped packages
const FRAMEWORK_SKILL_FOLDERS = new Set(['nuxt', 'vue', 'nuxt-modules', 'pnpm', 'vite'])

// Aliases for npm packages where slugCandidates convention doesn't produce the right skill folder.
// Only needed for gaps in the convention — keeps shrinking as slugCandidates improves.
const PACKAGE_ALIASES: Record<string, string> = {
  '@nuxtjs/seo': 'nuxt-seo',
  '@nuxtjs/mdc': 'nuxt-content',
  '@vueuse/nuxt': 'vueuse',
  'motion-v': 'motion',
  'motion-v/nuxt': 'motion',
  '@tresjs/core': 'tresjs',
  '@tresjs/nuxt': 'tresjs',
}

/**
 * Resolve a module ID or npm package name to a skill folder using the same
 * convention as the runtime resolver (`slugCandidates`), plus a direct match.
 * Excludes framework-level skill folders to prevent false positives
 * (e.g. `@ant-design-vue/nuxt` should NOT match the `nuxt` skill).
 */
export function resolveSkillFolder(nameOrPackage: string, skillFolders: Set<string>): string | null {
  // Explicit alias (covers convention gaps)
  const alias = PACKAGE_ALIASES[nameOrPackage]
  if (alias && skillFolders.has(alias)) return alias
  // Direct match (e.g. 'nuxt-ui' → 'nuxt-ui')
  if (skillFolders.has(nameOrPackage) && !FRAMEWORK_SKILL_FOLDERS.has(nameOrPackage)) return nameOrPackage
  // Convention-based match (e.g. '@nuxt/ui' → ['ui', 'nuxt-ui'] → 'nuxt-ui')
  for (const candidate of slugCandidates(nameOrPackage)) {
    if (skillFolders.has(candidate) && !FRAMEWORK_SKILL_FOLDERS.has(candidate)) return candidate
  }
  return null
}

/**
 * Discover all module skills from the GitHub repo at build time.
 * Caches for 1h. Returns skill folders, module data, and resolved package set.
 */
export async function discoverModuleSkills(npmPackages?: string[]): Promise<SkillDiscoveryResult> {
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.result

  let tree: GitHubTreeItem[]
  try {
    tree = await fetchTree()
  }
  catch (error) {
    console.warn('Failed to fetch GitHub tree for skill discovery:', error)
    return { skillFolders: new Set(), moduleSkills: {}, realSkillPackages: new Set() }
  }

  // Discover all skill folders
  const skillFolders = new Set<string>()
  for (const item of tree) {
    if (item.type === 'tree' && item.path.startsWith('skills/') && item.path.split('/').length === 2) {
      skillFolders.add(item.path.split('/')[1]!)
    }
  }

  // Build module skills for each folder
  const moduleSkills: SkillDiscoveryResult['moduleSkills'] = {}
  const fetches: Promise<void>[] = []

  for (const skillName of skillFolders) {
    const prefix = `skills/${skillName}/`
    const paths = tree
      .filter(item => item.type === 'blob' && item.path.startsWith(prefix))
      .map(item => item.path.slice(prefix.length))
      .filter(p => !EXCLUDED_DIRS.has(p.split('/')[0]!) && (p.endsWith('.md') || p.endsWith('.json')))

    if (!paths.length) continue

    moduleSkills[skillName] = { skillName, paths, files: {} }

    if (paths.includes('SKILL.md')) {
      fetches.push(
        $fetch<string>(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${prefix}SKILL.md`, { responseType: 'text' })
          .then((content) => { moduleSkills[skillName]!.files['SKILL.md'] = content })
          .catch(() => {}),
      )
    }
  }

  await Promise.all(fetches)

  // Resolve npm packages → skill folders
  const realSkillPackages = new Set<string>()
  if (npmPackages) {
    for (const npm of npmPackages) {
      if (resolveSkillFolder(npm, skillFolders)) {
        realSkillPackages.add(npm)
      }
    }
  }

  const result: SkillDiscoveryResult = { skillFolders, moduleSkills, realSkillPackages }
  cached = { result, at: Date.now() }
  return result
}

/**
 * Get the set of discovered skill folders. Light wrapper for endpoints
 * that only need the folder listing (not full module skills).
 */
export async function getSkillFolders(): Promise<Set<string>> {
  const { skillFolders } = await discoverModuleSkills()
  return skillFolders
}
