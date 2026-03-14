import { promises as fsp } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'pathe'
import { validateResolvedContributions } from '../../../src/internal'
import { resolveRemoteContributionsForPackage, type InstalledPackageInfo } from '../../../src/remote-resolver'
import type { ResolvedContribution, SkillResolverKind, SkillSourceKind } from '../../../src/types'

const CACHE_TTL = 1000 * 60 * 60
const EXCLUDED_DIRS = new Set(['scripts', 'node_modules', '.git'])
const projectRoot = fileURLToPath(new URL('../../../', import.meta.url))
const cacheRoot = join(projectRoot, 'docs', '.nuxt', 'skill-hub-preview-cache')

export interface ModuleSkillPreviewMeta {
  packageName: string
  version?: string
  skillName: string
  description?: string
  sourceKind: SkillSourceKind
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

function createCacheKey(pkg: InstalledPackageInfo) {
  return JSON.stringify([
    pkg.packageName,
    pkg.version || '',
    pkg.repository || '',
    pkg.homepage || '',
  ])
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
  const contribution = validated.contributions[0]

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
