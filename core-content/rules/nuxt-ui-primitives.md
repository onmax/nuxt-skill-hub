## Nuxt UI Primitives

### Rule ID: `ui-primitives-before-custom-markup`
### Rule: Prefer Nuxt UI primitives before custom markup
### When to apply
Building or fixing page chrome, tables, forms, modals, command palettes, dropdowns, or similar UI surfaces.

### Wrong pattern
Rebuilding a UI surface with raw HTML, custom keyboard handlers, or ad hoc styling when Nuxt UI already provides a first-class component.

### Recommended pattern
Start with the Nuxt UI primitive first and only fall back to custom markup when the primitive cannot express the required behavior.

### Nuxt-specific caveat
Nuxt UI tasks often fail because agents build something that looks correct while bypassing the intended component.

### Execution checklist
- Inputs to inspect: whether a matching Nuxt UI component exists for the surface.
- Minimal verification: the implementation uses the framework component when one fits.
- Stop condition: the required behavior is genuinely outside the component model.

### Rule ID: `ui-current-api-shape-not-lookalike`
### Rule: Match the current Nuxt UI API shape, not a plausible lookalike
### When to apply
Using existing or newly added Nuxt UI components.

### Wrong pattern
Guessing old props, old slot names, or generic dialog and table APIs that only resemble the real component.

### Recommended pattern
Use the documented prop names, models, slots, and grouping patterns for the exact Nuxt UI component.

### Nuxt-specific caveat
Nuxt UI evals frequently expose “wrong but plausible” API memory rather than outright broken UI.

### Execution checklist
- Inputs to inspect: component props, slot API, and state model.
- Minimal verification: component usage matches the expected API shape for the installed version.
- Stop condition: the installed module intentionally wraps or replaces the upstream component API.

### Rule ID: `ui-page-shells-belong-to-framework-components`
### Rule: Use framework page-shell components when they exist
### When to apply
Docs pages, marketing shells, dashboards, or app page chrome where Nuxt UI supplies a page primitive.

### Wrong pattern
Hand-assembling repeated header and footer page chrome when a framework page-shell component exists.

### Recommended pattern
Prefer the page-shell component and compose around it.

### Nuxt-specific caveat
A raw HTML page can look polished while still being the wrong answer if the framework expects a Nuxt UI shell.

### Execution checklist
- Inputs to inspect: repeated page chrome, layout composition, and available Nuxt UI shell primitives.
- Minimal verification: shared page chrome is expressed through the framework primitive when available.
- Stop condition: the prompt explicitly requires bespoke shell markup.
