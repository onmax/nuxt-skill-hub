import { promises as fsp } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
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
    expect(entry).toContain('# Nuxt Skill Index')
    expect(entry).toContain('## Monorepo Scope')
    expect(entry).toContain('`test/fixtures/core-only`')
    expect(nuxt).toContain('# Nuxt Best Practices')
    expect(vue).toContain('# Vue Best Practices Workflow')
    await expect(fsp.access(join(skillRoot, 'references/index.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/modules/_list.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/nuxt/rules/_sections.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/nuxt/rules/_template.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(generatedSkillRoot, '.state.json'))).resolves.toBeUndefined()
  })
})
