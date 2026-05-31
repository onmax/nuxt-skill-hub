import { createHash } from 'node:crypto'
import { promises as fsp } from 'node:fs'
import { isIP } from 'node:net'
import { dirname, join } from 'pathe'
import { findPackageOverride } from './package-overrides'
import { fetchUrlBytes, fetchUrlJson, parseGitHubRepo } from './remote-fetch'
import { emptyDir, ensureDir, isValidSkillName, normalizeContribution, sanitizeSegment } from './internal'
import type { InstalledPackageInfo, RemoteResolveResult } from './remote-resolver'
import type { ResolvedContribution, SkillManifestSkipped, ValidationIssue } from './types'

const WELL_KNOWN_DISCOVERY_V2_SCHEMA = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json'
const WELL_KNOWN_DISCOVERY_V2_INDEX_PATH = '/.well-known/agent-skills/index.json'
const WELL_KNOWN_SKILLS_INDEX_PATH = '/.well-known/skills/index.json'

interface WellKnownV2SkillEntry {
  name?: unknown
  type?: unknown
  description?: unknown
  url?: unknown
  digest?: unknown
}

interface WellKnownV2Index {
  $schema?: unknown
  skills?: unknown
}

interface WellKnownSkillsEntry {
  name?: unknown
  description?: unknown
  files?: unknown
}

interface WellKnownSkillsIndex {
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

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[|\]$/g, '')
}

function parseIpv4(hostname: string): [number, number, number, number] | null {
  const parts = hostname.split('.')
  if (parts.length !== 4) {
    return null
  }

  const octets = parts.map((part) => {
    if (!/^\d+$/.test(part)) {
      return Number.NaN
    }

    return Number(part)
  })

  if (octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null
  }

  return octets as [number, number, number, number]
}

function isPrivateIpv4(hostname: string): boolean {
  const octets = parseIpv4(normalizeHostname(hostname))
  if (!octets) {
    return false
  }

  const [a, b] = octets
  return a === 0
    || a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a >= 224 && a <= 239)
    || a >= 240
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = normalizeHostname(hostname)
  return normalized === '::'
    || normalized === '::1'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe8')
    || normalized.startsWith('fe9')
    || normalized.startsWith('fea')
    || normalized.startsWith('feb')
}

function isUnsafeHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname)

  if (normalized === 'localhost' || normalized.endsWith('.localhost')) {
    return true
  }

  const ipVersion = isIP(normalized)
  if (ipVersion === 4) {
    return isPrivateIpv4(normalized)
  }
  if (ipVersion === 6) {
    return isPrivateIpv6(normalized)
  }

  return false
}

function isPublicDiscoveryBase(url: string): boolean {
  try {
    const parsed = new URL(url)
    if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
      || parsed.hostname === 'github.com'
      || parseGitHubRepo(url)
      || isUnsafeHostname(parsed.hostname)) {
      return false
    }

    return true
  }
  catch {
    return false
  }
}

function isSameOriginUrl(url: string, baseUrl: string): boolean {
  return new URL(url).origin === new URL(baseUrl).origin
}

function resolveSameOriginUrl(rawUrl: string, baseUrl: string): string | null {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return null
  }

  try {
    const resolved = new URL(trimmed, baseUrl)
    if (!isSameOriginUrl(resolved.toString(), baseUrl) || isUnsafeHostname(resolved.hostname)) {
      return null
    }

    return resolved.toString()
  }
  catch {
    return null
  }
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
    .filter(isPublicDiscoveryBase))]
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

function normalizeSkillFilePath(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim().replaceAll('\\', '/')
  if (!trimmed || trimmed.startsWith('/') || trimmed.includes('\0')) {
    return null
  }

  const segments = trimmed.split('/')
  if (segments.some(segment => !segment || segment === '.' || segment === '..')) {
    return null
  }

  return trimmed
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
  resolver: 'wellKnownV2' | 'wellKnownSkills'
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

async function materializeSkillsIndexEntry(input: {
  packageInfo: InstalledPackageInfo
  entry: WellKnownSkillsEntry
  indexUrl: string
  docsUrl: string
  cacheRoot: string
  timeoutMs: number
}): Promise<MaterializedSkill | null> {
  const skillName = typeof input.entry.name === 'string' ? input.entry.name.trim() : ''
  if (!isValidSkillName(skillName)) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName || 'entry', 'well-known skill name is invalid') }
  }

  const description = typeof input.entry.description === 'string' ? input.entry.description.trim() : ''
  if (!description) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'well-known skill is missing a description') }
  }

  if (!Array.isArray(input.entry.files)) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'well-known skill is missing a files array') }
  }

  const files = [...new Set(input.entry.files.map(normalizeSkillFilePath).filter((file): file is string => Boolean(file)))]
  if (!files.includes('SKILL.md')) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'well-known skill must list SKILL.md') }
  }

  if (files.length !== input.entry.files.length) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'well-known skill includes an unsafe file path') }
  }

  const origin = new URL(input.docsUrl).origin
  const targetDir = join(
    input.cacheRoot,
    'well-known',
    'skills',
    sanitizeSegment(origin),
    sanitizeSegment(input.packageInfo.packageName),
    sanitizeSegment(input.packageInfo.version || 'unknown'),
    sanitizeSegment(skillName),
  )

  await emptyDir(targetDir)

  for (const file of files) {
    const fileUrl = resolveSameOriginUrl(`${skillName}/${file}`, new URL('./', input.indexUrl).toString())
    if (!fileUrl) {
      return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'well-known skill file URL must stay on the discovery origin') }
    }

    const response = await fetchUrlBytes(fileUrl, input.timeoutMs)
    if (!response.ok || !response.data) {
      return { skipped: makeSkip(input.packageInfo.packageName, skillName, `failed to fetch well-known skill file ${file}`) }
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
      resolver: 'wellKnownSkills',
      indexUrl: input.indexUrl,
    }),
  }
}

