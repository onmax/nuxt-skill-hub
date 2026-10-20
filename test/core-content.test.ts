import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadNuxtRuleFiles } from '../src/nuxt-content'
import { PACKAGE_VERSION } from '../shared/package-info'
import { loadVueSkillFiles } from '../src/vue-content'
import {
  createModuleWrapperContent,
  createModuleIndex,
  createSkillEntrypoint,
  createStableSkillWrapper,
  DEFAULT_NUXT_CONTENT_METADATA,
  selectLinkedPacks,
  SKILL_DESCRIPTION,
  type SkillEntrypointOptions,
} from '../shared/skill-render'

const testCacheRoot = join(tmpdir(), 'skill-hub-test-vue')

describe('createSkillEntrypoint', () => {
  it('stamps core metadata with the package version', () => {
    expect(DEFAULT_NUXT_CONTENT_METADATA.version).toBe(PACKAGE_VERSION)
  })

  it('has exactly one pack entry per rule file', async () => {
    const ruleFiles = Object.keys(await loadNuxtRuleFiles()).sort()
    const packPaths = DEFAULT_NUXT_CONTENT_METADATA.packs.map(pack => pack.relativePath).sort()

    expect(packPaths).toEqual(ruleFiles)
    expect(new Set(DEFAULT_NUXT_CONTENT_METADATA.packs.map(pack => pack.id)).size).toBe(packPaths.length)
  })

  it('uses each rule file title as the pack title', async () => {
    const ruleFiles = await loadNuxtRuleFiles()

    for (const pack of DEFAULT_NUXT_CONTENT_METADATA.packs) {
      expect(ruleFiles[pack.relativePath]!.split('\n')[0], pack.id).toBe(`## ${pack.title}`)
    }
  })

  it('omits the monorepo scope section for standalone apps', () => {
    const entry = createSkillEntrypoint('nuxt', DEFAULT_NUXT_CONTENT_METADATA)

    expect(entry).toContain('# Nuxt Skill Router')
    expect(entry).toContain('## Loading rules')
    expect(entry).toContain('## Routing')
    expect(entry).toContain('| Task shape or symptom | Example request | Open first |')
    expect(entry).toContain('./references/vue/SKILL.md')
    expect(entry).toContain('"This page fetches twice on first load"')
    expect(entry).toContain('"Why do I get a hydration mismatch from Date.now()?"')
    expect(entry).toContain('"Change canonical URL and OG tags"')
    expect(entry).toContain('"Expose only the public runtimeConfig key"')
    expect(entry).toContain('"This server/api handler cache or route rule is wrong"')
    expect(entry).toContain('"`clearError` is not behaving as expected"')
    expect(entry).toContain('"Should this secret live in runtime config or client code?"')
    expect(entry).toContain('Hydration and SSR Consistency')
    expect(entry).toContain('Server Routes, h3 Patterns, and Runtime Config')
    expect(entry).toContain('Nitro and h3 Server Patterns')
    expect(entry).toContain('Plugins and Runtime Boot')
    expect(entry).toContain('Performance and Rendering')
    expect(entry).toContain('Migrations and Compatibility')
    expect(entry).toContain('Verification and Finish')
    expect(entry).toContain('## Finish')
    expect(entry).not.toContain('## Monorepo scope')
    expect(entry).not.toContain('## Activation Flow')
    expect(entry).not.toContain('## High-Frequency Nuxt Decisions')
    expect(entry).not.toContain('## Precedence')
    expect(entry).not.toContain('## Before Completion')
    expect(entry).not.toContain('## Vue guidance')
    expect(entry).not.toContain('## All Nuxt packs')
    expect(entry).not.toContain('## Primary Packs')
    expect(entry).not.toContain('Installed module APIs')
    expect(entry).not.toContain('Nuxt UI Primitives')
    expect(entry).not.toContain('Content Modeling and Navigation')
    expect(entry).not.toContain('references/nuxt/index.md')
  })

  it('renders a hard monorepo scope warning when a scope path is provided', () => {
    const entry = createSkillEntrypoint('nuxt-web', DEFAULT_NUXT_CONTENT_METADATA, { monorepoScopePath: 'apps/web' })

    expect(entry).toContain('## Monorepo scope')
    expect(entry).toContain('`apps/web`')
    expect(entry).toContain('This skill applies only to `apps/web`.')
    expect(entry).toContain('Treat files and tasks outside that subtree as out of scope unless the user explicitly redirects you there.')
  })

  it('puts disambiguation before routing and verification in the finish step', () => {
    const entry = createSkillEntrypoint('nuxt', DEFAULT_NUXT_CONTENT_METADATA)
    const loadingRules = entry.slice(entry.indexOf('## Loading rules'), entry.indexOf('## Routing'))
    const finish = entry.slice(entry.indexOf('## Finish'))

    expect(loadingRules).toContain('[Abstraction Disambiguation](./references/nuxt/rules/abstraction-disambiguation.md)')
    expect(finish).toContain('[Verification and Finish](./references/nuxt/rules/verification-finish.md)')
  })

  it('routes module-specific packs only when their package is installed', () => {
    const entry = createSkillEntrypoint('nuxt', DEFAULT_NUXT_CONTENT_METADATA, {
      installedPackages: ['@nuxt/ui', '@nuxt/content'],
    })

    expect(entry).toContain('[Nuxt UI Primitives](./references/nuxt/rules/nuxt-ui-primitives.md)')
    expect(entry).toContain('[Content Modeling and Navigation](./references/nuxt/rules/content-modeling-navigation.md)')
  })

  it.each([
    ['a plain app', {}],
    ['module authoring', { moduleAuthoring: true }],
    ['Nuxt UI', { installedPackages: ['@nuxt/ui'] }],
    ['a module skill for Nuxt Content', { entries: [{ packageName: '@nuxt/content', skillName: 'nuxt-content', scriptsIncluded: false, sourceKind: 'dist', official: true, resolver: 'agentsField' }] }],
    ['every gated pack', { moduleAuthoring: true, installedPackages: DEFAULT_NUXT_CONTENT_METADATA.packs.flatMap(pack => pack.packages || []) }],
  ] satisfies Array<[string, SkillEntrypointOptions]>)('links exactly the packs it selects for %s', (_label, options) => {
    const entry = createSkillEntrypoint('nuxt', DEFAULT_NUXT_CONTENT_METADATA, options)
    const linked = new Set(Array.from(entry.matchAll(/\]\(\.\/references\/nuxt\/([^)]+)\)/g), match => match[1]))

    expect([...linked].sort()).toEqual(selectLinkedPacks(DEFAULT_NUXT_CONTENT_METADATA, options).map(pack => pack.relativePath).sort())
  })

  it('links every pack when all gates are open', () => {
    const packs = selectLinkedPacks(DEFAULT_NUXT_CONTENT_METADATA, {
      moduleAuthoring: true,
      installedPackages: DEFAULT_NUXT_CONTENT_METADATA.packs.flatMap(pack => pack.packages || []),
    })

    expect(packs).toEqual(DEFAULT_NUXT_CONTENT_METADATA.packs)
  })

  it('keeps the default skill app-oriented when module authoring is disabled', () => {
    const entry = createSkillEntrypoint('nuxt', DEFAULT_NUXT_CONTENT_METADATA)

    expect(entry).not.toContain('"Add a Nuxt module option, hook, or runtime extension"')
    expect(entry).not.toContain('Writing or refactoring a Nuxt module')
  })

  it('layers module-author guidance on top of the default skill', () => {
    const entry = createSkillEntrypoint('nuxt', DEFAULT_NUXT_CONTENT_METADATA, { moduleAuthoring: true })

    expect(entry).toContain('Module Authoring Conventions')
    expect(entry).toContain('Writing or refactoring a Nuxt module (`defineNuxtModule`, hooks, public APIs)')
    expect(entry).toContain('"Add a Nuxt module option, hook, or runtime extension"')
    expect(entry).not.toContain('## Module authoring')
    expect(entry).not.toContain('## Module Author Focus')
    expect(entry).not.toContain('## Module author focus')
  })
})

