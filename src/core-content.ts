import { promises as fsp } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CONTENT_FILES = [
  'architecture.md',
  'data-fetching-ssr.md',
  'server-runtime-security.md',
  'module-authoring.md',
  'migrations.md',
] as const

export const CORE_CONTENT_SOURCE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../core-content')

export async function loadCoreRuleFiles(): Promise<Record<string, string>> {
  const entries = await Promise.all(
    CONTENT_FILES.map(async (file) => {
      const contents = await fsp.readFile(join(CORE_CONTENT_SOURCE_DIR, file), 'utf8')
      return [file, contents] as const
    }),
  )

  return Object.fromEntries(entries)
}

export async function loadCoreIndexTemplate(): Promise<string> {
  return await fsp.readFile(join(CORE_CONTENT_SOURCE_DIR, 'index.template.md'), 'utf8')
}

function yamlString(value: string): string {
  return JSON.stringify(value)
}

export function createSkillEntrypoint(skillName: string): string {
  const description = 'Nuxt super-skill for this project. Use as the entry point for Nuxt best practices plus installed module skill extensions.'
  return `---
name: ${yamlString(skillName)}
description: ${yamlString(description)}
---

# Nuxt Super Skill (Experimental)

This skill is a router entrypoint.

## Workflow
1. Open [references/index.md](./references/index.md).
2. Apply core guidance first.
3. If your task touches an installed module, load that module's scoped guidance under [references/modules](./references/modules).

## Scope rule
Core guidance is default. Module guidance overrides core only inside the module's explicit scope.
`
}
