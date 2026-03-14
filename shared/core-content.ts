import { promises as fsp } from 'node:fs'
import { basename, join } from 'pathe'
import { DEFAULT_CORE_CONTENT_METADATA, type CoreContentMetadata } from './skill-render'

export async function loadCoreRuleFilesFromDir(coreContentDir: string): Promise<Record<string, string>> {
  const entries: Array<[string, string]> = []

  for await (const relativePath of fsp.glob('**/*', { cwd: coreContentDir })) {
    const absolutePath = join(coreContentDir, relativePath)
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

export async function loadCoreIndexTemplateFromDir(coreContentDir: string): Promise<string> {
  return await fsp.readFile(join(coreContentDir, 'index.template.md'), 'utf8')
}

export async function loadCoreMetadata(): Promise<CoreContentMetadata> {
  return DEFAULT_CORE_CONTENT_METADATA
}
