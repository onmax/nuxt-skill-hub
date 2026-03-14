import { resolve } from 'pathe'
import {
  loadNuxtMetadata as loadSharedNuxtMetadata,
  loadNuxtRuleFilesFromDir,
} from '../../../shared/nuxt-content'
import type { NuxtContentMetadata } from '~~/shared/skill-preview'

const nuxtContentDir = resolve(process.cwd(), '..', 'nuxt-content')

export async function loadNuxtRuleFiles(): Promise<Record<string, string>> {
  return await loadNuxtRuleFilesFromDir(nuxtContentDir)
}

export async function loadNuxtMetadata(): Promise<NuxtContentMetadata> {
  return await loadSharedNuxtMetadata()
}
