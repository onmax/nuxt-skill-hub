import { promises as fsp } from 'node:fs'
import { basename, join } from 'pathe'
import { DEFAULT_NUXT_CONTENT_METADATA, type NuxtContentMetadata } from './skill-render'

export async function loadNuxtRuleFilesFromDir(nuxtContentDir: string): Promise<Record<string, string>> {
  const entries: Array<[string, string]> = []

  for await (const relativePath of fsp.glob('**/*', { cwd: nuxtContentDir })) {
    const absolutePath = join(nuxtContentDir, relativePath)
    if (
      relativePath === 'index.template.md'
      || relativePath.split('/').some(segment => segment.startsWith('.'))
      || basename(relativePath).startsWith('_')
      || !(await fsp.lstat(absolutePath)).isFile()
    ) {
      continue
    }

    entries.push([relativePath, await fsp.readFile(absolutePath, 'utf8')])
  }

  entries.sort((a, b) => a[0].localeCompare(b[0]))

  return Object.fromEntries(entries)
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
