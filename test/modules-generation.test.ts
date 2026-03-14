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
    const entry = await fsp.readFile(join(skillRoot, 'SKILL.md'), 'utf8')
    const metadataSkill = await fsp.readFile(join(skillRoot, 'references/modules/test-meta-router/test-meta-router/SKILL.md'), 'utf8')

    expect(entry).toContain('## Module guides')
    expect(entry).toContain('### Official upstream skills')
    expect(entry).toContain('### Metadata-routed skills')
    expect(entry).toContain('### Skipped or unavailable')
    expect(entry).toContain('test-nuxt-ui')
    expect(entry).toContain('test-nuxt-bad')
    expect(entry).toContain('test-meta-router')
    expect(entry).toContain('./references/modules/test-meta-router/test-meta-router/SKILL.md')
    expect(metadataSkill).toContain('Docs: [https://example.com/test-meta-router](https://example.com/test-meta-router)')
    expect(metadataSkill).toContain('Source code: [https://github.com/example/test-meta-router](https://github.com/example/test-meta-router)')
    expect(metadataSkill).not.toContain('This skill was generated from package metadata')

    await expect(fsp.readFile(join(skillRoot, 'references/modules/test-nuxt-ui/nuxt-ui/SKILL.md'), 'utf8')).resolves.toContain('description: Test Nuxt UI module skill.')
    await expect(fsp.readFile(join(skillRoot, 'references/modules/test-nuxt-seo/nuxt-seo/SKILL.md'), 'utf8')).resolves.toContain('description: Test Nuxt SEO module skill.')
    await expect(fsp.access(join(skillRoot, 'references/modules/test-nuxt-bad/nuxt-bad/SKILL.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/modules/_list.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/modules/test-nuxt-ui/nuxt-ui.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/modules/test-nuxt-seo/nuxt-seo.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/modules/test-meta-router/test-meta-router.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/index.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'manifest.json'))).rejects.toBeDefined()

    await expect(fsp.access(join(skillRoot, 'references/modules/test-nuxt-ui/nuxt-ui/scripts/check.sh'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/modules/test-nuxt-seo/nuxt-seo/scripts/check.sh'))).rejects.toBeDefined()
  })
})
