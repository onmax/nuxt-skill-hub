import { PACKAGE_VERSION } from './package-info'

export type SkillSourceKind = 'dist' | 'github' | 'generated'
export type SkillResolverKind = 'agentsField' | 'githubHeuristic' | 'metadataRouter'
export type SkillTrustLevel = 'official' | 'community'

export interface NuxtPackMetadata {
  id: string
  title: string
  focus: string
  triggers: string[]
  relativePath: string
}

export interface NuxtContentMetadata {
  id: string
  version: string
  experimental: boolean
  description: string
  packIds: string[]
  packs: NuxtPackMetadata[]
}

export type CorePackMetadata = NuxtPackMetadata
export type CoreContentMetadata = NuxtContentMetadata

export interface SkillModuleRenderEntry {
  packageName: string
  version?: string
  skillName: string
  entryPath?: string
  description?: string
  scriptsIncluded: boolean
  sourceKind: SkillSourceKind
  sourceLabel?: string
  sourceRepo?: string
  sourceRef?: string
  sourcePath?: string
  repoUrl?: string
  docsUrl?: string
  official: boolean
  trustLevel?: SkillTrustLevel
  resolver: SkillResolverKind
  wrapperPath?: string
}

export interface SkillSkippedRenderEntry {
  packageName: string
  skillName: string
  reason: string
  sourceKind?: SkillSourceKind
}

export interface SkillFrontmatter {
  name?: string
  description?: string
}

