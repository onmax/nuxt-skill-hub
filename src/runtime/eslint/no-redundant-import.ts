import type { Rule } from 'eslint'

interface AutoImportEntry {
  name: string
  as?: string
  from: string
  type?: boolean
}

interface SpecInfo { spec: Rule.Node, localName: string, isRedundant: boolean }
interface SourceLookup { type: Set<string>, value: Set<string> }

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

    const lookup = new Map<string, SourceLookup>()
    for (const entry of entries) {
      const localName = entry.as || entry.name
      const existing = lookup.get(entry.from) || { type: new Set<string>(), value: new Set<string>() }
      existing[entry.type ? 'type' : 'value'].add(localName)
      lookup.set(entry.from, existing)
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
            specInfos.push({ spec, localName: '', isRedundant: false })
            continue
          }

          const localName = spec.local.name
          const names = isTypeOnlyImport(node, spec) ? autoImported.type : autoImported.value
          specInfos.push({ spec, localName, isRedundant: names.has(localName) })
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
            data: { name: redundant.map(s => s.localName).join(', ') },
            fix: fixer => fixer.removeRange([node.range![0], nextLineStart(sourceText, node.range![1])]),
          })
          return
        }

        context.report({
          node,
          messageId: 'redundant',
          data: { name: redundant.map(s => s.localName).join(', ') },
          fix: fixer => fixer.replaceText(node, rebuildImportDeclaration(context, node, kept)),
        })
      },
    }
  },
}

function nextLineStart(text: string, pos: number): number {
  const nl = text.indexOf('\n', pos)
  return nl === -1 ? pos : nl + 1
}

function isTypeOnlyImport(node: ImportDeclaration, spec: ImportSpecifier): boolean {
  return node.importKind === 'type' || spec.importKind === 'type'
}

function rebuildImportDeclaration(context: Rule.RuleContext, node: ImportDeclaration, kept: SpecInfo[]): string {
  const defaultSpecifiers = kept.filter(({ spec }) => spec.type === 'ImportDefaultSpecifier')
  const namespaceSpecifiers = kept.filter(({ spec }) => spec.type === 'ImportNamespaceSpecifier')
  const namedSpecifiers = kept.filter(({ spec }) => spec.type === 'ImportSpecifier').map(({ spec }) => spec as ImportSpecifier)
  const useTypeKeyword = node.importKind !== 'type'
    && !defaultSpecifiers.length
    && !namespaceSpecifiers.length
    && namedSpecifiers.length > 0
    && namedSpecifiers.every(spec => spec.importKind === 'type')

  const specifierTexts = [
    ...defaultSpecifiers.map(({ spec }) => context.sourceCode.getText(spec)),
    ...namespaceSpecifiers.map(({ spec }) => context.sourceCode.getText(spec)),
  ]

  if (namedSpecifiers.length) {
    const namedTexts = namedSpecifiers.map((spec) => {
      const text = context.sourceCode.getText(spec)
      return useTypeKeyword ? text.replace(/^type\s+/, '') : text
    })
    specifierTexts.push(`{ ${namedTexts.join(', ')} }`)
  }

  const suffix = context.sourceCode.text.slice(node.source.range![1], node.range![1])
  return `import${node.importKind === 'type' || useTypeKeyword ? ' type' : ''} ${specifierTexts.join(', ')} from ${context.sourceCode.getText(node.source)}${suffix}`
}
