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

export type PreviewSourceKind = 'dist' | 'github' | 'fallbackMap' | 'generated'
export type PreviewResolverKind = 'agentsField' | 'githubHeuristic' | 'mapEntry' | 'metadataRouter'
export type PreviewTrustLevel = 'official' | 'community'

export interface SkillModuleRenderEntry {
  packageName: string
  version?: string
  skillName: string
  description?: string
  scriptsIncluded: boolean
  sourceKind: PreviewSourceKind
  sourceLabel?: string
  sourceRepo?: string
  sourceRef?: string
  sourcePath?: string
  repoUrl?: string
  docsUrl?: string
  official: boolean
  trustLevel?: PreviewTrustLevel
  resolver: PreviewResolverKind
  wrapperPath?: string
}

export interface SkillSkippedRenderEntry {
  packageName: string
  skillName: string
  reason: string
  sourceKind?: PreviewSourceKind
}

export interface SkillFrontmatter {
  name?: string
  description?: string
}

export const DEFAULT_CORE_CONTENT_METADATA: CoreContentMetadata = {
  id: 'nuxt-best-practices',
  version: '1.5.0',
  experimental: true,
  description: 'Nuxt-native best-practice rule packs for AI execution. Complements docs, not a replacement.',
  sections: [
    'data-fetching-ssr',
    'hydration-consistency',
    'architecture-boundaries',
    'performance-rendering',
    'plugins',
    'nitro-h3-patterns',
    'server-routes-runtime-config',
    'module-authoring',
    'migrations',
  ],
  packs: [
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
      id: 'performance-rendering',
      title: 'Performance and Rendering',
      focus: 'Rendering strategy, payload cost, and lazy loading tradeoffs.',
      triggers: ['Performance regressions or rendering strategy changes', 'Link, asset, and bundle cost decisions'],
      relativePath: 'rules/performance-rendering.md',
    },
    {
      id: 'plugins',
      title: 'Plugins and Runtime Boot',
      focus: 'Plugin ordering, startup cost, and app/runtime initialization.',
      triggers: ['Plugins, app boot logic, or injected runtime helpers', 'Global runtime behavior changes'],
      relativePath: 'rules/plugins.md',
    },
    {
      id: 'nitro-h3-patterns',
      title: 'Nitro and h3 Server Patterns',
      focus: 'Handler contracts, caching, and edge-safe server behavior.',
      triggers: ['Server routes, middleware, Nitro plugins, or h3 handlers', 'API behavior, caching, or edge runtime concerns'],
      relativePath: 'rules/nitro-h3-patterns.md',
    },
    {
      id: 'server-routes-runtime-config',
      title: 'Server Routes and Runtime Config',
      focus: 'Runtime config exposure, env handling, and route-level contracts.',
      triggers: ['nuxt.config, runtime config, or env wiring', 'Server route config and public/private config exposure'],
      relativePath: 'rules/server-routes-runtime-config.md',
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

export function getSourceLabel(sourceKind: PreviewSourceKind): string {
  switch (sourceKind) {
    case 'dist':
      return 'Installed package skill'
    case 'github':
      return 'GitHub-resolved skill'
    case 'fallbackMap':
      return 'Curated fallback skill'
    case 'generated':
      return 'Metadata-routed skill'
  }
}

export function getTrustLevel(official: boolean): PreviewTrustLevel {
  return official ? 'official' : 'community'
}

export interface MetadataRouterSkillInput {
  packageName: string
  skillName: string
  description?: string
  repoUrl?: string
  docsUrl?: string
}

function formatMetadataLinks(entry: Pick<MetadataRouterSkillInput, 'repoUrl' | 'docsUrl'>): string {
  const links: string[] = []

  if (entry.docsUrl) {
    links.push(`- Official docs: [${entry.docsUrl}](${entry.docsUrl})`)
  }

  if (entry.repoUrl) {
    links.push(`- Repository: [${entry.repoUrl}](${entry.repoUrl})`)
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

  return {
    'SKILL.md': `---
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
1. Start with the relevant core pack from [../../core/index.md](../../core/index.md).
2. Open [references/index.md](./references/index.md) for routing guidance.
${routeLines}
`,
    'references/index.md': `# ${input.packageName} Metadata Router

This generated skill routes the agent to the smallest trustworthy upstream source for \`${input.packageName}\`.

## Upstream sources
${linkLines || '- No upstream links were available in package metadata.'}

## How to use this router
1. Read the module docs first when available.
2. Use the repository source for implementation details or missing edge cases.
3. Keep this module scoped to \`${input.packageName}\` surfaces only.
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

function formatVersion(version?: string): string {
  return version ? `v${version}` : 'unknown'
}

function relativeWrapperLink(entry: SkillModuleRenderEntry, prefix: string): string {
  if (!entry.wrapperPath) {
    return ''
  }

  return `${prefix}${entry.wrapperPath.replace(/^references\/modules\//, '')}`
}

function groupModuleEntries(entries: SkillModuleRenderEntry[]) {
  const officialUpstream = entries.filter(entry => entry.sourceKind === 'dist')
  const githubResolved = entries.filter(entry => entry.sourceKind === 'github')
  const curatedFallback = entries.filter(entry => entry.sourceKind === 'fallbackMap')
  const metadataRouted = entries.filter(entry => entry.sourceKind === 'generated')

  return { officialUpstream, githubResolved, curatedFallback, metadataRouted }
}

function renderModuleGroup(title: string, entries: SkillModuleRenderEntry[], prefix: string): string {
  if (!entries.length) {
    return ''
  }

  const lines = entries.map((rawEntry) => {
    const entry = withDerivedModuleFields(rawEntry)
    const wrapperLink = relativeWrapperLink(entry, prefix)
    const description = entry.description ? ` ${entry.description}` : ''
    return `- [${entry.packageName}](${wrapperLink}) \`${formatVersion(entry.version)}\` - ${entry.sourceLabel}. Trust: \`${entry.trustLevel}\`.${description}`
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

export function createModulesListMarkdown(entries: SkillModuleRenderEntry[], skipped: SkillSkippedRenderEntry[] = []): string {
  const { officialUpstream, githubResolved, curatedFallback, metadataRouted } = groupModuleEntries(entries)
  const sections = [
    renderModuleGroup('Official upstream skills', officialUpstream, './'),
    renderModuleGroup('GitHub-resolved skills', githubResolved, './'),
    renderModuleGroup('Curated fallback skills', curatedFallback, './'),
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
    `| ${pack.triggers.join('<br>')} | [${pack.title}](./core/${pack.relativePath}) | ${pack.focus} |`,
  )

  return [
    '| Surface or symptom | Load | Focus |',
    '| --- | --- | --- |',
    ...rows,
  ].join('\n')
}

export function createReferencesIndexContent(
  metadata: CoreContentMetadata,
  entries: SkillModuleRenderEntry[],
  skipped: SkillSkippedRenderEntry[] = [],
): string {
  const grouped = groupModuleEntries(entries)
  const moduleSections = [
    renderModuleGroup('Official upstream skills', grouped.officialUpstream, './modules/'),
    renderModuleGroup('GitHub-resolved skills', grouped.githubResolved, './modules/'),
    renderModuleGroup('Curated fallback skills', grouped.curatedFallback, './modules/'),
    renderModuleGroup('Metadata-routed skills', grouped.metadataRouted, './modules/'),
    renderSkippedEntries(skipped),
  ].filter(Boolean)
  const moduleGuideContent = moduleSections.length
    ? moduleSections.join('\n')
    : '_No module skills discovered. Use core guidance plus official module docs when module-specific guidance is missing._'

  return `# Nuxt Skill Map

This map routes you to the smallest relevant guidance set.

## How to use this map
1. Choose the core pack that matches the surface you are changing.
2. If an installed module is involved, open that module wrapper before the copied module \`SKILL.md\`.
3. If a module skill is skipped or unavailable, use the relevant core pack plus the module's official docs.

## Choose your core pack

${createCorePackTable(metadata)}

## Module guides

Read a generated module wrapper first. It explains provenance, trust, scope boundaries, and how to use the copied skill safely.

${moduleGuideContent}
---

_Generated by nuxt-skill-hub. Do not edit this file manually._
`
}

function createPackSummary(metadata: CoreContentMetadata): string {
  return metadata.packs
    .slice(0, 6)
    .map(pack => `\`${pack.title}\``)
    .join(', ')
}

export function createSkillEntrypoint(
  skillName: string,
  metadata: CoreContentMetadata,
  monorepoScopePath?: string,
): string {
  const description = 'Nuxt router skill for this project. Use it to load the relevant core Nuxt rule packs and installed module skill wrappers before making changes.'
  const monorepoScopeSection = monorepoScopePath
    ? `
## Monorepo Scope
This skill applies only to the \`${monorepoScopePath}\` subtree of this monorepo.
Treat files and tasks outside \`${monorepoScopePath}\` as out of scope unless the user explicitly redirects you there.
`
    : ''

  return `---
name: ${yamlString(skillName)}
description: ${yamlString(description)}
---

# Nuxt Skill Router

This file is the always-on routing and execution contract for Nuxt work in this repository.
It is not the full framework knowledge base.
${monorepoScopeSection}

## Activation Flow
1. Inspect the task surface and open [references/index.md](./references/index.md).
2. Load the smallest relevant core pack from the routing table there.
3. If an installed module is involved, read its generated wrapper under [references/modules](./references/modules) before opening the copied module \`SKILL.md\`.
4. Apply module guidance only inside that module's APIs, config, runtime behavior, and owned files.

## Always Apply
- Preserve repository conventions and keep the diff as small as possible.
- Verify the changed surface with the repo checks that matter for the task.
- Report missing, skipped, or low-confidence module guidance when it materially affects confidence.

## Precedence
- Repository-global instructions and required workflows win first.
- This router decides which Nuxt guidance to load next.
- Core packs define global Nuxt conventions.
- Module guidance overrides core only inside the module's explicit scope.

## When Unsure
- If instructions conflict, fall back to the relevant core pack and call out the conflict.
- If a needed module skill is missing or low-confidence, use core guidance plus the module's official docs.

## Core Packs
Start with the relevant pack in [references/index.md](./references/index.md). Primary packs include ${createPackSummary(metadata)}.
`
}

function createResolverNote(entry: SkillModuleRenderEntry): string {
  if (entry.sourceKind === 'dist') {
    return 'This module skill came from the installed package. Treat it as the highest-confidence module-specific guide.'
  }

  if (entry.sourceKind === 'github' && entry.resolver === 'agentsField') {
    return 'This module skill was resolved from the package repository metadata. It is still module-specific guidance, but you should verify critical details against the installed module version.'
  }

  if (entry.sourceKind === 'github') {
    return 'This module skill was resolved from GitHub heuristics. Verify critical details against the installed module docs or source before relying on edge-case behavior.'
  }

  if (entry.sourceKind === 'generated') {
    return 'This module router was generated from package metadata. Use the linked docs and repository as the source of truth for module-specific behavior.'
  }

  return 'This module skill came from the curated fallback map. Treat it as lower-confidence guidance and verify important behavior against the installed module docs or source.'
}

export function createModuleWrapperContent(entry: SkillModuleRenderEntry): string {
  const derivedEntry = withDerivedModuleFields(entry)
  const skillPath = `./${entry.skillName}/SKILL.md`
  const scriptsNote = entry.scriptsIncluded
    ? 'Module scripts were copied into this generated output.'
    : 'Module scripts were not copied into this generated output.'
  const descriptionBlock = entry.description
    ? `## Module Summary\n${entry.description}\n\n`
    : ''
  const upstreamLinks = [entry.docsUrl, entry.repoUrl]
    .filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index)
    .map((value) => {
      const label = value === entry.docsUrl ? 'Docs' : 'Repository'
      return `- ${label}: [${value}](${value})`
    })
    .join('\n')

  return `# ${entry.packageName} Module Wrapper

Use this wrapper before opening the copied module skill.

## Snapshot
- Package: \`${entry.packageName}\`
- Installed version: \`${formatVersion(entry.version)}\`
- Skill: \`${entry.skillName}\`
- Source: ${derivedEntry.sourceLabel}
- Trust: \`${derivedEntry.trustLevel}\`
- Scripts: ${entry.scriptsIncluded ? 'included' : 'not included'}

${descriptionBlock}## When to load this module skill
- The task edits this module's config, runtime behavior, plugins, composables, components, hooks, or owned files.
- The bug or refactor is clearly caused by \`${entry.packageName}\`.
- You already know the work is module-specific rather than a general Nuxt pattern.

${upstreamLinks
  ? `## Upstream links
${upstreamLinks}

`
  : ''}## How to use it
1. Start with the relevant core pack from [../../core/index.md](../../core/index.md).
2. Then open the copied module skill: [${entry.skillName} / SKILL.md](${skillPath}).
3. Apply the module guidance only within \`${entry.packageName}\` surfaces.

## Reliability note
${createResolverNote(entry)}

## Scripts
${scriptsNote}
`
}