export const DEFAULT_NUXT_CONTENT_METADATA: NuxtContentMetadata = {
  id: 'nuxt-best-practices',
  version: PACKAGE_VERSION,
  experimental: true,
  description: 'Nuxt-native decision packs and best-practice rule packs for AI execution. Complements docs, not a replacement.',
  packIds: [
    'abstraction-disambiguation',
    'page-meta-head-layout',
    'error-surfaces-recovery',
    'verification-finish',
    'data-fetching-ssr',
    'hydration-consistency',
    'architecture-boundaries',
    'server-routes-runtime-config',
    'nitro-h3-patterns',
    'plugins',
    'performance-rendering',
    'module-authoring',
    'migrations',
  ],
  packs: [
    {
      id: 'abstraction-disambiguation',
      title: 'Abstraction Disambiguation',
      focus: 'Choose Nuxt-owned abstractions before generic Vue, raw HTML, or ad hoc glue code.',
      triggers: ['A generic Vue or HTML fix looks plausible', 'You need to decide whether Nuxt, Nuxt Content, or Nuxt UI already owns the surface'],
      relativePath: 'rules/abstraction-disambiguation.md',
    },
    {
      id: 'page-meta-head-layout',
      title: 'Page Meta, Head, and Layout',
      focus: 'Separate page behavior, document metadata, and layout structure before editing.',
      triggers: ['Pages, layouts, middleware, or page options', 'Title, meta tags, canonical URLs, or OG metadata'],
      relativePath: 'rules/page-meta-head-layout.md',
    },
    {
      id: 'error-surfaces-recovery',
      title: 'Error Surfaces and Recovery',
      focus: 'Cover both global and local error boundaries and use the right recovery utilities.',
      triggers: ['Global error pages or local error boundaries', 'Recovery flows, clearError, showError, or fallback UI'],
      relativePath: 'rules/error-surfaces-recovery.md',
    },
    {
      id: 'verification-finish',
      title: 'Verification and Finish',
      focus: 'Verify the intended framework behavior and re-check paired surfaces before concluding work.',
      triggers: ['The fix spans more than one surface', 'You are about to finish a Nuxt change and need to confirm the right abstraction'],
      relativePath: 'rules/verification-finish.md',
    },
    {
      id: 'data-fetching-ssr',
      title: 'Data Fetching and SSR',
      focus: 'Deduplication, payload correctness, and request-safe loading.',
      triggers: ['Pages, layouts, or composables fetching initial data', 'SSR-visible content or hydration-sensitive state'],
      relativePath: 'rules/data-fetching-ssr.md',
    },
    {
      id: 'hydration-consistency',
      title: 'Hydration and SSR Consistency',
      focus: 'SSR/CSR determinism, client-only boundaries, and mismatch prevention.',
      triggers: ['Hydration warnings or client-only rendering', 'State that differs between server and browser'],
      relativePath: 'rules/hydration-consistency.md',
    },
    {
      id: 'architecture-boundaries',
      title: 'Architecture Boundaries',
      focus: 'Server-only secrets, request isolation, and safe shared abstractions.',
      triggers: ['Crossing server/client boundaries', 'Composable or utility architecture changes'],
      relativePath: 'rules/architecture-boundaries.md',
    },
    {
      id: 'server-routes-runtime-config',
      title: 'Server Routes and Runtime Config',
      focus: 'Runtime config exposure, env handling, and route-level contracts.',
      triggers: ['nuxt.config, runtime config, or env wiring', 'Server route config and public/private config exposure'],
      relativePath: 'rules/server-routes-runtime-config.md',
    },
    {
      id: 'nitro-h3-patterns',
      title: 'Nitro and h3 Server Patterns',
      focus: 'Handler contracts, caching, and edge-safe server behavior.',
      triggers: ['Server routes, middleware, Nitro plugins, or h3 handlers', 'API behavior, caching, or edge runtime concerns'],
      relativePath: 'rules/nitro-h3-patterns.md',
    },
    {
      id: 'plugins',
      title: 'Plugins and Runtime Boot',
      focus: 'Plugin ordering, startup cost, and app/runtime initialization.',
      triggers: ['Plugins, app boot logic, or injected runtime helpers', 'Global runtime behavior changes'],
      relativePath: 'rules/plugins.md',
    },
    {
      id: 'performance-rendering',
      title: 'Performance and Rendering',
      focus: 'Rendering strategy, payload cost, and lazy loading tradeoffs.',
      triggers: ['Performance regressions or rendering strategy changes', 'Link, asset, and bundle cost decisions'],
      relativePath: 'rules/performance-rendering.md',
    },
    {
      id: 'module-authoring',
      title: 'Module Authoring Conventions',
      focus: 'Nuxt Kit patterns, module lifecycle, and ecosystem-safe authoring.',
      triggers: ['Writing or refactoring a Nuxt module', 'Module install/setup conventions'],
      relativePath: 'rules/module-authoring.md',
    },
    {
      id: 'migrations',
      title: 'Migrations and Compatibility',
      focus: 'Incremental upgrades, compatibility boundaries, and rollout safety.',
      triggers: ['Upgrades, deprecations, or breaking behavior changes', 'Compatibility fixes across Nuxt versions'],
      relativePath: 'rules/migrations.md',
    },
  ],
}

export const DEFAULT_CORE_CONTENT_METADATA = DEFAULT_NUXT_CONTENT_METADATA

function yamlString(value: string): string {
  return JSON.stringify(value)
}

function cleanList(values: unknown): string[] {
  return Array.isArray(values)
    ? values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map(value => value.trim())
    : []
}

function normalizeNuxtPackMetadata(raw: unknown, fallback: NuxtPackMetadata): NuxtPackMetadata {
  if (!raw || typeof raw !== 'object') {
    return fallback
  }

  const entry = raw as Partial<NuxtPackMetadata>
  return {
    id: typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : fallback.id,
    title: typeof entry.title === 'string' && entry.title.trim() ? entry.title.trim() : fallback.title,
    focus: typeof entry.focus === 'string' && entry.focus.trim() ? entry.focus.trim() : fallback.focus,
    triggers: cleanList(entry.triggers).length ? cleanList(entry.triggers) : fallback.triggers,
    relativePath: typeof entry.relativePath === 'string' && entry.relativePath.trim() ? entry.relativePath.trim() : fallback.relativePath,
  }
}

