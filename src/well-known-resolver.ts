import { createHash } from 'node:crypto'
import { promises as fsp } from 'node:fs'
import { dirname, join } from 'pathe'
import { findPackageOverride } from './package-overrides'
import { fetchUrlBytes, fetchUrlJson, parseGitHubRepo } from './remote-fetch'
import { emptyDir, ensureDir, isValidSkillName, normalizeContribution, sanitizeSegment } from './internal'
import type { InstalledPackageInfo, RemoteResolveResult } from './remote-resolver'
import type { ResolvedContribution, SkillManifestSkipped, ValidationIssue } from './types'

const RFC_SCHEMA = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json'

interface LegacySkillEntry {
  name?: unknown
  description?: unknown
  files?: unknown
}

interface LegacyIndex {
  $schema?: unknown
  skills?: unknown
}

interface RfcSkillEntry {
  name?: unknown
  type?: unknown
  description?: unknown
  url?: unknown
  digest?: unknown
}

interface RfcIndex {
  $schema?: unknown
  skills?: unknown
}

interface MaterializedSkill {
  contribution?: ResolvedContribution
  skipped?: SkillManifestSkipped
}

function makeSkip(packageName: string, skillName: string, reason: string): SkillManifestSkipped {
  return {
    packageName,
    skillName,
    reason,
    sourceKind: 'wellKnown',
  }
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

function isDocsDiscoveryBase(url: string): boolean {
  const parsed = new URL(url)
  if (parsed.hostname === 'github.com' || parseGitHubRepo(url)) {
    return false
  }

  return true
}

function docsBaseCandidates(packageInfo: InstalledPackageInfo): string[] {
  const override = findPackageOverride(packageInfo.packageName)
  const candidates = [
    ...(override?.docsUrls || []),
    packageInfo.homepage || '',
  ]

  return [...new Set(candidates
    .map(normalizeHttpUrl)
    .filter((url): url is string => Boolean(url))
    .filter(isDocsDiscoveryBase))]
}

function isSafeRelativeFilePath(path: string): boolean {
  if (!path || path.includes('\0') || path.includes('\\') || path.startsWith('/')) {
    return false
  }

  const parts = path.split('/')
  return parts.every(part => part && part !== '.' && part !== '..')
}

function encodeRelativePath(path: string): string {
  return path.split('/').map(part => encodeURIComponent(part)).join('/')
}

function normalizeDigest(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return /^sha256:[a-f0-9]{64}$/.test(trimmed) ? trimmed : null
}

function sha256(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`
}

async function writeSkillFile(root: string, relativePath: string, bytes: Uint8Array): Promise<void> {
  const destination = join(root, relativePath)
  await ensureDir(dirname(destination))
  await fsp.writeFile(destination, bytes)
}

function contributionFor(input: {
  packageInfo: InstalledPackageInfo
  targetDir: string
  skillName: string
  description?: string
  docsUrl: string
  resolver: 'wellKnownRfc' | 'wellKnownLegacy'
  indexUrl: string
}): ResolvedContribution {
  const sourceRepo = parseGitHubRepo(input.packageInfo.repository)

  return normalizeContribution({
    packageName: input.packageInfo.packageName,
    version: input.packageInfo.version,
    sourceDir: input.targetDir,
    skillName: input.skillName,
    description: input.description,
    sourceKind: 'wellKnown',
    sourceRepo: sourceRepo || undefined,
    sourcePath: input.indexUrl,
    repoUrl: sourceRepo ? `https://github.com/${sourceRepo}` : undefined,
    docsUrl: input.docsUrl,
    official: true,
    resolver: input.resolver,
    forceIncludeScripts: true,
  }, input.targetDir, join(input.targetDir, '..'))
}

