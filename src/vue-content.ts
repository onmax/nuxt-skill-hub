import { existsSync } from 'node:fs'
import { fileURLToPath } from 'mlly'
import { dirname, resolve } from 'pathe'
import { downloadTemplate } from 'giget'
import { loadVueSkillFilesFromDir } from '../shared/vue-content'

const VUE_SKILLS_REPO = 'vuejs-ai/skills'
const VUE_SKILLS_PATH = 'skills/vue-best-practices'
const FALLBACK_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../vue-content')

export async function resolveVueContentDir(cacheRoot: string): Promise<string> {
  const targetDir = resolve(cacheRoot, 'vue-best-practices')
  try {
    await downloadTemplate(`gh:${VUE_SKILLS_REPO}/${VUE_SKILLS_PATH}`, {
      dir: targetDir,
      force: true,
      forceClean: true,
      registry: false,
      silent: true,
    })
    return targetDir
  }
  catch {
    if (existsSync(FALLBACK_DIR)) return FALLBACK_DIR
    throw new Error('Failed to fetch Vue skill content and no local fallback found')
  }
}

export async function loadVueSkillFiles(cacheRoot: string): Promise<Record<string, string>> {
  const dir = await resolveVueContentDir(cacheRoot)
  return loadVueSkillFilesFromDir(dir)
}
