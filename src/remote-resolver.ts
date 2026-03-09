import { join } from 'pathe'
import { FALLBACK_REF, FALLBACK_REPO, findFallbackMapEntry } from './fallback-map'
import { findGitHubOverride } from './github-overrides'
import { downloadGitHubDirectory, fetchGitHubDefaultBranch, fetchGitHubFileText, parseGitHubRepo } from './remote-fetch'
import type { ResolvedContribution, SkillManifestSkipped, SkillSourceKind, ValidationIssue } from './types'
import { createValidationIssue, normalizeContribution, pathExists, sanitizeSegment } from './internal'

export interface InstalledPackageInfo {
  packageName: string
  version?: string
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
  resolver: 'agentsField' | 'githubHeuristic' | 'mapEntry'
}

function makeSkip(packageName: string, skillName: string, reason: string, sourceKind?: SkillSourceKind): SkillManifestSkipped {
  return {
    packageName,
    skillName,
    reason,
    sourceKind,
  }
}

function slugCandidates(packageName: string): string[] {
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
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    if (!value || seen.has(value)) {
      continue
    }
    seen.add(value)
    output.push(value)
  }
  return output
}

async function materializeCandidate(
  packageInfo: InstalledPackageInfo,
  candidate: RemoteSkillCandidate,
  cacheRoot: string,
  timeoutMs: number,
): Promise<ResolvedContribution | null> {
  const targetDir = join(
    cacheRoot,
    candidate.sourceKind,
    sanitizeSegment(candidate.sourceRepo),
    sanitizeSegment(candidate.sourceRef),
    sanitizeSegment(packageInfo.packageName),
    sanitizeSegment(candidate.skillName),
  )

  const downloaded = await downloadGitHubDirectory(
    candidate.sourceRepo,
    candidate.sourceRef,
    candidate.sourcePath,
    targetDir,
    timeoutMs,
  )

  if (!downloaded.ok) {
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

function parseRemoteAgentsSkills(pkg: unknown): Array<{ name: string, path: string }> {
  const raw = pkg && typeof pkg === 'object'
    ? (pkg as { agents?: { skills?: unknown } }).agents?.skills
    : undefined

  if (!Array.isArray(raw)) {
    return []
  }

  const entries: Array<{ name: string, path: string }> = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue
    }
    const name = typeof entry.name === 'string' ? entry.name.trim() : ''
    const path = typeof entry.path === 'string' ? entry.path.trim() : ''
    if (!name || !path) {
      continue
    }
    entries.push({ name, path })
  }

  return entries
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
        const remoteSkills = parseRemoteAgentsSkills(parsed)
        for (const skill of remoteSkills) {
          const resolved = await materializeCandidate(packageInfo, {
            skillName: skill.name,
            sourcePath: skill.path,
            sourceKind: 'github',
            sourceRepo: repo,
            sourceRef: ref,
            official: true,
            resolver: 'agentsField',
          }, cacheRoot, timeoutMs)
          if (resolved) {
            return { contributions: [resolved], issues, skipped }
          }
        }
      }
      catch {
        issues.push(createValidationIssue(packageInfo.packageName, packageInfo.packageName, 'Failed to parse remote package.json', 'github'))
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
      }, cacheRoot, timeoutMs)

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

async function resolveViaFallbackMap(
  packageInfo: InstalledPackageInfo,
  cacheRoot: string,
  timeoutMs: number,
): Promise<RemoteResolveResult> {
  const entry = findFallbackMapEntry(packageInfo.packageName)
  if (!entry) {
    return {
      contributions: [],
      issues: [],
      skipped: [],
    }
  }

  const resolved = await materializeCandidate(packageInfo, {
    skillName: entry.skillName,
    sourcePath: entry.path,
    sourceKind: 'fallbackMap',
    sourceRepo: FALLBACK_REPO,
    sourceRef: FALLBACK_REF,
    official: false,
    resolver: 'mapEntry',
  }, cacheRoot, timeoutMs)

  if (resolved) {
    return {
      contributions: [resolved],
      issues: [],
      skipped: [],
    }
  }

  return {
    contributions: [],
    issues: [],
    skipped: [makeSkip(packageInfo.packageName, entry.skillName, 'Fallback map skill path could not be downloaded', 'fallbackMap')],
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

  const fallbackResult = await resolveViaFallbackMap(
    packageInfo,
    options.cacheRoot,
    options.githubLookupTimeoutMs,
  )

  if (fallbackResult.contributions.length) {
    return {
      contributions: fallbackResult.contributions,
      issues: [...githubResult.issues, ...fallbackResult.issues],
      skipped: fallbackResult.skipped,
    }
  }

  return {
    contributions: [],
    issues: [...githubResult.issues, ...fallbackResult.issues],
    skipped: [...githubResult.skipped, ...fallbackResult.skipped],
  }
}
