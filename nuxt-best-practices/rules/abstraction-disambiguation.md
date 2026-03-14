## Abstraction Disambiguation

### Rule ID: `disambiguation-framework-primitives-first`
### Rule: Prefer framework-owned primitives before generic Vue or raw HTML
### When to apply
Any fix where generic Vue code, hand-rolled HTML, or custom event wiring looks plausible.

### Wrong pattern
Solving a Nuxt problem with ad hoc watchers, raw fetches, or custom markup when Nuxt, Nuxt Content, or Nuxt UI already owns the surface.

### Recommended pattern
Identify the framework-owned abstraction first, then use generic Vue primitives only when the framework does not provide a suitable surface.

### Nuxt-specific caveat
Visually correct custom code can still be the wrong answer if it bypasses a Nuxt-native abstraction that hidden evals or framework conventions expect.

### Execution checklist
- [ ] Inputs to inspect: the exact surface being edited and whether Nuxt, Nuxt Content, or Nuxt UI already provides a first-class primitive.
- [ ] Minimal verification: the final solution uses the framework abstraction when one exists.
- [ ] Stop condition: the task explicitly requires behavior outside the owned abstraction.

### Rule ID: `disambiguation-nearby-concepts-before-editing`
### Rule: Resolve nearby concept pairs before changing code
### When to apply
Tasks that could map to two similar Nuxt concepts.

### Wrong pattern
Editing the first plausible API without deciding the actual concept pair first.

### Recommended pattern
Explicitly decide the concept pair before editing, such as `definePageMeta` vs `useHead`, data collection vs page collection, `NuxtLink` vs raw `<a>`, or `useCookie` vs `document.cookie`.

### Nuxt-specific caveat
Many strong agents fail Nuxt tasks by choosing the wrong nearby abstraction rather than by writing broken code.

### Execution checklist
- [ ] Inputs to inspect: prompt symptoms, file location, and framework-owned surface.
- [ ] Minimal verification: the chosen abstraction matches the actual responsibility of the change.
- [ ] Stop condition: both concepts are intentionally involved and clearly separated.

### Rule ID: `disambiguation-do-not-stop-at-visually-correct`
### Rule: Do not accept a visually correct result as sufficient
### When to apply
UI, docs, or content tasks where a hand-built implementation can look correct.

### Wrong pattern
Declaring success because the output looks fine while bypassing Nuxt UI, Content, or SSR-aware primitives.

### Recommended pattern
Check whether the implementation is framework-correct, not only visually correct.

### Nuxt-specific caveat
Nuxt evals often reject custom HTML solutions even when they render acceptably, because the intended abstraction was a framework primitive.

### Execution checklist
- [ ] Inputs to inspect: component usage, slot API, and data source wiring.
- [ ] Minimal verification: the implementation matches the expected framework primitive and API shape.
- [ ] Stop condition: the prompt explicitly asks for custom markup or behavior the primitive cannot support.
