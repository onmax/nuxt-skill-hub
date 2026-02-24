import { promises as fsp } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

const rootDir = fileURLToPath(new URL('./fixtures/with-modules', import.meta.url))

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

    await expect(fsp.readFile(join(skillRoot, 'references/modules/test-nuxt-ui/nuxt-ui/SKILL.md'), 'utf8')).resolves.toContain('Test Nuxt UI Skill')
    await expect(fsp.readFile(join(skillRoot, 'references/modules/test-nuxt-seo/nuxt-seo/SKILL.md'), 'utf8')).resolves.toContain('Test Nuxt SEO Skill')

    await expect(fsp.access(join(skillRoot, 'references/modules/test-nuxt-ui/nuxt-ui/scripts/check.sh'))).rejects.toBeDefined()
    await expect(fsp.readFile(join(skillRoot, 'references/modules/test-nuxt-seo/nuxt-seo/scripts/check.sh'), 'utf8')).resolves.toContain('seo')

    const manifest = JSON.parse(manifestRaw) as {
      modules: Array<{ packageName: string, scriptsIncluded: boolean }>
    }

    expect(manifest.modules.map(m => m.packageName)).toEqual(['test-nuxt-seo', 'test-nuxt-ui'])
    expect(manifest.modules.find(m => m.packageName === 'test-nuxt-seo')?.scriptsIncluded).toBe(true)
    expect(manifest.modules.find(m => m.packageName === 'test-nuxt-ui')?.scriptsIncluded).toBe(false)
  })
})
