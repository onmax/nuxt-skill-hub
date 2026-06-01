import { defaultSelectedModules, type SelectedModule } from '~/data/modules'
import {
  buildFileTree,
  getAvailablePlaygroundFilePath,
  type SkillFile,
} from '~/data/skill-files'
import type { NuxtModuleResult } from '~/composables/useNuxtModuleSearch'
import {
  createMetadataRouterSkillFiles,
  createSkillEntrypoint,
  getSourceLabel,
  getTrustLevel,
  resolveMetadataRouterSkillName,
  type NuxtContentMetadata,
  type SkillModuleRenderEntry,
  parseSkillFrontmatter,
  type SkillResolverKind,
  type SkillSourceKind,
} from '~~/shared/skill-preview'

const repoBlobBase = 'https://github.com/onmax/nuxt-skill-hub/blob/main'
const skillsRawBase = 'https://raw.githubusercontent.com/onmax/nuxt-skills/main/skills'
const generatedSkillRoot = '.codex/skills/nuxt-nuxt-skill-hub'

interface ModuleSkillCacheEntry {
  skillName?: string
  /** Base URL for fetching raw file content */
  rawBase?: string
  sourceHrefBase?: string
  paths: string[]
  files: Record<string, string>
  source?: 'official' | 'community'
  sourceKind?: SkillSourceKind
  resolver?: SkillResolverKind
  description?: string
  sourceRepo?: string
  sourceRef?: string
  sourcePath?: string
  repoUrl?: string
  docsUrl?: string
  official?: boolean
}

interface ModuleSkillFilesResponse {
  meta?: {
    skillName?: string
    description?: string
    sourceKind?: SkillSourceKind
    sourceHrefBase?: string
    sourceRepo?: string
    sourceRef?: string
    sourcePath?: string
    repoUrl?: string
    docsUrl?: string
    official?: boolean
    resolver?: SkillResolverKind
    scriptsIncluded?: boolean
  }
  paths?: string[]
  files?: Record<string, string>
  path?: string
  content?: string | null
}

function repoSource(path: string) {
  return `${repoBlobBase}/${path}`
}

