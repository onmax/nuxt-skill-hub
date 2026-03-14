import { resolve } from 'pathe'
import { loadVueSkillFilesFromDir } from '../../../shared/vue-content'

const vueContentDir = resolve(process.cwd(), '..', 'vue-content')

export async function loadVueSkillFiles(): Promise<Record<string, string>> {
  return await loadVueSkillFilesFromDir(vueContentDir)
}
