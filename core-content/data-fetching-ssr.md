# Data Fetching and SSR

## Fetching Strategy

### When to apply
Any new server-rendered page or data-dependent route.

### Wrong pattern
Duplicate the same fetch in multiple components without coordination.

### Recommended pattern
Fetch at the highest meaningful boundary and pass data down; parallelize independent calls.

### Nuxt-specific caveat
Use Nuxt-native fetching patterns (`useFetch`, server handlers) and avoid ad-hoc fetch wrappers unless necessary.

## Client Re-fetching

### When to apply
When interaction requires refresh or optimistic updates.

### Wrong pattern
Blindly re-fetch full payloads after every small mutation.

### Recommended pattern
Scope invalidation/re-fetch to impacted resources.

### Nuxt-specific caveat
Hydration already carries initial SSR state; avoid duplicate immediate client refetch by default.

## Error Surfaces

### When to apply
API failures, partial content, degraded endpoints.

### Wrong pattern
Swallow server errors and render empty UI states silently.

### Recommended pattern
Return explicit error states with useful context and fallback behavior.

### Nuxt-specific caveat
Prefer Nuxt error utilities and route-level error handling over custom global hacks.

## Execution checklist

- Inputs to inspect: page-level fetch boundaries, duplicated fetch calls, and mutation paths triggering re-fetch.
- Verify: first load uses SSR data once, independent calls are parallelized, and error states are explicit.
- Stop if: fetch logic duplicates the same payload across layers or adds immediate post-hydration refetch without need.
