## Module Authoring Conventions

### Rule ID: `module-keep-setup-fast-and-defer-heavy-work`
### Rule: Keep module setup fast and defer heavy work
### When to apply
Authoring or updating a Nuxt module with runtime behavior.

### Wrong pattern
Performing expensive async work directly in module `setup`.

### Recommended pattern
Keep `setup` lightweight and defer heavier tasks to lifecycle hooks or deferred build/runtime hooks.

### Nuxt-specific caveat
Nuxt warns when module setup takes too long; slow setup delays dev server and build startup.

### Execution checklist
- Inputs to inspect: `defineNuxtModule` setup body and async operations.
- Minimal verification: startup-critical path avoids long blocking work.
- Stop condition: required initialization must complete before app/module lifecycle proceeds.

### Rule ID: `module-prefix-public-exports`
### Rule: Prefix public exports and routes
### When to apply
Adding module composables, components, plugins, or server routes.

### Wrong pattern
Publishing generic names like `useData`, `<Button>`, or `/api/auth` from a module.

### Recommended pattern
Prefix public surface with module identity (`useFooData`, `<FooButton>`, `/api/_foo/*`).

### Nuxt-specific caveat
Unprefixed module routes/components collide easily with app code and other modules.

### Execution checklist
- Inputs to inspect: names of components/composables/runtime API routes.
- Minimal verification: exported names are collision-resistant and module-scoped.
- Stop condition: backward compatibility policy requires legacy unprefixed aliases.

### Rule ID: `module-public-kit-apis-only`
### Rule: Prefer documented Nuxt Kit APIs over internals
### When to apply
Implementing Nuxt module behavior and code generation logic.

### Wrong pattern
Relying on private Nuxt internals or undocumented hooks.

### Recommended pattern
Use stable `@nuxt/kit` APIs, documented hooks, and declared compatibility constraints.

### Nuxt-specific caveat
Private internals can break across minor/patch updates even when compatibility appears broad.

### Execution checklist
- Inputs to inspect: imported kit functions/hooks and internal path imports.
- Minimal verification: implementation uses public Nuxt APIs with explicit compatibility.
- Stop condition: required behavior has no documented public API yet.

### Rule ID: `module-skill-scope-only`
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
