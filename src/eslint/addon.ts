import type { Nuxt } from '@nuxt/schema'

interface ImportEntry { name: string, as?: string, from: string, type?: boolean }
interface UnimportLike { getImports: () => Promise<ImportEntry[]> }

interface ESLintConfigGenAddon {
  name: string
  getConfigs: () => Promise<{ imports?: { from: string, name: string, as?: string }[], configs?: string[] } | undefined>
}

export function createAutoImportAddon(nuxt: Nuxt): void {
  let unimport: UnimportLike | undefined
  let nitroUnimport: UnimportLike | undefined
  const hook = nuxt.hook as unknown as <T extends unknown[]>(name: string, callback: (...args: T) => void) => void

  hook('imports:context', (context: UnimportLike) => {
    unimport = context as UnimportLike
  })

  hook('nitro:init', (nitro: { unimport?: UnimportLike }) => {
    nitroUnimport = nitro.unimport
  })

  hook('eslint:config:addons', (addons: ESLintConfigGenAddon[]) => {
    addons.push({
      name: 'skill-hub:no-redundant-import',
      async getConfigs() {
        const imports: ImportEntry[] = [
          ...await unimport?.getImports() || [],
          ...await nitroUnimport?.getImports() || [],
        ]

        const seen = new Set<string>()
        const entries = imports
          .filter((i) => {
            const key = `${i.as || i.name}:${i.from}:${i.type ? 'type' : 'value'}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          .map(i => ({ name: i.name, ...(i.as && i.as !== i.name ? { as: i.as } : {}), from: i.from, ...(i.type ? { type: true } : {}) }))
          .sort((a, b) => a.from.localeCompare(b.from) || a.name.localeCompare(b.name))

        return {
          imports: [{ from: 'nuxt-skill-hub/eslint-plugin', name: 'default', as: 'skillHubPlugin' }],
          configs: [
            [
              '{',
              `  name: 'skill-hub/no-redundant-import',`,
              `  plugins: { 'skill-hub': skillHubPlugin },`,
              `  settings: { 'skill-hub/autoImports': ${JSON.stringify(entries)} },`,
              `  rules: { 'skill-hub/no-redundant-import': 'warn' },`,
              '}',
            ].join('\n'),
          ],
        }
      },
    })
  })
}