export function normalizeNuxtContentMetadata(raw: unknown): NuxtContentMetadata {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_NUXT_CONTENT_METADATA
  }

  const metadata = raw as Partial<NuxtContentMetadata>
  const fallbackPacksById = new Map(DEFAULT_NUXT_CONTENT_METADATA.packs.map(pack => [pack.id, pack]))
  const rawPacks = Array.isArray(metadata.packs) ? metadata.packs : []
  const packs = rawPacks.length
    ? rawPacks.map((pack) => {
        const packId = pack && typeof pack === 'object' && typeof (pack as { id?: unknown }).id === 'string'
          ? (pack as { id: string }).id
          : ''
        return normalizeNuxtPackMetadata(pack, fallbackPacksById.get(packId) || DEFAULT_NUXT_CONTENT_METADATA.packs[0]!)
      })
    : DEFAULT_NUXT_CONTENT_METADATA.packs

  return {
    id: typeof metadata.id === 'string' && metadata.id.trim() ? metadata.id.trim() : DEFAULT_NUXT_CONTENT_METADATA.id,
    version: typeof metadata.version === 'string' && metadata.version.trim() ? metadata.version.trim() : DEFAULT_NUXT_CONTENT_METADATA.version,
    experimental: typeof metadata.experimental === 'boolean' ? metadata.experimental : DEFAULT_NUXT_CONTENT_METADATA.experimental,
    description: typeof metadata.description === 'string' && metadata.description.trim()
      ? metadata.description.trim()
      : DEFAULT_NUXT_CONTENT_METADATA.description,
    packIds: cleanList(metadata.packIds).length ? cleanList(metadata.packIds) : DEFAULT_NUXT_CONTENT_METADATA.packIds,
    packs,
  }
}

export const normalizeCoreContentMetadata = normalizeNuxtContentMetadata

function parseFrontmatterValue(raw: string): string {
  const value = raw.trim()
  if (!value) {
    return ''
  }

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
    return value.slice(1, -1).trim()
  }

  return value
}

export function parseSkillFrontmatter(contents: string): SkillFrontmatter | null {
  const lines = contents.split(/\r?\n/)
  if (lines[0]?.trim() !== '---') {
    return null
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
  if (endIndex === -1) {
    return null
  }

  const frontmatter: SkillFrontmatter = {}
  const body = lines.slice(1, endIndex)

  for (const line of body) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmed.indexOf(':')
    if (separatorIndex <= 0) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    if (!/^[\w-]+$/.test(key)) {
      continue
    }

    const value = parseFrontmatterValue(trimmed.slice(separatorIndex + 1))
    if (key === 'name') {
      frontmatter.name = value
    }
    else if (key === 'description') {
      frontmatter.description = value
    }
  }

  return frontmatter
}

export function getSourceLabel(sourceKind: SkillSourceKind): string {
  switch (sourceKind) {
    case 'dist':
      return 'Installed package skill'
    case 'github':
      return 'Resolved module skill'
    case 'generated':
      return 'Metadata-routed skill'
  }
}

export function getTrustLevel(official: boolean): SkillTrustLevel {
  return official ? 'official' : 'community'
}

export interface MetadataRouterSkillInput {
  packageName: string
  skillName: string
  description?: string
  repoUrl?: string
  docsUrl?: string
}

function formatCompactLinks(
  entry: Pick<MetadataRouterSkillInput, 'repoUrl' | 'docsUrl'>,
  labels: {
    docs: string
    repo: string
  },
): string {
  const links: string[] = []

  if (entry.docsUrl) {
    links.push(`${labels.docs}: [${entry.docsUrl}](${entry.docsUrl})`)
  }

  if (entry.repoUrl) {
    links.push(`${labels.repo}: [${entry.repoUrl}](${entry.repoUrl})`)
  }

  return links.join('\n\n')
}

function formatWrapperLinks(
  entry: Pick<MetadataRouterSkillInput, 'repoUrl' | 'docsUrl'>,
  labels: {
    docs: string
    repo: string
  },
): string {
  const links: string[] = []

  if (entry.docsUrl) {
    links.push(`- ${labels.docs}: [${entry.docsUrl}](${entry.docsUrl})`)
  }

  if (entry.repoUrl) {
    links.push(`- ${labels.repo}: [${entry.repoUrl}](${entry.repoUrl})`)
  }

  return links.join('\n')
}

