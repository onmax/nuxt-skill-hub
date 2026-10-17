import { existsSync, promises as fsp } from 'node:fs'
import { resolve } from 'pathe'
import { downloadTemplate } from 'giget'
import { loadVueSkillFilesFromDir } from '../../../shared/vue-content'

const VUE_SKILLS_REPO = 'vuejs-ai/skills'
const VUE_SKILLS_PATH = 'skills/vue-best-practices'
const RETRY_AFTER_MS = 5 * 60_000

// Download into a scratch dir and swap it in only on success, so a failed fetch keeps the last good copy.
async function resolveVueContentDir(docsRoot: string): Promise<string | null> {
  const cacheDir = resolve(docsRoot, 'node_modules/.cache/vue-skill')
  const tmpDir = `${cacheDir}.tmp`
  try {
    await downloadTemplate(`gh:${VUE_SKILLS_REPO}/${VUE_SKILLS_PATH}`, {
      dir: tmpDir,
      force: true,
      forceClean: true,
      registry: false,
      silent: true,
    })
    await fsp.rm(cacheDir, { recursive: true, force: true })
    await fsp.rename(tmpDir, cacheDir)
    return cacheDir
  }
  catch (error) {
    await fsp.rm(tmpDir, { recursive: true, force: true })
    const cached = existsSync(resolve(cacheDir, 'SKILL.md'))
    console.warn(`[vue-content] Could not download ${VUE_SKILLS_REPO}/${VUE_SKILLS_PATH}${cached ? ', using cached copy' : ''}:`, error instanceof Error ? error.message : error)
    return cached ? cacheDir : null
  }
}

let cachedFiles: Record<string, string> | null = null
let pending: Promise<Record<string, string>> | null = null
let failedAt = 0

/**
 * Loads the Vue best-practices skill. Returns an empty object when it can't be downloaded
 * and no cached copy exists, so callers can degrade instead of failing the build.
 * Concurrent callers share one download, and a failure is not retried for a few minutes.
 */
export async function loadVueSkillFiles(docsRoot = process.cwd()): Promise<Record<string, string>> {
  if (cachedFiles) return cachedFiles
  if (Date.now() - failedAt < RETRY_AFTER_MS) return {}

  pending ||= (async () => {
    try {
      const dir = await resolveVueContentDir(docsRoot)
      if (!dir) {
        failedAt = Date.now()
        return {}
      }
      cachedFiles = await loadVueSkillFilesFromDir(dir)
      return cachedFiles
    }
    finally {
      pending = null
    }
  })()
  return pending
}
