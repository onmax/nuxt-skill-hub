## Migrations and Compatibility

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
