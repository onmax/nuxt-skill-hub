import { dirname, resolve } from 'node:path'
import { expect } from 'vitest'

export function resolveGeneratedSkillEntry(skillRoot: string, wrapper: string): string {
  const match = wrapper.match(/- Entry: \[([^\]]+)\]\(\1\)/)
  expect(match?.[1]).toBeTruthy()
  return resolve(skillRoot, match![1])
}

export function resolveGeneratedSkillRoot(skillRoot: string, wrapper: string): string {
  return dirname(resolveGeneratedSkillEntry(skillRoot, wrapper))
}