export function resolveMetadataRouterSkillName(packageName: string): string {
  if (packageName.startsWith('@')) {
    const [scope, name] = packageName.split('/')
    if (scope === '@nuxt' && name) {
      return `nuxt-${name}`
    }

    return (name || scope?.replace(/^@/, '') || '').trim()
  }

  return packageName.trim()
}

export function createMetadataRouterSkillFiles(input: MetadataRouterSkillInput): Record<string, string> {
  const description = input.description?.trim()
    || `Metadata-routed module skill for ${input.packageName}. Use it to reach the official docs and upstream source.`
  const linkLines = createCompactMetadataRouterContent(input).trim()

  return {
    'SKILL.md': `---
name: ${yamlString(input.skillName)}
description: ${yamlString(description)}
---

${linkLines || 'Docs: unavailable\nSource code: unavailable'}
`,
  }
}

function withDerivedModuleFields(entry: SkillModuleRenderEntry): Required<Pick<SkillModuleRenderEntry, 'sourceLabel' | 'trustLevel'>> & SkillModuleRenderEntry {
  return {
    ...entry,
    sourceLabel: entry.sourceLabel || getSourceLabel(entry.sourceKind),
    trustLevel: entry.trustLevel || getTrustLevel(entry.official),
  }
}

function formatVersion(version?: string): string | undefined {
  return version ? `v${version}` : undefined
}

function relativeModuleLink(entry: SkillModuleRenderEntry, prefix: string): string {
  const path = entry.entryPath || entry.wrapperPath
  if (!path) {
    return ''
  }

  return `${prefix}${path.replace(/^references\/modules\//, '')}`
}

function groupModuleEntries(entries: SkillModuleRenderEntry[]) {
  const officialUpstream = entries.filter(entry => entry.sourceKind === 'dist')
  const githubResolved = entries.filter(entry => entry.sourceKind === 'github')
  const metadataRouted = entries.filter(entry => entry.sourceKind === 'generated')

  return { officialUpstream, githubResolved, metadataRouted }
}

function hasModuleGuidance(entries: SkillModuleRenderEntry[], skipped: SkillSkippedRenderEntry[] = []): boolean {
  return entries.length > 0 || skipped.length > 0
}

function renderModuleGroup(title: string, entries: SkillModuleRenderEntry[], prefix: string): string {
  if (!entries.length) {
    return ''
  }

  const lines = entries.map((rawEntry) => {
    const entry = withDerivedModuleFields(rawEntry)
    const wrapperLink = relativeModuleLink(entry, prefix)
    const description = entry.description ? ` ${entry.description}` : ''
    const version = formatVersion(entry.version)
    const versionLabel = version ? ` \`${version}\`` : ''
    return `- [${entry.packageName}](${wrapperLink})${versionLabel} - ${entry.sourceLabel}. Trust: \`${entry.trustLevel}\`.${description}`
  })

  return `### ${title}\n${lines.join('\n')}\n`
}

function renderSkippedEntries(skipped: SkillSkippedRenderEntry[]): string {
  if (!skipped.length) {
    return ''
  }

  const lines = skipped.map((entry) => {
    const base = `- **${entry.packageName}** / \`${entry.skillName}\``
    const source = entry.sourceKind ? ` (\`${entry.sourceKind}\`)` : ''
    return `${base}${source}: ${entry.reason}. Use the relevant Nuxt pack plus the module's official docs.`
  })

  return `### Skipped or unavailable\n${lines.join('\n')}\n`
}

function findPack(metadata: NuxtContentMetadata, id: string): NuxtPackMetadata {
  return metadata.packs.find(pack => pack.id === id) || metadata.packs[0]!
}

function packLink(metadata: NuxtContentMetadata, id: string): string {
  const pack = findPack(metadata, id)
  return `[${pack.title}](./references/nuxt/${pack.relativePath})`
}

