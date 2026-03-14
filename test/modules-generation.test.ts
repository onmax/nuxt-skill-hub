import { promises as fsp } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

const rootDir = fileURLToPath(new URL('./fixtures/with-modules', import.meta.url))
const workspaceRoot = resolve(rootDir, '../../..')

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

async function writeMetadataRouterFixtureModule(
  pkgName: string,
  version: string,
  homepage: string,
  repository: string,
  description: string,
): Promise<void> {
  const moduleRoot = join(rootDir, 'node_modules', pkgName)

  await fsp.mkdir(moduleRoot, { recursive: true })
  await fsp.writeFile(join(moduleRoot, 'package.json'), JSON.stringify({
    name: pkgName,
    version,
    type: 'module',
    main: './module.mjs',
    homepage,
    repository,
    description,
  }, null, 2), 'utf8')

  await fsp.writeFile(join(moduleRoot, 'module.mjs'), `import { defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: '${pkgName}',
  },
  setup() {},
})
`, 'utf8')
}

async function prepareFixtureModules(): Promise<void> {
  await writeFixtureModule('test-nuxt-ui', '0.1.0', 'nuxt-ui', 'Test Nuxt UI module skill.', '#!/usr/bin/env sh\necho ui\n')
  await writeFixtureModule('test-nuxt-seo', '0.2.0', 'nuxt-seo', 'Test Nuxt SEO module skill.', '#!/usr/bin/env sh\necho seo\n')
  await writeFixtureModule('test-nuxt-bad', '0.0.1', 'nuxt-bad')
  await writeMetadataRouterFixtureModule(
    'test-meta-router',
    '0.3.0',
    'https://example.com/test-meta-router',
    'https://github.com/example/test-meta-router',
    'Generated from package metadata.',
  )
}

await prepareFixtureModules()
await setup({ rootDir })

describe('module-expanded generation', () => {
  it('renders app and generates merged module references without copying scripts by default', async () => {
    const html = await $fetch('/')
    expect(html).toContain('<div>with-modules</div>')

    const skillRoot = join(workspaceRoot, '.claude', 'skills', 'nuxt-with-modules-fixture')
    const index = await fsp.readFile(join(skillRoot, 'references/index.md'), 'utf8')
    const modulesList = await fsp.readFile(join(skillRoot, 'references/modules/_list.md'), 'utf8')
    const manifestRaw = await fsp.readFile(join(skillRoot, 'manifest.json'), 'utf8')
    const uiWrapper = await fsp.readFile(join(skillRoot, 'references/modules/test-nuxt-ui/nuxt-ui.md'), 'utf8')
    const seoWrapper = await fsp.readFile(join(skillRoot, 'references/modules/test-nuxt-seo/nuxt-seo.md'), 'utf8')
    const metadataWrapper = await fsp.readFile(join(skillRoot, 'references/modules/test-meta-router/test-meta-router.md'), 'utf8')

    expect(index).toContain('## Module guides')
    expect(index).toContain('### Official upstream skills')
    expect(index).toContain('### Metadata-routed skills')
    expect(index).toContain('### Skipped or unavailable')
    expect(index).toContain('test-nuxt-ui')
    expect(index).toContain('test-nuxt-bad')
    expect(index).toContain('test-meta-router')
    expect(modulesList).toContain('./test-nuxt-ui/nuxt-ui.md')
    expect(modulesList).toContain('./test-meta-router/test-meta-router.md')
    expect(modulesList).toContain('Use the relevant core pack plus the module\'s official docs.')
    expect(uiWrapper).toContain('# test-nuxt-ui Module Wrapper')
    expect(uiWrapper).toContain('Trust: `official`')
    expect(uiWrapper).toContain('## Delta-only rule')
    expect(uiWrapper).toContain('Module guidance is a delta on top of core Nuxt guidance.')
    expect(uiWrapper).toContain('Module scripts were not copied into this generated output.')
    expect(uiWrapper).toContain('./nuxt-ui/SKILL.md')
    expect(seoWrapper).toContain('Module scripts were not copied into this generated output.')
    expect(metadataWrapper).toContain('Metadata-routed skill')
    expect(metadataWrapper).toContain('[https://example.com/test-meta-router](https://example.com/test-meta-router)')
    expect(metadataWrapper).toContain('This module router was generated from package metadata.')

    await expect(fsp.readFile(join(skillRoot, 'references/modules/test-nuxt-ui/nuxt-ui/SKILL.md'), 'utf8')).resolves.toContain('description: Test Nuxt UI module skill.')
    await expect(fsp.readFile(join(skillRoot, 'references/modules/test-nuxt-seo/nuxt-seo/SKILL.md'), 'utf8')).resolves.toContain('description: Test Nuxt SEO module skill.')
    await expect(fsp.readFile(join(skillRoot, 'references/modules/test-meta-router/test-meta-router/SKILL.md'), 'utf8')).resolves.toContain('This skill was generated from package metadata')
    await expect(fsp.access(join(skillRoot, 'references/modules/test-nuxt-bad/nuxt-bad/SKILL.md'))).rejects.toBeDefined()

    await expect(fsp.access(join(skillRoot, 'references/modules/test-nuxt-ui/nuxt-ui/scripts/check.sh'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/modules/test-nuxt-seo/nuxt-seo/scripts/check.sh'))).rejects.toBeDefined()

    const manifest = JSON.parse(manifestRaw) as {
      modules: Array<{
        packageName: string
        scriptsIncluded: boolean
        sourceKind: string
        sourceLabel: string
        resolver: string
        official: boolean
        trustLevel: string
        wrapperPath?: string
        description?: string
        repoUrl?: string
        docsUrl?: string
      }>
      skipped: Array<{ packageName: string, skillName: string, reason: string, sourceKind?: string }>
    }

    expect(manifest.modules.map(m => m.packageName)).toEqual(['test-meta-router', 'test-nuxt-seo', 'test-nuxt-ui'])
    expect(manifest.modules.find(m => m.packageName === 'test-meta-router')?.sourceKind).toBe('generated')
    expect(manifest.modules.find(m => m.packageName === 'test-meta-router')?.resolver).toBe('metadataRouter')
    expect(manifest.modules.find(m => m.packageName === 'test-meta-router')?.sourceLabel).toBe('Metadata-routed skill')
    expect(manifest.modules.find(m => m.packageName === 'test-meta-router')?.repoUrl).toBe('https://github.com/example/test-meta-router')
    expect(manifest.modules.find(m => m.packageName === 'test-meta-router')?.docsUrl).toBe('https://example.com/test-meta-router')
    expect(manifest.modules.find(m => m.packageName === 'test-nuxt-seo')?.scriptsIncluded).toBe(false)
    expect(manifest.modules.find(m => m.packageName === 'test-nuxt-ui')?.scriptsIncluded).toBe(false)
    expect(manifest.modules.every(m => m.official)).toBe(true)
    expect(manifest.modules.every(m => m.trustLevel === 'official')).toBe(true)
    expect(manifest.modules.find(m => m.packageName === 'test-nuxt-ui')?.wrapperPath).toBe('references/modules/test-nuxt-ui/nuxt-ui.md')
    expect(manifest.modules.find(m => m.packageName === 'test-nuxt-ui')?.description).toBe('Test Nuxt UI module skill.')
    expect(manifest.skipped).toContainEqual({
      packageName: 'test-nuxt-bad',
      skillName: 'nuxt-bad',
      reason: 'SKILL.md frontmatter must include non-empty "description"',
      sourceKind: 'dist',
    })
  })
})
