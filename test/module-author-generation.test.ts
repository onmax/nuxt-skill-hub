import { promises as fsp } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
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
    expect(entry).toContain('Module Authoring Conventions')
    expect(entry).toContain('Writing or refactoring a Nuxt module (`defineNuxtModule`, hooks, public APIs)')
    expect(entry).toContain('Add a Nuxt module option, hook, or runtime extension')
    expect(entry).toContain('Verification and Finish')
    expect(entry).toContain('Hydration and SSR Consistency')
    expect(entry).not.toContain('## Module authoring')
    expect(entry).not.toContain('## Module Author Focus')
    expect(entry).not.toContain('## Module author focus')
    await expect(fsp.access(join(skillRoot, 'references/index.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'manifest.json'))).rejects.toBeDefined()
  }, 15000)
})
