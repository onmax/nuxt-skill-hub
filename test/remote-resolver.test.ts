import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it, vi } from 'vitest'

function createSkillFiles(destinationDir: string, skillName: string): Promise<void> {
  const content = `---\nname: ${skillName}\ndescription: test\n---\n`
  return fsp.mkdir(destinationDir, { recursive: true })
    .then(() => fsp.writeFile(join(destinationDir, 'SKILL.md'), content, 'utf8'))
}

function mockDownloadTemplate(impl: (input: string, dir: string) => Promise<void>) {
  return vi.fn(async (input: string, options?: { dir?: string }) => {
    if (!options?.dir) {
      throw new Error('missing dir')
    }

    await impl(input, options.dir)
    return {
      dir: options.dir,
      source: input,
    }
  })
}

describe('resolveRemoteContributionsForPackage', () => {
  it('resolves skill from github heuristics', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const downloadMock = mockDownloadTemplate(async (input, destinationDir) => {
      if (input === 'gh:acme/reka-ui/skills/reka-ui#main') {
        await createSkillFiles(destinationDir, 'reka-ui')
      }
      else {
        throw new Error('not found')
      }
    })

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn((input: string) => input || null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      fetchGitHubFileText: vi.fn(async () => ({ ok: false, status: 404 })),
      listGitHubDirectory: vi.fn(async () => ['reka-ui']),
    }))
    vi.doMock('giget', () => ({
      downloadTemplate: downloadMock,
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
    })

    expect(result.contributions).toHaveLength(1)
    expect(result.contributions[0]?.sourceKind).toBe('github')
    expect(result.contributions[0]?.official).toBe(true)
    expect(result.contributions[0]?.resolver).toBe('githubHeuristic')
    expect(result.skipped).toEqual([])
    expect(downloadMock.mock.calls.some(call => String(call[0]).includes('onmax/nuxt-skills'))).toBe(false)
  })

  it('generates a metadata-routed skill when github metadata is unavailable but package metadata exists', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const downloadMock = mockDownloadTemplate(async () => {
      throw new Error('not found')
    })

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn(() => null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      fetchGitHubFileText: vi.fn(async () => ({ ok: false, status: 404 })),
      listGitHubDirectory: vi.fn(async () => []),
    }))
    vi.doMock('giget', () => ({
      downloadTemplate: downloadMock,
    }))

    const { resolveRemoteContributionsForPackage } = await import('../src/remote-resolver')
    const result = await resolveRemoteContributionsForPackage({
      packageName: 'reka-ui',
      version: '1.2.3',
      description: 'Headless primitives for Vue.',
      homepage: 'https://reka-ui.com',
    }, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
    })

    expect(result.contributions).toHaveLength(1)
    expect(result.contributions[0]?.sourceKind).toBe('generated')
    expect(result.contributions[0]?.resolver).toBe('metadataRouter')
    expect(result.contributions[0]?.docsUrl).toBe('https://reka-ui.com/')
    expect(result.skipped).toEqual([])
    expect(downloadMock.mock.calls).toEqual([])
  })

  it('uses remote package agents.skills before heuristics', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const downloadMock = mockDownloadTemplate(async (input, destinationDir) => {
      if (input === 'gh:acme/nuxt-module/skills/nuxt-module#main') {
        await createSkillFiles(destinationDir, 'nuxt-module')
      }
      else {
        throw new Error('not found')
      }
    })

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn((input: string) => input || null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      listGitHubDirectory: vi.fn(async () => []),
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
    }))
    vi.doMock('giget', () => ({
      downloadTemplate: downloadMock,
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
    })

    expect(result.contributions).toHaveLength(1)
    expect(result.contributions[0]?.sourceKind).toBe('github')
    expect(result.contributions[0]?.resolver).toBe('agentsField')
    expect(result.contributions[0]?.sourcePath).toBe('skills/nuxt-module')
  })

  it('discovers all root github skills for docus', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const downloadMock = mockDownloadTemplate(async (input, destinationDir) => {
      if (
        input === 'gh:nuxt-content/docus/skills/create-docs#main'
        || input === 'gh:nuxt-content/docus/skills/review-docs#main'
      ) {
        await createSkillFiles(destinationDir, input.split('/').pop()?.split('#')[0] || 'unknown')
      }
      else {
        throw new Error('not found')
      }
    })

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn((input: string) => input || null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      fetchGitHubFileText: vi.fn(async () => ({ ok: false, status: 404 })),
      listGitHubDirectory: vi.fn(async () => ['create-docs', 'review-docs']),
    }))
    vi.doMock('giget', () => ({
      downloadTemplate: downloadMock,
    }))

    const { resolveRemoteContributionsForPackage } = await import('../src/remote-resolver')
    const result = await resolveRemoteContributionsForPackage({
      packageName: 'docus',
      version: '5.8.0',
      repository: 'nuxt-content/docus',
    }, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
    })

    expect(result.contributions).toHaveLength(2)
    expect(result.contributions.map(item => item.skillName)).toEqual(['create-docs', 'review-docs'])
    expect(result.contributions.every(item => item.sourceKind === 'github')).toBe(true)
    expect(result.contributions.every(item => item.official)).toBe(true)
    expect(result.skipped).toEqual([])
  })

  it('generates a metadata-routed skill when no remote skill is available', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const downloadMock = mockDownloadTemplate(async () => {
      throw new Error('not found')
    })

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn(() => null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      fetchGitHubFileText: vi.fn(async () => ({ ok: false, status: 404 })),
      listGitHubDirectory: vi.fn(async () => []),
    }))
    vi.doMock('giget', () => ({
      downloadTemplate: downloadMock,
    }))

    const { resolveRemoteContributionsForPackage } = await import('../src/remote-resolver')
    const result = await resolveRemoteContributionsForPackage({
      packageName: '@nuxt/a11y',
      version: '1.0.0',
      description: 'Accessibility tooling for Nuxt.',
      repository: 'https://github.com/nuxt/a11y',
      homepage: 'https://a11y.nuxt.com/',
    }, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
    })

    expect(result.contributions).toHaveLength(1)
    expect(result.contributions[0]?.sourceKind).toBe('generated')
    expect(result.contributions[0]?.resolver).toBe('metadataRouter')
    expect(result.contributions[0]?.repoUrl).toBe('https://github.com/nuxt/a11y')
    expect(result.contributions[0]?.docsUrl).toBe('https://a11y.nuxt.com/')
    expect(result.skipped).toEqual([])
    await expect(fsp.readFile(join(result.contributions[0]!.sourceDir, 'SKILL.md'), 'utf8')).resolves.toContain('This skill was generated from package metadata')
    await expect(fsp.readFile(join(result.contributions[0]!.sourceDir, 'references/index.md'), 'utf8')).resolves.toContain('Official docs')
  })

  it('keeps package skipped when metadata cannot produce a router skill', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const downloadMock = mockDownloadTemplate(async () => {
      throw new Error('not found')
    })

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn(() => null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      fetchGitHubFileText: vi.fn(async () => ({ ok: false, status: 404 })),
      listGitHubDirectory: vi.fn(async () => []),
    }))
    vi.doMock('giget', () => ({
      downloadTemplate: downloadMock,
    }))

    const { resolveRemoteContributionsForPackage } = await import('../src/remote-resolver')
    const result = await resolveRemoteContributionsForPackage({
      packageName: 'unknown-module',
      version: '0.0.1',
    }, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
    })

    expect(result.contributions).toEqual([])
    expect(result.skipped.some(entry => entry.sourceKind === 'generated')).toBe(true)
    expect(result.skipped.some(entry => entry.reason.includes('metadata-routed skill'))).toBe(true)
  })
})
