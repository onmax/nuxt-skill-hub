#!/usr/bin/env node

import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { spawnSync } from 'node:child_process'

const repoRoot = resolve(new URL('..', import.meta.url).pathname)
const defaultPortalRoot = resolve(process.env.HOME || '~', 'quiver', 'portal')

function parseArgs(argv) {
  const options = {
    portalRoot: defaultPortalRoot,
    install: true,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--portal' && argv[i + 1]) {
      options.portalRoot = resolve(argv[++i])
      continue
    }
    if (arg === '--no-install') {
      options.install = false
      continue
    }
  }

  return options
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    env: {
      ...process.env,
      ...options.env,
    },
  })

  if (result.status !== 0) {
    throw new Error([
      `Command failed: ${command} ${args.join(' ')}`,
      result.stdout || '',
      result.stderr || '',
    ].filter(Boolean).join('\n'))
  }

  return result.stdout?.trim() || ''
}

function prepareWorkspaceCopy(sourceDir, destinationDir) {
  cpSync(sourceDir, destinationDir, {
    recursive: true,
    force: true,
    filter: (source) => {
      const relativePath = source.slice(sourceDir.length).replace(/^\/+/, '')
      if (!relativePath) {
        return true
      }

      const topLevel = relativePath.split('/')[0]
      return !['.git', '.nuxt', '.output', '.tmp', 'test-results'].includes(topLevel)
    },
  })
}

function rewriteDependency(projectDir, dependencySpec) {
  const packageJsonPath = join(projectDir, 'package.json')
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  packageJson.dependencies ||= {}
  packageJson.dependencies['nuxt-skill-hub'] = dependencySpec
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8')
}

function removePath(path) {
  rmSync(path, { recursive: true, force: true })
}

function timePrepare(projectDir) {
  const startedAt = performance.now()
  const output = run('pnpm', ['exec', 'nuxi', 'prepare'], { cwd: projectDir, capture: true })
  return {
    durationMs: performance.now() - startedAt,
    output,
  }
}

function formatMs(value) {
  return `${value.toFixed(0)} ms`
}

function formatDelta(before, after) {
  const delta = before - after
  const ratio = before > 0 ? (delta / before) * 100 : 0
  const sign = delta >= 0 ? '-' : '+'
  return `${sign}${Math.abs(delta).toFixed(0)} ms (${sign}${Math.abs(ratio).toFixed(1)}%)`
}

function benchmarkVariant({ label, dependencySpec, portalRoot, install }) {
  const tempRoot = mkdtempSync(join(tmpdir(), 'nuxt-skill-bench-'))
  const projectDir = join(tempRoot, 'portal')

  try {
    prepareWorkspaceCopy(portalRoot, projectDir)
    rewriteDependency(projectDir, dependencySpec)

    if (install) {
      removePath(join(projectDir, 'node_modules'))
      run('pnpm', ['install', '--prefer-offline'], { cwd: projectDir })
    }

    removePath(join(projectDir, '.nuxt'))
    removePath(join(projectDir, '.output'))
    removePath(join(projectDir, 'node_modules', '.cache', 'nuxt-skill-hub'))

    const cold = timePrepare(projectDir)

    removePath(join(projectDir, '.nuxt'))
    removePath(join(projectDir, '.output'))

    const warm = timePrepare(projectDir)
    const persistentCachePath = join(projectDir, 'node_modules', '.cache', 'nuxt-skill-hub')

    return {
      label,
      coldMs: cold.durationMs,
      warmMs: warm.durationMs,
      restoredFromCache: warm.output.includes('Restored cached'),
      persistentCacheExists: existsSync(persistentCachePath),
    }
  }
  finally {
    removePath(tempRoot)
  }
}

function printSummary(portalRoot, results) {
  const [baseline, candidate] = results
  console.log('')
  console.log(`Portal benchmark: ${portalRoot}`)
  console.log('')
  console.log('| Variant | Cold prepare | Warm prepare | Restored cached tree | Persistent cache |')
  console.log('| --- | ---: | ---: | --- | --- |')
  for (const result of results) {
    console.log(`| ${result.label} | ${formatMs(result.coldMs)} | ${formatMs(result.warmMs)} | ${result.restoredFromCache ? 'yes' : 'no'} | ${result.persistentCacheExists ? 'yes' : 'no'} |`)
  }
  console.log('')
  console.log(`Cold delta (before -> after): ${formatDelta(baseline.coldMs, candidate.coldMs)}`)
  console.log(`Warm delta (before -> after): ${formatDelta(baseline.warmMs, candidate.warmMs)}`)
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!existsSync(options.portalRoot)) {
    throw new Error(`Portal project not found at ${options.portalRoot}`)
  }

  const installedPackageRoot = join(options.portalRoot, 'node_modules', 'nuxt-skill-hub')
  if (!existsSync(installedPackageRoot)) {
    throw new Error(`Baseline package not found at ${installedPackageRoot}`)
  }

  run('pnpm', ['run', 'dev:prepare'], { cwd: repoRoot })

  const results = [
    benchmarkVariant({
      label: 'before (portal-installed)',
      dependencySpec: `link:${installedPackageRoot}`,
      portalRoot: options.portalRoot,
      install: options.install,
    }),
    benchmarkVariant({
      label: 'after (workspace)',
      dependencySpec: `link:${repoRoot}`,
      portalRoot: options.portalRoot,
      install: options.install,
    }),
  ]

  printSummary(options.portalRoot, results)
}

main()
