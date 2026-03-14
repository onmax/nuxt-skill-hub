import { describe, expect, it } from 'vitest'
import { loadCoreMetadata } from '../src/core-content'
import { DEFAULT_CORE_CONTENT_METADATA, createModuleWrapperContent, createReferencesIndexContent, createSkillEntrypoint } from '../src/render-content'

describe('createSkillEntrypoint', () => {
  it('loads core metadata from the in-code default source', async () => {
    await expect(loadCoreMetadata()).resolves.toEqual(DEFAULT_CORE_CONTENT_METADATA)
  })

  it('omits the monorepo scope section for standalone apps', () => {
    const entry = createSkillEntrypoint('nuxt', DEFAULT_CORE_CONTENT_METADATA)

    expect(entry).toContain('# Nuxt Skill Index')
    expect(entry).toContain('## Activation Flow')
    expect(entry).toContain('## High-Frequency Nuxt Decisions')
    expect(entry).toContain('Explore the project first')
    expect(entry).toContain('## Precedence')
    expect(entry).toContain('## Before Completion')
    expect(entry).not.toContain('## Monorepo Scope')
  })

  it('renders a hard monorepo scope warning when a scope path is provided', () => {
    const entry = createSkillEntrypoint('nuxt-web', DEFAULT_CORE_CONTENT_METADATA, 'apps/web')

    expect(entry).toContain('## Monorepo Scope')
    expect(entry).toContain('`apps/web`')
    expect(entry).toContain('Treat files and tasks outside `apps/web` as out of scope unless the user explicitly redirects you there.')
  })

  it('prioritizes the eval-derived disambiguation packs', () => {
    expect(DEFAULT_CORE_CONTENT_METADATA.sections.slice(0, 6)).toEqual([
      'abstraction-disambiguation',
      'page-meta-head-layout',
      'error-surfaces-recovery',
      'content-modeling-navigation',
      'nuxt-ui-primitives',
      'verification-finish',
    ])
  })

  it('keeps the default skill app-oriented when module authoring is disabled', () => {
    const entry = createSkillEntrypoint('nuxt', DEFAULT_CORE_CONTENT_METADATA)
    const index = createReferencesIndexContent(DEFAULT_CORE_CONTENT_METADATA, [])

    expect(entry).not.toContain('## Module Author Focus')
    expect(index).not.toContain('## Module author focus')
    expect(index).not.toContain('Writing, refactoring, or publishing a Nuxt module')
  })

  it('layers module-author guidance on top of the default skill', () => {
    const entry = createSkillEntrypoint('nuxt', DEFAULT_CORE_CONTENT_METADATA, undefined, true)
    const index = createReferencesIndexContent(DEFAULT_CORE_CONTENT_METADATA, [], [], true)

    expect(entry).toContain('## Module Author Focus')
    expect(entry).toContain('## High-Frequency Nuxt Decisions')
    expect(entry).toContain('This skill keeps the default Nuxt app guidance and adds an authoring layer')
    expect(entry).toContain('Module Authoring Conventions')
    expect(index).toContain('## Module author focus')
    expect(index).toContain('Writing, refactoring, or publishing a Nuxt module')
  })
})

describe('createModuleWrapperContent', () => {
  it('renders compact metadata routers by default and keeps the verbose fallback behind a flag', () => {
    const entry = {
      packageName: '@nuxtjs/i18n',
      version: undefined,
      skillName: 'i18n',
      description: 'i18n features for your Nuxt project so you can easily add internationalization.',
      scriptsIncluded: false,
      sourceKind: 'generated' as const,
      sourceLabel: 'Metadata-routed skill',
      repoUrl: 'https://github.com/nuxt-modules/i18n',
      docsUrl: 'https://i18n.nuxtjs.org',
      official: true,
      trustLevel: 'official' as const,
      resolver: 'metadataRouter' as const,
    }

    expect(createModuleWrapperContent(entry).trim()).toBe(`- Docs: [https://i18n.nuxtjs.org](https://i18n.nuxtjs.org)
- Source code: [https://github.com/nuxt-modules/i18n](https://github.com/nuxt-modules/i18n)`)

    const verbose = createModuleWrapperContent(entry, { fallbackLinksOnly: false })
    expect(verbose).toContain('# @nuxtjs/i18n Module Wrapper')
    expect(verbose).toContain('Metadata-routed skill')
    expect(verbose).toContain('Installed version: _not detected_')
    expect(verbose).toContain('## How to use it')
  })

  it('uses neutral labels for resolved module skills and omits missing versions in module lists', () => {
    const index = createReferencesIndexContent(DEFAULT_CORE_CONTENT_METADATA, [
      {
        packageName: '@nuxthub/core',
        version: undefined,
        skillName: 'nuxthub',
        description: 'NuxtHub support.',
        scriptsIncluded: false,
        sourceKind: 'github' as const,
        repoUrl: 'https://github.com/nuxt-hub/core',
        docsUrl: 'https://hub.nuxt.com',
        official: true,
        trustLevel: 'official' as const,
        resolver: 'agentsField' as const,
        wrapperPath: 'references/modules/nuxthub/nuxthub.md',
      },
    ])

    expect(index).toContain('### Resolved module skills')
    expect(index).toContain('[@nuxthub/core](./modules/nuxthub/nuxthub.md)')
    expect(index).toContain('Resolved module skill. Trust: `official`.')
    expect(index).not.toContain('GitHub-resolved')
    expect(index).not.toContain('`unknown`')
  })
})
