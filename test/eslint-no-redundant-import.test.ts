import { describe, it } from 'vitest'
import { RuleTester } from 'eslint'
import { noRedundantImport } from '../src/runtime/eslint/no-redundant-import'

const settings = {
  'skill-hub/autoImports': [
    { name: 'ref', from: 'vue' },
    { name: 'computed', from: 'vue' },
    { name: 'watch', from: 'vue' },
    { name: 'onMounted', from: 'vue' },
    { name: 'Ref', from: 'vue', type: true },
    { name: 'ComputedRef', from: 'vue', type: true },
    { name: 'useFetch', from: '#app' },
    { name: 'useRoute', from: 'vue-router' },
    { name: 'navigateTo', from: '#app' },
    { name: 'useAppConfig', as: 'useConfig', from: '#imports' },
  ],
}

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } })

describe('no-redundant-import', () => {
  it('reports and fixes redundant imports', () => {
    tester.run('no-redundant-import', noRedundantImport, {
      valid: [
        // Not in auto-imports
        { code: `import { createApp } from 'vue'`, settings },
        // Different source
        { code: `import { ref } from '@vue/reactivity'`, settings },
        // Aliased — intentional rename
        { code: `import { ref as myRef } from 'vue'`, settings },
        // Default import
        { code: `import Vue from 'vue'`, settings },
        // Namespace import
        { code: `import * as Vue from 'vue'`, settings },
        // Side-effect import
        { code: `import 'vue'`, settings },
        // No settings — graceful no-op
        { code: `import { ref } from 'vue'`, settings: {} },
        // Mixed: only non-auto-imported specifiers
        { code: `import { createApp, defineComponent } from 'vue'`, settings },
        // Type-only auto imports must not remove runtime imports
        { code: `import { Foo } from 'pkg'`, settings: { 'skill-hub/autoImports': [{ name: 'Foo', from: 'pkg', type: true }] } },
        // Local alias collision must not remove a different imported symbol
        { code: `import { reactive as ref } from 'vue'`, settings },
      ],
      invalid: [
        // Single redundant → remove entire statement
        {
          code: `import { ref } from 'vue'\n`,
          output: ``,
          errors: [{ messageId: 'redundant' }],
          settings,
        },
        // All redundant → remove entire statement
        {
          code: `import { ref, computed, watch } from 'vue'\n`,
          output: ``,
          errors: [{ messageId: 'redundant' }],
          settings,
        },
        // Partial: ref is redundant, createApp is not
        {
          code: `import { ref, createApp } from 'vue'`,
          output: `import { createApp } from 'vue'`,
          errors: [{ messageId: 'redundant' }],
          settings,
        },
        // Partial: remove first specifier, keep second
        {
          code: `import { computed, createApp } from 'vue'`,
          output: `import { createApp } from 'vue'`,
          errors: [{ messageId: 'redundant' }],
          settings,
        },
        // Partial: remove last specifier, keep first
        {
          code: `import { createApp, ref } from 'vue'`,
          output: `import { createApp } from 'vue'`,
          errors: [{ messageId: 'redundant' }],
          settings,
        },
        // Mixed value + type: remove ref, keep type Ref (inline type specifier)
        // Note: inline `type` specifiers need TS parser. For standard ESLint, test without.
        // Nuxt composable from different source
        {
          code: `import { useRoute } from 'vue-router'\n`,
          output: ``,
          errors: [{ messageId: 'redundant' }],
          settings,
        },
        // Multiple redundant from different part of specifier list
        {
          code: `import { ref, createApp, computed } from 'vue'`,
          output: `import { createApp } from 'vue'`,
          errors: [{ messageId: 'redundant' }],
          settings,
        },
        // Aliased auto-imports should still be considered redundant
        {
          code: `import { useAppConfig as useConfig } from '#imports'\n`,
          output: ``,
          errors: [{ messageId: 'redundant' }],
          settings,
        },
        // Keep default imports intact when removing redundant named specifiers
        {
          code: `import Vue, { ref } from 'vue'`,
          output: `import Vue from 'vue'`,
          errors: [{ messageId: 'redundant' }],
          settings,
        },
        // Full-removal fix must preserve same-line trailing code
        {
          code: `import { ref } from 'vue'; doWork()`,
          output: `doWork()`,
          errors: [{ messageId: 'redundant' }],
          settings,
        },
      ],
    })
  })

  it('handles declaration files gracefully', () => {
    tester.run('no-redundant-import', noRedundantImport, {
      valid: [
        { code: `import { ref } from 'vue'`, settings, filename: 'types.d.ts' },
        { code: `import { ref } from 'vue'`, settings, filename: 'types.d.mts' },
        { code: `import { ref } from 'vue'`, settings, filename: 'types.d.cts' },
      ],
      invalid: [],
    })
  })
})
