# Nuxt Best Practices

These notes improve execution quality for AI agents in this repository.
They complement Nuxt docs; they do not replace official documentation.

## Source baseline
- Nuxt docs: `docs/3.guide/2.best-practices/*`, `docs/1.getting-started/10.data-fetching.md`, `docs/3.guide/4.modules/6.best-practices.md`
- Nuxt source: `packages/nuxt/src/app/composables/{asyncData,fetch,once}.ts`, `packages/nuxt/src/app/nuxt.ts`

## How to use this file
1. Start with the smallest high-priority pack that matches the actual surface or symptom.
2. Apply rule IDs directly; do not paraphrase away Nuxt-specific caveats.
3. Treat the first six packs as disambiguation overlays before broader infra packs.
4. Keep scope narrow: open only the sections needed for the current change.
5. Nuxt guidance is default; module guidance overrides it only inside explicit module scope.

## Rule Packs by Priority

| Priority | Pack | Focus | Rule ID Prefix |
| --- | --- | --- | --- |
| 1 | Abstraction Disambiguation | Choose framework-owned primitives before generic Vue or raw HTML | `disambiguation-` |
| 2 | Page Meta, Head, and Layout | Separate page behavior, document metadata, and layout structure | `page-` |
| 3 | Error Surfaces and Recovery | Cover both global and local error surfaces with the right recovery utilities | `error-` |
| 4 | Verification and Finish | Re-check paired surfaces and verify framework behavior before concluding | `verify-` |
| 5 | Data Fetching and SSR | Deduplication, payload correctness, and request safety | `data-` |
| 6 | Hydration and SSR Consistency | SSR and CSR determinism and client-only boundaries | `hydration-` |
| 7 | Architecture Boundaries | Server-only secrets and request-safe state | `arch-` |
| 8 | Server Routes and Runtime Config | Handler contracts and config exposure | `server-` |
| 9 | Nitro and h3 Server Patterns | Request contracts, caching behavior, and edge-safe server work | `nitro-` |
| 10 | Plugins and Runtime Boot | Plugin startup cost, ordering, and isolation | `plugin-` |
| 11 | Performance and Rendering | Rendering strategy, links, payload, and asset cost | `perf-` |
| 12 | Module Authoring Conventions | Nuxt Kit module safety and ecosystem fit | `module-` |
| 13 | Migrations and Compatibility | Safe incremental upgrades | `migration-` |

## Rule Packs

<!-- automd:file src="./rules/abstraction-disambiguation.md" -->
<!-- /automd -->

<!-- automd:file src="./rules/page-meta-head-layout.md" -->
<!-- /automd -->

<!-- automd:file src="./rules/error-surfaces-recovery.md" -->
<!-- /automd -->

<!-- automd:file src="./rules/verification-finish.md" -->
<!-- /automd -->

<!-- automd:file src="./rules/data-fetching-ssr.md" -->
<!-- /automd -->

<!-- automd:file src="./rules/hydration-consistency.md" -->
<!-- /automd -->

<!-- automd:file src="./rules/architecture-boundaries.md" -->
<!-- /automd -->

<!-- automd:file src="./rules/server-routes-runtime-config.md" -->
<!-- /automd -->

<!-- automd:file src="./rules/nitro-h3-patterns.md" -->
<!-- /automd -->

<!-- automd:file src="./rules/plugins.md" -->
<!-- /automd -->

<!-- automd:file src="./rules/performance-rendering.md" -->
<!-- /automd -->

<!-- automd:file src="./rules/module-authoring.md" -->
<!-- /automd -->

<!-- automd:file src="./rules/migrations.md" -->
<!-- /automd -->
