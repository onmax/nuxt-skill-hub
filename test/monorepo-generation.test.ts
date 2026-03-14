import { promises as fsp } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

const rootDir = fileURLToPath(new URL('./fixtures/monorepo/apps/web', import.meta.url))
const workspaceRoot = resolve(rootDir, '../..')

await setup({ rootDir })

describe('monorepo generation', () => {
  it('writes generated skills to the workspace root and scopes the entrypoint to the app subtree', async () => {
    const html = await $fetch('/')
    expect(html).toContain('<div>monorepo-web</div>')

    const skillRoot = join(workspaceRoot, '.claude', 'skills', 'nuxt-web-fixture')
    const entry = await fsp.readFile(join(skillRoot, 'SKILL.md'), 'utf8')
    const index = await fsp.readFile(join(skillRoot, 'references/index.md'), 'utf8')

    expect(entry).toContain('## Monorepo Scope')
    expect(entry).toContain('This skill applies only to the `apps/web` subtree of this monorepo.')
    expect(entry).toContain('Treat files and tasks outside `apps/web` as out of scope unless the user explicitly redirects you there.')
    expect(entry).toContain('## Precedence')
    expect(index).toContain('## Choose your core pack')

    await expect(fsp.access(join(rootDir, '.claude', 'skills', 'nuxt-web-fixture'))).rejects.toBeDefined()
  })
})
