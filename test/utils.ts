import { promises as fsp } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { expect } from 'vitest'

export function resolveGeneratedSkillEntry(skillRoot: string, wrapper: string): string {
  const match = wrapper.match(/- Entry: \[([^\]]+)\]\(\1\)/)
  expect(match?.[1]).toBeTruthy()
  return resolve(skillRoot, match![1])
}

export function resolveGeneratedSkillRoot(skillRoot: string, wrapper: string): string {
  return dirname(resolveGeneratedSkillEntry(skillRoot, wrapper))
}

/** Every Nuxt pack copied into the generated tree is linked from its router, and every pack link resolves. */
export async function expectCopiedPacksMatchRouterLinks(generatedSkillRoot: string, entry: string): Promise<void> {
  const copied: string[] = []
  for await (const path of fsp.glob('**/*.md', { cwd: join(generatedSkillRoot, 'references/nuxt') })) {
    copied.push(path.replaceAll('\\', '/'))
  }
  const linked = Array.from(entry.matchAll(/\]\(\.\/references\/nuxt\/([^)]+)\)/g), match => match[1]!)

  expect(copied.length).toBeGreaterThan(0)
  expect([...new Set(linked)].sort()).toEqual(copied.sort())
}
