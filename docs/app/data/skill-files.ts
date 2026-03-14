export interface SkillFile {
  name: string
  path: string
  content: string
  language: string
  sourceHref?: string
}

export interface SkillFileTree {
  label: string
  icon?: string
  defaultExpanded?: boolean
  value?: string
  children?: SkillFileTree[]
}

export const MODULES_DIR_PATH = 'dir:modules'
export const MODULES_LIST_FILE_PATH = 'references/modules/_list.md'

function sortTree(entries: SkillFileTree[]): SkillFileTree[] {
  return entries
    .map(entry => ({
      ...entry,
      children: entry.children ? sortTree(entry.children) : undefined,
    }))
    .sort((left, right) => {
      const leftIsDir = Boolean(left.children?.length)
      const rightIsDir = Boolean(right.children?.length)
      if (leftIsDir !== rightIsDir) {
        return leftIsDir ? -1 : 1
      }

      return left.label.localeCompare(right.label)
    })
}

function buildNestedTree(basePath: string, files: string[], directoryPrefix: string): SkillFileTree[] {
  const root: SkillFileTree[] = []
  const dirs = new Map<string, SkillFileTree>()

  for (const file of files.sort()) {
    const parts = file.split('/')
    const icon = file.endsWith('.json') ? 'i-lucide-file-json' : 'i-lucide-file-text'
    if (parts.length === 1) {
      root.push({ label: file, icon, value: `${basePath}/${file}` })
    }
    else {
      const dirName = parts[0]!
      if (!dirs.has(dirName)) {
        dirs.set(dirName, { value: `${directoryPrefix}/${dirName}`, label: dirName, icon: 'i-lucide-folder', defaultExpanded: false, children: [] })
      }
      dirs.get(dirName)!.children!.push({ label: parts.slice(1).join('/'), icon, value: `${basePath}/${file}` })
    }
  }

  return sortTree([...root, ...dirs.values()])
}

/**
 * @param nuxtFileKeys - relative paths from nuxt-content/
 * @param vueFileKeys - relative paths from vue-content/
 * @param selectedModuleIds - enabled module IDs
 * @param moduleFileLists - real file lists fetched from GitHub, keyed by module ID
 */
export function buildFileTree(
  nuxtFileKeys: string[],
  vueFileKeys: string[],
  selectedModuleIds: string[],
  moduleFileLists: Record<string, string[]> = {},
): SkillFileTree[] {
  const nuxtEntries = buildNestedTree('references/nuxt', nuxtFileKeys, 'dir:nuxt')
  const vueEntries = buildNestedTree('references/vue', vueFileKeys, 'dir:vue')

  const moduleEntries: SkillFileTree[] = selectedModuleIds
    .filter(id => moduleFileLists[id]?.length)
    .map(id => ({
      value: `dir:modules/${id}`,
      label: id,
      icon: 'i-lucide-puzzle',
      defaultExpanded: false,
      children: buildNestedTree(`references/modules/${id}`, moduleFileLists[id]!, `dir:modules/${id}`),
    }))

  return [
    { label: 'SKILL.md', icon: 'i-lucide-file-text', value: 'SKILL.md' },
    {
      value: 'dir:references',
      label: 'references',
      icon: 'i-lucide-folder',
      defaultExpanded: true,
      children: [
        {
          value: 'dir:nuxt',
          label: 'nuxt',
          icon: 'i-lucide-folder',
          defaultExpanded: false,
          children: nuxtEntries,
        },
        {
          value: 'dir:vue',
          label: 'vue',
          icon: 'i-lucide-folder',
          defaultExpanded: false,
          children: vueEntries,
        },
        {
          value: MODULES_DIR_PATH,
          label: 'modules',
          icon: 'i-lucide-folder',
          defaultExpanded: true,
          children: [
            { label: '_list.md', icon: 'i-lucide-file-text', value: MODULES_LIST_FILE_PATH },
            ...moduleEntries,
          ],
        },
      ],
    },
  ]
}

export function getAvailablePlaygroundFilePath(activePath: string, availablePaths: Iterable<string>): string {
  const pathSet = new Set(availablePaths)
  if (pathSet.has(activePath)) {
    return activePath
  }

  if (activePath.startsWith('references/modules/')) {
    return MODULES_LIST_FILE_PATH
  }

  return activePath
}
