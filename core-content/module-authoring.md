# Nuxt Module Authoring

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
Module ships `agents.skills` content.

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

## Execution checklist

- Inputs to inspect: module options API, hooks usage, packaged `agents.skills`, and release-coupled docs/skills.
- Verify: runtime behavior stays opt-in, skill scope stays module-specific, and skill updates ship with versions.
- Stop if: module skill starts adding global Nuxt guidance or relies on undocumented internals.
