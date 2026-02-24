## Data Fetching and SSR

### Rule: Fetch at the highest useful boundary
### When to apply
Building SSR pages or route-level data loading.

### Wrong pattern
Repeating identical fetches across nested components.

### Recommended pattern
Fetch once at page/layout boundary and pass data downward.

### Nuxt-specific caveat
Prefer `useFetch`/`$fetch` + server routes over ad-hoc wrappers.

### Execution checklist
- Inputs to inspect: repeated URL calls and data flow between page/components.
- Minimal verification: duplicated upstream calls are removed.
- Stop condition: independent fetch ownership cannot be merged safely.

### Rule: Avoid immediate duplicate fetch after hydration
### When to apply
Adding client refresh behavior after SSR load.

### Wrong pattern
Always re-fetching right after hydration without user/action trigger.

### Recommended pattern
Use SSR payload as first render source and revalidate only when needed.

### Nuxt-specific caveat
Hydrated SSR data is already present; unconditional immediate refetch wastes time.

### Execution checklist
- Inputs to inspect: post-mount hooks and revalidation triggers.
- Minimal verification: initial render uses SSR payload without instant duplicate call.
- Stop condition: stale data requirements mandate immediate client revalidation.
