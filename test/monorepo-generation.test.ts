import { promises as fsp } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { resolveGeneratedSkillRoot } from './utils'

const rootDir = fileURLToPath(new URL('./fixtures/monorepo/apps/web', import.meta.url))
const workspaceRoot = resolve(rootDir, '../..')

describe('monorepo generation', () => {
  it('writes generated skills to the workspace root and scopes the entrypoint to the app subtree', async () => {
    execSync('pnpm exec nuxt prepare', { cwd: rootDir, encoding: 'utf8', stdio: 'pipe' })

    const skillRoot = join(workspaceRoot, '.claude', 'skills', 'nuxt-web-fixture')
    const wrapper = await fsp.readFile(join(skillRoot, 'SKILL.md'), 'utf8')
    const generatedSkillRoot = resolveGeneratedSkillRoot(skillRoot, wrapper)
    const entry = await fsp.readFile(join(generatedSkillRoot, 'SKILL.md'), 'utf8')

    expect(wrapper).toContain('# Nuxt Skill Wrapper')
    expect(wrapper).toContain('.nuxt/')
    expect(entry).toContain('## Monorepo scope')
    expect(entry).toContain('This skill applies only to `apps/web`.')
    expect(entry).toContain('Treat files and tasks outside that subtree as out of scope unless the user explicitly redirects you there.')
    expect(entry).not.toContain('## Precedence')
    expect(entry).toContain('## Routing')
    await expect(fsp.access(join(skillRoot, 'references/index.md'))).rejects.toBeDefined()

    await expect(fsp.access(join(rootDir, '.claude', 'skills', 'nuxt-web-fixture'))).rejects.toBeDefined()
  }, 15000)
})
