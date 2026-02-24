# nuxt-skill-hub

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Experimental Nuxt module that generates one consolidated project skill entrypoint (`nuxt`) and expands it with installed module skills discovered from `package.json -> agents.skills`.

This module is intentionally simple and experimental:
- Nuxt-first best-practices core
- module-scoped extensions under `references/modules/<pkg>/<skill>/`
- no automatic fallback packs
- skills complement docs; they do not replace docs

## Core content source

Core best-practices markdown is stored as shareable source files in:
- [`core-content/index.template.md`](./core-content/index.template.md)
- [`core-content/architecture.md`](./core-content/architecture.md)
- [`core-content/data-fetching-ssr.md`](./core-content/data-fetching-ssr.md)
- [`core-content/server-runtime-security.md`](./core-content/server-runtime-security.md)
- [`core-content/module-authoring.md`](./core-content/module-authoring.md)
- [`core-content/migrations.md`](./core-content/migrations.md)

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

Example for GitHub Copilot target:

```txt
.github/skills/nuxt/
```

## Configuration

```ts
export default defineNuxtConfig({
  skillHub: {
    enabled: true,
    skillName: 'nuxt',
    targetMode: 'detected', // 'detected' | 'explicit'
    targets: ['github-copilot'],
    discoverDependencySkills: true,
    includeScripts: 'never', // 'never' | 'allowlist' | 'always'
    scriptAllowlist: ['my-module'],
    writeAgentsHint: false,
  },
})
```

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
