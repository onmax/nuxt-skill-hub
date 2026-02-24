# Nuxt Architecture Boundaries

## Server/Client Separation

### When to apply
Any feature that touches secrets, auth checks, external APIs, or request-specific logic.

### Wrong pattern
Put secret-bearing logic in composables imported by client code.

### Recommended pattern
Keep sensitive logic in Nitro handlers (`server/api/*`) or server-only utilities.

### Nuxt-specific caveat
`runtimeConfig.public` is client-visible. Use private `runtimeConfig` keys for secrets.

## Composables vs Utilities

### When to apply
When adding reusable logic consumed across pages/components.

### Wrong pattern
Use plain module singletons for request-scoped state.

### Recommended pattern
Use Nuxt/Vue composables for reactive state and request-aware behavior.

### Nuxt-specific caveat
Server rendering runs per request. Global mutable module state can leak across requests.

## Route Structure

### When to apply
When adding page-level features and nested layouts.

### Wrong pattern
Overload one page with unrelated responsibilities.

### Recommended pattern
Use file-based routing and route groups to keep boundaries explicit.

### Nuxt-specific caveat
Prefer route-level composition over custom router mutations unless there is a strong reason.
