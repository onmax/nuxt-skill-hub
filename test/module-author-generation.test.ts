import { promises as fsp } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

const rootDir = fileURLToPath(new URL('./fixtures/module-author', import.meta.url))
const workspaceRoot = resolve(rootDir, '../../..')

await setup({ rootDir })

describe('module-author generation', () => {
  it('layers module-author guidance on top of the generated skill', async () => {
    const html = await $fetch('/')
    expect(html).toContain('<div>module-author</div>')

    const skillRoot = join(workspaceRoot, '.claude', 'skills', 'nuxt-module-author-fixture')
    const entry = await fsp.readFile(join(skillRoot, 'SKILL.md'), 'utf8')
    const index = await fsp.readFile(join(skillRoot, 'references/index.md'), 'utf8')

    expect(entry).toContain('## Module Author Focus')
    expect(entry).toContain('## High-Frequency Nuxt Decisions')
    expect(entry).toContain('adds an authoring layer for repositories that build Nuxt modules')
    expect(entry).toContain('before changing `defineNuxtModule`, runtime extensions, hooks, or release scaffolding')

    expect(index).toContain('## Module author focus')
    expect(index).toContain('Writing, refactoring, or publishing a Nuxt module')
    expect(index).toContain('Module Authoring Conventions')
    await expect(fsp.access(join(skillRoot, 'manifest.json'))).rejects.toBeDefined()
  })
})
