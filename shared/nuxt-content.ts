import { promises as fsp } from 'node:fs'
import { join } from 'pathe'
import { DEFAULT_NUXT_CONTENT_METADATA, type NuxtContentMetadata } from './skill-render'
import { loadSkillFilesFromDir } from './load-skill-files'

export async function loadNuxtRuleFilesFromDir(nuxtContentDir: string): Promise<Record<string, string>> {
  return loadSkillFilesFromDir(nuxtContentDir, ['index.template.md'])
}

export async function loadNuxtIndexTemplateFromDir(nuxtContentDir: string): Promise<string> {
  return await fsp.readFile(join(nuxtContentDir, 'index.template.md'), 'utf8')
}

export async function loadNuxtMetadata(): Promise<NuxtContentMetadata> {
  return DEFAULT_NUXT_CONTENT_METADATA
}

export const loadCoreRuleFilesFromDir = loadNuxtRuleFilesFromDir
export const loadCoreIndexTemplateFromDir = loadNuxtIndexTemplateFromDir
export const loadCoreMetadata = loadNuxtMetadata
