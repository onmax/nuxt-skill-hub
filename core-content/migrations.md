# Migration and Compatibility

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

## Execution checklist

- Inputs to inspect: touched deprecated APIs, migration notes, and changed config/runtime paths.
- Verify: migration steps are reversible, checks run in dev and production-like flows, SSR and hydration both pass.
- Stop if: a migration change lacks checkpointing or validation coverage on representative routes.
