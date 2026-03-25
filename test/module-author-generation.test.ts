import { promises as fsp } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveGeneratedSkillRoot } from './utils'

const rootDir = fileURLToPath(new URL('./fixtures/module-author', import.meta.url))
const workspaceRoot = resolve(rootDir, '../../..')

describe('module-author generation', () => {
  it('layers module-author guidance on top of the generated skill', async () => {
    execSync('pnpm exec nuxt prepare', { cwd: rootDir, encoding: 'utf8', stdio: 'pipe' })

    const skillRoot = join(workspaceRoot, '.claude', 'skills', 'nuxt-module-author-fixture')
    const wrapper = await fsp.readFile(join(skillRoot, 'SKILL.md'), 'utf8')
    const generatedSkillRoot = resolveGeneratedSkillRoot(skillRoot, wrapper)
    const entry = await fsp.readFile(join(generatedSkillRoot, 'SKILL.md'), 'utf8')

    expect(wrapper).toContain('# Nuxt Skill Wrapper')
    expect(wrapper).toContain('Run `nuxt prepare` from this project before continuing.')
    expect(entry).toContain('## Module Author Focus')
    expect(entry).toContain('## Module author focus')
    expect(entry).toContain('Module Authoring Conventions')
    await expect(fsp.access(join(skillRoot, 'references/index.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'manifest.json'))).rejects.toBeDefined()
  }, 15000)
})
