# Nuxt Best Practices

These notes improve execution quality for AI agents in this repository.
They complement Nuxt docs; they do not replace official documentation.

## Source baseline
- Nuxt docs: `docs/3.guide/2.best-practices/*`, `docs/1.getting-started/10.data-fetching.md`, `docs/3.guide/4.modules/6.best-practices.md`
- Nuxt source: `packages/nuxt/src/app/composables/{asyncData,fetch,once}.ts`, `packages/nuxt/src/app/nuxt.ts`

## How to use this file
1. Select the highest-priority relevant rule pack.
2. Apply rule IDs directly; do not paraphrase away Nuxt-specific caveats.
3. Keep scope narrow: open only the sections needed for the current change.
4. Core guidance is default; module guidance overrides core only inside explicit module scope.

## Rule Packs by Priority

| Priority | Pack | Focus | Rule ID Prefix |
| --- | --- | --- | --- |
| 1 | Data Fetching and SSR | Deduplication, payload correctness, request safety | `data-` |
| 2 | Hydration and SSR Consistency | SSR/CSR determinism and client-only boundaries | `hydration-` |
| 3 | Architecture Boundaries | Server-only secrets and request-safe state | `arch-` |
| 4 | Performance and Rendering | Rendering strategy, links, payload and asset cost | `perf-` |
| 5 | Plugins and Runtime Boot | Plugin startup cost, ordering, and isolation | `plugin-` |
| 6 | Nitro and h3 Server Patterns | Request contracts, cache behavior, and edge-safe server work | `nitro-` |
| 7 | Server Routes and Runtime Config | Handler contracts and config exposure | `server-` |
| 8 | Module Authoring Conventions | Nuxt Kit module safety and ecosystem fit | `module-` |
| 9 | Migrations and Compatibility | Safe incremental upgrades | `migration-` |

## Rule Packs

<!-- automd:file src="./rules/_sections.md" -->
<!-- /automd -->