export function usePlayground() {
  const defaults = defaultSelectedModules.map(module => ({
    ...module,
    enabled: module.skillAvailability !== 'unavailable' ? module.enabled : false,
  }))

  const selectedModulesState = useLocalStorage<SelectedModule[]>('playground-modules-v3', defaults)
  const moduleAuthorMode = useLocalStorage<boolean>('playground-module-author-mode', false)

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
  const hasActiveModules = computed(() => selectedModuleIds.value.size > 0)

  const activeFilePath = useLocalStorage<string>('playground-active-file', 'SKILL.md')

  const { data: apiData } = useFetch('/api/skill-files')

  const moduleFileCache = ref<Record<string, ModuleSkillCacheEntry>>({})
  const moduleIndexLoading = ref<Set<string>>(new Set())
  const moduleFileContentLoading = ref<Set<string>>(new Set())

  const moduleSkillCache = computed<Record<string, ModuleSkillCacheEntry>>(() => {
    const prerendered = ((apiData.value as any)?.moduleSkills || {}) as Record<string, ModuleSkillCacheEntry>
    const merged: Record<string, ModuleSkillCacheEntry> = { ...prerendered }

    for (const [moduleId, entry] of Object.entries(moduleFileCache.value)) {
      const base = merged[moduleId]
      merged[moduleId] = {
        ...(base || {}),
        ...entry,
        paths: entry.paths.length ? entry.paths : base?.paths || [],
        files: {
          ...(base?.files || {}),
          ...entry.files,
        },
      }
    }

    return merged
  })

  function moduleSkillQuery(module: SelectedModule, filePath?: string) {
    return {
      module: module.id,
      packageName: module.packageName,
      docsUrl: module.docsUrl,
      repoUrl: module.repoUrl,
      path: filePath,
    }
  }

  async function fetchModuleSkillIndex(module: SelectedModule) {
    if (module.skillAvailability === 'unavailable') return
    if (moduleSkillCache.value[module.id]?.paths.length) return
    if (moduleIndexLoading.value.has(module.id)) return

    moduleIndexLoading.value = new Set([...moduleIndexLoading.value, module.id])
    try {
      const data = await $fetch<ModuleSkillFilesResponse>('/api/module-skill-files', {
        query: moduleSkillQuery(module),
      })
      if (!data.paths?.length || !data.meta?.skillName) return

      moduleFileCache.value = {
        ...moduleFileCache.value,
        [module.id]: {
          skillName: data.meta.skillName,
          paths: data.paths,
          files: data.files || {},
          sourceKind: data.meta.sourceKind,
          sourceHrefBase: data.meta.sourceHrefBase,
          resolver: data.meta.resolver,
          description: data.meta.description,
          sourceRepo: data.meta.sourceRepo,
          sourceRef: data.meta.sourceRef,
          sourcePath: data.meta.sourcePath,
          repoUrl: data.meta.repoUrl,
          docsUrl: data.meta.docsUrl,
          official: data.meta.official,
          source: data.meta.official === false ? 'community' : 'official',
        },
      }
    }
    catch (e) {
      console.warn(`Failed to discover skill for ${module.packageName}`, e)
    }
    finally {
      const next = new Set(moduleIndexLoading.value)
      next.delete(module.id)
      moduleIndexLoading.value = next
    }
  }

  async function fetchModuleFileContent(moduleId: string, filePath: string) {
    const cacheKey = `${moduleId}:${filePath}`
    const moduleEntry = moduleSkillCache.value[moduleId]
    if (!moduleEntry || moduleEntry.files[filePath] || moduleFileContentLoading.value.has(cacheKey)) return
    const module = selectedModules.value.find(entry => entry.id === moduleId)

    moduleFileContentLoading.value = new Set([...moduleFileContentLoading.value, cacheKey])
    try {
      const content = moduleEntry.rawBase
        ? await $fetch<string>(`${moduleEntry.rawBase}/${filePath}`, { responseType: 'text' })
        : module
          ? (await $fetch<ModuleSkillFilesResponse>('/api/module-skill-files', {
              query: moduleSkillQuery(module, filePath),
            })).content
          : await $fetch<string>(`${skillsRawBase}/${moduleEntry.skillName || moduleId}/${filePath}`, { responseType: 'text' })
      const cachedEntry = moduleFileCache.value[moduleId]
      if (typeof content === 'string') {
        moduleFileCache.value = {
          ...moduleFileCache.value,
          [moduleId]: {
            ...moduleEntry,
            ...(cachedEntry || {}),
            paths: cachedEntry?.paths.length ? cachedEntry.paths : moduleEntry.paths,
            files: { ...(cachedEntry?.files || {}), [filePath]: content },
          },
        }
      }
    }
    catch (e) {
      console.warn(`Failed to fetch ${filePath} for ${moduleId}`, e)
    }
    finally {
      const next = new Set(moduleFileContentLoading.value)
      next.delete(cacheKey)
      moduleFileContentLoading.value = next
    }
  }

  watch(
    () => selectedModules.value
      .filter(module => module.enabled && module.skillAvailability !== 'unavailable')
      .map(module => `${module.id}:${module.packageName}:${module.docsUrl || ''}:${module.repoUrl || ''}`),
    () => {
      for (const module of selectedModules.value.filter(module => module.enabled && module.skillAvailability !== 'unavailable')) {
        fetchModuleSkillIndex(module)
      }
    },
    { immediate: true },
  )

  watch(activeFilePath, (path) => {
    const match = path.match(/^references\/modules\/([^/]+)\/(.+)$/)
    if (!match) {
      return
    }

    const [, moduleId, filePath] = match
    if (!moduleId || !filePath) {
      return
    }
    const module = selectedModules.value.find(entry => entry.id === moduleId)
    if (moduleSkillCache.value[moduleId]?.paths.length || module?.skillAvailability === 'real') {
      fetchModuleFileContent(moduleId, filePath)
    }
  }, { immediate: true })

  const frameworkFileMap = computed<Record<string, SkillFile>>(() => {
    const d = apiData.value
    if (!d) return {}

    const metadata = d.metadata as NuxtContentMetadata
    const moduleEntries = modulePreviewEntries.value

    const files: Record<string, SkillFile> = {}
    files['SKILL.md'] = {
      name: 'SKILL.md',
      path: 'SKILL.md',
      language: 'markdown',
      content: createSkillEntrypoint('nuxt', metadata, undefined, moduleAuthorMode.value, moduleEntries),
      sourceHref: repoSource(`${generatedSkillRoot}/SKILL.md`),
    }

    if (d.nuxtFiles) {
      for (const [relativePath, content] of Object.entries(d.nuxtFiles)) {
        const path = `references/nuxt/${relativePath}`
        files[path] = { name: relativePath.split('/').pop() || relativePath, path, language: 'markdown', content: content as string, sourceHref: repoSource(`nuxt-best-practices/${relativePath}`) }
      }
    }

    if (d.vueFiles) {
      for (const [relativePath, content] of Object.entries(d.vueFiles)) {
        const path = `references/vue/${relativePath}`
        files[path] = { name: relativePath.split('/').pop() || relativePath, path, language: 'markdown', content: content as string, sourceHref: `https://github.com/vuejs-ai/skills/blob/main/skills/vue-best-practices/${relativePath}` }
      }
    }

    return files
  })

  // Build module file map from fetched real content
  const moduleFileMap = computed<Record<string, SkillFile>>(() => {
    if (!hasActiveModules.value) {
      return {}
    }

    const files: Record<string, SkillFile> = {}
    for (const module of selectedModules.value.filter(item => item.enabled && item.skillAvailability !== 'unavailable')) {
      const { preview, moduleFiles, sourceHref } = getModulePreviewFiles(module, moduleSkillCache.value[module.id])
      if (!preview || !moduleFiles) {
        continue
      }

      for (const [filePath, content] of Object.entries(moduleFiles)) {
        const path = `references/modules/${module.id}/${filePath}`
        files[path] = {
          name: filePath.split('/').pop() || filePath,
          path,
          language: filePath.endsWith('.json') ? 'json' : 'markdown',
          content,
          sourceHref: realModuleSourceHref(moduleSkillCache.value[module.id], filePath) || sourceHref,
        }
      }
    }
    return files
  })

  // Module file keys grouped by module (for tree building)
  const moduleFileLists = computed<Record<string, string[]>>(() => {
    if (!hasActiveModules.value) {
      return {}
    }

    const lists: Record<string, string[]> = {}
    for (const module of selectedModules.value.filter(item => item.enabled && item.skillAvailability !== 'unavailable')) {
      const { moduleFiles } = getModulePreviewFiles(module, moduleSkillCache.value[module.id])
      if (!moduleFiles) {
        continue
      }

      lists[module.id] = Object.keys(moduleFiles)
    }
    return lists
  })

  const modulePreviewEntries = computed<SkillModuleRenderEntry[]>(() =>
    hasActiveModules.value
      ? selectedModules.value
          .filter(module => module.enabled && module.skillAvailability !== 'unavailable')
          .map((module) => {
            const { preview } = getModulePreviewFiles(module, moduleSkillCache.value[module.id])
            return preview
          })
          .filter((entry): entry is SkillModuleRenderEntry => Boolean(entry))
      : [],
  )

  const nuxtFileKeys = computed(() => {
    const d = apiData.value
    return d?.nuxtFiles ? Object.keys(d.nuxtFiles) : []
  })

  const vueFileKeys = computed(() => {
    const d = apiData.value
    return d?.vueFiles ? Object.keys(d.vueFiles) : []
  })

  const fileTree = computed(() => buildFileTree(nuxtFileKeys.value, vueFileKeys.value, [...selectedModuleIds.value], moduleFileLists.value))

  const activeFile = computed<SkillFile | undefined>(() => {
    const path = activeFilePath.value
    return frameworkFileMap.value[path] || moduleFileMap.value[path]
  })

  const availableFilePaths = computed(() => [
    ...Object.keys(frameworkFileMap.value),
    ...Object.keys(moduleFileMap.value),
  ])

  watch([activeFilePath, availableFilePaths], ([path, filePaths]) => {
    const nextPath = getAvailablePlaygroundFilePath(path, filePaths)
    if (nextPath !== path) {
      activeFilePath.value = nextPath
    }
  }, { immediate: true })

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
      id: mod.skillName,
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

  return { selectedModules, selectedModuleIds, activeFilePath, activeFile, fileTree, moduleAuthorMode, toggleModule, removeModule, addModule, isSelected, selectFile }
}

