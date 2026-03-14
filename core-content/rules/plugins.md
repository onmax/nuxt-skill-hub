## Plugins and Runtime Boot

### Rule ID: `plugin-use-composables-before-plugin`
### Rule: Prefer composables/utilities before creating a plugin
### When to apply
Adding shared logic or helper functions used by limited parts of the app.

### Wrong pattern
Creating a global plugin for logic that can live in local composables/utilities.

### Recommended pattern
Use plugins only for true app-wide injection, app hooks, or framework integration boundaries.

### Nuxt-specific caveat
Every plugin participates in startup/hydration paths; unnecessary plugins add global boot cost.

### Execution checklist
- [ ] Inputs to inspect: plugin purpose, usage breadth, and required injection scope.
- [ ] Minimal verification: plugin is justified by app-wide behavior, not convenience alone.
- [ ] Stop condition: integration requires app-level hook/injection semantics.

### Rule ID: `plugin-async-parallel-when-independent`
### Rule: Run async plugins in parallel when they are independent
### When to apply
Multiple async plugins with no ordering dependency.

### Wrong pattern
Leaving independent async plugins serialized.

### Recommended pattern
Use object plugin syntax with `parallel: true`; define `dependsOn` only for real ordering constraints.

### Nuxt-specific caveat
Nuxt plugin runtime supports parallel execution and dependency-aware sequencing.

### Execution checklist
- [ ] Inputs to inspect: plugin async work and inter-plugin dependency graph.
- [ ] Minimal verification: independent plugins run in parallel without race conditions.
- [ ] Stop condition: plugin order is required for correctness.

### Rule ID: `plugin-order-controls-only-when-necessary`
### Rule: Use plugin ordering controls sparingly
### When to apply
You need deterministic plugin execution order.

### Wrong pattern
Using `order`/`enforce` aggressively to patch unclear plugin design.

### Recommended pattern
Keep default order first; use `dependsOn` for explicit dependency edges and reserve `order` for advanced edge cases.

### Nuxt-specific caveat
`order` overrides `enforce` and increases maintenance risk when plugin graphs evolve.

### Execution checklist
- [ ] Inputs to inspect: plugin metadata (`enforce`, `dependsOn`, `order`) and real dependency needs.
- [ ] Minimal verification: ordering metadata is minimal and documented by dependency reason.
- [ ] Stop condition: required order cannot be represented without broad global ordering hacks.
