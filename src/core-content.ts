import { promises as fsp } from 'node:fs'
import { basename, dirname, join, resolve } from 'pathe'
import { fileURLToPath } from 'node:url'

export const CORE_CONTENT_SOURCE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../core-content')

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
      const nested = await readFilesRecursively(absolutePath, relativePath)
      files.push(...nested)
      continue
    }

    if (entry.isFile() && relativePath !== 'index.template.md' && !basename(relativePath).startsWith('_')) {
      files.push([relativePath, await fsp.readFile(absolutePath, 'utf8')])
    }
  }

  return files
}

export async function loadCoreRuleFiles(): Promise<Record<string, string>> {
  const entries = await readFilesRecursively(CORE_CONTENT_SOURCE_DIR)
  entries.sort((a, b) => a[0].localeCompare(b[0]))

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

# Nuxt Super Skill

This skill is the primary entrypoint for Nuxt work in this repository.

## Structure
- [references/index.md](./references/index.md): navigation map for all available guidance.
- [references/core/index.md](./references/core/index.md): core Nuxt best-practice packs that apply by default.
- [references/modules](./references/modules): module-specific guides discovered from installed Nuxt modules.

## Workflow
1. Open [references/index.md](./references/index.md).
2. Start with core guidance unless the task is fully module-specific.
3. If the task involves an installed module, load the matching guide under [references/modules](./references/modules).
4. Apply only the smallest relevant sections to keep changes focused.

## Precedence
Core guidance is default. Module guidance overrides core only inside the module's explicit scope.
`
}