function createRoutingTable(metadata: NuxtContentMetadata, includeModuleAuthoring = false): string {
  const rows: Array<[string, string]> = [
    ...(includeModuleAuthoring
      ? [[
          'Writing or refactoring a Nuxt module (`defineNuxtModule`, hooks, public APIs)',
          packLink(metadata, 'module-authoring'),
        ] as [string, string]]
      : []),
    [
      'SSR, initial page load, route params, or data fetched for first render',
      packLink(metadata, 'data-fetching-ssr'),
    ],
    [
      'Hydration warnings, `ClientOnly`, browser-only APIs, time/randomness, or SSR/CSR mismatch',
      packLink(metadata, 'hydration-consistency'),
    ],
    [
      'Page options, middleware, layout selection, title, meta tags, canonical URLs, or OG data',
      packLink(metadata, 'page-meta-head-layout'),
    ],
    [
      '`nuxt.config.*`, `runtimeConfig`, env wiring, or public/private config exposure',
      packLink(metadata, 'server-routes-runtime-config'),
    ],
    [
      '`server/api/**`, `server/routes/**`, `defineEventHandler`, route rules, caching, or Nitro plugins',
      packLink(metadata, 'nitro-h3-patterns'),
    ],
    [
      'Plugins, injections, app boot logic, or global runtime initialization',
      packLink(metadata, 'plugins'),
    ],
    [
      'Secrets, privileged API calls, request isolation, or server/client boundary confusion',
      packLink(metadata, 'architecture-boundaries'),
    ],
    [
      'Performance regressions, rendering strategy, lazy loading, or payload/bundle cost',
      packLink(metadata, 'performance-rendering'),
    ],
    [
      'Upgrades, deprecations, compatibility fixes, or version-boundary work',
      packLink(metadata, 'migrations'),
    ],
    [
      'A generic Vue or raw HTML fix looks plausible',
      packLink(metadata, 'abstraction-disambiguation'),
    ],
    [
      'The remaining work is mostly components, composables, reactivity, props/emits, or SFC structure',
      '[Vue Best Practices](./references/vue/SKILL.md)',
    ],
    [
      'Global/local errors, `clearError`, `showError`, or recovery flows',
      packLink(metadata, 'error-surfaces-recovery'),
    ],
  ]

  return [
    '| Task shape or symptom | Open first |',
    '| --- | --- |',
    ...rows.map(([symptom, target]) => `| ${symptom} | ${target} |`),
  ].join('\n')
}

function createRoutingExamples(metadata: NuxtContentMetadata, includeModuleAuthoring = false): string {
  const lines = [
    `- "This page fetches twice on first load" → ${packLink(metadata, 'data-fetching-ssr')}`,
    `- "Why do I get a hydration mismatch from Date.now()?" → ${packLink(metadata, 'hydration-consistency')}`,
    `- "Change canonical URL and OG tags" → ${packLink(metadata, 'page-meta-head-layout')}`,
    `- "Expose only the public runtimeConfig key" → ${packLink(metadata, 'server-routes-runtime-config')}`,
    `- "This server/api handler cache or route rule is wrong" → ${packLink(metadata, 'nitro-h3-patterns')}`,
    `- "This modal/table/dropdown was hand-built in raw HTML" → ${packLink(metadata, 'abstraction-disambiguation')}`,
    `- "\`clearError\` is not behaving as expected" → ${packLink(metadata, 'error-surfaces-recovery')}`,
    `- "Should this secret live in runtime config or client code?" → ${packLink(metadata, 'architecture-boundaries')}`,
    ...(includeModuleAuthoring
      ? [`- "Add a Nuxt module option, hook, or runtime extension" → ${packLink(metadata, 'module-authoring')}`]
      : []),
  ]

  return `## Routing examples
${lines.join('\n')}`
}

