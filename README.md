# nuxt-skill-hub

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Experimental Nuxt module that generates one consolidated project skill entrypoint (`nuxt`) and expands it with installed module skills.

This module is intentionally simple and experimental:
- Nuxt-first best-practices core
- module-scoped extensions under `references/modules/<pkg>/<skill>/`
- skills complement docs; they do not replace docs
- agent detection and target paths are sourced from [`unagent`](https://www.npmjs.com/package/unagent)

## Core content source

Core best-practices markdown is stored as shareable rule-pack files in:
- [`core-content/metadata.json`](./core-content/metadata.json)
- [`core-content/index.template.md`](./core-content/index.template.md)
- [`core-content/rules/_sections.md`](./core-content/rules/_sections.md)
- [`core-content/rules/_template.md`](./core-content/rules/_template.md)
- [`core-content/rules/data-fetching-ssr.md`](./core-content/rules/data-fetching-ssr.md)
- [`core-content/rules/hydration-consistency.md`](./core-content/rules/hydration-consistency.md)
- [`core-content/rules/architecture-boundaries.md`](./core-content/rules/architecture-boundaries.md)
- [`core-content/rules/performance-rendering.md`](./core-content/rules/performance-rendering.md)
- [`core-content/rules/plugins.md`](./core-content/rules/plugins.md)
- [`core-content/rules/nitro-h3-patterns.md`](./core-content/rules/nitro-h3-patterns.md)
- [`core-content/rules/server-routes-runtime-config.md`](./core-content/rules/server-routes-runtime-config.md)
- [`core-content/rules/module-authoring.md`](./core-content/rules/module-authoring.md)
- [`core-content/rules/migrations.md`](./core-content/rules/migrations.md)

## Resolver flow (`dist -> github -> local fallback map`)

For each installed Nuxt module package:
1. Dist resolver:
- Read local installed `package.json`.
- Parse and validate `agents.skills`.
2. GitHub resolver (default enabled if dist had no valid skill):
- Resolve GitHub repo from package metadata.
- Try refs in order (`v<version>`, `<version>`, default branch).
- Read remote `package.json` `agents.skills`, then known-path heuristics.
3. Local fallback map resolver (used when GitHub had no hit):
- Use a built-in curated map sourced from [`onmax/nuxt-skills`](https://github.com/onmax/nuxt-skills) on `main`.
Manifest output records provenance for each resolved module skill:
- `sourceKind`: `dist | github | fallbackMap`
- `sourceRepo`, `sourceRef`, `sourcePath`
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
  skillHub: {
    targetMode: 'detected',
  },
})
```

### Generated output

For each selected target, the module writes:

```txt
<target-dir>/nuxt/
├── SKILL.md
├── manifest.json
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
    enabled: true,
    skillName: 'nuxt',
    targetMode: 'detected', // 'detected' | 'explicit'
    targets: ['claude-code'],
    discoverDependencySkills: true,
    enableGithubLookup: true,
    githubLookupTimeoutMs: 1500,
    includeScripts: 'never', // 'never' | 'allowlist' | 'always'
    scriptAllowlist: ['my-module'],
    writeAgentsHint: false,
  },
})
```

## Target IDs and Detection

`nuxt-skill-hub` now uses `unagent` as the source of truth for agent IDs and skills directories.

- `skillHub.targets` accepts `unagent` agent IDs.
- `targetMode: 'detected'` includes only agents detected as `config` (strict config-only), and only when a `skillsDir` is defined.
- Generated output is always project-local, mirroring the agent config path + skills dir shape.

Examples:
- `~/.codex` + `skills` => `<root>/.codex/skills`
- `~/.cursor` + `rules` => `<root>/.cursor/rules`
- `~/.codeium/windsurf` + `rules` => `<root>/.codeium/windsurf/rules`

If a target is unknown or does not expose `skillsDir` in `unagent`, it is skipped with a warning.
Only targets exposing `skillsDir` are writable.
If a target config directory is not under the user home directory, a project-local fallback path is used.

## Migration Note (Breaking)

- Legacy hardcoded target IDs are removed.
- Hard switch to `unagent` target IDs (no legacy ID compatibility map).
- Synthetic GitHub Copilot `.github/skills` target is removed.
- Legacy compatibility path writes are removed.

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

## Manifest

Generated `manifest.json` includes:
- `modules`: copied/active module skills with source metadata.
- `skipped`: validation/network-skipped module skills with reasons.

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
