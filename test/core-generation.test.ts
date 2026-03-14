import { promises as fsp } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

const rootDir = fileURLToPath(new URL('./fixtures/core-only', import.meta.url))
const workspaceRoot = resolve(rootDir, '../../..')

await setup({ rootDir })

describe('core-only generation', () => {
  it('renders app and generates core-only skill output', async () => {
    const html = await $fetch('/')
    expect(html).toContain('<div>core-only</div>')

    const skillRoot = join(workspaceRoot, '.claude', 'skills', 'nuxt-core-only-fixture')
    const entry = await fsp.readFile(join(skillRoot, 'SKILL.md'), 'utf8')
    const index = await fsp.readFile(join(skillRoot, 'references/index.md'), 'utf8')
    const core = await fsp.readFile(join(skillRoot, 'references/core/index.md'), 'utf8')

    expect(entry).toContain('# Nuxt Skill Index')
    expect(entry).toContain('## Activation Flow')
    expect(entry).toContain('Explore the project first')
    expect(entry).toContain('## High-Frequency Nuxt Decisions')
    expect(entry).toContain('## Before Completion')
    expect(entry).toContain('## Monorepo Scope')
    expect(entry).toContain('`test/fixtures/core-only`')
    expect(index).toContain('## Common forks in the road')
    expect(index).toContain('| Task shape or symptom | Load first | Why |')
    expect(index).toContain('Page Meta, Head, and Layout')
    expect(index).toContain('_No module skills discovered. Use core guidance plus official module docs when module-specific guidance is missing._')
    expect(core).toContain('# Nuxt Best Practices')
    expect(core).toContain('Abstraction Disambiguation')
    expect(core).toContain('Verification and Finish')
    await expect(fsp.access(join(skillRoot, 'references/core/rules/_sections.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/core/rules/_template.md'))).rejects.toBeDefined()
  })
})