async function materializeLegacySkill(input: {
  packageInfo: InstalledPackageInfo
  entry: LegacySkillEntry
  indexUrl: string
  docsUrl: string
  cacheRoot: string
  timeoutMs: number
}): Promise<MaterializedSkill | null> {
  const skillName = typeof input.entry.name === 'string' ? input.entry.name.trim() : ''
  if (!isValidSkillName(skillName)) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName || 'entry', 'legacy well-known skill name is invalid') }
  }

  const description = typeof input.entry.description === 'string' ? input.entry.description.trim() : ''
  if (!description) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'legacy well-known skill is missing a description') }
  }

  if (!Array.isArray(input.entry.files) || !input.entry.files.every(file => typeof file === 'string')) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'legacy well-known skill files must be a string array') }
  }

  const files = input.entry.files.map(file => file.trim())
  if (!files.includes('SKILL.md')) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'legacy well-known skill must include SKILL.md') }
  }

  const unsafePath = files.find(file => !isSafeRelativeFilePath(file))
  if (unsafePath) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, `legacy well-known skill contains unsafe file path "${unsafePath}"`) }
  }

  const origin = new URL(input.docsUrl).origin
  const targetDir = join(
    input.cacheRoot,
    'well-known',
    'legacy',
    sanitizeSegment(origin),
    sanitizeSegment(input.packageInfo.packageName),
    sanitizeSegment(input.packageInfo.version || 'unknown'),
    sanitizeSegment(skillName),
  )

  await emptyDir(targetDir)

  for (const file of files) {
    const fileUrl = new URL(`${encodeURIComponent(skillName)}/${encodeRelativePath(file)}`, input.indexUrl).toString()
    const response = await fetchUrlBytes(fileUrl, input.timeoutMs)
    if (!response.ok || !response.data) {
      return { skipped: makeSkip(input.packageInfo.packageName, skillName, `failed to fetch legacy well-known skill file "${file}"`) }
    }
    await writeSkillFile(targetDir, file, response.data)
  }

  return {
    contribution: contributionFor({
      packageInfo: input.packageInfo,
      targetDir,
      skillName,
      description,
      docsUrl: input.docsUrl,
      resolver: 'wellKnownLegacy',
      indexUrl: input.indexUrl,
    }),
  }
}

async function resolveLegacyIndex(input: {
  packageInfo: InstalledPackageInfo
  index: LegacyIndex
  indexUrl: string
  docsUrl: string
  cacheRoot: string
  timeoutMs: number
}): Promise<RemoteResolveResult> {
  const skipped: SkillManifestSkipped[] = []
  const contributions: ResolvedContribution[] = []

  if (!Array.isArray(input.index.skills)) {
    return {
      contributions: [],
      issues: [],
      skipped: [makeSkip(input.packageInfo.packageName, input.packageInfo.packageName, 'legacy well-known index is missing a skills array')],
    }
  }

  for (const rawEntry of input.index.skills) {
    if (!rawEntry || typeof rawEntry !== 'object') {
      skipped.push(makeSkip(input.packageInfo.packageName, 'entry', 'legacy well-known skill entry must be an object'))
      continue
    }

    const materialized = await materializeLegacySkill({
      packageInfo: input.packageInfo,
      entry: rawEntry as LegacySkillEntry,
      indexUrl: input.indexUrl,
      docsUrl: input.docsUrl,
      cacheRoot: input.cacheRoot,
      timeoutMs: input.timeoutMs,
    })

    if (materialized?.contribution) {
      contributions.push(materialized.contribution)
    }
    if (materialized?.skipped) {
      skipped.push(materialized.skipped)
    }
  }

  return { contributions, issues: [], skipped }
}

async function materializeRfcSkill(input: {
  packageInfo: InstalledPackageInfo
  entry: RfcSkillEntry
  indexUrl: string
  docsUrl: string
  cacheRoot: string
  timeoutMs: number
}): Promise<MaterializedSkill | null> {
  const skillName = typeof input.entry.name === 'string' ? input.entry.name.trim() : ''
  if (!isValidSkillName(skillName)) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName || 'entry', 'RFC well-known skill name is invalid') }
  }

  const description = typeof input.entry.description === 'string' ? input.entry.description.trim() : ''
  if (!description) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'RFC well-known skill is missing a description') }
  }

  const type = typeof input.entry.type === 'string' ? input.entry.type.trim() : ''
  if (type === 'archive') {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'archive artifacts are not supported yet') }
  }
  if (type !== 'skill-md') {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, `unsupported RFC well-known skill type "${type || 'unknown'}"`) }
  }

  if (typeof input.entry.url !== 'string' || !input.entry.url.trim()) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'RFC well-known skill is missing a URL') }
  }

  const digest = normalizeDigest(input.entry.digest)
  if (!digest) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'RFC well-known skill is missing a valid sha256 digest') }
  }

  const skillUrl = new URL(input.entry.url, input.indexUrl).toString()
  const response = await fetchUrlBytes(skillUrl, input.timeoutMs)
  if (!response.ok || !response.data) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'failed to fetch RFC well-known skill artifact') }
  }

  if (sha256(response.data) !== digest) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'RFC well-known skill digest mismatch') }
  }

  const origin = new URL(input.docsUrl).origin
  const targetDir = join(
    input.cacheRoot,
    'well-known',
    'rfc',
    sanitizeSegment(origin),
    sanitizeSegment(input.packageInfo.packageName),
    sanitizeSegment(input.packageInfo.version || 'unknown'),
    sanitizeSegment(skillName),
  )

  await emptyDir(targetDir)
  await writeSkillFile(targetDir, 'SKILL.md', response.data)

  return {
    contribution: contributionFor({
      packageInfo: input.packageInfo,
      targetDir,
      skillName,
      description,
      docsUrl: input.docsUrl,
      resolver: 'wellKnownRfc',
      indexUrl: input.indexUrl,
    }),
  }
}

