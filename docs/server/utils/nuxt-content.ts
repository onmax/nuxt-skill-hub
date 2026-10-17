import { resolve } from 'pathe'
import { loadNuxtRuleFilesFromDir } from '../../../shared/nuxt-content'

const nuxtContentDir = resolve(process.cwd(), '..', 'nuxt-best-practices')

export async function loadNuxtRuleFiles(): Promise<Record<string, string>> {
  return await loadNuxtRuleFilesFromDir(nuxtContentDir)
}
