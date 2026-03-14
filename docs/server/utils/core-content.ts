import { resolve } from 'pathe'
import {
  loadCoreMetadata as loadSharedCoreMetadata,
  loadCoreRuleFilesFromDir,
} from '../../../shared/core-content'
import type { CoreContentMetadata } from '~~/shared/skill-preview'

const coreContentDir = resolve(process.cwd(), '..', 'core-content')

export async function loadCoreRuleFiles(): Promise<Record<string, string>> {
  return await loadCoreRuleFilesFromDir(coreContentDir)
}

export async function loadCoreMetadata(): Promise<CoreContentMetadata> {
  return await loadSharedCoreMetadata()
}
