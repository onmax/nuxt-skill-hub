import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadCoreMetadata } from '../src/core-content'
import { PACKAGE_VERSION } from '../src/package-info'
import { loadVueSkillFiles } from '../src/vue-content'
import {
  createModuleWrapperContent,
  createSkillEntrypoint,
  createStableSkillWrapper,
  DEFAULT_CORE_CONTENT_METADATA,
} from '../src/render-content'

const testCacheRoot = join(tmpdir(), 'skill-hub-test-vue')

describe('createSkillEntrypoint', () => {
  it('loads core metadata from the in-code default source', async () => {
    await expect(loadCoreMetadata()).resolves.toEqual(DEFAULT_CORE_CONTENT_METADATA)
    expect(DEFAULT_CORE_CONTENT_METADATA.version).toBe(PACKAGE_VERSION)
  })

  it('omits the monorepo scope section for standalone apps', () => {
    const entry = createSkillEntrypoint('nuxt', DEFAULT_CORE_CONTENT_METADATA)

    expect(entry).toContain('# Nuxt Skill Index')
    expect(entry).toContain('## Activation Flow')
    expect(entry).toContain('## High-Frequency Nuxt Decisions')
    expect(entry).toContain('Explore the project first')
    expect(entry).toContain('## Precedence')
    expect(entry).toContain('## Before Completion')
    expect(entry).toContain('## Vue guidance')
    expect(entry).toContain('./references/vue/SKILL.md')
    expect(entry).not.toContain('## Monorepo Scope')
  })

  it('renders a hard monorepo scope warning when a scope path is provided', () => {
    const entry = createSkillEntrypoint('nuxt-web', DEFAULT_CORE_CONTENT_METADATA, 'apps/web')

    expect(entry).toContain('## Monorepo Scope')
    expect(entry).toContain('`apps/web`')
    expect(entry).toContain('Treat files and tasks outside `apps/web` as out of scope unless the user explicitly redirects you there.')
  })

  it('prioritizes the eval-derived disambiguation packs', () => {
    expect(DEFAULT_CORE_CONTENT_METADATA.packIds.slice(0, 4)).toEqual([
      'abstraction-disambiguation',
      'page-meta-head-layout',
      'error-surfaces-recovery',
      'verification-finish',
    ])
  })

  it('keeps the default skill app-oriented when module authoring is disabled', () => {
    const entry = createSkillEntrypoint('nuxt', DEFAULT_CORE_CONTENT_METADATA)

    expect(entry).not.toContain('## Module Author Focus')
    expect(entry).not.toContain('## Module author focus')
    expect(entry).not.toContain('Writing, refactoring, or publishing a Nuxt module')
  })

  it('layers module-author guidance on top of the default skill', () => {
    const entry = createSkillEntrypoint('nuxt', DEFAULT_CORE_CONTENT_METADATA, undefined, true)

    expect(entry).toContain('## Module Author Focus')
    expect(entry).toContain('## High-Frequency Nuxt Decisions')
    expect(entry).toContain('This skill keeps the default Nuxt app guidance and adds an authoring layer')
    expect(entry).toContain('Module Authoring Conventions')
    expect(entry).toContain('## Module author focus')
    expect(entry).toContain('Writing, refactoring, or publishing a Nuxt module')
  })
})

describe('createModuleWrapperContent', () => {
  it('renders compact metadata routers for generated module wrappers', () => {
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

    expect(createModuleWrapperContent(entry).trim()).toBe(`Docs: [https://i18n.nuxtjs.org](https://i18n.nuxtjs.org)

Source code: [https://github.com/nuxt-modules/i18n](https://github.com/nuxt-modules/i18n)`)
  })

  it('uses neutral labels for resolved module skills and omits missing versions in module lists', () => {
    const entry = createSkillEntrypoint('nuxt', DEFAULT_CORE_CONTENT_METADATA, undefined, false, [
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

    expect(entry).toContain('### Resolved module skills')
    expect(entry).toContain('[@nuxthub/core](./references/modules/nuxthub/nuxthub.md)')
    expect(entry).toContain('Resolved module skill. Trust: `official`.')
    expect(entry).not.toContain('GitHub-resolved')
    expect(entry).not.toContain('`unknown`')
  })
})

describe('createStableSkillWrapper', () => {
  it('renders a stable wrapper that points to generated build-dir content', () => {
    const entry = createStableSkillWrapper(
      'nuxt',
      '../../../apps/web/.nuxt/skill-hub/nuxt/SKILL.md',
      '../../../apps/web/.nuxt/skill-hub/nuxt',
      'prepare',
    )

    expect(entry).toContain('# Nuxt Skill Wrapper')
    expect(entry).toContain('The full generated skill tree lives in the Nuxt build directory')
    expect(entry).toContain('[../../../apps/web/.nuxt/skill-hub/nuxt/SKILL.md](../../../apps/web/.nuxt/skill-hub/nuxt/SKILL.md)')
    expect(entry).toContain('Run `nuxt prepare` from this project before continuing.')
  })

  it('explains manual mode recovery without pretending prepare will regenerate automatically', () => {
    const entry = createStableSkillWrapper('nuxt', './.nuxt/skill-hub/nuxt/SKILL.md', './.nuxt/skill-hub/nuxt', 'manual')

    expect(entry).toContain('Automatic skill generation is currently disabled')
    expect(entry).toContain('switch `skillHub.generationMode` to `\'prepare\'`')
  })
})

describe('bundled Vue content', () => {
  it('vendors the vue-best-practices skill with the must-read references', async () => {
    const files = await loadVueSkillFiles(testCacheRoot)

    expect(files['SKILL.md']).toContain('name: vue-best-practices')
    expect(files['SKILL.md']).toContain('references/reactivity.md')
    expect(files['SKILL.md']).toContain('references/sfc.md')
    expect(files['references/composables.md']).toContain('# Composable Organization Patterns')
  })
})
