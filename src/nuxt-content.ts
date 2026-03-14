import { dirname, resolve } from 'pathe'
import { fileURLToPath } from 'node:url'
import {
  loadNuxtIndexTemplateFromDir,
  loadNuxtMetadata as loadSharedNuxtMetadata,
  loadNuxtRuleFilesFromDir,
} from '../shared/nuxt-content'
import type { NuxtContentMetadata } from './render-content'

export const NUXT_CONTENT_SOURCE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../nuxt-content')

export async function loadNuxtRuleFiles(): Promise<Record<string, string>> {
  return await loadNuxtRuleFilesFromDir(NUXT_CONTENT_SOURCE_DIR)
}

export async function loadNuxtIndexTemplate(): Promise<string> {
  return await loadNuxtIndexTemplateFromDir(NUXT_CONTENT_SOURCE_DIR)
}

export async function loadNuxtMetadata(): Promise<NuxtContentMetadata> {
  return await loadSharedNuxtMetadata()
}

export const CORE_CONTENT_SOURCE_DIR = NUXT_CONTENT_SOURCE_DIR
export const loadCoreRuleFiles = loadNuxtRuleFiles
export const loadCoreIndexTemplate = loadNuxtIndexTemplate
export const loadCoreMetadata = loadNuxtMetadata
