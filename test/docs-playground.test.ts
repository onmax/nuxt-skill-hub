import { buildFileTree, getAvailablePlaygroundFilePath, MODULES_LIST_FILE_PATH } from '../docs/app/data/skill-files'
import { describe, expect, it } from 'vitest'
import { resolveSkillAvailability } from '../docs/app/data/skill-packages'
import {
  createMetadataRouterSkillFiles,
  createModuleWrapperContent,
  createModulesListMarkdown,
  createSkillEntrypoint,
  DEFAULT_CORE_CONTENT_METADATA,
  EMPTY_MODULE_GUIDANCE_MARKDOWN,
  resolveMetadataRouterSkillName,
} from '../shared/skill-render'

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
    expect(files['SKILL.md']).toContain('## Upstream sources')
    expect(files['references/index.md']).toBeUndefined()
  })

  it('renders additive module-author preview content when enabled', () => {
    const entry = createSkillEntrypoint('nuxt', DEFAULT_CORE_CONTENT_METADATA, undefined, true)

    expect(entry).toContain('## Module Author Focus')
    expect(entry).toContain('## Module author focus')
    expect(entry).toContain('Writing, refactoring, or publishing a Nuxt module')
    expect(entry).toContain('## Vue guidance')
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
    const entry = createSkillEntrypoint('nuxt', DEFAULT_CORE_CONTENT_METADATA, undefined, false, [
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

    expect(entry).toContain('### Resolved module skills')
    expect(entry).toContain('Resolved module skill. Trust: `official`.')
    expect(entry).not.toContain('GitHub-resolved')
    expect(entry).not.toContain('`unknown`')
  })

  it('does not expose framework metadata.json in the preview file tree', () => {
    const tree = buildFileTree(['index.md', 'rules/abstraction-disambiguation.md'], ['SKILL.md', 'references/reactivity.md'], [])
    const serialized = JSON.stringify(tree)

    expect(serialized).not.toContain('metadata.json')
    expect(serialized).not.toContain('references/nuxt/metadata.json')
    expect(serialized).not.toContain('references/vue/metadata.json')
    expect(serialized).not.toContain('references/index.md')
    expect(serialized).toContain('"label":"nuxt"')
    expect(serialized).toContain('"label":"vue"')
  })

  it('always includes the generated modules list in the preview tree', () => {
    const tree = buildFileTree(['index.md', 'rules/abstraction-disambiguation.md'], ['SKILL.md'], [])
    const serialized = JSON.stringify(tree)

    expect(serialized).toContain('"label":"modules"')
    expect(serialized).toContain(`"value":"${MODULES_LIST_FILE_PATH}"`)
  })

  it('renders the same empty module list markdown as package generation', () => {
    expect(createModulesListMarkdown([], [])).toBe(`${EMPTY_MODULE_GUIDANCE_MARKDOWN}\n`)
  })

  it('falls back to the generated module list when a selected module file disappears', () => {
    const availablePaths = ['SKILL.md', MODULES_LIST_FILE_PATH]

    expect(getAvailablePlaygroundFilePath('references/modules/nuxt-ui/SKILL.md', availablePaths)).toBe(MODULES_LIST_FILE_PATH)
    expect(getAvailablePlaygroundFilePath(MODULES_LIST_FILE_PATH, availablePaths)).toBe(MODULES_LIST_FILE_PATH)
  })
})
