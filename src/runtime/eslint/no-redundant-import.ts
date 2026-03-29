import type { Rule } from 'eslint'

interface AutoImportEntry {
  name: string
  as?: string
  from: string
  type?: boolean
}

interface SpecInfo { spec: Rule.Node, importedName: string, localName: string, isRedundant: boolean }

type ImportSpecifier = Rule.Node & { imported: { type: string, name: string, value?: string }, local: { name: string }, importKind?: string }
type ImportDeclaration = Rule.Node & { source: { value: string }, specifiers: ImportSpecifier[], importKind?: string }

const SETTINGS_KEY = 'skill-hub/autoImports'

export const noRedundantImport: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow explicit imports of auto-imported identifiers in Nuxt',
    },
    fixable: 'code',
    schema: [],
    messages: {
      redundant: '\'{{ name }}\' is auto-imported by Nuxt. Remove this explicit import.',
    },
  },
  create(context) {
    const entries = context.settings[SETTINGS_KEY] as AutoImportEntry[] | undefined
    if (!entries?.length)
      return {}

    // Build lookup: source -> Set<name>
    const lookup = new Map<string, Set<string>>()
    for (const entry of entries) {
      const name = entry.as || entry.name
      const existing = lookup.get(entry.from)
      if (existing) existing.add(name)
      else lookup.set(entry.from, new Set([name]))
    }

    return {
      ImportDeclaration(node: ImportDeclaration) {
        if (!node.specifiers.length) return

        const source = node.source.value
        const autoImported = lookup.get(source)
        if (!autoImported) return

        if (context.filename.endsWith('.d.ts')) return

        const specInfos: SpecInfo[] = []

        for (const spec of node.specifiers) {
          if (spec.type !== 'ImportSpecifier') {
            specInfos.push({ spec, importedName: '', localName: '', isRedundant: false })
            continue
          }

          const importedName = spec.imported.type === 'Identifier' ? spec.imported.name : (spec.imported.value ?? '')
          const localName = spec.local.name

          const isAliased = importedName !== localName
          const isRedundant = !isAliased && autoImported.has(importedName)

          specInfos.push({ spec, importedName, localName, isRedundant })
        }

        const redundant = specInfos.filter(s => s.isRedundant)
        if (!redundant.length) return

        const kept = specInfos.filter(s => !s.isRedundant)
        const sourceText = context.sourceCode.getText()

        // All specifiers redundant → remove entire statement
        if (!kept.length) {
          context.report({
            node,
            messageId: 'redundant',
            data: { name: redundant.map(s => s.importedName).join(', ') },
            fix: fixer => fixer.removeRange([node.range![0], nextLineStart(sourceText, node.range![1])]),
          })
          return
        }

        // Partial removal → rebuild the specifiers portion
        context.report({
          node,
          messageId: 'redundant',
          data: { name: redundant.map(s => s.importedName).join(', ') },
          fix(fixer) {
            const keptTexts = kept.map(s => context.sourceCode.getText(s.spec))
            const importText = context.sourceCode.getText(node)
            const braceStart = node.range![0] + importText.indexOf('{')
            const braceEnd = node.range![0] + importText.lastIndexOf('}') + 1

            // If remaining specifiers are all inline `type` → convert to `import type`
            const isStatementTypeImport = node.importKind === 'type'
            const allKeptAreTypeSpecifiers = !isStatementTypeImport && kept.every(s => (s.spec as ImportSpecifier).importKind === 'type')

            if (allKeptAreTypeSpecifiers) {
              const cleanedTexts = keptTexts.map(t => t.replace(/^type\s+/, ''))
              const newSpecifiers = `{ ${cleanedTexts.join(', ')} }`
              const importKeywordEnd = node.range![0] + 'import'.length
              return fixer.replaceTextRange([importKeywordEnd, braceEnd], ` type ${newSpecifiers}`)
            }

            return fixer.replaceTextRange([braceStart, braceEnd], `{ ${keptTexts.join(', ')} }`)
          },
        })
      },
    }
  },
}

function nextLineStart(text: string, pos: number): number {
  const nl = text.indexOf('\n', pos)
  return nl === -1 ? pos : nl + 1
}
