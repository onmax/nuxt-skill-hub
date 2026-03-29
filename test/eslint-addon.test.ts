import { describe, expect, it } from 'vitest'
import { createAutoImportAddon } from '../src/eslint/addon'

interface ImportEntry {
  name: string
  as?: string
  from: string
  type?: boolean
}

type HookCallback = (...args: unknown[]) => unknown

function extractAutoImports(config: string): ImportEntry[] {
  const match = config.match(/'skill-hub\/autoImports': (\[[^\n]+\])/)
  if (!match) {
    throw new Error('Failed to locate auto-import settings in generated ESLint config')
  }
  return JSON.parse(match[1]) as ImportEntry[]
}

describe('createAutoImportAddon', () => {
  it('keeps type and value auto-import variants distinct', async () => {
    const hooks = new Map<string, HookCallback>()
    const nuxt = {
      hook: (name: string, callback: HookCallback) => {
        hooks.set(name, callback)
      },
    }

    createAutoImportAddon(nuxt as never)

    hooks.get('imports:context')?.({
      getImports: async () => [
        { name: 'Foo', from: 'pkg' },
        { name: 'Foo', from: 'pkg', type: true },
      ],
    })

    const addons: Array<{ getConfigs: () => Promise<{ configs?: string[] } | undefined> }> = []
    hooks.get('eslint:config:addons')?.(addons)

    expect(addons).toHaveLength(1)

    const config = await addons[0].getConfigs()
    const entries = extractAutoImports(config?.configs?.[0] || '')

    expect(entries).toHaveLength(2)
    expect(entries).toEqual(expect.arrayContaining([
      { name: 'Foo', from: 'pkg' },
      { name: 'Foo', from: 'pkg', type: true },
    ]))
  })
})
