import { promises as fsp } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

const rootDir = fileURLToPath(new URL('./fixtures/with-modules', import.meta.url))

async function writeFixtureModule(
  pkgName: string,
  version: string,
  skillName: string,
  description?: string,
  scriptBody?: string,
): Promise<void> {
  const moduleRoot = join(rootDir, 'node_modules', pkgName)
  const skillRoot = join(moduleRoot, 'skills', skillName)
  const scriptRoot = join(skillRoot, 'scripts')
  const referencesRoot = join(skillRoot, 'references')
  const skillFrontmatter = [
    '---',
    `name: ${skillName}`,
    ...(description ? [`description: ${description}`] : []),
    '---',
    '',
    `# Test ${skillName} Skill`,
    '',
    `Scope: Applies when working with \`${pkgName}\`.`,
    '',
  ].join('\n')

  await fsp.mkdir(referencesRoot, { recursive: true })
  if (scriptBody) {
    await fsp.mkdir(scriptRoot, { recursive: true })
  }

  await fsp.writeFile(join(moduleRoot, 'package.json'), JSON.stringify({
    name: pkgName,
    version,
    type: 'module',
    main: './module.mjs',
    agents: {
      skills: [
        {
          name: skillName,
          path: `./skills/${skillName}`,
        },
      ],
    },
  }, null, 2), 'utf8')

  await fsp.writeFile(join(moduleRoot, 'module.mjs'), `import { defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: '${pkgName}',
  },
  setup() {},
})
`, 'utf8')

  await fsp.writeFile(join(skillRoot, 'SKILL.md'), skillFrontmatter, 'utf8')
  await fsp.writeFile(join(referencesRoot, `${skillName}.md`), `# ${skillName}\n`, 'utf8')

  if (scriptBody) {
    await fsp.writeFile(join(scriptRoot, 'check.sh'), scriptBody, 'utf8')
  }
}

async function prepareFixtureModules(): Promise<void> {
  await writeFixtureModule('test-nuxt-ui', '0.1.0', 'nuxt-ui', 'Test Nuxt UI module skill.', '#!/usr/bin/env sh\necho ui\n')
  await writeFixtureModule('test-nuxt-seo', '0.2.0', 'nuxt-seo', 'Test Nuxt SEO module skill.', '#!/usr/bin/env sh\necho seo\n')
  await writeFixtureModule('test-nuxt-bad', '0.0.1', 'nuxt-bad')
}

await prepareFixtureModules()
await setup({ rootDir })

describe('module-expanded generation', () => {
  it('renders app and generates merged module references with script policy', async () => {
    const html = await $fetch('/')
    expect(html).toContain('<div>with-modules</div>')

    const skillRoot = join(rootDir, '.github/skills/nuxt')
    const index = await fsp.readFile(join(skillRoot, 'references/index.md'), 'utf8')
    const manifestRaw = await fsp.readFile(join(skillRoot, 'manifest.json'), 'utf8')

    expect(index).toContain('test-nuxt-ui')
    expect(index).toContain('test-nuxt-seo')
    expect(index).toContain('test-nuxt-bad')
    expect(index).toContain('Skipped module skills')

    await expect(fsp.readFile(join(skillRoot, 'references/modules/test-nuxt-ui/nuxt-ui/SKILL.md'), 'utf8')).resolves.toContain('description: Test Nuxt UI module skill.')
    await expect(fsp.readFile(join(skillRoot, 'references/modules/test-nuxt-seo/nuxt-seo/SKILL.md'), 'utf8')).resolves.toContain('description: Test Nuxt SEO module skill.')
    await expect(fsp.access(join(skillRoot, 'references/modules/test-nuxt-bad/nuxt-bad/SKILL.md'))).rejects.toBeDefined()

    await expect(fsp.access(join(skillRoot, 'references/modules/test-nuxt-ui/nuxt-ui/scripts/check.sh'))).rejects.toBeDefined()
    await expect(fsp.readFile(join(skillRoot, 'references/modules/test-nuxt-seo/nuxt-seo/scripts/check.sh'), 'utf8')).resolves.toContain('seo')

    const manifest = JSON.parse(manifestRaw) as {
      modules: Array<{ packageName: string, scriptsIncluded: boolean, sourceKind: string, resolver: string, official: boolean }>
      skipped: Array<{ packageName: string, skillName: string, reason: string, sourceKind?: string }>
    }

    expect(manifest.modules.map(m => m.packageName)).toEqual(['test-nuxt-seo', 'test-nuxt-ui'])
    expect(manifest.modules.find(m => m.packageName === 'test-nuxt-seo')?.scriptsIncluded).toBe(true)
    expect(manifest.modules.find(m => m.packageName === 'test-nuxt-ui')?.scriptsIncluded).toBe(false)
    expect(manifest.modules.every(m => m.sourceKind === 'dist')).toBe(true)
    expect(manifest.modules.every(m => m.resolver === 'agentsField')).toBe(true)
    expect(manifest.modules.every(m => m.official)).toBe(true)
    expect(manifest.skipped).toContainEqual({
      packageName: 'test-nuxt-bad',
      skillName: 'nuxt-bad',
      reason: 'SKILL.md frontmatter must include non-empty "description"',
      sourceKind: 'dist',
    })
  })
})
