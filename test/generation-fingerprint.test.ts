import { promises as fsp } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createGenerationFingerprint, resolveLockfileInfo } from '../src/generation/fingerprint'

describe('resolveLockfileInfo', () => {
  it('returns null when no supported lockfile exists', async () => {
    const root = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-lockfile-'))
    await expect(resolveLockfileInfo(root)).resolves.toBeNull()
  })
})

describe('createGenerationFingerprint', () => {
  it('is stable regardless of installed package or local source ordering', async () => {
    const root = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-fingerprint-'))
    await fsp.writeFile(join(root, 'package.json'), JSON.stringify({
      name: 'fingerprint-fixture',
      private: true,
    }, null, 2), 'utf8')

    const common = {
      packageVersion: '0.0.4',
      rootDir: root,
      buildDir: join(root, '.nuxt'),
      exportRoot: root,
      skillName: 'nuxt-fingerprint-fixture',
      options: {
        targets: ['codex'],
        generationMode: 'prepare' as const,
        moduleAuthoring: false,
      },
    }

    const first = await createGenerationFingerprint({
      ...common,
      installedPackages: [
        { packageName: 'b', version: '1.0.0' },
        { packageName: 'a', version: '2.0.0' },
      ],
      localSources: [
        {
          packageName: 'pkg-b',
          skillName: 'skill-b',
          sourceDir: '/tmp/b',
          sourceRoot: '/tmp',
          sourceKind: 'dist',
          forceIncludeScripts: false,
          hash: 'bbb',
        },
        {
          packageName: 'pkg-a',
          skillName: 'skill-a',
          sourceDir: '/tmp/a',
          sourceRoot: '/tmp',
          sourceKind: 'dist',
          forceIncludeScripts: false,
          hash: 'aaa',
        },
      ],
    })

    const second = await createGenerationFingerprint({
      ...common,
      installedPackages: [
        { packageName: 'a', version: '2.0.0' },
        { packageName: 'b', version: '1.0.0' },
      ],
      localSources: [
        {
          packageName: 'pkg-a',
          skillName: 'skill-a',
          sourceDir: '/tmp/a',
          sourceRoot: '/tmp',
          sourceKind: 'dist',
          forceIncludeScripts: false,
          hash: 'aaa',
        },
        {
          packageName: 'pkg-b',
          skillName: 'skill-b',
          sourceDir: '/tmp/b',
          sourceRoot: '/tmp',
          sourceKind: 'dist',
          forceIncludeScripts: false,
          hash: 'bbb',
        },
      ],
    })

    expect(first).toBe(second)
  })

  it('changes when local source script inclusion changes', async () => {
    const root = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-fingerprint-flags-'))
    await fsp.writeFile(join(root, 'package.json'), JSON.stringify({
      name: 'fingerprint-flags-fixture',
      private: true,
    }, null, 2), 'utf8')

    const common = {
      packageVersion: '0.0.4',
      rootDir: root,
      buildDir: join(root, '.nuxt'),
      exportRoot: root,
      skillName: 'nuxt-fingerprint-flags',
      options: {
        targets: ['codex'],
        generationMode: 'prepare' as const,
        moduleAuthoring: false,
      },
      installedPackages: [],
    }

    const withoutScripts = await createGenerationFingerprint({
      ...common,
      localSources: [
        {
          packageName: 'pkg',
          skillName: 'skill',
          sourceDir: '/tmp/skill',
          sourceRoot: '/tmp',
          sourceKind: 'dist',
          forceIncludeScripts: false,
          hash: 'same',
        },
      ],
    })

    const withScripts = await createGenerationFingerprint({
      ...common,
      localSources: [
        {
          packageName: 'pkg',
          skillName: 'skill',
          sourceDir: '/tmp/skill',
          sourceRoot: '/tmp',
          sourceKind: 'dist',
          forceIncludeScripts: true,
          hash: 'same',
        },
      ],
    })

    expect(withoutScripts).not.toBe(withScripts)
  })
})
