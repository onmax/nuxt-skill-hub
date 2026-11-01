import { buildFileTree, getAvailablePlaygroundFilePath } from '../docs/app/data/skill-files'
import { describe, expect, it } from 'vitest'
import { resolveSkillAvailability } from '../docs/app/data/skill-packages'
import {
  createMetadataRouterSkillFiles,
  resolveMetadataRouterSkillName,
} from '../shared/skill-render'

describe('docs playground metadata routing', () => {
  it('distinguishes generated and unavailable module guidance on the client', () => {
    // 'real' is now resolved server-side via dynamic GitHub discovery
    expect(resolveSkillAvailability('@nuxt/a11y', 'https://github.com/nuxt/a11y', 'https://a11y.nuxt.com')).toBe('generated')
    expect(resolveSkillAvailability('unknown-module')).toBe('unavailable')
  })

  it('builds metadata-routed preview files', () => {
    const skillName = resolveMetadataRouterSkillName('@nuxt/a11y')
    const files = createMetadataRouterSkillFiles({
      packageName: '@nuxt/a11y',
      skillName,
      repoUrl: 'https://github.com/nuxt/a11y',
      docsUrl: 'https://a11y.nuxt.com',
    })

    expect(skillName).toBe('nuxt-a11y')
    expect(files['SKILL.md']).toContain('Docs: [https://a11y.nuxt.com](https://a11y.nuxt.com)')
    expect(files['SKILL.md']).toContain('Source code: [https://github.com/nuxt/a11y](https://github.com/nuxt/a11y)')
    expect(files['SKILL.md']).not.toContain('This skill was generated from package metadata')
    expect(files['references/index.md']).toBeUndefined()
  })

  it('builds selectable paths for framework files', () => {
    const tree = buildFileTree(['index.md', 'rules/abstraction-disambiguation.md'], ['SKILL.md', 'references/reactivity.md'], [])

    expect(tree[0]).toMatchObject({ label: 'SKILL.md', value: 'SKILL.md' })
    expect(tree[1]?.children).toMatchObject([
      {
        label: 'nuxt',
        children: [
          { label: 'rules', children: [{ value: 'references/nuxt/rules/abstraction-disambiguation.md' }] },
          { label: 'index.md', value: 'references/nuxt/index.md' },
        ],
      },
      {
        label: 'vue',
        children: [
          { label: 'references', children: [{ value: 'references/vue/references/reactivity.md' }] },
          { label: 'SKILL.md', value: 'references/vue/SKILL.md' },
        ],
      },
    ])
  })

  it('hides modules folder when no modules are selected', () => {
    const tree = buildFileTree(['index.md', 'rules/abstraction-disambiguation.md'], ['SKILL.md'], [])
    const serialized = JSON.stringify(tree)

    expect(serialized).not.toContain('"label":"modules"')
  })

  it('shows modules folder when modules have files', () => {
    const tree = buildFileTree(['index.md'], ['SKILL.md'], ['nuxthub'], { nuxthub: ['SKILL.md'] })
    const serialized = JSON.stringify(tree)

    expect(serialized).toContain('"label":"modules"')
    expect(serialized).toContain('"label":"nuxthub"')
  })

  it('falls back to the root skill when a selected module file disappears', () => {
    const availablePaths = ['SKILL.md']

    expect(getAvailablePlaygroundFilePath('references/modules/nuxt-ui/SKILL.md', availablePaths)).toBe('SKILL.md')
    expect(getAvailablePlaygroundFilePath('SKILL.md', availablePaths)).toBe('SKILL.md')
  })
})
