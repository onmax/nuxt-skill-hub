## Page Meta, Head, and Layout

### Rule ID: `page-define-page-meta-for-page-behavior`
### Rule: Use `definePageMeta` for page behavior, not document metadata
### When to apply
Changing layout, middleware, route rules, page transitions, keepalive, or other page-level behavior.

### Wrong pattern
Using `useHead` or ad hoc component wiring for concerns that belong in page metadata.

### Recommended pattern
Use `definePageMeta` in page files for page behavior and routing-related options.

### Nuxt-specific caveat
`definePageMeta` is about how a page behaves inside the app, not what goes into the document head.

### Execution checklist
- [ ] Inputs to inspect: whether the change lives in a page file and affects app behavior rather than head tags.
- [ ] Minimal verification: page behavior is expressed through page metadata instead of custom glue.
- [ ] Stop condition: the change is not page-scoped.

### Rule ID: `page-use-head-for-document-metadata`
### Rule: Use `useHead` or `useSeoMeta` for title and meta tags
### When to apply
Changing page title, meta description, canonical URLs, social metadata, or structured head elements.

### Wrong pattern
Trying to set document metadata with `definePageMeta` or template markup.

### Recommended pattern
Use `useHead` for general document head state and `useSeoMeta` for SEO-focused metadata.

### Nuxt-specific caveat
Head metadata and page metadata are adjacent concepts but are not interchangeable.

### Execution checklist
- [ ] Inputs to inspect: the exact metadata surface being changed.
- [ ] Minimal verification: head data is emitted through Nuxt head composables.
- [ ] Stop condition: the task is about route behavior, layout, or middleware instead.

### Rule ID: `page-layout-structure-belongs-in-layouts`
### Rule: Put shared page chrome and structure in layouts or framework shells
### When to apply
Repeated headers, footers, navigation shells, or shared page structure across routes.

### Wrong pattern
Copying shell markup into pages or mixing layout concerns into unrelated components.

### Recommended pattern
Use layout files or framework-owned shell primitives for shared structure.

### Nuxt-specific caveat
Layout confusion often travels with `definePageMeta` vs `useHead` confusion, so resolve both surfaces together.

### Execution checklist
- [ ] Inputs to inspect: whether the structure is shared across pages and whether a layout already exists.
- [ ] Minimal verification: shared shell concerns live in the layout layer, not duplicated page markup.
- [ ] Stop condition: the structure is intentionally page-specific.
