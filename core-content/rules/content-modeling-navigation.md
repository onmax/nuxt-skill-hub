## Content Modeling and Navigation

### Rule ID: `content-data-collections-for-structured-records`
### Rule: Use data collections for structured JSON or YAML records
### When to apply
Working with structured records that are not authored as full content pages.

### Wrong pattern
Treating JSON or YAML records as page content just because they live in the content tree.

### Recommended pattern
Model structured records as Nuxt Content data collections when they represent data rather than pages.

### Nuxt-specific caveat
The right collection type changes the query surface and avoids page-oriented assumptions in navigation and rendering.

### Execution checklist
- Inputs to inspect: file formats, collection config, and whether entries represent records or renderable pages.
- Minimal verification: collection type matches the underlying content model.
- Stop condition: the data is intentionally authored and rendered as page content.

### Rule ID: `content-navigation-from-collections`
### Rule: Use collection navigation primitives for generated docs navigation
### When to apply
Building sidebars, section navigation, or docs trees from content.

### Wrong pattern
Manually assembling navigation trees when the collection model can generate them.

### Recommended pattern
Use collection-navigation helpers such as `queryCollectionNavigation` before writing custom navigation assembly.

### Nuxt-specific caveat
Manual sidebar assembly is a repeated failure mode when Nuxt Content already has a first-class navigation primitive.

### Execution checklist
- Inputs to inspect: navigation source, collection schema, and current sidebar code.
- Minimal verification: the navigation derives from collection primitives instead of custom tree-building.
- Stop condition: the navigation behavior cannot be represented with collection helpers.

### Rule ID: `content-model-before-rendering`
### Rule: Finalize content modeling before choosing rendering primitives
### When to apply
Tasks that mix collection setup, querying, and rendering.

### Wrong pattern
Choosing the rendering component or sidebar implementation before deciding the collection model.

### Recommended pattern
Lock the collection type and query surface first, then render from that model.

### Nuxt-specific caveat
Many content bugs come from modeling mistakes that are then hidden under custom rendering code.

### Execution checklist
- Inputs to inspect: collection config, query usage, and rendering components.
- Minimal verification: the rendering code follows the collection model rather than compensating for a wrong model.
- Stop condition: the collection model is already fixed and correct.