function createSkillMapSections(
  metadata: NuxtContentMetadata,
  entries: SkillModuleRenderEntry[],
  skipped: SkillSkippedRenderEntry[] = [],
  includeModuleAuthoring = false,
): string {
  const includeModuleSections = hasModuleGuidance(entries, skipped)
  const grouped = groupModuleEntries(entries)
  const moduleSections = [
    renderModuleGroup('Official upstream skills', grouped.officialUpstream, './references/modules/'),
    renderModuleGroup('Resolved module skills', grouped.githubResolved, './references/modules/'),
    renderModuleGroup('Metadata-routed skills', grouped.metadataRouted, './references/modules/'),
    renderSkippedEntries(skipped),
  ].filter(Boolean)
  const moduleGuidesSection = includeModuleSections
    ? `## Module guides
Use a module entry only when an installed module owns the surface. Module guidance is delta-only and should not replace broad Nuxt rules outside that module.

${moduleSections.join('\n')}`
    : ''

  return [
    '## Routing',
    'Load one matching guide first. Open more guides only when the first guide points you there or the task clearly crosses boundaries.',
    createRoutingTable(metadata, includeModuleAuthoring),
    createRoutingExamples(metadata, includeModuleAuthoring),
    moduleGuidesSection,
  ].filter(Boolean).join('\n\n')
}

export function createSkillEntrypoint(
  skillName: string,
  metadata: NuxtContentMetadata,
  monorepoScopePath?: string,
  includeModuleAuthoring = false,
  entries: SkillModuleRenderEntry[] = [],
  skipped: SkillSkippedRenderEntry[] = [],
): string {
  const description = 'Routes Nuxt work to the smallest relevant guide. Use for `useFetch`/`useAsyncData`, SSR, hydration mismatches, `definePageMeta`, `useHead`/`useSeoMeta`, `runtimeConfig`, Nitro/h3 server routes, plugins, Nuxt UI, Nuxt Content, or Nuxt module authoring.'
  const monorepoScopeSection = monorepoScopePath
    ? `## Monorepo scope
This skill applies only to \`${monorepoScopePath}\`. Treat files and tasks outside that subtree as out of scope unless the user explicitly redirects you there.`
    : ''

  return `---
name: ${yamlString(skillName)}
description: ${yamlString(description)}
---

# Nuxt Skill Router

Use this skill to make the Nuxt ownership decision first, then route to the smallest relevant Nuxt, Vue, or module guide.
${monorepoScopeSection ? `\n${monorepoScopeSection}\n` : '\n'}## Loading rules
1. Repository-global instructions and required workflows win first.
2. Inspect the exact owned surface first: page, layout, component, server handler, collection, config file, or module-owned file.
3. Load one matching guide from the routing table below.
4. Switch to [Vue Best Practices](./references/vue/SKILL.md) only when Nuxt no longer owns the abstraction.
5. Use module entries only inside module-owned APIs, config, runtime behavior, and files.
6. Open additional guides only when the first guide points you there or the task clearly crosses boundaries.

${createSkillMapSections(metadata, entries, skipped, includeModuleAuthoring)}

## Finish
For multi-surface changes or final verification, open ${packLink(metadata, 'verification-finish')}.

- Verify paired surfaces when relevant: page/head, server/client, global/local.
- Verify framework behavior, not only visible output.
- Keep module guidance scoped to the owning module.

---

_Generated by nuxt-skill-hub. Do not edit this file manually._
`
}

export function createStableSkillWrapper(
  skillName: string,
  generatedEntryPath: string,
  generatedRootPath: string,
  generationMode: 'prepare' | 'manual',
): string {
  const description = 'Stable entrypoint for generated Nuxt guidance in this repository. Use for Nuxt SSR, hydration, pages, `runtimeConfig`, Nitro/h3, plugins, Nuxt UI, Nuxt Content, or Nuxt module work. If generated content is missing, regenerate it with `nuxt prepare`.'
  const recoveryInstructions = generationMode === 'manual'
    ? [
        'Automatic skill generation is currently disabled by `skillHub.generationMode: \'manual\'`.',
        'Ask the user to switch `skillHub.generationMode` to `\'prepare\'`, then run `nuxt prepare`.',
      ].join('\n')
    : [
        'Run `nuxt prepare` from this project before continuing.',
        'That regenerates the Nuxt build directory, refreshes types, and writes the generated Nuxt skill content.',
      ].join('\n')

  return `---
name: ${yamlString(skillName)}
description: ${yamlString(description)}
---

# Nuxt Skill Wrapper

This is the stable entrypoint for Nuxt guidance in this repository.
The full generated skill tree lives in the Nuxt build directory so the checked-in skill surface stays small.

## Generated content
- Entry: [${generatedEntryPath}](${generatedEntryPath})
- Root: [${generatedRootPath}](${generatedRootPath})

## Required workflow
1. Check whether the generated entry exists.
2. If it exists, open it and follow that generated skill instead of extending this wrapper.
3. If it does not exist, ${recoveryInstructions}

## Notes
- Generated content is ephemeral and may be refreshed by Nuxt.
- This wrapper is the stable file that should remain in version control.
`
}

