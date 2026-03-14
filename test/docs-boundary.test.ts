import { promises as fsp } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const docsRoot = resolve(process.cwd(), 'docs')

async function readFiles(dir: string): Promise<string[]> {
  const entries = await fsp.readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await readFiles(fullPath))
      continue
    }

    if (entry.isFile() && /\.(?:ts|vue)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

describe('docs boundaries', () => {
  it('does not import docs logic from package src files', async () => {
    const files = await readFiles(docsRoot)

    const serverUtilsDir = join(docsRoot, 'server', 'utils')
    for (const file of files) {
      if (file.startsWith(serverUtilsDir)) continue
      const contents = await fsp.readFile(file, 'utf8')
      expect(contents, file).not.toMatch(/(?:\.\.\/)+src\//)
      expect(contents, file).not.toMatch(/from ['"][^'"]*src\/(?:frontmatter|render-content|core-content|nuxt-content|vue-content)/)
    }
  })
})
