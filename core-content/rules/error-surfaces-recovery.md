## Error Surfaces and Recovery

### Rule ID: `error-check-global-and-local-surfaces`
### Rule: Check both global and local error surfaces
### When to apply
Handling runtime errors, route failures, or fallback UI in Nuxt.

### Wrong pattern
Fixing only `app/error.vue` or only a local `NuxtErrorBoundary` when the flow requires both.

### Recommended pattern
Identify whether the issue needs a global error surface, a local boundary, or both, then implement both surfaces explicitly when required.

### Nuxt-specific caveat
Nuxt error handling is often multi-surface; solving only half the pattern is a recurring failure mode in strong models.

### Execution checklist
- [ ] Inputs to inspect: where the error originates and whether recovery is route-wide or local to a subtree.
- [ ] Minimal verification: the intended error surface actually receives and renders the failure.
- [ ] Stop condition: the issue is intentionally scoped to one surface only.

### Rule ID: `error-use-nuxt-recovery-utilities`
### Rule: Use Nuxt recovery helpers instead of ad hoc reset logic
### When to apply
Recovering from an error state or clearing error UI.

### Wrong pattern
Resetting local refs or forcing navigation without using Nuxt recovery utilities.

### Recommended pattern
Use Nuxt error helpers such as `clearError`, `showError`, and framework-supported retry paths.

### Nuxt-specific caveat
Custom reset logic can leave the app in an inconsistent state if it bypasses Nuxt's error lifecycle.

### Execution checklist
- [ ] Inputs to inspect: current error state flow and whether Nuxt helpers are already present.
- [ ] Minimal verification: recovery clears the error surface and restores intended navigation or rendering behavior.
- [ ] Stop condition: the task explicitly requires a non-standard recovery path.
