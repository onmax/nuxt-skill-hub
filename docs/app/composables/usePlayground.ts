import { defaultSelectedModules, type SelectedModule } from '~/data/modules'
import { buildFileTree, type SkillFile } from '~/data/skill-files'
import type { NuxtModuleResult } from '~/composables/useNuxtModuleSearch'
import {
  createMetadataRouterSkillFiles,
  createModuleWrapperContent,
  createModulesListMarkdown,
  createReferencesIndexContent,
  createSkillEntrypoint,
  getSourceLabel,
  getTrustLevel,
  resolveMetadataRouterSkillName,
  type CoreContentMetadata,
  type SkillModuleRenderEntry,
  parseSkillFrontmatter,
} from '~~/shared/skill-preview'

const repoBlobBase = 'https://github.com/onmax/nuxt-skill-hub/blob/main'
const skillsRepoBlobBase = 'https://github.com/onmax/nuxt-skills/blob/main/skills'
const generatedSkillRoot = '.codex/skills/nuxt-nuxt-skill-hub'

function repoSource(path: string) {
  return `${repoBlobBase}/${path}`
}

export function usePlayground() {
  const defaults = defaultSelectedModules.map(module => ({
    ...module,
    enabled: module.skillAvailability !== 'unavailable' ? module.enabled : false,
  }))

  const selectedModulesState = useLocalStorage<SelectedModule[]>('playground-modules-v2', defaults)

  const { data: moduleCatalogData } = useFetch<{ modules: NuxtModuleResult[] }>('/api/nuxt-modules', {
    default: () => ({ modules: [] }),
  })

  const moduleCatalogByPackage = computed(() =>
    new Map((moduleCatalogData.value?.modules || []).map(module => [module.npm, module])),
  )

  const selectedModules = computed<SelectedModule[]>(() =>
    selectedModulesState.value.map((module) => {
      const catalogEntry = moduleCatalogByPackage.value.get(module.packageName)
      return {
        ...module,
        label: catalogEntry?.name || module.label,
        description: catalogEntry?.description || module.description,
        iconUrl: catalogEntry?.icon
          ? `https://raw.githubusercontent.com/nuxt/modules/main/icons/${catalogEntry.icon}`
          : module.iconUrl,
        skillAvailability: catalogEntry?.skillAvailability || module.skillAvailability,
        repoUrl: catalogEntry?.github || module.repoUrl,
        docsUrl: catalogEntry?.website || module.docsUrl,
        moduleType: catalogEntry?.type || module.moduleType,
      }
    }),
  )

  const selectedModuleIds = computed(() =>
    new Set(selectedModules.value.filter(m => m.enabled && m.skillAvailability !== 'unavailable').map(m => m.id)),
  )

  const activeFilePath = useLocalStorage<string>('playground-active-file', 'SKILL.md')

  const { data: apiData } = useFetch('/api/skill-files')

  // Fetch real module skill files from GitHub
  const moduleFileCache = ref<Record<string, Record<string, string>>>({})
  const moduleFileLoading = ref<Set<string>>(new Set())

  async function fetchModuleFiles(moduleId: string) {
    if (moduleFileCache.value[moduleId] || moduleFileLoading.value.has(moduleId)) return
    moduleFileLoading.value = new Set([...moduleFileLoading.value, moduleId])
    try {
      const data = await $fetch<{ files: Record<string, string> }>('/api/module-skill-files', { query: { module: moduleId } })
      moduleFileCache.value = { ...moduleFileCache.value, [moduleId]: data.files }
    }
    catch (e) {
      console.warn(`Failed to fetch skill files for ${moduleId}`, e)
    }
    finally {
      const next = new Set(moduleFileLoading.value)
      next.delete(moduleId)
      moduleFileLoading.value = next
    }
  }

  // Auto-fetch when modules are enabled
  watch(selectedModuleIds, (ids) => {
    for (const id of ids) {
      const module = selectedModules.value.find(entry => entry.id === id)
      if (module?.skillAvailability === 'real' && !moduleFileCache.value[id]) fetchModuleFiles(id)
    }
  }, { immediate: true })

  const coreFileMap = computed<Record<string, SkillFile>>(() => {
    const d = apiData.value
    if (!d) return {}

    const metadata = d.metadata as CoreContentMetadata
    const moduleEntries = modulePreviewEntries.value
    const manifest = {
      ...d.manifest,
      modules: moduleEntries.map(entry => ({
        packageName: entry.packageName,
        version: entry.version,
        skillName: entry.skillName,
        sourceDir: `preview/${entry.packageName}`,
        destination: `references/modules/${entry.packageName}/${entry.skillName}`,
        scriptsIncluded: entry.scriptsIncluded,
        description: entry.description,
        sourceKind: entry.sourceKind,
        sourceLabel: entry.sourceLabel,
        sourceRepo: entry.sourceRepo,
        sourceRef: entry.sourceRef,
        sourcePath: entry.sourcePath,
        repoUrl: entry.repoUrl,
        docsUrl: entry.docsUrl,
        official: entry.official,
        trustLevel: entry.trustLevel,
        resolver: entry.resolver,
        wrapperPath: entry.wrapperPath,
      })),
    }

    const files: Record<string, SkillFile> = {}
    files['SKILL.md'] = { name: 'SKILL.md', path: 'SKILL.md', language: 'markdown', content: createSkillEntrypoint('nuxt', metadata), sourceHref: repoSource(`${generatedSkillRoot}/SKILL.md`) }
    files['manifest.json'] = { name: 'manifest.json', path: 'manifest.json', language: 'json', content: JSON.stringify(manifest, null, 2), sourceHref: repoSource(`${generatedSkillRoot}/manifest.json`) }
    files['references/index.md'] = { name: 'index.md', path: 'references/index.md', language: 'markdown', content: createReferencesIndexContent(metadata, moduleEntries), sourceHref: repoSource(`${generatedSkillRoot}/references/index.md`) }
    files['references/core/metadata.json'] = { name: 'metadata.json', path: 'references/core/metadata.json', language: 'json', content: JSON.stringify(d.metadata, null, 2), sourceHref: repoSource('core-content/metadata.json') }
    files['references/modules/_list.md'] = {
      name: '_list.md',
      path: 'references/modules/_list.md',
      language: 'markdown',
      content: createModulesListMarkdown(moduleEntries),
      sourceHref: repoSource(`${generatedSkillRoot}/references/modules/_list.md`),
    }

    if (d.coreFiles) {
      for (const [relativePath, content] of Object.entries(d.coreFiles)) {
        const path = `references/core/${relativePath}`
        files[path] = { name: relativePath.split('/').pop() || relativePath, path, language: 'markdown', content: content as string, sourceHref: repoSource(`core-content/${relativePath}`) }
      }
    }

    return files
  })

  // Build module file map from fetched real content
  const moduleFileMap = computed<Record<string, SkillFile>>(() => {
    const files: Record<string, SkillFile> = {}
    for (const module of selectedModules.value.filter(item => item.enabled && item.skillAvailability !== 'unavailable')) {
      const { preview, moduleFiles, sourceHref } = getModulePreviewFiles(module, moduleFileCache.value[module.id])
      if (!preview || !moduleFiles) {
        continue
      }

      if (preview.wrapperPath) {
        files[preview.wrapperPath] = {
          name: preview.wrapperPath.split('/').pop() || preview.wrapperPath,
          path: preview.wrapperPath,
          language: 'markdown',
          content: createModuleWrapperContent(preview),
          sourceHref,
        }
      }

      for (const [filePath, content] of Object.entries(moduleFiles)) {
        const path = `references/modules/${module.id}/${filePath}`
        files[path] = {
          name: filePath.split('/').pop() || filePath,
          path,
          language: filePath.endsWith('.json') ? 'json' : 'markdown',
          content,
          sourceHref: module.skillAvailability === 'real' ? `${skillsRepoBlobBase}/${module.id}/${filePath}` : sourceHref,
        }
      }
    }
    return files
  })

  // Module file keys grouped by module (for tree building)
  const moduleFileLists = computed<Record<string, string[]>>(() => {
    const lists: Record<string, string[]> = {}
    for (const module of selectedModules.value.filter(item => item.enabled && item.skillAvailability !== 'unavailable')) {
      const { preview, moduleFiles } = getModulePreviewFiles(module, moduleFileCache.value[module.id])
      if (!preview || !moduleFiles) {
        continue
      }

      const files = Object.keys(moduleFiles)
      if (preview.wrapperPath) {
        files.unshift(preview.wrapperPath.replace(`references/modules/${module.id}/`, ''))
      }
      lists[module.id] = files
    }
    return lists
  })

  const modulePreviewEntries = computed<SkillModuleRenderEntry[]>(() =>
    selectedModules.value
      .filter(module => module.enabled && module.skillAvailability !== 'unavailable')
      .map((module) => {
        const { preview } = getModulePreviewFiles(module, moduleFileCache.value[module.id])
        return preview
      })
      .filter((entry): entry is SkillModuleRenderEntry => Boolean(entry)),
  )

  const coreFileKeys = computed(() => {
    const d = apiData.value
    return d?.coreFiles ? Object.keys(d.coreFiles) : []
  })

  const fileTree = computed(() => buildFileTree(coreFileKeys.value, [...selectedModuleIds.value], moduleFileLists.value))

  const activeFile = computed<SkillFile | undefined>(() => {
    const path = activeFilePath.value
    return coreFileMap.value[path] || moduleFileMap.value[path]
  })

  function toggleModule(id: string) {
    const mod = selectedModulesState.value.find(m => m.id === id)
    const resolved = selectedModules.value.find(m => m.id === id)
    if (!mod || !resolved || mod.locked || resolved.skillAvailability === 'unavailable') return
    mod.enabled = !mod.enabled
  }

  function removeModule(id: string) {
    const mod = selectedModulesState.value.find(m => m.id === id)
    if (mod?.locked) return
    selectedModulesState.value = selectedModulesState.value.filter(m => m.id !== id)
  }

  function addModule(mod: NuxtModuleResult) {
    if (mod.skillAvailability === 'unavailable') return
    if (selectedModulesState.value.some(m => m.packageName === mod.npm)) return
    selectedModulesState.value.push({
      id: mod.name,
      packageName: mod.npm,
      label: mod.name,
      description: mod.description,
      icon: '',
      iconUrl: mod.icon ? `https://raw.githubusercontent.com/nuxt/modules/main/icons/${mod.icon}` : undefined,
      enabled: true,
      skillAvailability: mod.skillAvailability,
      repoUrl: mod.github,
      docsUrl: mod.website,
      locked: false,
      moduleType: mod.type,
    })
  }

  function isSelected(npm: string) {
    return selectedModulesState.value.some(m => m.packageName === npm)
  }

  function selectFile(path: string) {
    activeFilePath.value = path
  }

  return { selectedModules, selectedModuleIds, activeFilePath, fileTree, activeFile, toggleModule, removeModule, addModule, isSelected, selectFile }
}

