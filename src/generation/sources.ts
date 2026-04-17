import { createHash } from 'node:crypto'
import { promises as fsp } from 'node:fs'
import { glob } from 'tinyglobby'
import { isAbsolute, join, relative, resolve } from 'pathe'
import {
  mapWithConcurrency,
  normalizeContribution,
  sortAndDedupeContributions,
  type PackageSkillDiscovery,
} from '../internal'
import type {
  ResolvedContribution,
  SkillHubContribution,
} from '../types'

const HASH_READ_CONCURRENCY = 16

interface HashEntry {
  kind: 'symlink' | 'dir' | 'file' | 'other'
  relativePath: string
  payload?: Buffer | string
  mode?: number
}

export interface LocalSourceFingerprint {
  packageName: string
  skillName: string
  sourceDir: string
  sourceRoot: string
  sourceKind: ResolvedContribution['sourceKind']
  forceIncludeScripts: boolean
  hash: string | null
}

export async function resolveManualContribution(rootDir: string, contribution: SkillHubContribution): Promise<ResolvedContribution> {
  const sourceDir = isAbsolute(contribution.sourceDir)
    ? contribution.sourceDir
    : resolve(rootDir, contribution.sourceDir)

  return normalizeContribution(contribution, sourceDir, sourceDir)
}

export function collectWorkspaceDiscoverySources(_rootDir: string, discoveries: PackageSkillDiscovery[]): ResolvedContribution[] {
  const contributions: ResolvedContribution[] = []

  for (const discovery of discoveries) {
    if (!isLocalDiscoveryRoot(discovery.packageRoot)) {
      continue
    }

    for (const skill of discovery.skills) {
      const sourceDir = resolve(discovery.packageRoot, skill.path)
      contributions.push(normalizeContribution({
        packageName: discovery.packageName,
        version: discovery.version,
        sourceDir,
        skillName: skill.name,
      }, sourceDir, discovery.packageRoot))
    }
  }

  return sortAndDedupeContributions(contributions)
}

function isLocalDiscoveryRoot(packageRoot: string): boolean {
  const normalizedRoot = resolve(packageRoot).replaceAll('\\', '/')
  return !/(?:^|\/)node_modules(?:\/|$)/.test(normalizedRoot)
}

export async function createLocalSourceFingerprints(contributions: ResolvedContribution[]): Promise<LocalSourceFingerprint[]> {
  const fingerprints = await Promise.all(contributions.map(async contribution => ({
    packageName: contribution.packageName,
    skillName: contribution.skillName,
    sourceDir: resolve(contribution.sourceDir).replaceAll('\\', '/'),
    sourceRoot: resolve(contribution.sourceRoot).replaceAll('\\', '/'),
    sourceKind: contribution.sourceKind,
    forceIncludeScripts: contribution.forceIncludeScripts,
    hash: await hashDirectoryTreeIfExists(contribution.sourceDir),
  })))

  return fingerprints.sort((a, b) => {
    const left = `${a.packageName}::${a.skillName}::${a.sourceDir}`
    const right = `${b.packageName}::${b.skillName}::${b.sourceDir}`
    return left.localeCompare(right)
  })
}

async function hashDirectoryTreeIfExists(rootPath: string): Promise<string | null> {
  let rootStat
  try {
    rootStat = await fsp.lstat(rootPath)
  }
  catch {
    return null
  }

  if (!rootStat.isDirectory()) {
    return null
  }

  const entries = await glob('**/*', {
    cwd: rootPath,
    dot: true,
    expandDirectories: false,
    followSymbolicLinks: false,
    onlyFiles: false,
  })

  entries.sort((a, b) => a.localeCompare(b))

  const hashEntries = await mapWithConcurrency(entries, HASH_READ_CONCURRENCY, async (entry): Promise<HashEntry> => {
    const currentPath = join(rootPath, entry)
    const stat = await fsp.lstat(currentPath)
    const relativePath = relative(rootPath, currentPath).replaceAll('\\', '/')

    if (stat.isSymbolicLink()) {
      return { kind: 'symlink', relativePath, payload: await fsp.readlink(currentPath) }
    }
    if (stat.isDirectory()) {
      return { kind: 'dir', relativePath }
    }
    if (stat.isFile()) {
      return { kind: 'file', relativePath, payload: await fsp.readFile(currentPath) }
    }
    return { kind: 'other', relativePath, mode: stat.mode }
  })

  const hash = createHash('sha256')
  hash.update('dir:.\n')

  for (const entry of hashEntries) {
    switch (entry.kind) {
      case 'symlink':
        hash.update(`symlink:${entry.relativePath}:`)
        hash.update(entry.payload!)
        hash.update('\n')
        break
      case 'dir':
        hash.update(`dir:${entry.relativePath}\n`)
        break
      case 'file':
        hash.update(`file:${entry.relativePath}:`)
        hash.update(entry.payload!)
        hash.update('\n')
        break
      default:
        hash.update(`other:${entry.relativePath}:${entry.mode}\n`)
    }
  }

  return hash.digest('hex')
}
