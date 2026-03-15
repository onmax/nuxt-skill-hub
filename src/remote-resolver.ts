import { promises as fsp } from 'node:fs'
import { downloadTemplate } from 'giget'
import { dirname, join } from 'pathe'
import { findGitHubOverride } from './github-overrides'
import { fetchGitHubDefaultBranch, fetchGitHubFileText, listGitHubDirectory, parseGitHubRepo } from './remote-fetch'
import { createMetadataRouterSkillFiles, resolveMetadataRouterSkillName } from './render-content'
import type { ResolvedContribution, SkillManifestSkipped, SkillSourceKind, ValidationIssue } from './types'
import { createValidationIssue, ensureDir, normalizeContribution, parseAgentSkillDeclarations, pathExists, sanitizeSegment } from './internal'

export interface InstalledPackageInfo {
  packageName: string
  version?: string
  description?: string
  repository?: string
  homepage?: string
}

export interface RemoteResolveOptions {
  cacheRoot: string
  githubLookupTimeoutMs: number
  enableGithubLookup: boolean
}

export interface RemoteResolveResult {
  contributions: ResolvedContribution[]
  issues: ValidationIssue[]
  skipped: SkillManifestSkipped[]
}

interface RemoteSkillCandidate {
  skillName: string
  sourcePath: string
  sourceKind: SkillSourceKind
  sourceRepo: string
  sourceRef: string
  official: boolean
  resolver: 'agentsField' | 'githubHeuristic'
}

function makeSkip(packageName: string, skillName: string, reason: string, sourceKind?: SkillSourceKind): SkillManifestSkipped {
  return {
    packageName,
    skillName,
    reason,
    sourceKind,
  }
}

export function slugCandidates(packageName: string): string[] {
  const [scopeOrName, scopedName] = packageName.startsWith('@') ? packageName.split('/') : ['', packageName]
  const base = (scopedName || scopeOrName || '').trim()
  const candidates = new Set<string>()

  if (base) {
    candidates.add(base)
  }

  if (scopeOrName === '@nuxt' && base) {
    candidates.add(`nuxt-${base}`)
  }

  if (scopeOrName === '@nuxthub' && base === 'core') {
    candidates.add('nuxthub')
  }

  if (scopeOrName === '@vueuse' && base === 'core') {
    candidates.add('vueuse')
  }

  return Array.from(candidates)
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function normalizeHttpUrl(url: string | undefined): string | undefined {
  const trimmed = url?.trim()
  if (!trimmed) {
    return undefined
  }

  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.toString()
      : undefined
  }
  catch {
    return undefined
  }
}

function resolveRepositoryUrl(packageInfo: InstalledPackageInfo): { repoUrl?: string, sourceRepo?: string } {
  const sourceRepo = parseGitHubRepo(packageInfo.repository) || parseGitHubRepo(packageInfo.homepage)
  if (sourceRepo) {
    return {
      sourceRepo,
      repoUrl: `https://github.com/${sourceRepo}`,
    }
  }

  return {
    repoUrl: normalizeHttpUrl(packageInfo.repository),
  }
}

async function materializeCandidate(
  packageInfo: InstalledPackageInfo,
  candidate: RemoteSkillCandidate,
  cacheRoot: string,
): Promise<ResolvedContribution | null> {
  const targetDir = join(
    cacheRoot,
    candidate.sourceKind,
    sanitizeSegment(candidate.sourceRepo),
    sanitizeSegment(candidate.sourceRef),
    sanitizeSegment(packageInfo.packageName),
    sanitizeSegment(candidate.skillName),
  )

  try {
    await downloadTemplate(`gh:${candidate.sourceRepo}/${candidate.sourcePath}#${candidate.sourceRef}`, {
      dir: targetDir,
      force: true,
      forceClean: true,
      registry: false,
      silent: true,
    })
  }
  catch {
    return null
  }

  if (!(await pathExists(join(targetDir, 'SKILL.md')))) {
    return null
  }

  return normalizeContribution({
    packageName: packageInfo.packageName,
    version: packageInfo.version,
    sourceDir: targetDir,
    skillName: candidate.skillName,
    sourceKind: candidate.sourceKind,
    sourceRepo: candidate.sourceRepo,
    sourceRef: candidate.sourceRef,
    sourcePath: candidate.sourcePath,
    official: candidate.official,
    resolver: candidate.resolver,
    forceIncludeScripts: true,
  }, targetDir, join(targetDir, '..'))
}

