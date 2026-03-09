## Performance and Rendering

### Rule ID: `perf-use-nuxtlink-for-internal-nav`
### Rule: Use `NuxtLink` for internal navigation
### When to apply
Creating or refactoring internal navigation links.

### Wrong pattern
Using raw `<a>` tags for internal routes without Nuxt link behavior.

### Recommended pattern
Use `NuxtLink` for internal routes and tune prefetch strategy when needed (`visible` vs `interaction`).

### Nuxt-specific caveat
`NuxtLink` carries built-in route-aware prefetching and defaults that reduce navigation latency.

### Execution checklist
- Inputs to inspect: internal links in pages/layout/components.
- Minimal verification: internal links use `NuxtLink` and preserve semantics/accessibility.
- Stop condition: link target is external or deliberately bypasses router.

### Rule ID: `perf-match-route-rules-to-content-volatility`
### Rule: Use route rules to match rendering strategy to content volatility
### When to apply
Pages with mixed static, stale-while-revalidate, ISR, or client-only requirements.

### Wrong pattern
Applying one rendering mode globally when route behavior differs.

### Recommended pattern
Set explicit `routeRules` per route family (`prerender`, `swr`, `isr`, `ssr: false`) based on freshness and SEO needs.

### Nuxt-specific caveat
Nuxt/Nitro route rules directly shape cache semantics and server behavior per route.

### Execution checklist
- Inputs to inspect: route patterns, freshness requirements, and SEO constraints.
- Minimal verification: configured rules align with intended cache/render behavior.
- Stop condition: deployment target cannot support required route rule semantics.

### Rule ID: `perf-lazy-load-and-hydrate-intentionally`
### Rule: Use lazy component loading and lazy hydration intentionally
### When to apply
Components not required for first meaningful paint or immediate interactivity.

### Wrong pattern
Hydrating all components eagerly on initial page load.

### Recommended pattern
Use `Lazy*` component imports and hydration triggers (for example `hydrate-on-visible`) for non-critical islands.

### Nuxt-specific caveat
Lazy hydration support exists in Nuxt and can materially reduce main-thread work on initial navigation.

### Execution checklist
- Inputs to inspect: above-the-fold criticality and interactive timing needs.
- Minimal verification: non-critical UI defers code/hydration without breaking UX.
- Stop condition: component must be immediately interactive for first render flow.

### Rule ID: `perf-reduce-payload-and-asset-cost`
### Rule: Reduce payload and asset cost before adding infra complexity
### When to apply
Performance regressions tied to response size, client JS, images, or third-party scripts.

### Wrong pattern
Adding caching layers first while shipping oversized payloads/assets.

### Recommended pattern
Trim async-data payload shape, optimize images/fonts/scripts with Nuxt-native tooling, and profile with DevTools + `nuxi analyze`.

### Nuxt-specific caveat
Nuxt Image, Nuxt Fonts, and Nuxt Scripts are designed to target LCP/CLS/INP regressions with Nuxt-aware defaults.

### Execution checklist
- Inputs to inspect: payload tab, bundle analysis, image/script/font loading paths.
- Minimal verification: measurable reduction in transferred bytes or blocking work on critical path.
- Stop condition: bottleneck is backend latency unrelated to client payload/asset behavior.
