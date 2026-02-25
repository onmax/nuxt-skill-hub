import { promises as fsp } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

const rootDir = fileURLToPath(new URL('./fixtures/core-only', import.meta.url))

await setup({ rootDir })

describe('core-only generation', () => {
  it('renders app and generates core-only skill output', async () => {
    const html = await $fetch('/')
    expect(html).toContain('<div>core-only</div>')

    const skillRoot = join(rootDir, '.claude/skills/nuxt')
    const entry = await fsp.readFile(join(skillRoot, 'SKILL.md'), 'utf8')
    const index = await fsp.readFile(join(skillRoot, 'references/index.md'), 'utf8')
    const core = await fsp.readFile(join(skillRoot, 'references/core/index.md'), 'utf8')

    expect(entry).toContain('# Nuxt Super Skill')
    expect(index).toContain('Nuxt Best Practices')
    expect(index).toContain('_No module skills discovered._')
    expect(core).toContain('# Nuxt Best Practices')
    await expect(fsp.access(join(skillRoot, 'references/core/rules/_sections.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/core/rules/_template.md'))).rejects.toBeDefined()
  })
})
