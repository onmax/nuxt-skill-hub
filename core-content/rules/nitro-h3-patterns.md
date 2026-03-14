## Nitro and h3 Server Patterns

### Rule ID: `nitro-validated-input-helpers`
### Rule: Use h3 validated helpers for route params, query, and body
### When to apply
Creating or refactoring `server/api/*` handlers with external input.

### Wrong pattern
Casting `event.context.params`, `getQuery(event)`, or `readBody(event)` to trusted shapes without validation.

### Recommended pattern
Use `getValidatedRouterParams`, `getValidatedQuery`, and `readValidatedBody` (for example with Zod parsers) at handler boundaries.

### Nuxt-specific caveat
Nuxt server routes run on h3; validated helpers provide both runtime safety and stronger type flow than ad-hoc casting.

### Execution checklist
- [ ] Inputs to inspect: all untrusted handler inputs (params/query/body).
- [ ] Minimal verification: invalid inputs return explicit client-safe errors.
- [ ] Stop condition: accepted schema/validator is not available in project constraints.

### Rule ID: `nitro-waituntil-for-nonblocking-work`
### Rule: Move non-critical async side work to `event.waitUntil`
### When to apply
Logging, cache warmup, or analytics in server handlers that should not delay response.

### Wrong pattern
Awaiting non-essential async jobs before sending response.

### Recommended pattern
Return response early and schedule non-critical work with `event.waitUntil(...)`.

### Nuxt-specific caveat
`event.waitUntil` integrates with runtime providers to finish background work after response, including edge-like runtimes.

### Execution checklist
- [ ] Inputs to inspect: awaited tasks in request critical path.
- [ ] Minimal verification: response path no longer blocks on non-critical work.
- [ ] Stop condition: task result is required to compute response.

### Rule ID: `nitro-cache-varies-for-tenant-host`
### Rule: Configure `cache.varies` when caching depends on request headers
### When to apply
Using Nitro cache/route rules with host-aware or tenant-aware logic.

### Wrong pattern
Reading host-based request data under cached routes without declaring varying headers.

### Recommended pattern
Set `cache.varies` for headers that affect output (typically `host`, `x-forwarded-host` in multi-tenant setups).

### Nuxt-specific caveat
With cached responses, incoming request headers are dropped by default; `useRequestURL()` can otherwise resolve host as `localhost`.

### Execution checklist
- [ ] Inputs to inspect: cached route logic that branches on headers/host.
- [ ] Minimal verification: cache keys vary by intended tenant headers.
- [ ] Stop condition: output is fully header-invariant.

### Rule ID: `nitro-api-error-shape-client-safe`
### Rule: Use client-safe API error shape in server handlers
### When to apply
Throwing errors from `server/api/*` endpoints consumed by clients.

### Wrong pattern
Throwing generic errors or relying on long/internal `message` values to reach clients.

### Recommended pattern
Throw `createError` with explicit `status` and short `statusText`; use `data` for structured client payload and keep sensitive detail server-side.

### Nuxt-specific caveat
In API routes, `statusText` is the safer client-facing channel; avoid embedding dynamic user input in messages.

### Execution checklist
- [ ] Inputs to inspect: thrown API errors and exposed message payloads.
- [ ] Minimal verification: consistent status code/text contract with no sensitive leakage.
- [ ] Stop condition: upstream error contract cannot be mapped safely.

### Rule ID: `nitro-runtime-config-from-event`
### Rule: Prefer `useRuntimeConfig(event)` in server routes
### When to apply
Accessing runtime config inside server handlers.

### Wrong pattern
Reading config without event context in handlers that may depend on runtime overrides.

### Recommended pattern
Pass `event` to `useRuntimeConfig(event)` in server handlers.

### Nuxt-specific caveat
Passing event is optional but recommended for runtime-overridden environment values in route execution.

### Execution checklist
- [ ] Inputs to inspect: server handlers using runtime config.
- [ ] Minimal verification: handler config values resolve correctly in runtime deployment environment.
- [ ] Stop condition: execution context is not an h3 event handler.
