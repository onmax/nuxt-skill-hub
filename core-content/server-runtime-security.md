# Server Runtime and Security

## Runtime Config Discipline

### When to apply
Adding environment variables, API keys, and service endpoints.

### Wrong pattern
Expose full server config in client helpers.

### Recommended pattern
Whitelist only required public values, keep private config server-only.

### Nuxt-specific caveat
Audit `runtimeConfig.public` changes as a public API change.

## Input Validation

### When to apply
New server routes, webhooks, action endpoints.

### Wrong pattern
Trust request payload shape without validation.

### Recommended pattern
Validate input at handler boundaries and fail with explicit HTTP errors.

### Nuxt-specific caveat
Use h3-compatible validation patterns close to the handler entrypoint.

## Caching and State

### When to apply
High-traffic endpoints or expensive upstream calls.

### Wrong pattern
Store cross-request mutable state in module scope without policy.

### Recommended pattern
Use explicit cache primitives and invalidation strategy.

### Nuxt-specific caveat
Nitro runtime may vary by platform; document cache behavior assumptions.

## Execution checklist

- Inputs to inspect: `runtimeConfig` additions, new server handlers, and cache/state usage in server code.
- Verify: only intended public keys are exposed, handler inputs are validated, and cache policy is explicit.
- Stop if: secrets appear in client-visible config or endpoint payload validation is missing.