function createPreviewModuleEntry(module: SelectedModule, moduleFiles: Record<string, string>): SkillModuleRenderEntry {
  const frontmatter = parseSkillFrontmatter(moduleFiles['SKILL.md'] || '')
  const sourceKind = 'github'
  const skillName = frontmatter?.name || module.id

  return {
    packageName: module.packageName,
    version: undefined,
    skillName,
    description: frontmatter?.description,
    scriptsIncluded: Object.keys(moduleFiles).some(path => path === 'scripts' || path.startsWith('scripts/')),
    sourceKind,
    sourceLabel: getSourceLabel(sourceKind),
    sourceRepo: module.repoUrl?.includes('github.com/') ? module.repoUrl.replace('https://github.com/', '') : undefined,
    sourceRef: 'main',
    sourcePath: `skills/${module.id}`,
    repoUrl: module.repoUrl,
    docsUrl: module.docsUrl,
    official: true,
    trustLevel: getTrustLevel(true),
    resolver: 'githubHeuristic',
    wrapperPath: `references/modules/${module.id}/${skillName}.md`,
  }
}

function createGeneratedPreviewModuleEntry(module: SelectedModule): SkillModuleRenderEntry {
  const skillName = resolveMetadataRouterSkillName(module.packageName)

  return {
    packageName: module.packageName,
    version: undefined,
    skillName,
    description: module.description,
    scriptsIncluded: false,
    sourceKind: 'generated',
    sourceLabel: getSourceLabel('generated'),
    sourceRepo: module.repoUrl?.includes('github.com/') ? module.repoUrl.replace('https://github.com/', '') : undefined,
    repoUrl: module.repoUrl,
    docsUrl: module.docsUrl,
    official: true,
    trustLevel: getTrustLevel(true),
    resolver: 'metadataRouter',
    wrapperPath: `references/modules/${module.id}/${skillName}.md`,
  }
}

function getModulePreviewFiles(module: SelectedModule, realModuleFiles?: Record<string, string>): {
  preview: SkillModuleRenderEntry | null
  moduleFiles: Record<string, string> | null
  sourceHref?: string
} {
  if (module.skillAvailability === 'real') {
    if (!realModuleFiles) {
      return { preview: null, moduleFiles: null }
    }

    return {
      preview: createPreviewModuleEntry(module, realModuleFiles),
      moduleFiles: realModuleFiles,
      sourceHref: repoSource(`${generatedSkillRoot}/references/modules/${module.id}`),
    }
  }

  if (module.skillAvailability === 'generated') {
    const preview = createGeneratedPreviewModuleEntry(module)
    return {
      preview,
      moduleFiles: createMetadataRouterSkillFiles({
        packageName: module.packageName,
        skillName: preview.skillName,
        description: module.description,
        repoUrl: module.repoUrl,
        docsUrl: module.docsUrl,
      }),
      sourceHref: module.docsUrl || module.repoUrl,
    }
  }

  return { preview: null, moduleFiles: null }
}
