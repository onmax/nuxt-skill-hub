# nuxt-skill-hub

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Teach your AI agent the Nuxt way with best practices and module guidance.

This module is intentionally simple and experimental:
- Nuxt-first best-practices core
- module-scoped extensions under `references/modules/<pkg>/<skill>/`
- skills complement docs; they do not replace docs
- agent detection and target paths are sourced from [`unagent`](https://www.npmjs.com/package/unagent)

## Core content source

Core best-practices markdown is stored as shareable rule-pack files in:
- [`core-content/index.template.md`](./core-content/index.template.md)
- [`core-content/rules/abstraction-disambiguation.md`](./core-content/rules/abstraction-disambiguation.md)
- [`core-content/rules/page-meta-head-layout.md`](./core-content/rules/page-meta-head-layout.md)
- [`core-content/rules/error-surfaces-recovery.md`](./core-content/rules/error-surfaces-recovery.md)
- [`core-content/rules/content-modeling-navigation.md`](./core-content/rules/content-modeling-navigation.md)
- [`core-content/rules/nuxt-ui-primitives.md`](./core-content/rules/nuxt-ui-primitives.md)
- [`core-content/rules/verification-finish.md`](./core-content/rules/verification-finish.md)
- [`core-content/rules/data-fetching-ssr.md`](./core-content/rules/data-fetching-ssr.md)
- [`core-content/rules/hydration-consistency.md`](./core-content/rules/hydration-consistency.md)
- [`core-content/rules/architecture-boundaries.md`](./core-content/rules/architecture-boundaries.md)
- [`core-content/rules/performance-rendering.md`](./core-content/rules/performance-rendering.md)
- [`core-content/rules/plugins.md`](./core-content/rules/plugins.md)
- [`core-content/rules/nitro-h3-patterns.md`](./core-content/rules/nitro-h3-patterns.md)
- [`core-content/rules/server-routes-runtime-config.md`](./core-content/rules/server-routes-runtime-config.md)
- [`core-content/rules/module-authoring.md`](./core-content/rules/module-authoring.md)
- [`core-content/rules/migrations.md`](./core-content/rules/migrations.md)

Core pack metadata is defined in TypeScript via `DEFAULT_CORE_CONTENT_METADATA`.

## Resolver flow (`dist -> github -> metadata router`)

For each installed Nuxt module package:
1. Dist resolver:
- Read local installed `package.json`.
- Parse and validate `agents.skills`.
2. GitHub resolver (default enabled if dist had no valid skill):
- Resolve GitHub repo from package metadata.
- Try refs in order (`v<version>`, `<version>`, default branch).
- Read remote `package.json` `agents.skills`, then known-path heuristics.
3. Metadata router (used when no skill artifact was found):
- Generate a minimal routing skill from local package metadata.
- Link the agent to the package homepage/docs and repository source.
Manifest output records provenance for each resolved module skill:
- `sourceKind`: `dist | github | generated`
- `sourceRepo`, `sourceRef`, `sourcePath`
- `repoUrl`, `docsUrl`
- `official` and `resolver`

## Install

```bash
npx nuxt module add nuxt-skill-hub
```

## Usage

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-skill-hub'],
})
```

### Generated output

For each selected target, the module writes:

```txt
<target-dir>/nuxt/
├── SKILL.md
└── references/
    ├── index.md
    ├── core/
    └── modules/
```

Example targets:

```txt
.claude/skills/nuxt/
.cursor/rules/nuxt/
.codeium/windsurf/rules/nuxt/
```

## Configuration

```ts
export default defineNuxtConfig({
  skillHub: {
    fallbackLinksOnly: true,
    moduleAuthoring: true,
    skillName: 'nuxt',
    targets: ['claude-code'],
  },
})
```

## Target IDs and Detection

`nuxt-skill-hub` now uses `unagent` as the source of truth for agent IDs and skills directories.

- `skillHub.targets` accepts `unagent` agent IDs.
- `skillHub.fallbackLinksOnly` accepts `boolean` and defaults to `true`.
- `skillHub.moduleAuthoring` accepts `boolean` and defaults to `false`.
- Leaving `skillHub.targets` empty includes only agents detected as `config` (strict config-only).
- Generated output is app-local for standalone repos, and workspace-root local for monorepos, mirroring the agent config path + skills dir shape.

Examples:
- `~/.cursor` + `rules` => `<root>/.cursor/rules`
- `~/.codeium/windsurf` + `rules` => `<root>/.codeium/windsurf/rules`
- Monorepo app `apps/web` => `<workspace-root>/.claude/skills/<app-skill>`

If a target is unknown or does not expose `skillsDir` in `unagent`, it is skipped with a warning.
When output is written at a monorepo workspace root, the generated top-level `SKILL.md` includes a hard scope warning that limits the skill to the consuming app subtree.

## Module author contract

Modules can ship skill artifacts in package dist via `agents.skills`:

```json
{
  "agents": {
    "skills": [
      { "name": "nuxt-seo", "path": "./skills/nuxt-seo" }
    ]
  }
}
```

Validation rules for contributed module skills:
- `agents.skills[].name` must be strict skill format (`hyphen-case`, lowercase, max 64, no consecutive hyphens).
- `agents.skills[].path` must resolve inside the package root.
- Skill directory name must match `agents.skills[].name`.
- Skill root must include `SKILL.md` with YAML frontmatter containing non-empty `name` and `description`.
- `SKILL.md` frontmatter `name` must match `agents.skills[].name`.

When validation fails, the module logs warnings and skips the invalid skill. Generation continues.

Scope rule for module authors:
- Module skills should only document module-specific behavior.
- Core guidance remains default.
- Module guidance overrides core only in explicit module scope.

When no module skill is available but package metadata exposes a repository or homepage, the generated output includes a metadata-routed module skill instead of skipping the package outright.

## Local contribution hook

Projects or local modules can contribute extra skill sources:

```ts
export default defineNuxtModule({
  setup(_, nuxt) {
    nuxt.hook('skill-hub:contribute', (ctx) => {
      ctx.add({
        packageName: 'local-module',
        sourceDir: '/absolute/path/to/skills/local-module',
        skillName: 'local-module',
      })
    })
  },
})
```

## Contribution

```bash
pnpm install
pnpm run dev:prepare
pnpm run test
pnpm run lint
pnpm run typecheck
pnpm --dir docs dev
```

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-skill-hub/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-skill-hub
[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-skill-hub.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-skill-hub
[license-src]: https://img.shields.io/npm/l/nuxt-skill-hub.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-skill-hub
[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt
[nuxt-href]: https://nuxt.com