describe('createModuleWrapperContent', () => {
  it('renders scoped metadata routers for generated module wrappers', () => {
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

    const content = createModuleWrapperContent(entry)
    expect(content).toContain('# @nuxtjs/i18n Module Router')
    expect(content).toContain('Docs: [https://i18n.nuxtjs.org](https://i18n.nuxtjs.org)')
    expect(content).toContain('Source code: [https://github.com/nuxt-modules/i18n](https://github.com/nuxt-modules/i18n)')
    expect(content).toContain('Start with the relevant route in the parent Nuxt skill')
  })

  it('keeps the root module section compact and moves details to the module index', () => {
    const entry = createSkillEntrypoint('nuxt', DEFAULT_NUXT_CONTENT_METADATA, { entries: [
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
    ] })

    expect(entry).toContain('## Module guides')
    expect(entry).toContain('[Module guide index](./references/modules/index.md)')
    expect(entry).toContain('Installed module APIs, options, components, or composables: `@nuxthub/core`')
    expect(entry).toContain('1 resolved')
    expect(entry).not.toContain('### Resolved module skills')
    expect(entry).not.toContain('[@nuxthub/core](./references/modules/nuxthub/nuxthub.md)')
    expect(entry).not.toContain('GitHub-resolved')
    expect(entry).not.toContain('`unknown`')
  })

  it('renders detailed module entries in the module index', () => {
    const index = createModuleIndex([
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
    expect(index).toContain('[@nuxthub/core](./nuxthub/nuxthub.md)')
    expect(index).toContain('Resolved module skill. Trust: `official`.')
  })

  it('renders docs-discovered module skills in their own group', () => {
    const index = createModuleIndex([
      {
        packageName: 'docus',
        version: '5.9.0',
        skillName: 'create-docs',
        description: 'Create Docus documentation.',
        scriptsIncluded: true,
        sourceKind: 'wellKnown' as const,
        sourceLabel: 'Docs-discovered skill',
        docsUrl: 'https://docus.dev/',
        official: true,
        trustLevel: 'official' as const,
        resolver: 'wellKnownV2' as const,
        wrapperPath: 'references/modules/docus/create-docs.md',
      },
    ])

    expect(index).toContain('### Docs-discovered skills')
    expect(index).toContain('[docus](./docus/create-docs.md) `v5.9.0` - Docs-discovered skill. Trust: `official`.')
  })
})

describe('createStableSkillWrapper', () => {
  it('renders a stable wrapper that points to generated build-dir content', () => {
    const entry = createStableSkillWrapper(
      'nuxt',
      '../../../apps/web/.nuxt/skill-hub/nuxt/SKILL.md',
      '../../../apps/web/.nuxt/skill-hub/nuxt',
      'prepare',
      { projectPath: 'apps/web' },
    )

    expect(entry).toContain('# Nuxt Skill Wrapper')
    expect(entry).toContain('The full generated skill tree lives in the Nuxt build directory')
    expect(entry).toContain('[../../../apps/web/.nuxt/skill-hub/nuxt/SKILL.md](../../../apps/web/.nuxt/skill-hub/nuxt/SKILL.md)')
    expect(entry).toContain('run `npx nuxt prepare` in `apps/web`, then open it.')
    expect(entry).toContain('It goes missing when `.nuxt` is deleted, and only `nuxt prepare` regenerates it')
    expect(entry).toContain(`description: ${JSON.stringify(SKILL_DESCRIPTION)}`)
    expect(entry).not.toContain('core Nuxt rule packs')
  })

  it('runs prepare from the repository root for standalone apps', () => {
    const entry = createStableSkillWrapper('nuxt', '../../../.nuxt/skill-hub/nuxt/SKILL.md', '../../../.nuxt/skill-hub/nuxt', 'prepare')

    expect(entry).toContain('run `npx nuxt prepare` from the repository root, then open it.')
  })

  it('falls back to the bundled rule packs when prepare cannot run', () => {
    const rules = '../../../node_modules/nuxt-skill-hub/nuxt-best-practices/rules'
    const entry = createStableSkillWrapper('nuxt', '../../../.nuxt/skill-hub/nuxt/SKILL.md', '../../../.nuxt/skill-hub/nuxt', 'prepare', {
      bundledRulesPath: rules,
    })

    expect(entry).toContain(`3. If it still can't be generated, read the core Nuxt rule packs that ship with the module in [${rules}](${rules}).`)
  })

  it('explains manual mode recovery without pretending prepare will regenerate automatically', () => {
    const entry = createStableSkillWrapper('nuxt', './.nuxt/skill-hub/nuxt/SKILL.md', './.nuxt/skill-hub/nuxt', 'manual')

    expect(entry).toContain('generation is off (`skillHub.generationMode: \'manual\'`)')
    expect(entry).toContain('switch it to `\'prepare\'`')
    expect(entry).not.toContain('restores the tree from cache')
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