function realModuleSourceHref(realModuleFiles: ModuleSkillCacheEntry | undefined, filePath: string): string | undefined {
  if (realModuleFiles?.sourceHrefBase) {
    return `${realModuleFiles.sourceHrefBase}/${filePath}`
  }

  if (realModuleFiles?.rawBase) {
    return `${realModuleFiles.rawBase}/${filePath}`
  }
}

function createPreviewModuleEntry(module: SelectedModule, realModuleFiles: ModuleSkillCacheEntry): SkillModuleRenderEntry {
  const moduleFiles = realModuleFiles.files
  const frontmatter = parseSkillFrontmatter(moduleFiles['SKILL.md'] || '')
  const sourceKind = realModuleFiles.sourceKind || 'github'
  const skillName = frontmatter?.name || module.id
  const official = realModuleFiles.official ?? realModuleFiles.source !== 'community'

  return {
    packageName: module.packageName,
    version: undefined,
    skillName,
    entryPath: `references/modules/${module.id}/SKILL.md`,
    description: frontmatter?.description || realModuleFiles.description,
    scriptsIncluded: Object.keys(moduleFiles).some(path => path === 'scripts' || path.startsWith('scripts/')),
    sourceKind,
    sourceLabel: getSourceLabel(sourceKind),
    sourceRepo: realModuleFiles.sourceRepo || (module.repoUrl?.includes('github.com/') ? module.repoUrl.replace('https://github.com/', '') : undefined),
    sourceRef: realModuleFiles.sourceRef,
    sourcePath: realModuleFiles.sourcePath,
    repoUrl: realModuleFiles.repoUrl || module.repoUrl,
    docsUrl: realModuleFiles.docsUrl || module.docsUrl,
    official,
    trustLevel: getTrustLevel(official),
    resolver: realModuleFiles.resolver || 'githubHeuristic',
  }
}

function createGeneratedPreviewModuleEntry(module: SelectedModule): SkillModuleRenderEntry {
  const skillName = resolveMetadataRouterSkillName(module.packageName)

  return {
    packageName: module.packageName,
    version: undefined,
    skillName,
    entryPath: `references/modules/${module.id}/SKILL.md`,
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
  }
}

function getModulePreviewFiles(module: SelectedModule, realModuleFiles?: ModuleSkillCacheEntry): {
  preview: SkillModuleRenderEntry | null
  moduleFiles: Record<string, string> | null
  sourceHref?: string
} {
  if (realModuleFiles?.paths.length) {
    if (!realModuleFiles) {
      return { preview: null, moduleFiles: null }
    }

    const moduleFiles = Object.fromEntries(
      realModuleFiles.paths.map((filePath) => [
        filePath,
        realModuleFiles.files[filePath] ?? 'Loading...',
      ]),
    )

    return {
      preview: createPreviewModuleEntry(module, realModuleFiles),
      moduleFiles,
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
