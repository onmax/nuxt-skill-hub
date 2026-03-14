import { promises as fsp } from 'node:fs'
import { basename, join, resolve } from 'pathe'
import { DEFAULT_CORE_CONTENT_METADATA, normalizeCoreContentMetadata, type CoreContentMetadata } from '~~/shared/skill-preview'

const coreContentDir = resolve(process.cwd(), '..', 'core-content')

async function readFilesRecursively(dir: string, prefix = ''): Promise<Array<[string, string]>> {
  const entries = await fsp.readdir(dir, { withFileTypes: true })
  const files: Array<[string, string]> = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue
    }

    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
    const absolutePath = join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...await readFilesRecursively(absolutePath, relativePath))
      continue
    }

    if (entry.isFile() && relativePath !== 'index.template.md' && !basename(relativePath).startsWith('_')) {
      files.push([relativePath, await fsp.readFile(absolutePath, 'utf8')])
    }
  }

  return files
}

export async function loadCoreRuleFiles(): Promise<Record<string, string>> {
  const entries = await readFilesRecursively(coreContentDir)
  entries.sort((a, b) => a[0].localeCompare(b[0]))

  return Object.fromEntries(entries)
}

export async function loadCoreMetadata(): Promise<CoreContentMetadata> {
  try {
    const raw = await fsp.readFile(join(coreContentDir, 'metadata.json'), 'utf8')
    return normalizeCoreContentMetadata(JSON.parse(raw))
  }
  catch {
    return DEFAULT_CORE_CONTENT_METADATA
  }
}
