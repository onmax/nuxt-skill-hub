## Module Authoring Conventions

### Rule: Keep module runtime extensions explicit
### When to apply
Authoring or updating a Nuxt module with runtime behavior.

### Wrong pattern
Injecting broad behavior implicitly without option boundaries.

### Recommended pattern
Expose explicit options and predictable defaults.

### Nuxt-specific caveat
Prefer documented Nuxt Kit APIs/hooks over private internals.

### Execution checklist
- Inputs to inspect: `defineNuxtModule` options, runtime injections, defaults.
- Minimal verification: behavior can be reasoned from options and docs.
- Stop condition: implementation relies on unstable internal APIs.

### Rule: Scope module skills to module APIs only
### When to apply
Publishing `agents.skills` with a module.

### Wrong pattern
Embedding global Nuxt framework guidance inside module-specific skill docs.

### Recommended pattern
Document only module APIs, integration points, and module-specific caveats.

### Nuxt-specific caveat
Module guidance can override core only inside that module's explicit scope.

### Execution checklist
- Inputs to inspect: skill frontmatter, rule language, examples.
- Minimal verification: instructions are module-scoped and version-aligned.
- Stop condition: module skill introduces global rules unrelated to module behavior.
