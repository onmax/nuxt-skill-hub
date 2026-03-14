import { defaultSelectedModules, type SelectedModule } from '~/data/modules'
import {
  buildFileTree,
  getAvailablePlaygroundFilePath,
  MODULES_LIST_FILE_PATH,
  type SkillFile,
} from '~/data/skill-files'
import type { NuxtModuleResult } from '~/composables/useNuxtModuleSearch'
import {
  createMetadataRouterSkillFiles,
  createModuleWrapperContent,
  createModulesListMarkdown,
  createSkillEntrypoint,
  getSourceLabel,
  getTrustLevel,
  resolveMetadataRouterSkillName,
  type NuxtContentMetadata,
  type SkillModuleRenderEntry,
  parseSkillFrontmatter,
} from '~~/shared/skill-preview'

const repoBlobBase = 'https://github.com/onmax/nuxt-skill-hub/blob/main'
const skillsRepoBlobBase = 'https://github.com/onmax/nuxt-skills/blob/main/skills'
const generatedSkillRoot = '.codex/skills/nuxt-nuxt-skill-hub'

interface ModuleSkillCacheEntry {
  paths: string[]
  files: Record<string, string>
}

function repoSource(path: string) {
  return `${repoBlobBase}/${path}`
}

export function usePlayground() {
  const defaults = defaultSelectedModules.map(module => ({
    ...module,
    enabled: module.skillAvailability !== 'unavailable' ? module.enabled : false,
  }))

  const selectedModulesState = useLocalStorage<SelectedModule[]>('playground-modules-v2', defaults)
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

  // Fetch real module skill files from GitHub
  const moduleFileCache = ref<Record<string, ModuleSkillCacheEntry>>({})
  const moduleFileLoading = ref<Set<string>>(new Set())
  const moduleFileContentLoading = ref<Set<string>>(new Set())

  async function fetchModuleFiles(moduleId: string) {
    if (moduleFileCache.value[moduleId] || moduleFileLoading.value.has(moduleId)) return
    moduleFileLoading.value = new Set([...moduleFileLoading.value, moduleId])
    try {
      const data = await $fetch<{ paths: string[] }>('/api/module-skill-files', { query: { module: moduleId } })
      moduleFileCache.value = {
        ...moduleFileCache.value,
        [moduleId]: {
          paths: data.paths || [],
          files: {},
        },
      }
      if (data.paths?.includes('SKILL.md')) {
        await fetchModuleFileContent(moduleId, 'SKILL.md')
      }
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

  async function fetchModuleFileContent(moduleId: string, filePath: string) {
    const cacheKey = `${moduleId}:${filePath}`
    const moduleEntry = moduleFileCache.value[moduleId]
    if (!moduleEntry || moduleEntry.files[filePath] || moduleFileContentLoading.value.has(cacheKey)) return

    moduleFileContentLoading.value = new Set([...moduleFileContentLoading.value, cacheKey])
    try {
      const data = await $fetch<{ content: string | null }>('/api/module-skill-files', {
        query: { module: moduleId, path: filePath },
      })
      if (typeof data.content === 'string') {
        moduleFileCache.value = {
          ...moduleFileCache.value,
          [moduleId]: {
            ...moduleEntry,
            files: {
              ...moduleEntry.files,
              [filePath]: data.content,
            },
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

  // Auto-fetch when modules are enabled
  watch(selectedModuleIds, (ids) => {
    if (!ids.size) {
      return
    }

    for (const id of ids) {
      const module = selectedModules.value.find(entry => entry.id === id)
      if (module?.skillAvailability === 'real' && !moduleFileCache.value[id]) fetchModuleFiles(id)
    }
  }, { immediate: true })

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
    if (module?.skillAvailability === 'real') {
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
    files[MODULES_LIST_FILE_PATH] = {
      name: '_list.md',
      path: MODULES_LIST_FILE_PATH,
      language: 'markdown',
      content: createModulesListMarkdown(moduleEntries),
      sourceHref: repoSource(`${generatedSkillRoot}/references/modules/_list.md`),
    }

    if (d.nuxtFiles) {
      for (const [relativePath, content] of Object.entries(d.nuxtFiles)) {
        const path = `references/nuxt/${relativePath}`
        files[path] = { name: relativePath.split('/').pop() || relativePath, path, language: 'markdown', content: content as string, sourceHref: repoSource(`nuxt-content/${relativePath}`) }
      }
    }

    if (d.vueFiles) {
      for (const [relativePath, content] of Object.entries(d.vueFiles)) {
        const path = `references/vue/${relativePath}`
        files[path] = { name: relativePath.split('/').pop() || relativePath, path, language: 'markdown', content: content as string, sourceHref: repoSource(`vue-content/${relativePath}`) }
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
    if (!hasActiveModules.value) {
      return {}
    }

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
    hasActiveModules.value
      ? selectedModules.value
          .filter(module => module.enabled && module.skillAvailability !== 'unavailable')
          .map((module) => {
            const { preview } = getModulePreviewFiles(module, moduleFileCache.value[module.id])
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

  return { selectedModules, selectedModuleIds, activeFilePath, activeFile, fileTree, moduleAuthorMode, toggleModule, removeModule, addModule, isSelected, selectFile }
}

function createPreviewModuleEntry(module: SelectedModule, moduleFiles: Record<string, string>): SkillModuleRenderEntry {
  const frontmatter = parseSkillFrontmatter(moduleFiles['SKILL.md'] || '')
  const sourceKind = 'github'
  const skillName = frontmatter?.name || module.id

  return {
    packageName: module.packageName,
    version: undefined,
    skillName,
    entryPath: `references/modules/${module.id}/SKILL.md`,
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
  }
}

function createGeneratedPreviewModuleEntry(module: SelectedModule): SkillModuleRenderEntry {
  const skillName = resolveMetadataRouterSkillName(module.packageName)

  return {
    packageName: module.packageName,
    version: undefined,
    skillName,
    entryPath: `references/modules/${module.id}/${skillName}.md`,
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

function getModulePreviewFiles(module: SelectedModule, realModuleFiles?: ModuleSkillCacheEntry): {
  preview: SkillModuleRenderEntry | null
  moduleFiles: Record<string, string> | null
  sourceHref?: string
} {
  if (module.skillAvailability === 'real') {
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
      preview: createPreviewModuleEntry(module, realModuleFiles.files),
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
