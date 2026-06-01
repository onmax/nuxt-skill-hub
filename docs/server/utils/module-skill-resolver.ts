import { promises as fsp } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'pathe'
import { readPackageJSON, resolvePackageJSON } from 'pkg-types'
import { validateResolvedContributions } from '../../../src/internal'
import { resolveRemoteContributionsForPackage, slugCandidates, type InstalledPackageInfo } from '../../../src/remote-resolver'
import type { ResolvedContribution, SkillResolverKind, SkillSourceKind } from '../../../src/types'

const CACHE_TTL = 1000 * 60 * 60
const EXCLUDED_DIRS = new Set(['scripts', 'node_modules', '.git'])
const projectRoot = fileURLToPath(new URL('../../../', import.meta.url))
const docsRoot = join(projectRoot, 'docs')
const cacheRoot = join(projectRoot, 'docs', '.nuxt', 'skill-hub-preview-cache')

export interface ModuleSkillPreviewMeta {
  packageName: string
  version?: string
  skillName: string
  description?: string
  sourceKind: SkillSourceKind
  sourceHrefBase?: string
  sourceRepo?: string
  sourceRef?: string
  sourcePath?: string
  repoUrl?: string
  docsUrl?: string
  official: boolean
  resolver: SkillResolverKind
  scriptsIncluded: boolean
}

export interface ModuleSkillPreview {
  meta: ModuleSkillPreviewMeta
  paths: string[]
  files: Record<string, string>
  sourceDir: string
  at: number
}

interface CachedPreview {
  preview: ModuleSkillPreview | null
  at: number
}

const cache = new Map<string, CachedPreview>()
const packageMetadataCache = new Map<string, { data: PackageMetadata | null, at: number }>()

interface PackageMetadataHints {
  docsUrl?: string
  repoUrl?: string
}

interface PackageMetadata {
  name?: string
  packageName?: string
  version?: string
  description?: string
  repository?: unknown
  homepage?: unknown
  docs?: unknown
  documentation?: unknown
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readUrlValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(readUrlValues)
  }

  if (typeof value === 'string') {
    return [value]
  }

  if (value && typeof value === 'object' && 'url' in value) {
    const url = (value as { url?: unknown }).url
    return typeof url === 'string' ? [url] : []
  }

  return []
}

function readRepositoryUrl(repository: unknown): string | undefined {
  return readUrlValues(repository)[0]
}

function dedupe(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

async function readInstalledPackageMetadata(packageName: string): Promise<PackageMetadata | null> {
  for (const root of [docsRoot, projectRoot]) {
    try {
      const packageJsonPath = await resolvePackageJSON(packageName, { url: root })
      return await readPackageJSON(packageJsonPath) as PackageMetadata
    }
    catch {
      continue
    }
  }

  return null
}

async function fetchRegistryPackageMetadata(packageName: string): Promise<PackageMetadata | null> {
  try {
    return await $fetch<PackageMetadata>(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`, {
      timeout: 1500,
    })
  }
  catch {
    return null
  }
}

async function readPackageMetadata(packageName: string): Promise<PackageMetadata | null> {
  const cached = packageMetadataCache.get(packageName)
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return cached.data
  }

  const data = await readInstalledPackageMetadata(packageName) || await fetchRegistryPackageMetadata(packageName)
  packageMetadataCache.set(packageName, { data, at: Date.now() })
  return data
}

function createCacheKey(pkg: InstalledPackageInfo) {
  return JSON.stringify([
    pkg.packageName,
    pkg.version || '',
    pkg.repository || '',
    pkg.homepage || '',
    ...(pkg.docsUrls || []),
  ])
}

function toSourceHrefBase(contribution: ResolvedContribution): string | undefined {
  if (contribution.sourceKind === 'github' && contribution.sourceRepo && contribution.sourceRef && contribution.sourcePath) {
    return `https://github.com/${contribution.sourceRepo}/blob/${contribution.sourceRef}/${contribution.sourcePath}`
  }

  if (contribution.sourceKind === 'wellKnown' && contribution.resolver === 'wellKnownSkills' && contribution.docsUrl) {
    return new URL(`/.well-known/skills/${contribution.skillName}`, contribution.docsUrl).toString().replace(/\/$/, '')
  }
}

export async function resolvePackageInfo(
  packageName: string,
  hints: PackageMetadataHints = {},
): Promise<InstalledPackageInfo | null> {
  const metadata = await readPackageMetadata(packageName)
  const docsUrls = dedupe([
    ...readUrlValues(metadata?.docs),
    ...readUrlValues(metadata?.documentation),
    ...readUrlValues(metadata?.homepage),
    hints.docsUrl,
  ])
  const repository = readRepositoryUrl(metadata?.repository) || hints.repoUrl

  if (!metadata && !repository && !docsUrls.length) {
    return null
  }

  return {
    packageName: readString(metadata?.packageName) || readString(metadata?.name) || packageName,
    version: readString(metadata?.version),
    description: readString(metadata?.description),
    repository,
    homepage: docsUrls[0],
    docsUrls,
  }
}

async function collectSkillFiles(
  sourceDir: string,
  currentDir = sourceDir,
): Promise<{ paths: string[], scriptsIncluded: boolean }> {
  const entries = await fsp.readdir(currentDir, { withFileTypes: true })
  const paths: string[] = []
  let scriptsIncluded = false

  for (const entry of entries) {
    const absolutePath = join(currentDir, entry.name)
    const relativePath = relative(sourceDir, absolutePath)

    if (!relativePath || relativePath.split('/').includes('..')) {
      continue
    }

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        scriptsIncluded ||= entry.name === 'scripts'
        continue
      }

      const nested = await collectSkillFiles(sourceDir, absolutePath)
      paths.push(...nested.paths)
      scriptsIncluded ||= nested.scriptsIncluded
      continue
    }

    if (relativePath.endsWith('.md') || relativePath.endsWith('.json')) {
      paths.push(relativePath)
    }
  }

  return {
    paths: paths.sort((a, b) => a.localeCompare(b)),
    scriptsIncluded,
  }
}