function createResolverNote(entry: SkillModuleRenderEntry): string {
  if (entry.sourceKind === 'dist') {
    return 'This module skill came from the installed package. Treat it as the highest-confidence module-specific delta guide.'
  }

  if (entry.sourceKind === 'github' && entry.resolver === 'agentsField') {
    return 'This module skill was resolved from repository metadata. It is still module-specific guidance, but verify version-sensitive details against the installed module docs or source.'
  }

  if (entry.sourceKind === 'github') {
    return 'This module skill was resolved from GitHub heuristics. Verify important behavior against the installed module docs or source before relying on edge cases.'
  }

  return 'This module router was generated from package metadata. Use the linked docs and repository as the source of truth for module-specific behavior.'
}

function createCompactMetadataRouterContent(entry: Pick<MetadataRouterSkillInput, 'repoUrl' | 'docsUrl'>): string {
  return `${formatCompactLinks(entry, {
    docs: 'Docs',
    repo: 'Source code',
  })}\n`
}

export function createModuleWrapperContent(entry: SkillModuleRenderEntry): string {
  if (entry.sourceKind === 'generated') {
    return createCompactMetadataRouterContent(entry)
  }

  const derivedEntry = withDerivedModuleFields(entry)
  const skillPath = `./${entry.skillName}/SKILL.md`
  const scriptsNote = entry.scriptsIncluded
    ? 'Module scripts were copied into this generated output.'
    : 'Module scripts were not copied into this generated output.'
  const descriptionBlock = entry.description
    ? `## Module Summary\n${entry.description}\n\n`
    : ''
  const upstreamLinks = formatWrapperLinks({
    docsUrl: entry.docsUrl,
    repoUrl: entry.repoUrl,
  }, {
    docs: 'Docs',
    repo: 'Repository',
  })
  const installedVersion = formatVersion(entry.version)

  return `# ${entry.packageName} Module Wrapper

Use this wrapper before opening the copied module skill.

## Snapshot
- Package: \`${entry.packageName}\`
- Installed version: ${installedVersion ? `\`${installedVersion}\`` : '_not detected_'}
- Skill: \`${entry.skillName}\`
- Source: ${derivedEntry.sourceLabel}
- Trust: \`${derivedEntry.trustLevel}\`
- Scripts: ${entry.scriptsIncluded ? 'included' : 'not included'}

${descriptionBlock}## Scope
Use this wrapper only when the task directly involves \`${entry.packageName}\` APIs, config, runtime behavior, plugins, composables, components, hooks, or owned files.

## Delta-only rule
Module guidance is a delta on top of Nuxt guidance.
Do not replace broad Nuxt rules with module-specific guidance outside \`${entry.packageName}\` surfaces.

${upstreamLinks
  ? `## Upstream links
${upstreamLinks}

`
  : ''}## How to use it
1. Start with the relevant route in [../../SKILL.md](../../SKILL.md), then load the matching Nuxt pack or Vue guidance.
2. Then open the copied module skill: [${entry.skillName} / SKILL.md](${skillPath}).
3. Apply the module guidance only within \`${entry.packageName}\` surfaces.
4. If behavior is unresolved or version-sensitive, use the static docs and repository links above.

## Reliability note
${createResolverNote(entry)}

## Scripts
${scriptsNote}
`
}
