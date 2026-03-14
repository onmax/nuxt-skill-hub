## Architecture Boundaries

### Rule ID: `arch-secrets-server-only`
### Rule: Keep secrets and request checks server-side
### When to apply
Implementing auth, secret-bearing API calls, or per-request business logic.

### Wrong pattern
Placing secret usage in shared composables imported by client code.

### Recommended pattern
Move sensitive logic to `server/api/*` handlers, server utilities, or server plugins.

### Nuxt-specific caveat
Anything in `runtimeConfig.public` is client-visible.

### Execution checklist
- [ ] Inputs to inspect: changed files in `server/`, `composables/`, and `runtimeConfig` usage.
- [ ] Minimal verification: no secret values or token checks in client bundles.
- [ ] Stop condition: a required server-only check cannot be moved out of client code.

### Rule ID: `arch-request-safe-state`
### Rule: Use request-safe state boundaries
### When to apply
Adding reusable cross-page logic with state.

### Wrong pattern
Using mutable module-level singletons for request-scoped state.

### Recommended pattern
Use `useState`/composables for shared state and pass request context explicitly where needed.

### Nuxt-specific caveat
SSR runs per request; module globals can leak state across requests.

### Execution checklist
- [ ] Inputs to inspect: shared state in module scope and composable state factories.
- [ ] Minimal verification: request-specific data is not shared globally.
- [ ] Stop condition: solution depends on mutable globals without explicit isolation.

### Rule ID: `arch-server-entrypoint-for-sensitive-io`
### Rule: Keep sensitive I/O behind server entrypoints
### When to apply
Calling third-party APIs, databases, or internal services with credentials.

### Wrong pattern
Making direct browser fetches to privileged upstream services with forwarded sensitive headers.

### Recommended pattern
Expose a constrained `server/api/*` boundary and call it from client/UI code.

### Nuxt-specific caveat
`useFetch('/api/*')` on server uses request-aware fetch behavior; external APIs require explicit header allowlisting.

### Execution checklist
- [ ] Inputs to inspect: upstream fetch targets, header forwarding, and token placement.
- [ ] Minimal verification: browser code only talks to safe internal endpoints.
- [ ] Stop condition: architecture requires direct client access to privileged credentials.
