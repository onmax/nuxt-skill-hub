## Migrations and Compatibility

### Rule ID: `migration-reversible-slices`
### Rule: Perform migrations in reversible slices
### When to apply
Nuxt, Nitro, h3, or module major/minor upgrades.

### Wrong pattern
Large unscoped migration commits with no rollback checkpoints.

### Recommended pattern
Split migration into small steps with explicit validation after each step.

### Nuxt-specific caveat
Validate both SSR render path and client hydration path.

### Execution checklist
- Inputs to inspect: changed APIs, config keys, and migration commit boundaries.
- Minimal verification: each slice can be reverted independently.
- Stop condition: migration cannot be tested incrementally.

### Rule ID: `migration-upgrade-touched-deprecations`
### Rule: Remove deprecated APIs in touched areas
### When to apply
Editing files already using deprecated Nuxt/Nitro/h3 patterns.

### Wrong pattern
Keeping mixed old/new patterns in the same touched code path.

### Recommended pattern
Upgrade touched deprecated usage while context is active.

### Nuxt-specific caveat
Prefer official migration mappings over ad-hoc replacements.

### Execution checklist
- Inputs to inspect: touched deprecated symbols and replacement mapping.
- Minimal verification: no deprecated usage remains in modified files.
- Stop condition: required replacement API is not yet stable in target version.

### Rule ID: `migration-verify-ssr-and-hydration`
### Rule: Verify both server render and hydration behavior after each slice
### When to apply
Any migration touching rendering, data fetching, plugins, or runtime config.

### Wrong pattern
Validating only build success without browser hydration and runtime checks.

### Recommended pattern
Validate SSR output, hydration warnings, critical data paths, and route navigation on each migration slice.

### Nuxt-specific caveat
Nuxt migrations can pass type checks while still regressing payload transfer or hydration behavior.

### Execution checklist
- Inputs to inspect: browser console hydration warnings, route transitions, and async-data behavior.
- Minimal verification: no hydration mismatch warnings and no duplicate initial fetch regressions.
- Stop condition: environment lacks a runnable app context for runtime verification.
