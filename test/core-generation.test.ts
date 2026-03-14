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

    expect(entry).toContain('# Nuxt Skill Router')
    expect(entry).toContain('## Activation Flow')
    expect(entry).toContain('## Always Apply')
    expect(entry).toContain('## Monorepo Scope')
    expect(entry).toContain('`test/fixtures/core-only`')
    expect(index).toContain('## Choose your core pack')
    expect(index).toContain('| Surface or symptom | Load | Focus |')
    expect(index).toContain('_No module skills discovered. Use core guidance plus official module docs when module-specific guidance is missing._')
    expect(core).toContain('# Nuxt Best Practices')
    await expect(fsp.access(join(skillRoot, 'references/core/rules/_sections.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/core/rules/_template.md'))).rejects.toBeDefined()
  })
})
