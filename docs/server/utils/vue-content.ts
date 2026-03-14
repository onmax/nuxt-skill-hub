import { existsSync } from 'node:fs'
import { resolve } from 'pathe'
import { downloadTemplate } from 'giget'
import { loadVueSkillFilesFromDir } from '../../../shared/vue-content'

const VUE_SKILLS_REPO = 'vuejs-ai/skills'
const VUE_SKILLS_PATH = 'skills/vue-best-practices'
const fallbackDir = resolve(process.cwd(), '..', 'vue-content')
const cacheDir = resolve(process.cwd(), '.nuxt', 'vue-skill-cache')

async function resolveVueContentDir(): Promise<string> {
  try {
    await downloadTemplate(`gh:${VUE_SKILLS_REPO}/${VUE_SKILLS_PATH}`, {
      dir: cacheDir,
      force: true,
      forceClean: true,
      registry: false,
      silent: true,
    })
    return cacheDir
  }
  catch {
    if (existsSync(fallbackDir)) return fallbackDir
    throw new Error('Failed to fetch Vue skill content and no local fallback found')
  }
}

let cachedFiles: Record<string, string> | null = null

export async function loadVueSkillFiles(): Promise<Record<string, string>> {
  if (cachedFiles) return cachedFiles
  const dir = await resolveVueContentDir()
  cachedFiles = await loadVueSkillFilesFromDir(dir)
  return cachedFiles
}
