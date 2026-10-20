import { promises as fsp } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadNuxt } from '@nuxt/kit'
import { describe, expect, it } from 'vitest'
import { resolveStableSkillBuildDir } from '../src/generator'
import { expectCopiedPacksMatchRouterLinks, resolveGeneratedSkillRoot } from './utils'

const rootDir = fileURLToPath(new URL('./fixtures/core-only', import.meta.url))
const workspaceRoot = resolve(rootDir, '../../..')
const cacheRoot = join(workspaceRoot, 'node_modules', '.cache', 'nuxt-skill-hub')

describe('core-only generation', () => {
  it('writes the stable wrapper and build-dir output during prepare', async () => {
    await fsp.rm(cacheRoot, { recursive: true, force: true })

    execSync('pnpm exec nuxt prepare', { cwd: rootDir, encoding: 'utf8', stdio: 'pipe' })
    execSync('pnpm exec nuxt prepare', { cwd: rootDir, encoding: 'utf8', stdio: 'pipe' })

    const skillRoot = join(workspaceRoot, '.claude', 'skills', 'nuxt-core-only-fixture')
    const wrapper = await fsp.readFile(join(skillRoot, 'SKILL.md'), 'utf8')
    const generatedSkillRoot = resolveGeneratedSkillRoot(skillRoot, wrapper)
    const entry = await fsp.readFile(join(generatedSkillRoot, 'SKILL.md'), 'utf8')
    const dataPack = await fsp.readFile(join(generatedSkillRoot, 'references/nuxt/rules/data-fetching-ssr.md'), 'utf8')
    const vue = await fsp.readFile(join(generatedSkillRoot, 'references/vue/SKILL.md'), 'utf8')

    expect(wrapper).toContain('# Nuxt Skill Wrapper')
    expect(wrapper).toContain('run `npx nuxt prepare` in `test/fixtures/core-only`')
    await expectCopiedPacksMatchRouterLinks(generatedSkillRoot, entry)
    expect(wrapper).toContain('.nuxt/')
    expect(entry).toContain('# Nuxt Skill Router')
    expect(entry).toContain('## Loading rules')
    expect(entry).toContain('## Routing')
    expect(entry).toContain('| Task shape or symptom | Example request | Open first |')
    expect(entry).toContain('Page Meta, Head, and Layout')
    expect(entry).toContain('Hydration and SSR Consistency')
    expect(entry).toContain('Server Routes, h3 Patterns, and Runtime Config')
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
    expect(dataPack).toContain('## Data Fetching and SSR')
    await expect(fsp.access(join(generatedSkillRoot, 'references/nuxt/index.md'))).rejects.toBeDefined()
    // Gated packs stay out when their module isn't installed and module authoring is off.
    await expect(fsp.access(join(generatedSkillRoot, 'references/nuxt/rules/nuxt-ui-primitives.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(generatedSkillRoot, 'references/nuxt/rules/module-authoring.md'))).rejects.toBeDefined()
    expect(vue).toContain('# Vue Best Practices Workflow')
    await expect(fsp.access(join(skillRoot, 'references/index.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/nuxt'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/vue'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/modules/_list.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'manifest.json'))).rejects.toBeDefined()
    await expect(fsp.access(join(generatedSkillRoot, '.state.json'))).resolves.toBeUndefined()
  }, 15000)

  // `nuxt dev` loads with `dev: true`. `nuxt build` loads with `dev: false`, and Nuxt then moves
  // its buildDir to node_modules/.cache/nuxt/.nuxt because `.nuxt` exists.
  it.each([['nuxt dev', true], ['nuxt build', false]])('%s restores the cached tree after .nuxt/skill-hub is deleted', async (_command, dev) => {
    const skillRoot = join(workspaceRoot, '.claude', 'skills', 'nuxt-core-only-fixture')
    const wrapperPath = join(skillRoot, 'SKILL.md')
    const generatedSkillRoot = resolveGeneratedSkillRoot(skillRoot, await fsp.readFile(wrapperPath, 'utf8'))
    await fsp.rm(join(rootDir, '.nuxt', 'skill-hub'), { recursive: true, force: true })

    // Not `_prepare`: generation doesn't run, only the restore on `build:before`.
    const nuxt = await loadNuxt({ cwd: rootDir, dev })
    try {
      await nuxt.callHook('build:before')
    }
    finally {
      await nuxt.close()
    }

    expect(resolveGeneratedSkillRoot(skillRoot, await fsp.readFile(wrapperPath, 'utf8'))).toBe(generatedSkillRoot)
    expect(generatedSkillRoot).toBe(join(rootDir, '.nuxt', 'skill-hub', 'nuxt-core-only-fixture'))
    const entry = await fsp.readFile(join(generatedSkillRoot, 'SKILL.md'), 'utf8')
    expect(entry).toContain('# Nuxt Skill Router')
    await expectCopiedPacksMatchRouterLinks(generatedSkillRoot, entry)
  }, 15000)
})

describe('resolveStableSkillBuildDir', () => {
  it('keeps the tree in .nuxt when nuxt build uses the build cache dir', () => {
    expect(resolveStableSkillBuildDir('/app', '/app/.nuxt')).toBe('/app/.nuxt')
    expect(resolveStableSkillBuildDir('/app', '/app/node_modules/.cache/nuxt/.nuxt')).toBe('/app/.nuxt')
    expect(resolveStableSkillBuildDir('/app', '/app/custom-build')).toBe('/app/custom-build')
  })
})
