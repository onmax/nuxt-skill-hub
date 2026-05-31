---
name: nuxt
description: "Use Nuxt Skill Hub guidance for Nuxt, Vue, Nitro, runtime config, page metadata, hydration, data fetching, Nuxt UI, Nuxt Content, and installed Nuxt module work."
---

# Nuxt

## Quick Start

Use this skill before changing a Nuxt project:

```bash
npx skills add https://nuxt-skill.onmax.me/
```

For project-specific module guidance, install the Nuxt module in the target app:

```bash
npx nuxi module add nuxt-skill-hub
```

Then run the project's prepare step so Skill Hub can generate the local agent skill tree.

## Workflow

1. Inspect the exact surface first: page, layout, component, composable, server route, plugin, module API, or config file.
2. Choose the smallest Nuxt-owned abstraction before falling back to generic Vue or raw HTML.
3. For initial render data, prefer Nuxt payload-backed loading with `useFetch` or `useAsyncData`.
4. Keep browser-only APIs out of SSR paths unless the code is gated behind client-only execution.
5. Keep secrets and privileged I/O behind server routes, server utilities, or runtime config private values.
6. Use module-specific guidance only when an installed module owns the API, component, hook, or runtime behavior being edited.
7. Verify the intended Nuxt behavior before finishing, not only the visible output.

## Routing

- Page metadata, canonical URLs, Open Graph, layouts, or middleware: use Nuxt page/head patterns.
- Hydration warnings, time, randomness, browser globals, or client-only rendering: use hydration and SSR consistency guidance.
- Runtime config, environment variables, API routes, Nitro handlers, caching, or request validation: use Nuxt server guidance.
- Vue component structure, props, emits, composables, or reactivity after the Nuxt decision is settled: use Vue guidance.
- Nuxt UI, Nuxt Content, NuxtHub, or other module APIs: start with the broad Nuxt rule, then apply module-specific docs or generated Skill Hub module guidance.

## Links

- Docs: https://nuxt-skill.onmax.me/
- Source: https://github.com/onmax/nuxt-skill-hub
- Nuxt best practices: https://github.com/onmax/nuxt-skill-hub/tree/main/nuxt-best-practices

## Rules

- Do not replace Nuxt-specific rules with generic framework advice when Nuxt owns the surface.
- Do not assume a module API shape from memory when the installed version can differ.
- Do not broaden edits beyond the reported Nuxt surface unless the user asks for broader cleanup.
- Treat Skill Hub as execution guidance that complements official docs; it does not replace source or version-specific documentation.
