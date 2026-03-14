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

// Build file tree from a flat list of relative paths
function filesToTree(moduleId: string, files: string[]): SkillFileTree[] {
  const root: SkillFileTree[] = []
  const dirs = new Map<string, SkillFileTree>()

  for (const file of files.sort()) {
    const parts = file.split('/')
    const icon = file.endsWith('.json') ? 'i-lucide-file-json' : 'i-lucide-file-text'
    if (parts.length === 1) {
      root.push({ label: file, icon, value: `references/modules/${moduleId}/${file}` })
    }
    else {
      const dirName = parts[0]!
      if (!dirs.has(dirName)) {
        dirs.set(dirName, { value: `dir:modules/${moduleId}/${dirName}`, label: dirName, icon: 'i-lucide-folder', defaultExpanded: false, children: [] })
      }
      dirs.get(dirName)!.children!.push({ label: parts.slice(1).join('/'), icon, value: `references/modules/${moduleId}/${file}` })
    }
  }

  return [...root, ...dirs.values()]
}

/**
 * @param coreFileKeys - relative paths from core-content/
 * @param selectedModuleIds - enabled module IDs
 * @param moduleFileLists - real file lists fetched from GitHub, keyed by module ID
 */
export function buildFileTree(coreFileKeys: string[], selectedModuleIds: string[], moduleFileLists: Record<string, string[]> = {}): SkillFileTree[] {
  const ruleFiles: SkillFileTree[] = coreFileKeys
    .filter(k => k.startsWith('rules/'))
    .map(k => ({ label: k.replace('rules/', ''), icon: 'i-lucide-file-text', value: `references/core/${k}` }))

  const moduleEntries: SkillFileTree[] = selectedModuleIds
    .filter(id => moduleFileLists[id]?.length)
    .map(id => ({
      value: `dir:modules/${id}`,
      label: id,
      icon: 'i-lucide-puzzle',
      defaultExpanded: false,
      children: filesToTree(id, moduleFileLists[id]!),
    }))

  return [
    { label: 'SKILL.md', icon: 'i-lucide-file-text', value: 'SKILL.md' },
    {
      value: 'dir:references',
      label: 'references',
      icon: 'i-lucide-folder',
      defaultExpanded: true,
      children: [
        { label: 'index.md', icon: 'i-lucide-file-text', value: 'references/index.md' },
        {
          value: 'dir:core',
          label: 'core',
          icon: 'i-lucide-folder',
          defaultExpanded: false,
          children: [
            ...(ruleFiles.length > 0 ? [{ value: 'dir:rules', label: 'rules', icon: 'i-lucide-folder', children: ruleFiles }] : []),
          ],
        },
        ...(moduleEntries.length > 0
          ? [{
              value: 'dir:modules',
              label: 'modules',
              icon: 'i-lucide-folder',
              defaultExpanded: true,
              children: [
                { label: '_list.md', icon: 'i-lucide-file-text', value: 'references/modules/_list.md' },
                ...moduleEntries,
              ],
            }]
          : []),
      ],
    },
  ]
}
