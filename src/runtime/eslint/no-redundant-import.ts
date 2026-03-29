import type { Rule } from 'eslint'

interface AutoImportEntry {
  name: string
  as?: string
  from: string
  type?: boolean
}

type ImportSourceNode = Rule.Node & { value: string, range: [number, number] }
type ImportSpecifierNode = Rule.Node & {
  type: 'ImportSpecifier'
  imported: { name?: string, value?: string }
  local: { name: string }
  importKind?: 'type' | 'value'
}
type ImportDefaultSpecifierNode = Rule.Node & { type: 'ImportDefaultSpecifier' }
type ImportNamespaceSpecifierNode = Rule.Node & { type: 'ImportNamespaceSpecifier' }
type ImportNode = Rule.Node & {
  type: 'ImportDeclaration'
  importKind?: 'type' | 'value'
  range: [number, number]
  source: ImportSourceNode
  specifiers: Array<ImportDefaultSpecifierNode | ImportNamespaceSpecifierNode | ImportSpecifierNode>
}

interface SpecInfo { spec: ImportNode['specifiers'][number], localName: string, isRedundant: boolean }
type AutoImportNames = Map<string, Set<string>>
interface SourceLookup { type: AutoImportNames, value: AutoImportNames }

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
  create(context): Rule.RuleListener {
    const entries = context.settings[SETTINGS_KEY] as AutoImportEntry[] | undefined
    if (!entries?.length)
      return {}

    const lookup = new Map<string, SourceLookup>()
    for (const entry of entries) {
      const localName = entry.as || entry.name
      const existing = lookup.get(entry.from) || { type: new Map(), value: new Map() }
      addAutoImportName(existing[entry.type ? 'type' : 'value'], localName, entry.name)
      lookup.set(entry.from, existing)
    }

    return {
      ImportDeclaration(node) {
        const importNode = node as unknown as ImportNode
        if (!importNode.specifiers.length) return

        const source = typeof importNode.source.value === 'string' ? importNode.source.value : undefined
        if (!source) return
        const autoImported = lookup.get(source)
        if (!autoImported) return

        if (isDeclarationFile(context.filename)) return

        const specInfos: SpecInfo[] = []

        for (const spec of importNode.specifiers) {
          if (spec.type !== 'ImportSpecifier') {
            specInfos.push({ spec, localName: '', isRedundant: false })
            continue
          }

          const localName = spec.local.name
          const names = isTypeOnlyImport(importNode, spec) ? autoImported.type : autoImported.value
          const importedName = getImportedName(spec)
          specInfos.push({ spec, localName, isRedundant: importedName ? names.get(localName)?.has(importedName) === true : false })
        }

        const redundant = specInfos.filter(s => s.isRedundant)
        if (!redundant.length) return

        const kept = specInfos.filter(s => !s.isRedundant)
        const sourceText = context.sourceCode.getText()

        // All specifiers redundant → remove entire statement
        if (!kept.length) {
          context.report({
            node: importNode,
            messageId: 'redundant',
            data: { name: redundant.map(s => s.localName).join(', ') },
            fix: fixer => fixer.removeRange(importRemovalRange(sourceText, importNode.range)),
          })
          return
        }

        context.report({
          node: importNode,
          messageId: 'redundant',
          data: { name: redundant.map(s => s.localName).join(', ') },
          fix: fixer => fixer.replaceText(importNode, rebuildImportDeclaration(context, importNode, kept)),
        })
      },
    }
  },
}

function isDeclarationFile(filename: string): boolean {
  return /\.d\.(?:cts|mts|ts)$/.test(filename)
}

function importRemovalRange(text: string, range: [number, number]): [number, number] {
  let end = range[1]

  while (text[end] === ' ' || text[end] === '\t') {
    end++
  }

  if (text.startsWith('\r\n', end)) {
    return [range[0], end + 2]
  }

  if (text[end] === '\n') {
    return [range[0], end + 1]
  }

  return [range[0], end]
}

function isTypeOnlyImport(node: ImportNode, spec: ImportSpecifierNode): boolean {
  return node.importKind === 'type' || spec.importKind === 'type'
}

function addAutoImportName(lookup: AutoImportNames, localName: string, importedName: string): void {
  const importedNames = lookup.get(localName) || new Set<string>()
  importedNames.add(importedName)
  lookup.set(localName, importedNames)
}

function getImportedName(spec: ImportSpecifierNode): string | undefined {
  return typeof spec.imported.name === 'string'
    ? spec.imported.name
    : typeof spec.imported.value === 'string'
      ? spec.imported.value
      : undefined
}

function rebuildImportDeclaration(context: Rule.RuleContext, node: ImportNode, kept: SpecInfo[]): string {
  const defaultSpecifiers = kept.filter(({ spec }) => spec.type === 'ImportDefaultSpecifier')
  const namespaceSpecifiers = kept.filter(({ spec }) => spec.type === 'ImportNamespaceSpecifier')
  const namedSpecifiers = kept.filter(({ spec }) => spec.type === 'ImportSpecifier').map(({ spec }) => spec as ImportSpecifierNode)
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

  const sourceRange = node.source.range as [number, number]
  const suffix = context.sourceCode.text.slice(sourceRange[1], node.range[1])
  return `import${node.importKind === 'type' || useTypeKeyword ? ' type' : ''} ${specifierTexts.join(', ')} from ${context.sourceCode.getText(node.source)}${suffix}`
}
