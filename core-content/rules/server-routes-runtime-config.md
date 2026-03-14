## Server Routes, h3 Patterns, and Runtime Config

### Rule ID: `server-validate-input-at-boundary`
### Rule: Validate request input at handler boundaries
### When to apply
Creating or updating `server/api/*` routes, webhook handlers, or actions.

### Wrong pattern
Trusting payload shape and casting request body directly.

### Recommended pattern
Validate input at handler entry and return explicit HTTP errors on invalid data.

### Nuxt-specific caveat
Keep validation close to h3 handler entrypoints to avoid hidden assumptions.

### Execution checklist
- [ ] Inputs to inspect: new/edited handler params, body parsing, query usage.
- [ ] Minimal verification: invalid payload returns explicit error status.
- [ ] Stop condition: handler cannot define a stable input contract.

### Rule ID: `server-runtime-config-public-minimal`
### Rule: Keep runtime config exposure intentional
### When to apply
Adding env vars or endpoint values in `runtimeConfig`.

### Wrong pattern
Moving broad server configuration into `runtimeConfig.public`.

### Recommended pattern
Expose only the minimum public keys required by the client.

### Nuxt-specific caveat
Changes under `runtimeConfig.public` are effectively public API changes.

### Execution checklist
- [ ] Inputs to inspect: `nuxt.config` runtime config additions/changes.
- [ ] Minimal verification: only intended public keys are exposed.
- [ ] Stop condition: feature requires exposing secrets in public config.

### Rule ID: `server-header-forwarding-allowlist`
### Rule: Forward request headers intentionally
### When to apply
Proxying request context from SSR to internal or external API calls.

### Wrong pattern
Blindly forwarding all inbound headers to upstream services.

### Recommended pattern
Use `useFetch('/api/*')` for internal request-context propagation and explicit allowlists for external API calls.

### Nuxt-specific caveat
Relative `useFetch` calls on server use request-aware fetch behavior; external forwarding still requires explicit safety controls.

### Execution checklist
- [ ] Inputs to inspect: forwarded header sets and upstream destination type (internal vs external).
- [ ] Minimal verification: only required headers are forwarded, with no unsafe pass-through.
- [ ] Stop condition: upstream contract demands full raw header pass-through.
