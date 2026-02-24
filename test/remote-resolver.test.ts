import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it, vi } from 'vitest'

function createSkillFiles(destinationDir: string, skillName: string): Promise<void> {
  const content = `---\nname: ${skillName}\ndescription: test\n---\n`
  return fsp.mkdir(destinationDir, { recursive: true })
    .then(() => fsp.writeFile(join(destinationDir, 'SKILL.md'), content, 'utf8'))
}

describe('resolveRemoteContributionsForPackage', () => {
  it('prefers github and does not fall back when github resolves', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const downloadMock = vi.fn(async (repo: string, _ref: string, sourcePath: string, destinationDir: string) => {
      if (repo === 'acme/reka-ui' && sourcePath === 'skills/reka-ui') {
        await createSkillFiles(destinationDir, 'reka-ui')
        return { ok: true }
      }
      return { ok: false, status: 404, error: 'not found' }
    })

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn((input: string) => input || null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      fetchGitHubFileText: vi.fn(async () => ({ ok: false, status: 404 })),
      downloadGitHubDirectory: downloadMock,
    }))

    const { resolveRemoteContributionsForPackage } = await import('../src/remote-resolver')
    const result = await resolveRemoteContributionsForPackage({
      packageName: 'reka-ui',
      version: '1.2.3',
      repository: 'acme/reka-ui',
    }, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
      enableFallbackMap: true,
      fallbackMapRepo: 'onmax/nuxt-skills',
      fallbackMapRef: 'main',
    })

    expect(result.contributions).toHaveLength(1)
    expect(result.contributions[0]?.sourceKind).toBe('github')
    expect(result.contributions[0]?.official).toBe(true)
    expect(result.contributions[0]?.resolver).toBe('githubHeuristic')
    expect(result.skipped).toEqual([])
    expect(downloadMock.mock.calls.some(call => call[0] === 'onmax/nuxt-skills')).toBe(false)
  })

  it('uses fallback map when github resolution fails', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const downloadMock = vi.fn(async (repo: string, _ref: string, sourcePath: string, destinationDir: string) => {
      if (repo === 'onmax/nuxt-skills' && sourcePath === 'skills/reka-ui') {
        await createSkillFiles(destinationDir, 'reka-ui')
        return { ok: true }
      }
      return { ok: false, status: 404, error: 'not found' }
    })

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn(() => null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      fetchGitHubFileText: vi.fn(async () => ({ ok: false, status: 404 })),
      downloadGitHubDirectory: downloadMock,
    }))

    const { resolveRemoteContributionsForPackage } = await import('../src/remote-resolver')
    const result = await resolveRemoteContributionsForPackage({
      packageName: 'reka-ui',
      version: '1.2.3',
      repository: undefined,
    }, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
      enableFallbackMap: true,
      fallbackMapRepo: 'onmax/nuxt-skills',
      fallbackMapRef: 'main',
    })

    expect(result.contributions).toHaveLength(1)
    expect(result.contributions[0]?.sourceKind).toBe('fallbackMap')
    expect(result.contributions[0]?.official).toBe(false)
    expect(result.contributions[0]?.resolver).toBe('mapEntry')
    expect(result.contributions[0]?.forceIncludeScripts).toBe(true)
    expect(downloadMock.mock.calls.some(call => call[0] === 'onmax/nuxt-skills')).toBe(true)
  })

  it('uses remote package agents.skills before heuristics', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const downloadMock = vi.fn(async (repo: string, _ref: string, sourcePath: string, destinationDir: string) => {
      if (repo === 'acme/nuxt-module' && sourcePath === 'skills/nuxt-module') {
        await createSkillFiles(destinationDir, 'nuxt-module')
        return { ok: true }
      }
      return { ok: false, status: 404, error: 'not found' }
    })

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn((input: string) => input || null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      fetchGitHubFileText: vi.fn(async () => ({
        ok: true,
        status: 200,
        data: JSON.stringify({
          agents: {
            skills: [
              { name: 'nuxt-module', path: 'skills/nuxt-module' },
            ],
          },
        }),
      })),
      downloadGitHubDirectory: downloadMock,
    }))

    const { resolveRemoteContributionsForPackage } = await import('../src/remote-resolver')
    const result = await resolveRemoteContributionsForPackage({
      packageName: '@acme/nuxt-module',
      version: '0.3.0',
      repository: 'acme/nuxt-module',
    }, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
      enableFallbackMap: true,
      fallbackMapRepo: 'onmax/nuxt-skills',
      fallbackMapRef: 'main',
    })

    expect(result.contributions).toHaveLength(1)
    expect(result.contributions[0]?.sourceKind).toBe('github')
    expect(result.contributions[0]?.resolver).toBe('agentsField')
    expect(result.contributions[0]?.sourcePath).toBe('skills/nuxt-module')
  })
})
