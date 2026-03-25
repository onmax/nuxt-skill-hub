import { createHash } from 'node:crypto'
import { promises as fsp } from 'node:fs'
import { hash as ohash } from 'ohash'
import { join, relative } from 'pathe'
import { resolveLockfile } from 'pkg-types'
import type { ModuleOptions } from '../types'
import type { LocalSourceFingerprint } from './sources'

export interface LockfileInfo {
  path: string
  hash: string
}

export async function resolveLockfileInfo(exportRoot: string): Promise<LockfileInfo | null> {
  let lockfilePath: string

  try {
    lockfilePath = await resolveLockfile(exportRoot)
  }
  catch {
    return null
  }

  const contents = await fsp.readFile(lockfilePath)
  const hash = createHash('sha256').update(contents).digest('hex')

  return {
    path: relative(exportRoot, lockfilePath).replaceAll('\\', '/'),
    hash,
  }
}

export async function createGenerationFingerprint(input: {
  packageVersion: string
  rootDir: string
  buildDir: string
  exportRoot: string
  skillName: string
  options: ModuleOptions
  installedPackages: Array<{ packageName: string, version?: string }>
  localSources: LocalSourceFingerprint[]
}): Promise<string> {
  const rootPackageHash = await hashFileIfExists(join(input.rootDir, 'package.json'))
  const lockfile = await resolveLockfileInfo(input.exportRoot)
  const modules = [...input.installedPackages]
    .filter(pkg => pkg.packageName !== 'nuxt-skill-hub')
    .map(pkg => ({ name: pkg.packageName, version: pkg.version || null }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const localSources = [...input.localSources].sort((a, b) => {
    const left = `${a.packageName}::${a.skillName}::${a.sourceDir}`
    const right = `${b.packageName}::${b.skillName}::${b.sourceDir}`
    return left.localeCompare(right)
  })

  return ohash({
    packageVersion: input.packageVersion,
    skillName: input.skillName,
    rootDir: input.rootDir,
    buildDir: input.buildDir,
    rootPackageHash,
    lockfile,
    modules,
    localSources,
    skillHub: {
      skillName: input.options.skillName?.trim() || null,
      targets: [...(input.options.targets || [])].sort(),
      moduleAuthoring: Boolean(input.options.moduleAuthoring),
      generationMode: input.options.generationMode || 'prepare',
    },
  })
}

async function hashFileIfExists(path: string): Promise<string | null> {
  try {
    const contents = await fsp.readFile(path)
    return createHash('sha256').update(contents).digest('hex')
  }
  catch {
    return null
  }
}
