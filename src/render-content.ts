import type { SkillResolverKind, SkillSourceKind, SkillTrustLevel } from './types'

export interface CorePackMetadata {
  id: string
  title: string
  focus: string
  triggers: string[]
  relativePath: string
}

export interface CoreContentMetadata {
  id: string
  version: string
  experimental: boolean
  description: string
  sections: string[]
  packs: CorePackMetadata[]
}

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

export interface ModuleWrapperRenderOptions {
  fallbackLinksOnly?: boolean
}

export interface SkillSkippedRenderEntry {
  packageName: string
  skillName: string
  reason: string
  sourceKind?: SkillSourceKind
}

export interface SkillRenderProfile {
  includeModuleAuthoring: boolean
  packSummaryIds: string[]
}

export const DEFAULT_CORE_CONTENT_METADATA: CoreContentMetadata = {
  id: 'nuxt-best-practices',
  version: '0.0.1',
  experimental: true,
  description: 'Nuxt-native decision packs and best-practice rule packs for AI execution. Complements docs, not a replacement.',
  sections: [
    'abstraction-disambiguation',
    'page-meta-head-layout',
    'error-surfaces-recovery',
    'content-modeling-navigation',
    'nuxt-ui-primitives',
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
      id: 'content-modeling-navigation',
      title: 'Content Modeling and Navigation',
      focus: 'Model structured records correctly and use collection and navigation primitives before manual assembly.',
      triggers: ['Nuxt Content collections, JSON or YAML records, or generated navigation', 'Sidebar, docs navigation, or content-derived listings'],
      relativePath: 'rules/content-modeling-navigation.md',
    },
    {
      id: 'nuxt-ui-primitives',
      title: 'Nuxt UI Primitives',
      focus: 'Prefer first-class Nuxt UI surfaces and their current API shape before hand-rolled markup.',
      triggers: ['Tables, forms, modals, command palettes, dropdowns, or page chrome', 'A custom HTML implementation looks visually correct but framework-owned primitives exist'],
      relativePath: 'rules/nuxt-ui-primitives.md',
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

function yamlString(value: string): string {
  return JSON.stringify(value)
}

function cleanList(values: unknown): string[] {
  return Array.isArray(values)
    ? values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map(value => value.trim())
    : []
}

function normalizeCorePackMetadata(raw: unknown, fallback: CorePackMetadata): CorePackMetadata {
  if (!raw || typeof raw !== 'object') {
    return fallback
  }

  const entry = raw as Partial<CorePackMetadata>
  return {
    id: typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : fallback.id,
    title: typeof entry.title === 'string' && entry.title.trim() ? entry.title.trim() : fallback.title,
    focus: typeof entry.focus === 'string' && entry.focus.trim() ? entry.focus.trim() : fallback.focus,
    triggers: cleanList(entry.triggers).length ? cleanList(entry.triggers) : fallback.triggers,
    relativePath: typeof entry.relativePath === 'string' && entry.relativePath.trim() ? entry.relativePath.trim() : fallback.relativePath,
  }
}

export function normalizeCoreContentMetadata(raw: unknown): CoreContentMetadata {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_CORE_CONTENT_METADATA
  }

  const metadata = raw as Partial<CoreContentMetadata>
  const fallbackPacksById = new Map(DEFAULT_CORE_CONTENT_METADATA.packs.map(pack => [pack.id, pack]))
  const rawPacks = Array.isArray(metadata.packs) ? metadata.packs : []
  const packs = rawPacks.length
    ? rawPacks.map((pack) => {
        const packId = pack && typeof pack === 'object' && typeof (pack as { id?: unknown }).id === 'string'
          ? (pack as { id: string }).id
          : ''
        return normalizeCorePackMetadata(pack, fallbackPacksById.get(packId) || DEFAULT_CORE_CONTENT_METADATA.packs[0]!)
      })
    : DEFAULT_CORE_CONTENT_METADATA.packs

  return {
    id: typeof metadata.id === 'string' && metadata.id.trim() ? metadata.id.trim() : DEFAULT_CORE_CONTENT_METADATA.id,
    version: typeof metadata.version === 'string' && metadata.version.trim() ? metadata.version.trim() : DEFAULT_CORE_CONTENT_METADATA.version,
    experimental: typeof metadata.experimental === 'boolean' ? metadata.experimental : DEFAULT_CORE_CONTENT_METADATA.experimental,
    description: typeof metadata.description === 'string' && metadata.description.trim()
      ? metadata.description.trim()
      : DEFAULT_CORE_CONTENT_METADATA.description,
    sections: cleanList(metadata.sections).length ? cleanList(metadata.sections) : DEFAULT_CORE_CONTENT_METADATA.sections,
    packs,
  }
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

function formatMetadataLinks(entry: Pick<MetadataRouterSkillInput, 'repoUrl' | 'docsUrl'>): string {
  return formatWrapperLinks(entry, {
    docs: 'Official docs',
    repo: 'Repository',
  })
}

export function resolveMetadataRouterSkillName(packageName: string): string {
  if (packageName.startsWith('@')) {
    const [scope, name] = packageName.split('/')
    if (scope === '@nuxt' && name) {
      return `nuxt-${name}`
    }

    return (name || scope.replace(/^@/, '')).trim()
  }

  return packageName.trim()
}

export function createMetadataRouterSkillFiles(input: MetadataRouterSkillInput): Record<string, string> {
  const description = input.description?.trim()
    || `Metadata-routed module skill for ${input.packageName}. Use it to reach the official docs and upstream source.`
  const linkLines = formatMetadataLinks(input)
  const routeSteps: string[] = []
  if (input.docsUrl) {
    routeSteps.push('Consult the official docs first for public APIs, usage, and supported patterns.')
  }
  if (input.repoUrl) {
    routeSteps.push('Inspect the repository source for gaps, examples, or version-specific behavior.')
  }
  routeSteps.push('Fall back to the relevant Nuxt core pack when module-specific guidance is still unclear.')
  const routeLines = routeSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')

  const summary = input.description?.trim()
    ? `## Module Summary\n${input.description.trim()}\n\n`
    : ''

  const skill = `---
name: ${yamlString(input.skillName)}
description: ${yamlString(description)}
---

# ${input.packageName} Metadata Router

This skill was generated from package metadata because no module-authored skill was available.

${summary}## Scope
Use this only for work that directly involves \`${input.packageName}\`.

## Routing
${linkLines || '- No official docs or repository URL were available in package metadata.'}

## Workflow
1. Start with the relevant route in [../../index.md](../../index.md) and load the matching core pack.
2. Keep this router scoped to \`${input.packageName}\` surfaces only.
${routeLines}
`

  const index = `# ${input.packageName} Metadata Router

This generated skill routes the agent to the smallest trustworthy upstream source for \`${input.packageName}\`.

## Upstream sources
${linkLines || '- No upstream links were available in package metadata.'}

## How to use this router
1. Read the module docs first when available.
2. Use the repository source for implementation details or missing edge cases.
3. Keep this module scoped to \`${input.packageName}\` surfaces only.
`

  return {
    'SKILL.md': skill,
    'references/index.md': index,
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
    return `${base}${source}: ${entry.reason}. Use the relevant core pack plus the module's official docs.`
  })

  return `### Skipped or unavailable\n${lines.join('\n')}\n`
}

function findPack(metadata: CoreContentMetadata, id: string): CorePackMetadata {
  return metadata.packs.find(pack => pack.id === id) || metadata.packs[0]!
}

function createPackSummary(metadata: CoreContentMetadata, packIds: string[]): string {
  return packIds
    .map(packId => `\`${findPack(metadata, packId).title}\``)
    .join(', ')
}

export function getSkillRenderProfile(includeModuleAuthoring = false): SkillRenderProfile {
  if (includeModuleAuthoring) {
    return {
      includeModuleAuthoring,
      packSummaryIds: [
        'module-authoring',
        'plugins',
        'architecture-boundaries',
        'nitro-h3-patterns',
        'migrations',
      ],
    }
  }

  return {
    includeModuleAuthoring: false,
    packSummaryIds: [
      'abstraction-disambiguation',
      'page-meta-head-layout',
      'error-surfaces-recovery',
      'content-modeling-navigation',
      'nuxt-ui-primitives',
    ],
  }
}

function packLink(metadata: CoreContentMetadata, id: string): string {
  const pack = findPack(metadata, id)
  return `[${pack.title}](./core/${pack.relativePath})`
}

function createRoutingTable(metadata: CoreContentMetadata, includeModuleAuthoring = false): string {
  const rows = [
    ...(includeModuleAuthoring
      ? [{
          symptom: 'Writing, refactoring, or publishing a Nuxt module',
          packId: 'module-authoring',
          why: 'Start with Nuxt Kit-safe authoring patterns, lifecycle hooks, prefixed public APIs, and skill scope boundaries.',
        }]
      : []),
    {
      symptom: 'SSR, initial page load, route params, or hydration-sensitive data',
      packId: 'data-fetching-ssr',
      why: 'Prefer `useFetch` or `useAsyncData` over setup-time `$fetch` or `onMounted` fetches.',
    },
    {
      symptom: 'Page options, route middleware, layout selection, title, meta tags, or OG data',
      packId: 'page-meta-head-layout',
      why: 'Separate page behavior from document metadata and layout structure before editing.',
    },
    {
      symptom: 'A generic Vue fix or raw HTML implementation looks tempting',
      packId: 'abstraction-disambiguation',
      why: 'Check whether Nuxt, Nuxt Content, or Nuxt UI already owns the abstraction.',
    },
    {
      symptom: 'Global errors, local fallback UI, `clearError`, `showError`, or recovery flows',
      packId: 'error-surfaces-recovery',
      why: 'Nuxt error handling often needs both global and local surfaces to be correct.',
    },
    {
      symptom: 'Nuxt Content JSON or YAML records, collection shape, docs nav, or sidebars',
      packId: 'content-modeling-navigation',
      why: 'Choose `type: \'data\'` and collection-navigation primitives before manual assembly.',
    },
    {
      symptom: 'Tables, forms, modals, command palettes, dropdowns, or page chrome',
      packId: 'nuxt-ui-primitives',
      why: 'Prefer the current Nuxt UI primitive and API shape before hand-rolled markup or listeners.',
    },
    {
      symptom: 'Secrets, runtime config, privileged API calls, or server/client boundary confusion',
      packId: 'architecture-boundaries',
      why: 'Move sensitive logic server-side first, then pair with config and route rules as needed.',
    },
    {
      symptom: 'Before finishing a fix that spans multiple files or surfaces',
      packId: 'verification-finish',
      why: 'Re-check paired surfaces and verify framework behavior, not only the visible output.',
    },
  ]

  return [
    '| Task shape or symptom | Load first | Why |',
    '| --- | --- | --- |',
    ...rows.map(row => `| ${row.symptom} | ${packLink(metadata, row.packId)} | ${row.why} |`),
  ].join('\n')
}

export function createModulesListMarkdown(entries: SkillModuleRenderEntry[], skipped: SkillSkippedRenderEntry[] = []): string {
  const { officialUpstream, githubResolved, metadataRouted } = groupModuleEntries(entries)
  const sections = [
    renderModuleGroup('Official upstream skills', officialUpstream, './'),
    renderModuleGroup('Resolved module skills', githubResolved, './'),
    renderModuleGroup('Metadata-routed skills', metadataRouted, './'),
    renderSkippedEntries(skipped),
  ].filter(Boolean)

  if (!sections.length) {
    return '_No module skills discovered. Use core guidance plus official module docs when module-specific guidance is missing._\n'
  }

  return `${sections.join('\n')}`.trimEnd() + '\n'
}

function createCorePackTable(metadata: CoreContentMetadata): string {
  const rows = metadata.packs.map(pack =>
    `| [${pack.title}](./core/${pack.relativePath}) | ${pack.focus} | ${pack.triggers.join('<br>')} |`,
  )

  return [
    '| Pack | Focus | Typical triggers |',
    '| --- | --- | --- |',
    ...rows,
  ].join('\n')
}

export function createReferencesIndexContent(
  metadata: CoreContentMetadata,
  entries: SkillModuleRenderEntry[],
  skipped: SkillSkippedRenderEntry[] = [],
  includeModuleAuthoring = false,
): string {
  const grouped = groupModuleEntries(entries)
  const moduleSections = [
    renderModuleGroup('Official upstream skills', grouped.officialUpstream, './modules/'),
    renderModuleGroup('Resolved module skills', grouped.githubResolved, './modules/'),
    renderModuleGroup('Metadata-routed skills', grouped.metadataRouted, './modules/'),
    renderSkippedEntries(skipped),
  ].filter(Boolean)
  const moduleGuideContent = moduleSections.length
    ? moduleSections.join('\n')
    : '_No module skills discovered. Use core guidance plus official module docs when module-specific guidance is missing._'
  const audienceGuide = includeModuleAuthoring
    ? `
## Module author focus

This skill includes extra guidance for Nuxt module authors on top of the default app-oriented Nuxt packs.
If the task touches \`defineNuxtModule\`, Nuxt Kit hooks, generated runtime files, prefixed public APIs, or release compatibility, start with ${packLink(metadata, 'module-authoring')} before branching into the broader app-oriented packs.
`
    : ''

  return `# Nuxt Skill Map

This map routes you through Nuxt's common forks before deeper packs.

## How to use this map
1. Explore the current surface first: page, layout, component, server handler, content collection, or module-owned file.
2. Load the first matching pack from the routing table below.
3. Open deeper packs only when the first pack points you there.
4. If an installed module is involved, open its entry under \`references/modules\`.
5. Copied skills go straight to their \`SKILL.md\`; metadata-routed modules only expose docs and source links.
${audienceGuide}

## Common forks in the road

${createRoutingTable(metadata, includeModuleAuthoring)}

## All core packs

${createCorePackTable(metadata)}

## Module guides

Open the linked module entry first. Copied skills link straight to their \`SKILL.md\`; metadata-routed modules use a small docs/source router when no copied skill exists.

${moduleGuideContent}
---

_Generated by nuxt-skill-hub. Do not edit this file manually._
`
}

export function createSkillEntrypoint(
  skillName: string,
  metadata: CoreContentMetadata,
  monorepoScopePath?: string,
  includeModuleAuthoring = false,
): string {
  const profile = getSkillRenderProfile(includeModuleAuthoring)
  const description = 'Always-on Nuxt disambiguation layer for this project. Use it to choose the right Nuxt pack first, then load module delta skills only when needed.'
  const monorepoScopeSection = monorepoScopePath
    ? `
## Monorepo Scope
This skill applies only to the \`${monorepoScopePath}\` subtree of this monorepo.
Treat files and tasks outside \`${monorepoScopePath}\` as out of scope unless the user explicitly redirects you there.
`
    : ''
  const audienceSection = profile.includeModuleAuthoring
    ? `

## Module Author Focus
This skill keeps the default Nuxt app guidance and adds an authoring layer for repositories that build Nuxt modules.
Start with [Module Authoring Conventions](./references/core/rules/module-authoring.md) for \`defineNuxtModule\`, lifecycle hooks, prefixed public APIs, and module-scoped skill boundaries, then fall back to the broader app packs when the task crosses into runtime behavior.
`
    : ''
  const activationFlow = `1. Explore the project first: inspect the real page, component, route, server handler, collection, or module surface you are changing.
2. Open [references/index.md](./references/index.md) and load the smallest matching core pack.
3. If module authoring is part of the task, load [Module Authoring Conventions](./references/core/rules/module-authoring.md) before changing \`defineNuxtModule\`, runtime extensions, hooks, or release scaffolding.
4. If an installed module owns the problem, open its entry under [references/modules](./references/modules).
5. Apply module guidance as delta-only rules inside that module's APIs, config, runtime behavior, and owned files.`
  const frequencyHeader = profile.includeModuleAuthoring
    ? '## High-Frequency Nuxt Decisions'
    : '## High-Frequency Nuxt Decisions'
  const frequencyBullets = profile.includeModuleAuthoring
    ? `- If the task changes module boot or heavy setup work, prefer lightweight \`setup\` plus lifecycle hooks before adding blocking async work.
- If the module exposes routes, composables, components, or config, prefix public surfaces with module identity before shipping generic names.
- If the implementation relies on undocumented Nuxt internals, confirm there is not a public \`@nuxt/kit\` API or documented hook first.
- If the task adds or edits a bundled module skill, keep it strictly scoped to the module's APIs, integration points, and caveats.
- If runtime config, server handlers, or generated files are involved, pair module-author guidance with the relevant server, Nitro, plugin, or migration pack instead of improvising cross-boundary behavior.
- If the work is version-sensitive, check compatibility constraints and migration boundaries before expanding the module surface.
- If the task touches SSR, initial page load, or route-driven data, prefer \`useFetch\` or \`useAsyncData\` before \`onMounted\` plus \`$fetch\`.
- If the task changes page options, layout selection, route middleware, or page-level behavior, check \`definePageMeta\` before adding ad hoc wiring.
- If the task changes title, meta tags, canonical URLs, or OG data, check \`useHead\` or \`useSeoMeta\` before page-meta or template markup.
- If content lives in JSON or YAML records, or the UI needs generated docs navigation, choose data collections and collection-navigation primitives before manual assembly.
- If the UI surface is page chrome, a table, a form, a modal, a command palette, or a dropdown, prefer a Nuxt UI primitive before raw HTML or custom listeners.
- If runtime config, tokens, secrets, or privileged API calls are involved, keep them server-side and expose only a server route or the minimum public config.
- If hydration, browser-only APIs, time, randomness, or cookies are involved, use SSR-safe primitives first and isolate browser-only work behind \`ClientOnly\` or \`onMounted\`.
- If the fix touches errors, fallback UI, or recovery flow, check both global and local surfaces before concluding the work is complete.
- If the solution looks correct but uses generic Vue or hand-rolled HTML, confirm Nuxt, Nuxt Content, or Nuxt UI does not already own that abstraction.
- If the task is module-specific, use the module entry and keep module guidance scoped; do not replace broad Nuxt rules with module-specific rules.`
    : `- If the task touches SSR, initial page load, or route-driven data, prefer \`useFetch\` or \`useAsyncData\` before \`onMounted\` plus \`$fetch\`.
- If the task changes page options, layout selection, route middleware, or page-level behavior, check \`definePageMeta\` before adding ad hoc wiring.
- If the task changes title, meta tags, canonical URLs, or OG data, check \`useHead\` or \`useSeoMeta\` before page-meta or template markup.
- If content lives in JSON or YAML records, or the UI needs generated docs navigation, choose data collections and collection-navigation primitives before manual assembly.
- If the UI surface is page chrome, a table, a form, a modal, a command palette, or a dropdown, prefer a Nuxt UI primitive before raw HTML or custom listeners.
- If runtime config, tokens, secrets, or privileged API calls are involved, keep them server-side and expose only a server route or the minimum public config.
- If hydration, browser-only APIs, time, randomness, or cookies are involved, use SSR-safe primitives first and isolate browser-only work behind \`ClientOnly\` or \`onMounted\`.
- If the fix touches errors, fallback UI, or recovery flow, check both global and local surfaces before concluding the work is complete.
- If the solution looks correct but uses generic Vue or hand-rolled HTML, confirm Nuxt, Nuxt Content, or Nuxt UI does not already own that abstraction.
- If the task is module-specific, use the module entry and keep module guidance scoped; do not replace broad Nuxt rules with module-specific rules.`
  const beforeCompletion = profile.includeModuleAuthoring
    ? `- Did I start from Nuxt Kit and documented lifecycle hooks before reaching for private internals?
- Did I keep public APIs collision-resistant and module-scoped?
- Did I keep module skill guidance as a delta on top of core Nuxt guidance instead of restating framework-global rules?
- Did I verify compatibility, install/setup cost, and cross-boundary behavior before concluding the work is complete?
- Did I still verify the relevant app/runtime surfaces when the module work crossed into SSR, Nitro, plugins, config, or UI behavior?`
    : `- Did I choose a Nuxt primitive where a generic Vue or raw HTML solution would be tempting?
- Did I check whether the fix needs a second surface such as global or local, or server or client?
- Did I choose the right concept pair: page meta vs head, data collection vs page collection, component primitive vs custom markup?
- Did I verify the framework behavior that matters, not just the visible output?`

  return `---
name: ${yamlString(skillName)}
description: ${yamlString(description)}
---

# Nuxt Skill Index

This file keeps the highest-frequency Nuxt decisions in context.
Use it to avoid generic Vue fallbacks, then route into the smallest matching pack.
${monorepoScopeSection}
${audienceSection}

## Activation Flow
${activationFlow}

${frequencyHeader}
${frequencyBullets}

## Precedence
- Repository-global instructions and required workflows win first.
- This file keeps the common Nuxt forks in context.
- Core packs provide deeper Nuxt guidance.
- Module entries add delta-only guidance inside explicit module scope.

## Before Completion
${beforeCompletion}

## Core Packs
Start with the relevant pack in [references/index.md](./references/index.md). Primary packs include ${createPackSummary(metadata, profile.packSummaryIds)}.
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

  if (entry.sourceKind === 'generated') {
    return 'This module router was generated from package metadata. Use the linked docs and repository as the source of truth for module-specific behavior.'
  }

  return 'Treat this module wrapper as module-specific delta guidance and verify important behavior against upstream sources.'
}

function createCompactMetadataRouterContent(entry: SkillModuleRenderEntry): string {
  return `${formatWrapperLinks(entry, {
    docs: 'Docs',
    repo: 'Source code',
  })}\n`
}

export function createModuleWrapperContent(
  entry: SkillModuleRenderEntry,
  options: ModuleWrapperRenderOptions = {},
): string {
  if (entry.sourceKind === 'generated' && options.fallbackLinksOnly !== false) {
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
Module guidance is a delta on top of core Nuxt guidance.
Do not replace broad Nuxt rules with module-specific guidance outside \`${entry.packageName}\` surfaces.

${upstreamLinks
  ? `## Upstream links
${upstreamLinks}

`
  : ''}## How to use it
1. Start with the relevant route in [../../index.md](../../index.md) and load the matching core pack.
2. Then open the copied module skill: [${entry.skillName} / SKILL.md](${skillPath}).
3. Apply the module guidance only within \`${entry.packageName}\` surfaces.
4. If behavior is unresolved or version-sensitive, use the static docs and repository links above.

## Reliability note
${createResolverNote(entry)}

## Scripts
${scriptsNote}
`
}