async function resolveViaGitHub(
  packageInfo: InstalledPackageInfo,
  cacheRoot: string,
  timeoutMs: number,
): Promise<RemoteResolveResult> {
  const issues: ValidationIssue[] = []
  const skipped: SkillManifestSkipped[] = []
  const override = findGitHubOverride(packageInfo.packageName)
  const repo = override?.repo
    || parseGitHubRepo(packageInfo.repository)
    || parseGitHubRepo(packageInfo.homepage)

  if (!repo) {
    return {
      contributions: [],
      issues,
      skipped: [makeSkip(packageInfo.packageName, override?.skillName || packageInfo.packageName, 'No GitHub repository metadata found', 'github')],
    }
  }

  const refs = dedupe([
    override?.ref || '',
    packageInfo.version ? `v${packageInfo.version}` : '',
    packageInfo.version || '',
    await fetchGitHubDefaultBranch(repo, timeoutMs) || '',
    'main',
    'master',
  ])

  const candidates = dedupe([
    override?.skillName || '',
    ...slugCandidates(packageInfo.packageName),
  ])
  const pathCandidates = dedupe([
    override?.path || '',
    ...candidates.flatMap((skillName) => {
      return [
        `skills/${skillName}`,
        `.claude/skills/${skillName}`,
        `.github/skills/${skillName}`,
      ]
    }),
  ])

  for (const ref of refs) {
    const packageJson = await fetchGitHubFileText(repo, ref, 'package.json', timeoutMs)
    if (packageJson.ok && packageJson.data) {
      try {
        const parsed = JSON.parse(packageJson.data) as unknown
        const remoteSkills = parseAgentSkillDeclarations(parsed, packageInfo.packageName, 'github')
        issues.push(...remoteSkills.issues)

        for (const skill of remoteSkills.skills) {
          const resolved = await materializeCandidate(packageInfo, {
            skillName: skill.name,
            sourcePath: skill.path,
            sourceKind: 'github',
            sourceRepo: repo,
            sourceRef: ref,
            official: true,
            resolver: 'agentsField',
          }, cacheRoot)
          if (resolved) {
            return { contributions: [resolved], issues, skipped }
          }
        }
      }
      catch {
        issues.push(createValidationIssue(packageInfo.packageName, packageInfo.packageName, 'Failed to parse remote package.json', 'github'))
      }
    }

    // List skills/ directory at repo root to discover all skills
    const skillsDirs = await listGitHubDirectory(repo, ref, 'skills', timeoutMs)
    if (skillsDirs.length) {
      const contributions: ResolvedContribution[] = []
      for (const skillName of skillsDirs) {
        const resolved = await materializeCandidate(packageInfo, {
          skillName,
          sourcePath: `skills/${skillName}`,
          sourceKind: 'github',
          sourceRepo: repo,
          sourceRef: ref,
          official: true,
          resolver: 'githubHeuristic',
        }, cacheRoot)
        if (resolved) {
          contributions.push(resolved)
        }
      }
      if (contributions.length) {
        return { contributions, issues, skipped }
      }
    }

    for (const path of pathCandidates) {
      const candidateSkillName = override?.path && path === override.path
        ? (override.skillName || path.split('/').pop() || packageInfo.packageName)
        : path.split('/').pop() || packageInfo.packageName

      const resolved = await materializeCandidate(packageInfo, {
        skillName: candidateSkillName,
        sourcePath: path,
        sourceKind: 'github',
        sourceRepo: repo,
        sourceRef: ref,
        official: true,
        resolver: 'githubHeuristic',
      }, cacheRoot)

      if (resolved) {
        return { contributions: [resolved], issues, skipped }
      }
    }
  }

  skipped.push(makeSkip(packageInfo.packageName, override?.skillName || packageInfo.packageName, 'No GitHub skill found using configured refs and path heuristics', 'github'))
  return {
    contributions: [],
    issues,
    skipped,
  }
}

async function resolveViaMetadataRouter(
  packageInfo: InstalledPackageInfo,
  cacheRoot: string,
): Promise<RemoteResolveResult> {
  const { repoUrl, sourceRepo } = resolveRepositoryUrl(packageInfo)
  const docsUrl = normalizeHttpUrl(packageInfo.homepage)

  if (!repoUrl && !docsUrl) {
    return {
      contributions: [],
      issues: [],
      skipped: [makeSkip(packageInfo.packageName, packageInfo.packageName, 'No package metadata was available to generate a metadata-routed skill', 'generated')],
    }
  }

  const skillName = resolveMetadataRouterSkillName(packageInfo.packageName)
  const targetDir = join(
    cacheRoot,
    'generated',
    'metadata-router',
    sanitizeSegment(packageInfo.packageName),
    sanitizeSegment(skillName),
  )

  const files = createMetadataRouterSkillFiles({
    packageName: packageInfo.packageName,
    skillName,
    description: packageInfo.description,
    repoUrl,
    docsUrl,
  })

  for (const [relativePath, contents] of Object.entries(files)) {
    const destination = join(targetDir, relativePath)
    await ensureDir(dirname(destination))
    await fsp.writeFile(destination, contents, 'utf8')
  }

  return {
    contributions: [
      normalizeContribution({
        packageName: packageInfo.packageName,
        version: packageInfo.version,
        sourceDir: targetDir,
        skillName,
        description: packageInfo.description,
        sourceKind: 'generated',
        sourceRepo,
        repoUrl,
        docsUrl,
        official: true,
        resolver: 'metadataRouter',
        forceIncludeScripts: false,
      }, targetDir, join(targetDir, '..')),
    ],
    issues: [],
    skipped: [],
  }
}

export async function resolveRemoteContributionsForPackage(
  packageInfo: InstalledPackageInfo,
  options: RemoteResolveOptions,
): Promise<RemoteResolveResult> {
  const githubResult = options.enableGithubLookup
    ? await resolveViaGitHub(packageInfo, options.cacheRoot, options.githubLookupTimeoutMs)
    : {
        contributions: [],
        issues: [],
        skipped: [],
      }

  if (githubResult.contributions.length) {
    return githubResult
  }

  const generatedResult = await resolveViaMetadataRouter(packageInfo, options.cacheRoot)

  if (generatedResult.contributions.length) {
    return {
      contributions: generatedResult.contributions,
      issues: [...githubResult.issues, ...generatedResult.issues],
      skipped: generatedResult.skipped,
    }
  }

  return {
    contributions: [],
    issues: [...githubResult.issues, ...generatedResult.issues],
    skipped: [...githubResult.skipped, ...generatedResult.skipped],
  }
}
