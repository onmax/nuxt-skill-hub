import { slugCandidates } from '../../../src/remote-resolver'
import { GITHUB_OVERRIDES } from '../../../src/github-overrides'

const COMMUNITY_REPO = 'onmax/nuxt-skills'
const COMMUNITY_BRANCH = 'main'
const CACHE_TTL = 1000 * 60 * 60 // 1h
const EXCLUDED_DIRS = new Set(['scripts', 'node_modules', '.git'])

interface GitHubTreeItem { path: string, type: 'blob' | 'tree' }

interface ModuleSkillEntry {
  skillName: string
  /** Base URL for fetching raw file content on the client */
  rawBase: string
  paths: string[]
  files: Record<string, string>
  /** Where this skill was resolved from */
  source: 'official' | 'community'
}

interface SkillDiscoveryResult {
  skillFolders: Set<string>
  moduleSkills: Record<string, ModuleSkillEntry>
  realSkillPackages: Set<string>
}

let cached: { result: SkillDiscoveryResult, at: number } | null = null

async function fetchGitHubTree(repo: string, ref: string): Promise<GitHubTreeItem[]> {
  const url = `https://api.github.com/repos/${repo}/git/trees/${ref}?recursive=1`
  const data = await $fetch<{ tree: GitHubTreeItem[] }>(url)
  return data.tree
}

function extractSkillFromTree(tree: GitHubTreeItem[], skillPath: string): string[] {
  const prefix = skillPath.endsWith('/') ? skillPath : `${skillPath}/`
  return tree
    .filter(item => item.type === 'blob' && item.path.startsWith(prefix))
    .map(item => item.path.slice(prefix.length))
    .filter(p => !EXCLUDED_DIRS.has(p.split('/')[0]!) && (p.endsWith('.md') || p.endsWith('.json')))
}

// Framework skill folders that should not match arbitrary scoped packages
const FRAMEWORK_SKILL_FOLDERS = new Set(['nuxt', 'vue', 'nuxt-modules', 'pnpm', 'vite'])

// Aliases for npm packages where slugCandidates convention doesn't produce the right skill folder
const PACKAGE_ALIASES: Record<string, string> = {
  '@nuxtjs/seo': 'nuxt-seo',
  '@nuxtjs/mdc': 'nuxt-content',
  '@vueuse/nuxt': 'vueuse-functions',
  '@vueuse/core': 'vueuse-functions',
  'motion-v': 'motion',
  'motion-v/nuxt': 'motion',
  '@tresjs/core': 'tresjs',
  '@tresjs/nuxt': 'tresjs',
}

export function resolveSkillFolder(nameOrPackage: string, skillFolders: Set<string>): string | null {
  const alias = PACKAGE_ALIASES[nameOrPackage]
  if (alias && skillFolders.has(alias)) return alias
  if (skillFolders.has(nameOrPackage) && !FRAMEWORK_SKILL_FOLDERS.has(nameOrPackage)) return nameOrPackage
  for (const candidate of slugCandidates(nameOrPackage)) {
    if (skillFolders.has(candidate) && !FRAMEWORK_SKILL_FOLDERS.has(candidate)) return candidate
  }
  return null
}

/**
 * Fetch skills from official module repos (GITHUB_OVERRIDES).
 * These take priority over community skills.
 */
async function fetchOfficialSkills(): Promise<Record<string, ModuleSkillEntry>> {
  const results: Record<string, ModuleSkillEntry> = {}
  const overridesWithRepo = GITHUB_OVERRIDES.filter(o => o.repo && o.path && o.skillName)

  await Promise.all(overridesWithRepo.map(async (override) => {
    try {
      const tree = await fetchGitHubTree(override.repo!, override.ref || 'main')
      const paths = extractSkillFromTree(tree, override.path!)
      if (!paths.length) return

      const rawBase = `https://raw.githubusercontent.com/${override.repo}/${override.ref || 'main'}/${override.path}`
      const entry: ModuleSkillEntry = { skillName: override.skillName!, rawBase, paths, files: {}, source: 'official' }

      if (paths.includes('SKILL.md')) {
        try {
          entry.files['SKILL.md'] = await $fetch<string>(
            `https://raw.githubusercontent.com/${override.repo}/${override.ref || 'main'}/${override.path}/SKILL.md`,
            { responseType: 'text' },
          )
        }
        catch { /* skip */ }
      }

      results[override.skillName!] = entry
    }
    catch {
      console.warn(`Failed to fetch official skill from ${override.repo}`)
    }
  }))

  return results
}

/**
 * Fetch all skills from the community repo (onmax/nuxt-skills).
 */
async function fetchCommunitySkills(): Promise<{ skillFolders: Set<string>, moduleSkills: Record<string, ModuleSkillEntry> }> {
  let tree: GitHubTreeItem[]
  try {
    tree = await fetchGitHubTree(COMMUNITY_REPO, COMMUNITY_BRANCH)
  }
  catch (error) {
    console.warn('Failed to fetch community skills tree:', error)
    return { skillFolders: new Set(), moduleSkills: {} }
  }

  const skillFolders = new Set<string>()
  for (const item of tree) {
    if (item.type === 'tree' && item.path.startsWith('skills/') && item.path.split('/').length === 2) {
      skillFolders.add(item.path.split('/')[1]!)
    }
  }

  const moduleSkills: Record<string, ModuleSkillEntry> = {}
  const fetches: Promise<void>[] = []

  for (const skillName of skillFolders) {
    const paths = extractSkillFromTree(tree, `skills/${skillName}`)
    if (!paths.length) continue

    const rawBase = `https://raw.githubusercontent.com/${COMMUNITY_REPO}/${COMMUNITY_BRANCH}/skills/${skillName}`
    moduleSkills[skillName] = { skillName, rawBase, paths, files: {}, source: 'community' }

    if (paths.includes('SKILL.md')) {
      fetches.push(
        $fetch<string>(`https://raw.githubusercontent.com/${COMMUNITY_REPO}/${COMMUNITY_BRANCH}/skills/${skillName}/SKILL.md`, { responseType: 'text' })
          .then((content) => { moduleSkills[skillName]!.files['SKILL.md'] = content })
          .catch(() => {}),
      )
    }
  }

  await Promise.all(fetches)
  return { skillFolders, moduleSkills }
}

/**
 * Discover all module skills. Official repo skills take priority over community.
 */
export async function discoverModuleSkills(npmPackages?: string[]): Promise<SkillDiscoveryResult> {
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.result

  const [officialSkills, community] = await Promise.all([
    fetchOfficialSkills(),
    fetchCommunitySkills(),
  ])

  // Merge: official wins over community for the same skill name
  const moduleSkills: Record<string, ModuleSkillEntry> = { ...community.moduleSkills }
  for (const [skillName, entry] of Object.entries(officialSkills)) {
    moduleSkills[skillName] = entry
  }

  // Skill folders = union of community + official
  const skillFolders = new Set(community.skillFolders)
  for (const skillName of Object.keys(officialSkills)) {
    skillFolders.add(skillName)
  }

  const realSkillPackages = new Set<string>()
  if (npmPackages) {
    for (const npm of npmPackages) {
      if (resolveSkillFolder(npm, skillFolders)) realSkillPackages.add(npm)
    }
  }

  const result: SkillDiscoveryResult = { skillFolders, moduleSkills, realSkillPackages }
  cached = { result, at: Date.now() }
  return result
}

export async function getSkillFolders(): Promise<Set<string>> {
  const { skillFolders } = await discoverModuleSkills()
  return skillFolders
}
