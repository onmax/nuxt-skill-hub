<p align="center">
  <img src="https://nuxt-skill.onmax.me/og-image.png" alt="Nuxt Skill Hub" width="100%">
</p>

<h1 align="center"><img src="https://nuxt-skill.onmax.me/icon.png" alt="" width="32" height="32" style="vertical-align: middle;"> nuxt-skill-hub</h1>

<p align="center">Teach your AI agent the Nuxt way with best practices and module guidance.</p>

<p align="center">
  <a href="https://npmx.dev/package/nuxt-skill-hub"><img src="https://npmx.dev/api/registry/badge/version/nuxt-skill-hub" alt="npm version"></a>
  <a href="https://npmx.dev/package/nuxt-skill-hub"><img src="https://npmx.dev/api/registry/badge/downloads/nuxt-skill-hub" alt="npm downloads"></a>
  <a href="https://npmx.dev/package/nuxt-skill-hub"><img src="https://npmx.dev/api/registry/badge/license/nuxt-skill-hub" alt="License"></a>
  <a href="https://nuxt.com"><img src="https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js" alt="Nuxt"></a>
</p>

> [!NOTE]
> This module is ready for production use, but the API may still evolve over time.

## Documentation

**[nuxt-skill.onmax.me](https://nuxt-skill.onmax.me)**

## Install

For agents:

```bash
npx skills add https://nuxt-skill.onmax.me/
```

For Nuxt projects:

```bash
npx nuxi module add nuxt-skill-hub
```

Use [Doctor](https://vite-doctor.onmax.me/) to check AI-written Nuxt changes for Nuxt, Vue, Nitro, and Vite issues before review.

## How it works

The module writes two things.

1. A small wrapper skill in each agent's skills directory. It only points to the generated tree, so its content barely changes and you can commit it.
2. The full generated skill tree in the Nuxt build directory, at `.nuxt/skill-hub/<skillName>/`. It is rebuilt by Nuxt and stays out of git.

```
my-app/
├── .claude/skills/nuxt-my-app/
│   └── SKILL.md                  # wrapper, commit this
└── .nuxt/skill-hub/nuxt-my-app/
    ├── SKILL.md                  # router: picks the smallest relevant guide
    └── references/
        ├── nuxt/
        │   ├── index.md
        │   └── rules/            # data-fetching-ssr.md, hydration-consistency.md, plugins.md, ...
        ├── vue/                  # Vue best practices (vuejs-ai/skills)
        └── modules/
            ├── index.md
            └── <package>/<skill>/SKILL.md
```

The wrapper is written every time Nuxt starts. The generated tree is written during `nuxt prepare`, which also runs on `postinstall` in most Nuxt projects. Both steps are skipped in CI and during `nuxi typecheck`. Results are cached in `node_modules/.cache/nuxt-skill-hub`. A later `nuxt prepare` restores the cached tree if the inputs (options, module versions, local skill files) are unchanged and the cache is younger than `remote.cacheTtlMs`.

**Agents.** With no `targets` set, the module writes a wrapper for every agent whose config directory exists in your home directory, such as `~/.claude` or `~/.codex`. The agent list comes from [unagent](https://github.com/onmax/unagent). The wrapper path mirrors that config directory inside the project: `.claude/skills/<name>/` for Claude Code, `.codex/skills/<name>/` for Codex, `.cursor/rules/<name>/` for Cursor. If no agent is detected, nothing is written and the module logs a warning.

**Skill name.** The default is `nuxt-<package name>` from your `package.json` (scope removed), or `nuxt` if there is no name.

**Monorepos.** Wrappers go to the workspace root (the nearest folder with `pnpm-workspace.yaml` or a `workspaces` field in `package.json`), so agents find them when opened at the repo root. The generated router then gets a "Monorepo scope" section that limits it to the app's path, for example `apps/web`. Each app gets its own skill name from its own `package.json`.

## Configuration

Options go under `skillHub` in `nuxt.config.ts`. All are optional.

```ts
export default defineNuxtConfig({
  modules: ['nuxt-skill-hub'],
  skillHub: {
    targets: ['claude-code', 'codex'],
    moduleAuthoring: true,
    remote: {
      githubHeuristics: true,
      timeoutMs: 3000,
    },
  },
})
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `skillName` | `string` | `nuxt-<package name>` | Name of the wrapper and generated skill. Lowercase, hyphen-case, up to 64 characters. Invalid values fall back to the default. |
| `targets` | `string[]` | `[]` (auto-detect) | Agent ids from unagent, such as `claude-code`, `codex`, `cursor`. Setting this turns off detection. Unknown ids are skipped with a warning. |
| `generationMode` | `'prepare' \| 'manual'` | `'prepare'` | `prepare` builds the tree during `nuxt prepare`. `manual` writes only the wrapper, which tells the agent that generation is off. |
| `moduleAuthoring` | `boolean` | `false` | Adds the module authoring guide to the router. Enable it when the project is a Nuxt module. |
| `remote` | `boolean \| object` | `true` | Remote lookup of module skills. `false` limits sources to installed packages, the `skill-hub:contribute` hook, and generated metadata routers. |

`remote` accepts an object with these fields:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `remote.enabled` | `boolean` | `true` | Fetch module skills from GitHub and docs sites. |
| `remote.githubHeuristics` | `boolean` | `false` | Also search GitHub repos for skill folders by path when a package declares none. |
| `remote.timeoutMs` | `number` | `1500` | Timeout for each remote request. |
| `remote.concurrency` | `number` | `8` | Number of packages resolved in parallel. |
| `remote.cacheTtlMs` | `number` | `86400000` (24 h) | How long a cached generated tree is reused. `0` regenerates on every `nuxt prepare`. |
| `remote.refresh` | `boolean` | `false` | Ignore the cache once and regenerate. |
| `remote.timings` | `boolean` | `false` | Log how each package was resolved and how long it took. Also on when Nuxt `debug` is set. |
| `remote.maxFiles` | `number` | `40` | Max files per skill from a `.well-known` index. |
| `remote.maxBytes` | `number` | `524288` (512 KB) | Max total bytes per skill from a `.well-known` index. |
| `remote.maxFileBytes` | `number` | `131072` (128 KB) | Max bytes per file from a `.well-known` index. |

## For module authors

Skill Hub looks at every package in `modules` (local paths are ignored) and every layer in `extends`. For each package it takes the first source that produces a skill:

1. **Installed package.** An `agents.skills` field in the installed `package.json`. This is the recommended path. It needs no network, and the skill always matches the installed version. The app's own `package.json` is read the same way.
2. **GitHub `agents` field.** The same field, read from the repo's `package.json` at tag `v<version>`, then `<version>`, then the default branch, `main`, and `master`. The repo comes from `repository` or `homepage`.
3. **Docs `.well-known`.** `/.well-known/agent-skills/index.json` ([Agent Skills discovery 0.2.0](https://schemas.agentskills.io/discovery/0.2.0/schema.json), `skill-md` entries with a sha256 digest) or `/.well-known/skills/index.json` (entries with `name`, `description`, and a `files` list of `.md`/`.json` files). The base URL comes from `docs`, `documentation`, or `homepage` in `package.json`. Files must be on the same origin.
4. **GitHub heuristics.** Only with `remote.githubHeuristics: true`. Looks for folders under `skills/`, then `skills/<slug>`, `.claude/skills/<slug>`, and `.github/skills/<slug>`.
5. **Metadata router.** If nothing else matched, Skill Hub writes a short skill that links to the package's docs and repository.

Steps 2 to 4 run only when `remote` is enabled. A few popular packages (`@nuxt/ui`, `@vueuse/core`, `@nuxt/content`, and others) have built-in overrides in [`src/package-overrides.ts`](./src/package-overrides.ts) that point to a known repo, ref, and path.

### Ship a skill in your package

Put the skill in a folder that is published to npm and declare it in `package.json`:

```
my-nuxt-module/
├── package.json
└── skills/
    └── my-nuxt-module/
        ├── SKILL.md
        └── references/
            └── options.md
```

```json
{
  "name": "my-nuxt-module",
  "files": ["dist", "skills"],
  "agents": {
    "skills": [
      { "name": "my-nuxt-module", "path": "./skills/my-nuxt-module" }
    ]
  }
}
```

```md
---
name: my-nuxt-module
description: Use when configuring my-nuxt-module or calling its composables.
---

# my-nuxt-module
...
```

Skill Hub validates each skill and skips it with a warning if a rule fails:

- `name` is lowercase hyphen-case, up to 64 characters, with no `--`.
- The folder name equals `name`.
- `path` stays inside the package root.
- `SKILL.md` exists and has YAML frontmatter with `name` (equal to the declared name) and a non-empty `description`.

Skill Hub copies the folder to `references/modules/<package>/<skill>/`. It skips symlinks, and for installed packages it also skips `scripts/`.

### Trust levels

Each module entry in the generated index is labeled `official` or `community`. Skills from the package itself, its repo, its docs site, or a metadata router are `official`. Skills that Skill Hub maps from a third-party repo, such as the curated `@nuxt/content` and `nuxt-studio` skills from `onmax/nuxt-skills`, are `community`.

### Add a skill from a hook

Use the `skill-hub:contribute` hook to add a skill that is not discovered automatically, for example from a local module or from your app's own config:

```ts
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  modules: ['nuxt-skill-hub'],
  hooks: {
    'skill-hub:contribute': (ctx) => {
      ctx.add({
        packageName: 'my-local-module',
        sourceDir: fileURLToPath(new URL('./skills/my-local-module', import.meta.url)),
      })
    },
  },
})
```

A module can call the same hook with `nuxt.hook('skill-hub:contribute', ...)` in its `setup`. `packageName` and `sourceDir` are required. `sourceDir` can be absolute or relative to the Nuxt root. Optional fields: `skillName` (defaults to the folder name), `version`, `description`, `docsUrl`, `repoUrl`, `official` (defaults to `true`), and `forceIncludeScripts` (defaults to `false`). Contributed skills go through the same validation as package skills.

Three more hooks report resolution progress: `skill-hub:resolve:start`, `skill-hub:resolve:package` (once per package, with the resolver used and the duration), and `skill-hub:resolve:done`.

## License

MIT
