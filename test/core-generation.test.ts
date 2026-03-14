import { promises as fsp } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { EMPTY_MODULE_GUIDANCE_MARKDOWN } from '../src/render-content'

const rootDir = fileURLToPath(new URL('./fixtures/core-only', import.meta.url))
const workspaceRoot = resolve(rootDir, '../../..')

await setup({ rootDir })

describe('core-only generation', () => {
  it('renders app and generates core-only skill output', async () => {
    const html = await $fetch('/')
    expect(html).toContain('<div>core-only</div>')

    const skillRoot = join(workspaceRoot, '.claude', 'skills', 'nuxt-core-only-fixture')
    const entry = await fsp.readFile(join(skillRoot, 'SKILL.md'), 'utf8')
    const nuxt = await fsp.readFile(join(skillRoot, 'references/nuxt/index.md'), 'utf8')
    const vue = await fsp.readFile(join(skillRoot, 'references/vue/SKILL.md'), 'utf8')
    const modulesList = await fsp.readFile(join(skillRoot, 'references/modules/_list.md'), 'utf8')

    expect(entry).toContain('# Nuxt Skill Index')
    expect(entry).toContain('## Activation Flow')
    expect(entry).toContain('Explore the project first')
    expect(entry).toContain('## High-Frequency Nuxt Decisions')
    expect(entry).toContain('## Common forks in the road')
    expect(entry).toContain('| Task shape or symptom | Load first | Why |')
    expect(entry).toContain('Page Meta, Head, and Layout')
    expect(entry).toContain('_No module skills discovered. Use Nuxt guidance plus official module docs when module-specific guidance is missing._')
    expect(entry).toContain('## Vue guidance')
    expect(entry).toContain('## Before Completion')
    expect(entry).toContain('## Monorepo Scope')
    expect(entry).toContain('`test/fixtures/core-only`')
    expect(modulesList).toBe(`${EMPTY_MODULE_GUIDANCE_MARKDOWN}\n`)
    expect(nuxt).toContain('# Nuxt Best Practices')
    expect(nuxt).toContain('Abstraction Disambiguation')
    expect(nuxt).toContain('Verification and Finish')
    expect(vue).toContain('# Vue Best Practices Workflow')
    expect(vue).toContain('references/reactivity.md')
    await expect(fsp.access(join(skillRoot, 'references/index.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/nuxt/rules/_sections.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/nuxt/rules/_template.md'))).rejects.toBeDefined()
  })
})
