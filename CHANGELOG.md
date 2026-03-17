# Changelog


## v0.0.1


### 🚀 Enhancements

- Add nuxt super-skill module ([84e5582](https://github.com/onmax/nuxt-skill-hub/commit/84e5582))
- Harden super-skill validation ([aaac7b3](https://github.com/onmax/nuxt-skill-hub/commit/aaac7b3))
- Add staged skill resolution ([5967753](https://github.com/onmax/nuxt-skill-hub/commit/5967753))
- Restore internal fallback map ([09df8d9](https://github.com/onmax/nuxt-skill-hub/commit/09df8d9))
- **core-content:** Add nuxt nitro h3 rules ([543c4b0](https://github.com/onmax/nuxt-skill-hub/commit/543c4b0))
- Switch targets to unagent ([32e21df](https://github.com/onmax/nuxt-skill-hub/commit/32e21df))
- Add missing fallback map entries ([8666995](https://github.com/onmax/nuxt-skill-hub/commit/8666995))
- Add onInstall wizard ([cc60d61](https://github.com/onmax/nuxt-skill-hub/commit/cc60d61))
- Derive skill name from project package.json ([a066acc](https://github.com/onmax/nuxt-skill-hub/commit/a066acc))
- Discover skills from repo root skills/ dir ([386aa5c](https://github.com/onmax/nuxt-skill-hub/commit/386aa5c))
- Add additionalPackages option ([1f8125d](https://github.com/onmax/nuxt-skill-hub/commit/1f8125d))
- Refresh skill hub content and add release automation ([116b055](https://github.com/onmax/nuxt-skill-hub/commit/116b055))
- **docs:** Add module skill preview resolver ([54a7ce1](https://github.com/onmax/nuxt-skill-hub/commit/54a7ce1))
- **docs:** Add favicon with nuxt colors ([adb2771](https://github.com/onmax/nuxt-skill-hub/commit/adb2771))
- **docs:** Add swiss knife favicon and icon ([b3d84c0](https://github.com/onmax/nuxt-skill-hub/commit/b3d84c0))
- **docs:** Add links to Vue and Nuxt best practices in skill grid ([0aeeae8](https://github.com/onmax/nuxt-skill-hub/commit/0aeeae8))

### 🩹 Fixes

- Expand onmax fallback skill map ([14bd8be](https://github.com/onmax/nuxt-skill-hub/commit/14bd8be))
- **playground:** Sort nuxt config keys ([888c215](https://github.com/onmax/nuxt-skill-hub/commit/888c215))
- **skill-gen:** Codex target and discovery ([7462783](https://github.com/onmax/nuxt-skill-hub/commit/7462783))
- Resolve catalog refs in dependencies ([f014bd6](https://github.com/onmax/nuxt-skill-hub/commit/f014bd6))
- Use useLogger, fix toPosix, fix option ref ([a447b1e](https://github.com/onmax/nuxt-skill-hub/commit/a447b1e))
- Resolve skills for nuxt layers ([baf7b4c](https://github.com/onmax/nuxt-skill-hub/commit/baf7b4c))
- Allow git-hosted installs ([3506fed](https://github.com/onmax/nuxt-skill-hub/commit/3506fed))
- Export monorepo skills at workspace root ([453eb9a](https://github.com/onmax/nuxt-skill-hub/commit/453eb9a))
- **ci:** Satisfy multiline ternary lint rules ([40fe350](https://github.com/onmax/nuxt-skill-hub/commit/40fe350))
- **test:** Allow server utils to import from src ([f6d9f9b](https://github.com/onmax/nuxt-skill-hub/commit/f6d9f9b))
- Correct repository URL to onmax org ([f99d1bd](https://github.com/onmax/nuxt-skill-hub/commit/f99d1bd))
- **docs:** Prerender module skills for static deployment ([cc3a75b](https://github.com/onmax/nuxt-skill-hub/commit/cc3a75b))
- Prioritize official skills over community, fix router newlines ([c5b0c63](https://github.com/onmax/nuxt-skill-hub/commit/c5b0c63))
- **docs:** Handle md links in playground ([ae643df](https://github.com/onmax/nuxt-skill-hub/commit/ae643df))
- **docs:** Polish animations and playground UI ([3bb9f4e](https://github.com/onmax/nuxt-skill-hub/commit/3bb9f4e))
- Move mlly to deps, add logo header, npmx badges ([75454ce](https://github.com/onmax/nuxt-skill-hub/commit/75454ce))
- Add default export condition ([#2](https://github.com/onmax/nuxt-skill-hub/pull/2))

### 💅 Refactors

- Externalize core markdown ([8fe207f](https://github.com/onmax/nuxt-skill-hub/commit/8fe207f))
- Remove fallback resolution ([2569037](https://github.com/onmax/nuxt-skill-hub/commit/2569037))
- **agents:** Hard switch to unagent ([623b4a2](https://github.com/onmax/nuxt-skill-hub/commit/623b4a2))
- Replace hand-rolled utils with pathe, pkg-types, ofetch ([8c0142d](https://github.com/onmax/nuxt-skill-hub/commit/8c0142d))
- Simplify skill hub and docs preview ([037bc76](https://github.com/onmax/nuxt-skill-hub/commit/037bc76))
- Simplify skill resolution and reset versioning ([de53fb5](https://github.com/onmax/nuxt-skill-hub/commit/de53fb5))
- **module:** Consolidate shared rendering ([cef969d](https://github.com/onmax/nuxt-skill-hub/commit/cef969d))
- **content:** Split bundled nuxt and vue packs ([75fb341](https://github.com/onmax/nuxt-skill-hub/commit/75fb341))
- **skill-generation:** Remove module list file ([8e7ccbc](https://github.com/onmax/nuxt-skill-hub/commit/8e7ccbc))
- Rename nuxt-content to nuxt-best-practices, fetch vue skills from GitHub ([c405964](https://github.com/onmax/nuxt-skill-hub/commit/c405964))
- **docs:** Auto-discover skills from GitHub tree ([61102fc](https://github.com/onmax/nuxt-skill-hub/commit/61102fc))
- Warn conflicting skills, simplify codebase ([b9bd505](https://github.com/onmax/nuxt-skill-hub/commit/b9bd505))
- Replace node:url with mlly ([39194b4](https://github.com/onmax/nuxt-skill-hub/commit/39194b4))

### 🏡 Chore

- **pnpm:** Catalog deps and playground modules ([6cfd640](https://github.com/onmax/nuxt-skill-hub/commit/6cfd640))
- **playground:** Commit generated skill output ([91f0415](https://github.com/onmax/nuxt-skill-hub/commit/91f0415))
- Update lockfile ([68db66d](https://github.com/onmax/nuxt-skill-hub/commit/68db66d))
- Stop tracking generated playground skills ([848a91f](https://github.com/onmax/nuxt-skill-hub/commit/848a91f))
- **ci:** Use main branch only ([0499d53](https://github.com/onmax/nuxt-skill-hub/commit/0499d53))

### ✅ Tests

- Mock external boundary, not internals ([d36c56a](https://github.com/onmax/nuxt-skill-hub/commit/d36c56a))

### 🤖 CI

- Declare pnpm package manager ([40306df](https://github.com/onmax/nuxt-skill-hub/commit/40306df))

### ❤️ Contributors

- Max <maximogarciamtnez@gmail.com>
- Onmax <maximogarciamtnez@gmail.com>

