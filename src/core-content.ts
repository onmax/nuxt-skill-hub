import { dirname, resolve } from 'pathe'
import { fileURLToPath } from 'node:url'
import {
  loadCoreIndexTemplateFromDir,
  loadCoreMetadata as loadSharedCoreMetadata,
  loadCoreRuleFilesFromDir,
} from '../shared/core-content'
import type { CoreContentMetadata } from './render-content'

export const CORE_CONTENT_SOURCE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../core-content')

export async function loadCoreRuleFiles(): Promise<Record<string, string>> {
  return await loadCoreRuleFilesFromDir(CORE_CONTENT_SOURCE_DIR)
}

export async function loadCoreIndexTemplate(): Promise<string> {
  return await loadCoreIndexTemplateFromDir(CORE_CONTENT_SOURCE_DIR)
}

export async function loadCoreMetadata(): Promise<CoreContentMetadata> {
  return await loadSharedCoreMetadata()
}
