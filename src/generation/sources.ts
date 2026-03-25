import { createHash } from 'node:crypto'
import { promises as fsp } from 'node:fs'
import { glob } from 'tinyglobby'
import { isAbsolute, join, relative, resolve } from 'pathe'
import {
  normalizeContribution,
  pathExists,
  sortAndDedupeContributions,
  type PackageSkillDiscovery,
} from '../internal'
import type {
  ResolvedContribution,
  SkillHubContribution,
} from '../types'

export interface LocalSourceFingerprint {
  packageName: string
  skillName: string
  sourceDir: string
  sourceRoot: string
  sourceKind: ResolvedContribution['sourceKind']
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
    hash: await hashDirectoryTreeIfExists(contribution.sourceDir),
  })))

  return fingerprints.sort((a, b) => {
    const left = `${a.packageName}::${a.skillName}::${a.sourceDir}`
    const right = `${b.packageName}::${b.skillName}::${b.sourceDir}`
    return left.localeCompare(right)
  })
}

async function hashDirectoryTreeIfExists(rootPath: string): Promise<string | null> {
  if (!(await pathExists(rootPath))) {
    return null
  }

  const hash = createHash('sha256')
  hash.update('dir:.\n')

  const entries = await glob('**/*', {
    cwd: rootPath,
    dot: true,
    expandDirectories: false,
    followSymbolicLinks: false,
    onlyFiles: false,
  })

  entries.sort((a, b) => a.localeCompare(b))

  for (const entry of entries) {
    const currentPath = join(rootPath, entry)
    const stat = await fsp.lstat(currentPath)
    const relativePath = relative(rootPath, currentPath).replaceAll('\\', '/')

    if (stat.isSymbolicLink()) {
      hash.update(`symlink:${relativePath}:`)
      hash.update(await fsp.readlink(currentPath))
      hash.update('\n')
      continue
    }

    if (stat.isDirectory()) {
      hash.update(`dir:${relativePath}\n`)
      continue
    }

    if (stat.isFile()) {
      hash.update(`file:${relativePath}:`)
      hash.update(await fsp.readFile(currentPath))
      hash.update('\n')
      continue
    }

    hash.update(`other:${relativePath}:${stat.mode}\n`)
  }

  return hash.digest('hex')
}
