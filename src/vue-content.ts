import { dirname, resolve } from 'pathe'
import { fileURLToPath } from 'node:url'
import { loadVueSkillFilesFromDir } from '../shared/vue-content'

export const VUE_CONTENT_SOURCE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../vue-content')

export async function loadVueSkillFiles(): Promise<Record<string, string>> {
  return await loadVueSkillFilesFromDir(VUE_CONTENT_SOURCE_DIR)
}