function toPreviewMeta(contribution: ResolvedContribution, scriptsIncluded: boolean): ModuleSkillPreviewMeta {
  return {
    packageName: contribution.packageName,
    version: contribution.version,
    skillName: contribution.skillName,
    description: contribution.description,
    sourceKind: contribution.sourceKind,
    sourceHrefBase: toSourceHrefBase(contribution),
    sourceRepo: contribution.sourceRepo,
    sourceRef: contribution.sourceRef,
    sourcePath: contribution.sourcePath,
    repoUrl: contribution.repoUrl,
    docsUrl: contribution.docsUrl,
    official: contribution.official,
    resolver: contribution.resolver,
    scriptsIncluded,
  }
}

function selectPreviewContribution(pkg: InstalledPackageInfo, contributions: ResolvedContribution[]): ResolvedContribution | undefined {
  const candidates = new Set(slugCandidates(pkg.packageName))
  return contributions.find(contribution => candidates.has(contribution.skillName)) || contributions[0]
}

export async function resolveModuleSkillPreview(pkg: InstalledPackageInfo): Promise<ModuleSkillPreview | null> {
  const cacheKey = createCacheKey(pkg)
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return cached.preview
  }

  const resolved = await resolveRemoteContributionsForPackage(pkg, {
    cacheRoot,
    githubLookupTimeoutMs: 1500,
    enableGithubLookup: true,
  })
  const validated = await validateResolvedContributions(resolved.contributions)
  const contribution = selectPreviewContribution(pkg, validated.contributions)

  if (!contribution) {
    cache.set(cacheKey, { preview: null, at: Date.now() })
    return null
  }

  const { paths, scriptsIncluded } = await collectSkillFiles(contribution.sourceDir)
  const preview: ModuleSkillPreview = {
    meta: toPreviewMeta(contribution, scriptsIncluded),
    paths,
    files: {},
    sourceDir: contribution.sourceDir,
    at: Date.now(),
  }

  cache.set(cacheKey, { preview, at: preview.at })
  return preview
}

export async function readModuleSkillPreviewFile(
  pkg: InstalledPackageInfo,
  filePath: string,
): Promise<{ preview: ModuleSkillPreview | null, content: string | null }> {
  const preview = await resolveModuleSkillPreview(pkg)
  if (!preview || !preview.paths.includes(filePath)) {
    return { preview, content: null }
  }

  if (preview.files[filePath]) {
    return { preview, content: preview.files[filePath] }
  }

  const content = await fsp.readFile(join(preview.sourceDir, filePath), 'utf8')
  preview.files[filePath] = content
  preview.at = Date.now()
  cache.set(createCacheKey(pkg), { preview, at: preview.at })

  return { preview, content }
}