async function resolveRfcIndex(input: {
  packageInfo: InstalledPackageInfo
  index: RfcIndex
  indexUrl: string
  docsUrl: string
  cacheRoot: string
  timeoutMs: number
}): Promise<RemoteResolveResult> {
  const skipped: SkillManifestSkipped[] = []
  const contributions: ResolvedContribution[] = []

  if (!Array.isArray(input.index.skills)) {
    return {
      contributions: [],
      issues: [],
      skipped: [makeSkip(input.packageInfo.packageName, input.packageInfo.packageName, 'RFC well-known index is missing a skills array')],
    }
  }

  for (const rawEntry of input.index.skills) {
    if (!rawEntry || typeof rawEntry !== 'object') {
      skipped.push(makeSkip(input.packageInfo.packageName, 'entry', 'RFC well-known skill entry must be an object'))
      continue
    }

    const materialized = await materializeRfcSkill({
      packageInfo: input.packageInfo,
      entry: rawEntry as RfcSkillEntry,
      indexUrl: input.indexUrl,
      docsUrl: input.docsUrl,
      cacheRoot: input.cacheRoot,
      timeoutMs: input.timeoutMs,
    })

    if (materialized?.contribution) {
      contributions.push(materialized.contribution)
    }
    if (materialized?.skipped) {
      skipped.push(materialized.skipped)
    }
  }

  return { contributions, issues: [], skipped }
}

async function resolveIndex(input: {
  packageInfo: InstalledPackageInfo
  indexUrl: string
  docsUrl: string
  cacheRoot: string
  timeoutMs: number
}): Promise<RemoteResolveResult | null> {
  const response = await fetchUrlJson<LegacyIndex | RfcIndex>(input.indexUrl, input.timeoutMs)
  if (!response.ok) {
    if (response.status === 404) {
      return null
    }

    return {
      contributions: [],
      issues: [],
      skipped: [makeSkip(input.packageInfo.packageName, input.packageInfo.packageName, `failed to fetch well-known index ${input.indexUrl}`)],
    }
  }

  const index = response.data
  if (!index || typeof index !== 'object') {
    return {
      contributions: [],
      issues: [],
      skipped: [makeSkip(input.packageInfo.packageName, input.packageInfo.packageName, 'well-known index must be an object')],
    }
  }

  if (index.$schema === RFC_SCHEMA) {
    return await resolveRfcIndex({
      ...input,
      index,
    })
  }

  if (typeof index.$schema === 'string' && index.$schema) {
    return {
      contributions: [],
      issues: [],
      skipped: [makeSkip(input.packageInfo.packageName, input.packageInfo.packageName, `unsupported well-known schema "${index.$schema}"`)],
    }
  }

  return await resolveLegacyIndex({
    ...input,
    index,
  })
}

export async function resolveViaWellKnown(
  packageInfo: InstalledPackageInfo,
  cacheRoot: string,
  timeoutMs: number,
): Promise<RemoteResolveResult> {
  const bases = docsBaseCandidates(packageInfo)
  const skipped: SkillManifestSkipped[] = []
  const issues: ValidationIssue[] = []

  for (const docsUrl of bases) {
    for (const path of ['/.well-known/agent-skills/index.json', '/.well-known/skills/index.json']) {
      const indexUrl = new URL(path, docsUrl).toString()
      const result = await resolveIndex({
        packageInfo,
        indexUrl,
        docsUrl,
        cacheRoot,
        timeoutMs,
      })

      if (!result) {
        continue
      }

      issues.push(...result.issues)
      skipped.push(...result.skipped)

      if (result.contributions.length) {
        return {
          contributions: result.contributions,
          issues,
          skipped,
        }
      }
    }
  }

  if (!bases.length) {
    return {
      contributions: [],
      issues: [],
      skipped: [],
    }
  }

  return {
    contributions: [],
    issues,
    skipped,
  }
}
