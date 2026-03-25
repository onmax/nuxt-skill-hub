import { promises as fsp } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { resolveGeneratedSkillRoot } from './utils'

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

describe('module-expanded generation', () => {
  it('writes merged module references into the build-dir output without copying scripts by default', async () => {
    execSync('pnpm exec nuxt prepare', { cwd: rootDir, encoding: 'utf8', stdio: 'pipe' })

    const skillRoot = join(workspaceRoot, '.claude', 'skills', 'nuxt-with-modules-fixture')
    const wrapper = await fsp.readFile(join(skillRoot, 'SKILL.md'), 'utf8')
    const generatedSkillRoot = resolveGeneratedSkillRoot(skillRoot, wrapper)
    const entry = await fsp.readFile(join(generatedSkillRoot, 'SKILL.md'), 'utf8')
    const metadataSkill = await fsp.readFile(join(generatedSkillRoot, 'references/modules/test-meta-router/test-meta-router/SKILL.md'), 'utf8')

    expect(wrapper).toContain('# Nuxt Skill Wrapper')
    expect(wrapper).toContain('Run `nuxt prepare` from this project before continuing.')
    expect(entry).toContain('## Module guides')
    expect(entry).toContain('### Official upstream skills')
    expect(entry).toContain('### Metadata-routed skills')
    expect(entry).toContain('### Skipped or unavailable')
    expect(entry).toContain('test-nuxt-ui')
    expect(entry).toContain('test-nuxt-bad')
    expect(entry).toContain('test-meta-router')
    expect(metadataSkill).toContain('Docs: [https://example.com/test-meta-router](https://example.com/test-meta-router)')
    expect(metadataSkill).toContain('Source code: [https://github.com/example/test-meta-router](https://github.com/example/test-meta-router)')
    await expect(fsp.readFile(join(generatedSkillRoot, 'references/modules/test-nuxt-ui/nuxt-ui/SKILL.md'), 'utf8')).resolves.toContain('description: Test Nuxt UI module skill.')
    await expect(fsp.readFile(join(generatedSkillRoot, 'references/modules/test-nuxt-seo/nuxt-seo/SKILL.md'), 'utf8')).resolves.toContain('description: Test Nuxt SEO module skill.')
    await expect(fsp.access(join(generatedSkillRoot, 'references/modules/test-nuxt-ui/nuxt-ui/scripts/check.sh'))).rejects.toBeDefined()
    await expect(fsp.access(join(generatedSkillRoot, 'references/modules/test-nuxt-seo/nuxt-seo/scripts/check.sh'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'references/index.md'))).rejects.toBeDefined()
    await expect(fsp.access(join(skillRoot, 'manifest.json'))).rejects.toBeDefined()
  }, 15000)
})
