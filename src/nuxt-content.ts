import { dirname, resolve } from 'pathe'
import { fileURLToPath } from 'mlly'
import { loadNuxtRuleFilesFromDir } from '../shared/nuxt-content'

export const NUXT_CONTENT_SOURCE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../nuxt-best-practices')

export async function loadNuxtRuleFiles(): Promise<Record<string, string>> {
  return await loadNuxtRuleFilesFromDir(NUXT_CONTENT_SOURCE_DIR)
}
