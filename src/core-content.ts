export const CORE_RULE_FILES: Record<string, string> = {
  'architecture.md': `# Nuxt Architecture Boundaries

## Server/Client Separation

### When to apply
Any feature that touches secrets, auth checks, external APIs, or request-specific logic.

### Wrong pattern
Put secret-bearing logic in composables imported by client code.

### Recommended pattern
Keep sensitive logic in Nitro handlers ('server/api/*') or server-only utilities.

### Nuxt-specific caveat
'runtimeConfig.public' is client-visible. Use private 'runtimeConfig' keys for secrets.

## Composables vs Utilities

### When to apply
When adding reusable logic consumed across pages/components.

### Wrong pattern
Use plain module singletons for request-scoped state.

### Recommended pattern
Use Nuxt/Vue composables for reactive state and request-aware behavior.

### Nuxt-specific caveat
Server rendering runs per request. Global mutable module state can leak across requests.

## Route Structure

### When to apply
When adding page-level features and nested layouts.

### Wrong pattern
Overload one page with unrelated responsibilities.

### Recommended pattern
Use file-based routing and route groups to keep boundaries explicit.

### Nuxt-specific caveat
Prefer route-level composition over custom router mutations unless there is a strong reason.
`,
  'data-fetching-ssr.md': `# Data Fetching and SSR

## Fetching Strategy

### When to apply
Any new server-rendered page or data-dependent route.

### Wrong pattern
Duplicate the same fetch in multiple components without coordination.

### Recommended pattern
Fetch at the highest meaningful boundary and pass data down; parallelize independent calls.

### Nuxt-specific caveat
Use Nuxt-native fetching patterns ('useFetch', server handlers) and avoid ad-hoc fetch wrappers unless necessary.

## Client Re-fetching

### When to apply
When interaction requires refresh or optimistic updates.

### Wrong pattern
Blindly re-fetch full payloads after every small mutation.

### Recommended pattern
Scope invalidation/re-fetch to impacted resources.

### Nuxt-specific caveat
Hydration already carries initial SSR state; avoid duplicate immediate client refetch by default.

## Error Surfaces

### When to apply
API failures, partial content, degraded endpoints.

### Wrong pattern
Swallow server errors and render empty UI states silently.

### Recommended pattern
Return explicit error states with useful context and fallback behavior.

### Nuxt-specific caveat
Prefer Nuxt error utilities and route-level error handling over custom global hacks.
`,
  'server-runtime-security.md': `# Server Runtime and Security

## Runtime Config Discipline

### When to apply
Adding environment variables, API keys, and service endpoints.

### Wrong pattern
Expose full server config in client helpers.

### Recommended pattern
Whitelist only required public values, keep private config server-only.

### Nuxt-specific caveat
Audit 'runtimeConfig.public' changes as a public API change.

## Input Validation

### When to apply
New server routes, webhooks, action endpoints.

### Wrong pattern
Trust request payload shape without validation.

### Recommended pattern
Validate input at handler boundaries and fail with explicit HTTP errors.

### Nuxt-specific caveat
Use h3-compatible validation patterns close to the handler entrypoint.

## Caching and State

### When to apply
High-traffic endpoints or expensive upstream calls.

### Wrong pattern
Store cross-request mutable state in module scope without policy.

### Recommended pattern
Use explicit cache primitives and invalidation strategy.

### Nuxt-specific caveat
Nitro runtime may vary by platform; document cache behavior assumptions.
`,
  'module-authoring.md': `# Nuxt Module Authoring

## Runtime Extension Boundaries

### When to apply
Publishing or maintaining a Nuxt module.

### Wrong pattern
Inject broad runtime behavior without opt-in configuration.

### Recommended pattern
Expose explicit module options and keep defaults predictable.

### Nuxt-specific caveat
Use Nuxt Kit utilities and module hooks instead of undocumented internals.

## Skill Contribution Scope

### When to apply
Module ships 'agents.skills' content.

### Wrong pattern
Write global framework guidance inside module-specific skill docs.

### Recommended pattern
Keep module skills narrowly scoped to that module's APIs and integration points.

### Nuxt-specific caveat
Module guidance can override core guidance only within module scope.

## Versioning

### When to apply
Releases with behavior or API changes.

### Wrong pattern
Update docs/skills out-of-band from release version.

### Recommended pattern
Ship skill updates with package releases.

### Nuxt-specific caveat
Treat skill quality as DX surface area of your module.
`,
  'migrations.md': `# Migration and Compatibility

## Change Framing

### When to apply
Minor/major Nuxt upgrades or module major updates.

### Wrong pattern
Apply sweeping refactors without migration notes.

### Recommended pattern
Break migration into small, reversible steps with clear checkpoints.

### Nuxt-specific caveat
Prefer official migration patterns for Nuxt/Nitro/h3 over improvised rewrites.

## Deprecation Handling

### When to apply
Deprecated composables, APIs, config keys.

### Wrong pattern
Mix old and new patterns indefinitely.

### Recommended pattern
Prioritize removing deprecated usage in touched areas first.

### Nuxt-specific caveat
Deprecation cleanup should be verified in both dev and production-like builds.

## Validation

### When to apply
After migration commits.

### Wrong pattern
Validate only happy-path pages.

### Recommended pattern
Run typecheck, targeted runtime tests, and representative route checks.

### Nuxt-specific caveat
SSR and client hydration paths must both be validated.
`,
}

export const CORE_INDEX_TEMPLATE = `# Nuxt Best Practices

These notes are for AI execution quality in this repository.
They complement docs; they do not replace official documentation.

## How to use this file
- Start with the section that matches your task.
- Apply core guidance by default.
- Module guidance can override core guidance only inside module scope.

## Sections

<!-- automd:file src="./architecture.md" -->
<!-- /automd -->

<!-- automd:file src="./data-fetching-ssr.md" -->
<!-- /automd -->

<!-- automd:file src="./server-runtime-security.md" -->
<!-- /automd -->

<!-- automd:file src="./module-authoring.md" -->
<!-- /automd -->

<!-- automd:file src="./migrations.md" -->
<!-- /automd -->
`

export function createSkillEntrypoint(skillName: string): string {
  return `---
name: ${skillName}
description: Nuxt super-skill for this project. Use as the entry point for Nuxt best practices plus installed module skill extensions.
---

# Nuxt Super Skill (Experimental)

This skill is a router entrypoint.

## Workflow
1. Open [references/index.md](./references/index.md).
2. Apply core guidance first.
3. If your task touches an installed module, load that module's scoped guidance under [references/modules](./references/modules).

## Scope rule
Core guidance is default. Module guidance overrides core only inside the module's explicit scope.
`
}
