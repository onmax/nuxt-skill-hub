## Hydration and SSR Consistency

### Rule ID: `hydration-no-browser-apis-in-ssr-path`
### Rule: Keep browser-only APIs out of SSR execution paths
### When to apply
Reading storage, window size, document state, or navigator data in setup/render paths.

### Wrong pattern
Accessing `window`, `document`, or `localStorage` during server render.

### Recommended pattern
Use SSR-safe primitives (`useCookie`, server data, request headers) or gate browser-only logic in `ClientOnly`/`onMounted`.

### Nuxt-specific caveat
Hydration mismatch can force full subtree re-render and break event binding assumptions.

### Execution checklist
- [ ] Inputs to inspect: setup code for browser globals and conditional rendering paths.
- [ ] Minimal verification: first SSR HTML and first client render produce matching structure/content.
- [ ] Stop condition: third-party dependency cannot run without browser APIs before mount.

### Rule ID: `hydration-deterministic-first-render`
### Rule: Make first render deterministic across server and client
### When to apply
Rendering dynamic values such as timestamps, randomness, or locale-sensitive formatting.

### Wrong pattern
Using `Math.random()`, `new Date()`, or environment-specific formatting directly in template/setup for first paint.

### Recommended pattern
Seed shared state with `useState`, use `NuxtTime`, or defer non-deterministic values until after mount.

### Nuxt-specific caveat
Time/randomness differences between SSR and CSR are a common hydration mismatch cause.

### Execution checklist
- [ ] Inputs to inspect: first-render values derived from time/random/browser environment.
- [ ] Minimal verification: page hydrates without mismatch warnings.
- [ ] Stop condition: feature explicitly requires client-personalized first paint with acceptable fallback.

### Rule ID: `hydration-client-only-libraries-after-mount`
### Rule: Initialize DOM-mutating third-party libraries after hydration
### When to apply
Integrating analytics, tag managers, embeds, or widgets that touch DOM directly.

### Wrong pattern
Running library initialization in universal setup path.

### Recommended pattern
Load/init libraries in `onMounted` or dedicated client plugins and provide SSR-safe fallback markup.

### Nuxt-specific caveat
`import.meta.client` guards code path, but DOM writes before hydration completion can still create mismatch risk.

### Execution checklist
- [ ] Inputs to inspect: library init location and DOM mutation timing.
- [ ] Minimal verification: no hydration warnings and no visible layout flash from re-render.
- [ ] Stop condition: library requires synchronous pre-hydration bootstrap with no fallback option.
