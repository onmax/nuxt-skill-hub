## Architecture Boundaries

### Rule: Keep secrets and request checks server-side
### When to apply
Implementing auth, secret-bearing API calls, or per-request business logic.

### Wrong pattern
Placing secret usage in shared composables imported by client code.

### Recommended pattern
Move sensitive logic to `server/api/*` handlers or server-only utilities.

### Nuxt-specific caveat
Anything in `runtimeConfig.public` is client-visible.

### Execution checklist
- Inputs to inspect: changed files in `server/`, `composables/`, and `runtimeConfig` usage.
- Minimal verification: no secret values or token checks in client bundles.
- Stop condition: a required server-only check cannot be moved out of client code.

### Rule: Use request-safe state boundaries
### When to apply
Adding reusable cross-page logic with state.

### Wrong pattern
Using mutable module-level singletons for request-scoped state.

### Recommended pattern
Use composables and request-local state primitives.

### Nuxt-specific caveat
SSR runs per request; module globals can leak state across requests.

### Execution checklist
- Inputs to inspect: shared state in module scope and composable state factories.
- Minimal verification: request-specific data is not shared globally.
- Stop condition: solution depends on mutable globals without explicit isolation.
