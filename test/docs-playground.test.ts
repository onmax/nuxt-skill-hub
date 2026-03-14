import { buildFileTree } from '../docs/app/data/skill-files'
import { describe, expect, it } from 'vitest'
import { resolveSkillAvailability } from '../docs/app/data/skill-packages'
import { createMetadataRouterSkillFiles, createModuleWrapperContent, createReferencesIndexContent, createSkillEntrypoint, DEFAULT_CORE_CONTENT_METADATA, resolveMetadataRouterSkillName } from '../shared/skill-render'

describe('docs playground metadata routing', () => {
  it('distinguishes real, generated, and unavailable module guidance', () => {
    expect(resolveSkillAvailability('@nuxt/ui')).toBe('real')
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
    expect(files['SKILL.md']).toContain('This skill was generated from package metadata')
    expect(files['SKILL.md']).toContain('[https://github.com/nuxt/a11y](https://github.com/nuxt/a11y)')
    expect(files['SKILL.md']).toContain('Keep this router scoped to `@nuxt/a11y` surfaces only.')
    expect(files['references/index.md']).toContain('Official docs')
  })

  it('renders additive module-author preview content when enabled', () => {
    const entry = createSkillEntrypoint('nuxt', DEFAULT_CORE_CONTENT_METADATA, undefined, true)
    const index = createReferencesIndexContent(DEFAULT_CORE_CONTENT_METADATA, [], [], true)

    expect(entry).toContain('## Module Author Focus')
    expect(index).toContain('## Module author focus')
    expect(index).toContain('Writing, refactoring, or publishing a Nuxt module')
  })

  it('keeps generated preview wrappers compact by default', () => {
    const entry = {
      packageName: '@nuxt/a11y',
      version: undefined,
      skillName: 'nuxt-a11y',
      description: 'Accessibility module.',
      scriptsIncluded: false,
      sourceKind: 'generated' as const,
      sourceLabel: 'Metadata-routed skill',
      repoUrl: 'https://github.com/nuxt/a11y',
      docsUrl: 'https://a11y.nuxt.com',
      official: true,
      trustLevel: 'official' as const,
      resolver: 'metadataRouter' as const,
    }

    expect(createModuleWrapperContent(entry).trim()).toBe(`- Docs: [https://a11y.nuxt.com](https://a11y.nuxt.com)
- Source code: [https://github.com/nuxt/a11y](https://github.com/nuxt/a11y)`)
  })

  it('uses neutral labels for resolved preview skills and hides missing versions', () => {
    const index = createReferencesIndexContent(DEFAULT_CORE_CONTENT_METADATA, [
      {
        packageName: '@nuxthub/core',
        version: undefined,
        skillName: 'nuxthub',
        description: 'NuxtHub support.',
        scriptsIncluded: false,
        sourceKind: 'github' as const,
        sourceLabel: 'Resolved module skill',
        repoUrl: 'https://github.com/nuxthub/core',
        docsUrl: 'https://hub.nuxt.com',
        official: true,
        trustLevel: 'official' as const,
        resolver: 'agentsField' as const,
        wrapperPath: 'references/modules/nuxthub/nuxthub.md',
      },
    ])

    expect(index).toContain('### Resolved module skills')
    expect(index).toContain('Resolved module skill. Trust: `official`.')
    expect(index).not.toContain('GitHub-resolved')
    expect(index).not.toContain('`unknown`')
  })

  it('does not expose core metadata.json in the preview file tree', () => {
    const tree = buildFileTree(['rules/abstraction-disambiguation.md'], [])
    const serialized = JSON.stringify(tree)

    expect(serialized).not.toContain('metadata.json')
    expect(serialized).not.toContain('references/core/metadata.json')
  })
})
