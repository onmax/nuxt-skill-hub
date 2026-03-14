import { promises as fsp } from 'node:fs'
import { basename, dirname, join, resolve } from 'pathe'
import { fileURLToPath } from 'node:url'
import { DEFAULT_CORE_CONTENT_METADATA, type CoreContentMetadata, normalizeCoreContentMetadata } from './render-content'

export const CORE_CONTENT_SOURCE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../core-content')

export async function loadCoreRuleFiles(): Promise<Record<string, string>> {
  const entries: Array<[string, string]> = []

  for await (const relativePath of fsp.glob('**/*', { cwd: CORE_CONTENT_SOURCE_DIR })) {
    const absolutePath = join(CORE_CONTENT_SOURCE_DIR, relativePath)
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

export async function loadCoreIndexTemplate(): Promise<string> {
  return await fsp.readFile(join(CORE_CONTENT_SOURCE_DIR, 'index.template.md'), 'utf8')
}

export async function loadCoreMetadata(): Promise<CoreContentMetadata> {
  try {
    const raw = await fsp.readFile(join(CORE_CONTENT_SOURCE_DIR, 'metadata.json'), 'utf8')
    return normalizeCoreContentMetadata(JSON.parse(raw))
  }
  catch {
    return DEFAULT_CORE_CONTENT_METADATA
  }
}