async function materializeV2Skill(input: {
  packageInfo: InstalledPackageInfo
  entry: WellKnownV2SkillEntry
  indexUrl: string
  docsUrl: string
  cacheRoot: string
  timeoutMs: number
}): Promise<MaterializedSkill | null> {
  const skillName = typeof input.entry.name === 'string' ? input.entry.name.trim() : ''
  if (!isValidSkillName(skillName)) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName || 'entry', 'well-known v2 skill name is invalid') }
  }

  const description = typeof input.entry.description === 'string' ? input.entry.description.trim() : ''
  if (!description) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'well-known v2 skill is missing a description') }
  }

  const type = typeof input.entry.type === 'string' ? input.entry.type.trim() : ''
  if (type === 'archive') {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'archive artifacts are not supported yet') }
  }
  if (type !== 'skill-md') {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, `unsupported well-known v2 skill type "${type || 'unknown'}"`) }
  }

  if (typeof input.entry.url !== 'string' || !input.entry.url.trim()) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'well-known v2 skill is missing a URL') }
  }

  const digest = normalizeDigest(input.entry.digest)
  if (!digest) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'well-known v2 skill is missing a valid sha256 digest') }
  }

  const skillUrl = resolveSameOriginUrl(input.entry.url, input.indexUrl)
  if (!skillUrl) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'well-known v2 skill URL must stay on the discovery origin') }
  }

  const response = await fetchUrlBytes(skillUrl, input.timeoutMs)
  if (!response.ok || !response.data) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'failed to fetch well-known v2 skill artifact') }
  }

  if (sha256(response.data) !== digest) {
    return { skipped: makeSkip(input.packageInfo.packageName, skillName, 'well-known v2 skill digest mismatch') }
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
      resolver: 'wellKnownV2',
      indexUrl: input.indexUrl,
    }),
  }
}

async function resolveSkillsIndex(input: {
  packageInfo: InstalledPackageInfo
  index: WellKnownSkillsIndex
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
      skipped: [makeSkip(input.packageInfo.packageName, input.packageInfo.packageName, 'well-known skills index is missing a skills array')],
    }
  }

  for (const rawEntry of input.index.skills) {
    if (!rawEntry || typeof rawEntry !== 'object') {
      skipped.push(makeSkip(input.packageInfo.packageName, 'entry', 'well-known skill entry must be an object'))
      continue
    }

    const materialized = await materializeSkillsIndexEntry({
      packageInfo: input.packageInfo,
      entry: rawEntry as WellKnownSkillsEntry,
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

async function resolveV2Index(input: {
  packageInfo: InstalledPackageInfo
  index: WellKnownV2Index
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
      skipped: [makeSkip(input.packageInfo.packageName, input.packageInfo.packageName, 'well-known v2 index is missing a skills array')],
    }
  }

  for (const rawEntry of input.index.skills) {
    if (!rawEntry || typeof rawEntry !== 'object') {
      skipped.push(makeSkip(input.packageInfo.packageName, 'entry', 'well-known v2 skill entry must be an object'))
      continue
    }

    const materialized = await materializeV2Skill({
      packageInfo: input.packageInfo,
      entry: rawEntry as WellKnownV2SkillEntry,
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
  const response = await fetchUrlJson<WellKnownV2Index>(input.indexUrl, input.timeoutMs)
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

  if (index.$schema === WELL_KNOWN_DISCOVERY_V2_SCHEMA) {
    return await resolveV2Index({
      ...input,
      index,
    })
  }

  if (new URL(input.indexUrl).pathname === WELL_KNOWN_SKILLS_INDEX_PATH && !index.$schema) {
    return await resolveSkillsIndex({
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

  return {
    contributions: [],
    issues: [],
    skipped: [makeSkip(input.packageInfo.packageName, input.packageInfo.packageName, 'well-known index is missing the v2 schema')],
  }
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
    const indexUrls = [
      new URL(WELL_KNOWN_DISCOVERY_V2_INDEX_PATH, docsUrl).toString(),
      new URL(WELL_KNOWN_SKILLS_INDEX_PATH, docsUrl).toString(),
    ]

    for (const indexUrl of indexUrls) {
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
