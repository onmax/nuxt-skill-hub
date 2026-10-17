import { resolve } from 'pathe'
import { loadNuxtRuleFilesFromDir } from '../../../shared/nuxt-content'

// Server routes run with cwd = docs/; the build-time hosted-skill module passes its rootDir.
export async function loadNuxtRuleFiles(docsRoot = process.cwd()): Promise<Record<string, string>> {
  return await loadNuxtRuleFilesFromDir(resolve(docsRoot, '..', 'nuxt-best-practices'))
}
