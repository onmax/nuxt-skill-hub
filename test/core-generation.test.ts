import { promises as fsp } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { resolveGeneratedSkillRoot } from './utils'

const rootDir = fileURLToPath(new URL('./fixtures/core-only', import.meta.url))
const workspaceRoot = resolve(rootDir, '../../..')

describe('core-only generation', () => {
  it('writes the stable wrapper and build-dir output during prepare', async () => {
    execSync('pnpm exec nuxt prepare', { cwd: rootDir, encoding: 'utf8', stdio: 'pipe' })
    execSync('pnpm exec nuxt prepare', { cwd: rootDir, encoding: 'utf8', stdio: 'pipe' })

    const skillRoot = join(workspaceRoot, '.claude', 'skills', 'nuxt-core-only-fixture')
    const wrapper = await fsp.readFile(join(skillRoot, 'SKILL.md'), 'utf8')
    const generatedSkillRoot = resolveGeneratedSkillRoot(skillRoot, wrapper)
    const entry = await fsp.readFile(join(generatedSkillRoot, 'SKILL.md'), 'utf8')
    const nuxt = await fsp.readFile(join(generatedSkillRoot, 'references/nuxt/index.md'), 'utf8')
    const vue = await fsp.readFile(join(generatedSkillRoot, 'references/vue/SKILL.md'), 'utf8')

    expect(wrapper).toContain('# Nuxt Skill Wrapper')
    expect(wrapper).toContain('Run `nuxt prepare` from this project before continuing.')
    expect(wrapper).toContain('.nuxt/')
    expect(entry).toContain('# Nuxt Skill Router')
    expect(entry).toContain('## Loading rules')
    expect(entry).toContain('## Routing')
    expect(entry).toContain('## Routing examples')
    expect(entry).toContain('| Task shape or symptom | Open first |')
    expect(entry).toContain('Page Meta, Head, and Layout')
    expect(entry).toContain('Hydration and SSR Consistency')
    expect(entry).toContain('Server Routes and Runtime Config')
    expect(entry).toContain('Nitro and h3 Server Patterns')
    expect(entry).toContain('Plugins and Runtime Boot')
    expect(entry).toContain('Performance and Rendering')
    expect(entry).toContain('Migrations and Compatibility')
    expect(entry).toContain('Verification and Finish')
    expect(entry).not.toContain('_No module skills discovered. Use Nuxt guidance plus official module docs when module-specific guidance is missing._')
    expect(entry).not.toContain('## Vue guidance')
    expect(entry).not.toContain('## All Nuxt packs')
    expect(entry).not.toContain('## Primary Packs')
    expect(entry).toContain('## Monorepo scope')
    expect(entry).toContain('`test/fixtures/core-only`')
    expect(nuxt).toContain('# Nuxt Best Practices')
    expect(vue).toContain('# Vue Best Practices Workflow')
    await expect(fsp.access(join(skillRoot, 'references/index.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/nuxt'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/vue'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/modules/_list.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'manifest.json'))).rejects.toBeDefined()
    await expect(fsp.access(join(generatedSkillRoot, '.state.json'))).resolves.toBeUndefined()
  }, 15000)
})
