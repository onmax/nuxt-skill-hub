import { promises as fsp } from 'node:fs'
import { basename, join } from 'pathe'

export async function loadVueSkillFilesFromDir(vueContentDir: string): Promise<Record<string, string>> {
  const entries: Array<[string, string]> = []

  for await (const relativePath of fsp.glob('**/*', { cwd: vueContentDir })) {
    const absolutePath = join(vueContentDir, relativePath)
    if (
      relativePath.split('/').some(segment => segment.startsWith('.'))
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
