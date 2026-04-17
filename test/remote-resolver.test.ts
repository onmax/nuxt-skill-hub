import { createHash } from 'node:crypto'
import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it, vi } from 'vitest'

function createSkillFiles(destinationDir: string, skillName: string): Promise<void> {
  const content = `---\nname: ${skillName}\ndescription: test\n---\n`
  return fsp.mkdir(destinationDir, { recursive: true })
    .then(() => fsp.writeFile(join(destinationDir, 'SKILL.md'), content, 'utf8'))
}

function skillMarkdown(skillName: string, description = 'test'): string {
  return `---\nname: ${skillName}\ndescription: ${description}\n---\n`
}

function sha256(content: string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`
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
      fetchUrlJson: vi.fn(async () => ({ ok: false, status: 404 })),
      fetchUrlBytes: vi.fn(async () => ({ ok: false, status: 404 })),
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
      fetchUrlJson: vi.fn(async () => ({ ok: false, status: 404 })),
      fetchUrlBytes: vi.fn(async () => ({ ok: false, status: 404 })),
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
      if (input === 'gh:acme/nuxt-module/skills/nuxt-module#v0.3.0') {
        await createSkillFiles(destinationDir, 'nuxt-module')
      }
      else {
        throw new Error('not found')
      }
    })

    vi.resetModules()
    const defaultBranchMock = vi.fn(async () => 'main')
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn((input: string) => input || null),
      fetchGitHubDefaultBranch: defaultBranchMock,
      listGitHubDirectory: vi.fn(async () => []),
      fetchUrlJson: vi.fn(async () => ({ ok: false, status: 404 })),
      fetchUrlBytes: vi.fn(async () => ({ ok: false, status: 404 })),
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
    expect(defaultBranchMock).not.toHaveBeenCalled()
  })

  it('uses remote package agents.skills on fallback refs before heuristics', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const downloadMock = mockDownloadTemplate(async (input, destinationDir) => {
      if (input === 'gh:acme/nuxt-module/.agent/skills/nuxt-module#main') {
        await createSkillFiles(destinationDir, 'nuxt-module')
        return
      }

      throw new Error('not found')
    })
    const listGitHubDirectoryMock = vi.fn(async () => ['wrong-heuristic'])

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn((input: string) => input || null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      listGitHubDirectory: listGitHubDirectoryMock,
      fetchUrlJson: vi.fn(async () => ({ ok: false, status: 404 })),
      fetchUrlBytes: vi.fn(async () => ({ ok: false, status: 404 })),
      fetchGitHubFileText: vi.fn(async (_repo: string, ref: string) => {
        if (ref === 'v0.3.0' || ref === '0.3.0') {
          return { ok: false, status: 404 }
        }

        if (ref === 'main') {
          return {
            ok: true,
            status: 200,
            data: JSON.stringify({
              agents: {
                skills: [
                  { name: 'nuxt-module', path: '.agent/skills/nuxt-module' },
                ],
              },
            }),
          }
        }

        return { ok: false, status: 404 }
      }),
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
    expect(result.contributions[0]?.resolver).toBe('agentsField')
    expect(result.contributions[0]?.sourceRef).toBe('main')
    expect(result.contributions[0]?.sourcePath).toBe('.agent/skills/nuxt-module')
    expect(listGitHubDirectoryMock).not.toHaveBeenCalled()
  })

  it('does not probe well-known indexes on localhost homepages', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const fetchUrlJsonMock = vi.fn(async () => ({ ok: false, status: 404 }))

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn(() => null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      fetchGitHubFileText: vi.fn(async () => ({ ok: false, status: 404 })),
      listGitHubDirectory: vi.fn(async () => []),
      fetchUrlJson: fetchUrlJsonMock,
      fetchUrlBytes: vi.fn(async () => ({ ok: false, status: 404 })),
    }))
    vi.doMock('giget', () => ({
      downloadTemplate: mockDownloadTemplate(async () => {
        throw new Error('not found')
      }),
    }))

    const { resolveRemoteContributionsForPackage } = await import('../src/remote-resolver')
    const result = await resolveRemoteContributionsForPackage({
      packageName: 'local-docs',
      version: '1.0.0',
      description: 'Local docs.',
      homepage: 'http://localhost:3000/',
    }, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
    })

    expect(result.contributions).toHaveLength(1)
    expect(result.contributions[0]?.sourceKind).toBe('generated')
    expect(fetchUrlJsonMock).not.toHaveBeenCalled()
  })

  it('does not probe well-known indexes on private IPv4 homepages', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const fetchUrlJsonMock = vi.fn(async () => ({ ok: false, status: 404 }))

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn(() => null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      fetchGitHubFileText: vi.fn(async () => ({ ok: false, status: 404 })),
      listGitHubDirectory: vi.fn(async () => []),
      fetchUrlJson: fetchUrlJsonMock,
      fetchUrlBytes: vi.fn(async () => ({ ok: false, status: 404 })),
    }))
    vi.doMock('giget', () => ({
      downloadTemplate: mockDownloadTemplate(async () => {
        throw new Error('not found')
      }),
    }))

    const { resolveRemoteContributionsForPackage } = await import('../src/remote-resolver')
    const result = await resolveRemoteContributionsForPackage({
      packageName: 'private-docs',
      version: '1.0.0',
      description: 'Private docs.',
      homepage: 'http://192.168.1.10/docs',
    }, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
    })

    expect(result.contributions).toHaveLength(1)
    expect(result.contributions[0]?.sourceKind).toBe('generated')
    expect(result.contributions[0]?.docsUrl).toBe('http://192.168.1.10/docs')
    expect(fetchUrlJsonMock).not.toHaveBeenCalled()
  })

  it('skips RFC well-known skill-md entries whose artifact URL leaves the discovery origin', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const fetchUrlBytesMock = vi.fn(async () => ({ ok: true, data: Buffer.from(skillMarkdown('docs-sdk')) }))

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn(() => null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      fetchGitHubFileText: vi.fn(async () => ({ ok: false, status: 404 })),
      listGitHubDirectory: vi.fn(async () => []),
      fetchUrlJson: vi.fn(async (url: string) => url === 'https://docs.example.com/.well-known/agent-skills/index.json'
        ? {
            ok: true,
            data: {
              $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
              skills: [
                {
                  name: 'docs-sdk',
                  type: 'skill-md',
                  description: 'Use the SDK docs.',
                  url: 'https://evil.example.com/SKILL.md',
                  digest: sha256(skillMarkdown('docs-sdk')),
                },
              ],
            },
          }
        : { ok: false, status: 404 }),
      fetchUrlBytes: fetchUrlBytesMock,
    }))
    vi.doMock('giget', () => ({
      downloadTemplate: mockDownloadTemplate(async () => {
        throw new Error('not found')
      }),
    }))

    const { resolveRemoteContributionsForPackage } = await import('../src/remote-resolver')
    const result = await resolveRemoteContributionsForPackage({
      packageName: 'docs-sdk',
      version: '1.0.0',
      description: 'Docs SDK.',
      homepage: 'https://docs.example.com/',
    }, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
    })

    expect(result.contributions).toHaveLength(1)
    expect(result.contributions[0]?.sourceKind).toBe('generated')
    expect(result.skipped.some(entry => entry.reason === 'RFC well-known skill URL must stay on the discovery origin')).toBe(true)
    expect(fetchUrlBytesMock).not.toHaveBeenCalled()
  })

  it('resolves Docus legacy well-known skills via docs URL override', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const downloadMock = mockDownloadTemplate(async () => {
      throw new Error('not found')
    })
    const defaultBranchMock = vi.fn(async () => 'main')
    const listGitHubDirectoryMock = vi.fn(async () => [])

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn((input: string | undefined) => {
        if (!input) return null
        if (input === 'nuxt-content/docus') return input
        if (input.includes('github.com/nuxt-content/docus')) return 'nuxt-content/docus'
        return null
      }),
      fetchGitHubDefaultBranch: defaultBranchMock,
      fetchGitHubFileText: vi.fn(async () => ({ ok: false, status: 404 })),
      listGitHubDirectory: listGitHubDirectoryMock,
      fetchUrlJson: vi.fn(async (url: string) => {
        if (url === 'https://docus.dev/.well-known/agent-skills/index.json') {
          return { ok: false, status: 404 }
        }

        if (url === 'https://docus.dev/.well-known/skills/index.json') {
          return {
            ok: true,
            data: {
              skills: [
                {
                  name: 'create-docs',
                  description: 'Create docs.',
                  files: ['SKILL.md', 'references/templates.md'],
                },
                {
                  name: 'review-docs',
                  description: 'Review docs.',
                  files: ['SKILL.md'],
                },
              ],
            },
          }
        }

        return { ok: false, status: 404 }
      }),
      fetchUrlBytes: vi.fn(async (url: string) => {
        const files: Record<string, string> = {
          'https://docus.dev/.well-known/skills/create-docs/SKILL.md': skillMarkdown('create-docs', 'Create docs.'),
          'https://docus.dev/.well-known/skills/create-docs/references/templates.md': '# Templates\n',
          'https://docus.dev/.well-known/skills/review-docs/SKILL.md': skillMarkdown('review-docs', 'Review docs.'),
        }

        const content = files[url]
        return content
          ? { ok: true, data: Buffer.from(content) }
          : { ok: false, status: 404 }
      }),
    }))
    vi.doMock('giget', () => ({
      downloadTemplate: downloadMock,
    }))

    const { resolveRemoteContributionsForPackage } = await import('../src/remote-resolver')
    const result = await resolveRemoteContributionsForPackage({
      packageName: 'docus',
      version: '5.9.0',
      repository: 'git+https://github.com/nuxt-content/docus.git',
      homepage: 'https://github.com/nuxt-content/docus#readme',
    }, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
    })

    expect(result.contributions).toHaveLength(2)
    expect(result.contributions.map(item => item.skillName)).toEqual(['create-docs', 'review-docs'])
    expect(result.contributions.every(item => item.sourceKind === 'wellKnown')).toBe(true)
    expect(result.contributions.every(item => item.resolver === 'wellKnownLegacy')).toBe(true)
    expect(result.contributions[0]?.docsUrl).toBe('https://docus.dev/')
    await expect(fsp.readFile(join(result.contributions[0]!.sourceDir, 'references/templates.md'), 'utf8')).resolves.toBe('# Templates\n')
    expect(defaultBranchMock).toHaveBeenCalledWith('nuxt-content/docus', 200)
    expect(listGitHubDirectoryMock).not.toHaveBeenCalled()
  })

  it('resolves RFC well-known skill-md entries and verifies digests', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const skill = skillMarkdown('docs-sdk', 'Use the SDK docs.')

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn(() => null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      fetchGitHubFileText: vi.fn(async () => ({ ok: false, status: 404 })),
      listGitHubDirectory: vi.fn(async () => []),
      fetchUrlJson: vi.fn(async (url: string) => url === 'https://docs.example.com/.well-known/agent-skills/index.json'
        ? {
            ok: true,
            data: {
              $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
              skills: [
                {
                  name: 'docs-sdk',
                  type: 'skill-md',
                  description: 'Use the SDK docs.',
                  url: '/.well-known/agent-skills/docs-sdk/SKILL.md',
                  digest: sha256(skill),
                },
              ],
            },
          }
        : { ok: false, status: 404 }),
      fetchUrlBytes: vi.fn(async (url: string) => url === 'https://docs.example.com/.well-known/agent-skills/docs-sdk/SKILL.md'
        ? { ok: true, data: Buffer.from(skill) }
        : { ok: false, status: 404 }),
    }))
    vi.doMock('giget', () => ({
      downloadTemplate: mockDownloadTemplate(async () => {
        throw new Error('not found')
      }),
    }))

    const { resolveRemoteContributionsForPackage } = await import('../src/remote-resolver')
    const result = await resolveRemoteContributionsForPackage({
      packageName: 'docs-sdk',
      version: '1.0.0',
      homepage: 'https://docs.example.com/',
    }, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
    })

    expect(result.contributions).toHaveLength(1)
    expect(result.contributions[0]?.sourceKind).toBe('wellKnown')
    expect(result.contributions[0]?.resolver).toBe('wellKnownRfc')
    await expect(fsp.readFile(join(result.contributions[0]!.sourceDir, 'SKILL.md'), 'utf8')).resolves.toBe(skill)
  })

  it('skips RFC well-known skill-md entries with digest mismatches and falls back', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const skill = skillMarkdown('docs-sdk', 'Use the SDK docs.')

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn(() => null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      fetchGitHubFileText: vi.fn(async () => ({ ok: false, status: 404 })),
      listGitHubDirectory: vi.fn(async () => []),
      fetchUrlJson: vi.fn(async (url: string) => {
        if (url === 'https://docs.example.com/.well-known/agent-skills/index.json') {
          return {
            ok: true,
            data: {
              $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
              skills: [
                {
                  name: 'docs-sdk',
                  type: 'skill-md',
                  description: 'Use the SDK docs.',
                  url: '/.well-known/agent-skills/docs-sdk/SKILL.md',
                  digest: `sha256:${'0'.repeat(64)}`,
                },
              ],
            },
          }
        }

        return { ok: false, status: 404 }
      }),
      fetchUrlBytes: vi.fn(async () => ({ ok: true, data: Buffer.from(skill) })),
    }))
    vi.doMock('giget', () => ({
      downloadTemplate: mockDownloadTemplate(async () => {
        throw new Error('not found')
      }),
    }))

    const { resolveRemoteContributionsForPackage } = await import('../src/remote-resolver')
    const result = await resolveRemoteContributionsForPackage({
      packageName: 'docs-sdk',
      version: '1.0.0',
      homepage: 'https://docs.example.com/',
    }, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
    })

    expect(result.contributions).toHaveLength(1)
    expect(result.contributions[0]?.sourceKind).toBe('generated')
    expect(result.skipped.some(entry => entry.sourceKind === 'wellKnown' && entry.reason.includes('digest mismatch'))).toBe(true)
  })

  it('skips RFC archive entries until archive extraction is supported', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn(() => null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      fetchGitHubFileText: vi.fn(async () => ({ ok: false, status: 404 })),
      listGitHubDirectory: vi.fn(async () => []),
      fetchUrlJson: vi.fn(async (url: string) => url === 'https://docs.example.com/.well-known/agent-skills/index.json'
        ? {
            ok: true,
            data: {
              $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
              skills: [
                {
                  name: 'docs-sdk',
                  type: 'archive',
                  description: 'Use the SDK docs.',
                  url: '/.well-known/agent-skills/docs-sdk.tar.gz',
                  digest: `sha256:${'1'.repeat(64)}`,
                },
              ],
            },
          }
        : { ok: false, status: 404 }),
      fetchUrlBytes: vi.fn(async () => ({ ok: false, status: 404 })),
    }))
    vi.doMock('giget', () => ({
      downloadTemplate: mockDownloadTemplate(async () => {
        throw new Error('not found')
      }),
    }))

    const { resolveRemoteContributionsForPackage } = await import('../src/remote-resolver')
    const result = await resolveRemoteContributionsForPackage({
      packageName: 'docs-sdk',
      version: '1.0.0',
      homepage: 'https://docs.example.com/',
    }, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
    })

    expect(result.contributions).toHaveLength(1)
    expect(result.contributions[0]?.sourceKind).toBe('generated')
    expect(result.skipped.some(entry => entry.reason === 'archive artifacts are not supported yet')).toBe(true)
  })

  it('rejects unsafe legacy well-known file paths and falls back', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const fetchUrlBytesMock = vi.fn(async () => ({ ok: true, data: Buffer.from(skillMarkdown('docs-sdk')) }))

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn(() => null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      fetchGitHubFileText: vi.fn(async () => ({ ok: false, status: 404 })),
      listGitHubDirectory: vi.fn(async () => []),
      fetchUrlJson: vi.fn(async (url: string) => {
        if (url === 'https://docs.example.com/.well-known/agent-skills/index.json') {
          return { ok: false, status: 404 }
        }

        if (url === 'https://docs.example.com/.well-known/skills/index.json') {
          return {
            ok: true,
            data: {
              skills: [
                {
                  name: 'docs-sdk',
                  description: 'Use the SDK docs.',
                  files: ['SKILL.md', '../secret.md'],
                },
              ],
            },
          }
        }

        return { ok: false, status: 404 }
      }),
      fetchUrlBytes: fetchUrlBytesMock,
    }))
    vi.doMock('giget', () => ({
      downloadTemplate: mockDownloadTemplate(async () => {
        throw new Error('not found')
      }),
    }))

    const { resolveRemoteContributionsForPackage } = await import('../src/remote-resolver')
    const result = await resolveRemoteContributionsForPackage({
      packageName: 'docs-sdk',
      version: '1.0.0',
      homepage: 'https://docs.example.com/',
    }, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
    })

    expect(result.contributions).toHaveLength(1)
    expect(result.contributions[0]?.sourceKind).toBe('generated')
    expect(result.skipped.some(entry => entry.reason.includes('unsafe file path'))).toBe(true)
    expect(fetchUrlBytesMock).not.toHaveBeenCalled()
  })

  it('discovers all root github skills for docus', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const downloadMock = mockDownloadTemplate(async (input, destinationDir) => {
      if (
        input === 'gh:nuxt-content/docus/skills/docus#main'
        || input === 'gh:nuxt-content/docus/skills/create-docs#main'
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
      listGitHubDirectory: vi.fn(async () => ['docus', 'create-docs', 'review-docs']),
      fetchUrlJson: vi.fn(async () => ({ ok: false, status: 404 })),
      fetchUrlBytes: vi.fn(async () => ({ ok: false, status: 404 })),
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

    expect(result.contributions).toHaveLength(3)
    expect(result.contributions.map(item => item.skillName)).toEqual(['docus', 'create-docs', 'review-docs'])
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
      fetchUrlJson: vi.fn(async () => ({ ok: false, status: 404 })),
      fetchUrlBytes: vi.fn(async () => ({ ok: false, status: 404 })),
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
    await expect(fsp.readFile(join(result.contributions[0]!.sourceDir, 'SKILL.md'), 'utf8')).resolves.toContain('Docs: [https://a11y.nuxt.com/](https://a11y.nuxt.com/)')
    await expect(fsp.readFile(join(result.contributions[0]!.sourceDir, 'SKILL.md'), 'utf8')).resolves.not.toContain('This skill was generated from package metadata')
    await expect(fsp.access(join(result.contributions[0]!.sourceDir, 'references/index.md'))).rejects.toBeDefined()
  })

  it('reuses cached github skill trees across runs', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const downloadMock = mockDownloadTemplate(async (input, destinationDir) => {
      if (input === 'gh:acme/nuxt-module/skills/nuxt-module#v0.3.0') {
        await createSkillFiles(destinationDir, 'nuxt-module')
        return
      }

      throw new Error('not found')
    })

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn((input: string) => input || null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      listGitHubDirectory: vi.fn(async () => []),
      fetchUrlJson: vi.fn(async () => ({ ok: false, status: 404 })),
      fetchUrlBytes: vi.fn(async () => ({ ok: false, status: 404 })),
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
    const packageInfo = {
      packageName: '@acme/nuxt-module',
      version: '0.3.0',
      repository: 'acme/nuxt-module',
    }

    const first = await resolveRemoteContributionsForPackage(packageInfo, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
    })
    const downloadCallsAfterFirstRun = downloadMock.mock.calls.length
    const second = await resolveRemoteContributionsForPackage(packageInfo, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
    })

    expect(first.contributions).toHaveLength(1)
    expect(second.contributions).toHaveLength(1)
    expect(downloadCallsAfterFirstRun).toBeGreaterThan(0)
    expect(downloadMock.mock.calls).toHaveLength(downloadCallsAfterFirstRun)
    expect(second.contributions[0]?.sourceDir).toBe(first.contributions[0]?.sourceDir)
  })

  it('re-fetches cached github skill trees for mutable branch refs', async () => {
    const cacheRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-remote-'))
    const downloadMock = mockDownloadTemplate(async (input, destinationDir) => {
      if (input === 'gh:acme/reka-ui/skills/reka-ui#main') {
        await createSkillFiles(destinationDir, 'reka-ui')
        return
      }

      throw new Error('not found')
    })

    vi.resetModules()
    vi.doMock('../src/remote-fetch', () => ({
      parseGitHubRepo: vi.fn((input: string) => input || null),
      fetchGitHubDefaultBranch: vi.fn(async () => 'main'),
      fetchGitHubFileText: vi.fn(async () => ({ ok: false, status: 404 })),
      listGitHubDirectory: vi.fn(async () => ['reka-ui']),
      fetchUrlJson: vi.fn(async () => ({ ok: false, status: 404 })),
      fetchUrlBytes: vi.fn(async () => ({ ok: false, status: 404 })),
    }))
    vi.doMock('giget', () => ({
      downloadTemplate: downloadMock,
    }))

    const { resolveRemoteContributionsForPackage } = await import('../src/remote-resolver')
    const packageInfo = {
      packageName: 'reka-ui',
      version: '1.2.3',
      repository: 'acme/reka-ui',
    }

    const first = await resolveRemoteContributionsForPackage(packageInfo, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
    })
    const second = await resolveRemoteContributionsForPackage(packageInfo, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
    })

    expect(first.contributions).toHaveLength(1)
    expect(second.contributions).toHaveLength(1)
    expect(downloadMock).toHaveBeenCalledTimes(2)
    expect(second.contributions[0]?.sourceDir).toBe(first.contributions[0]?.sourceDir)
  })

  it('reuses cached metadata-router skill files across runs', async () => {
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
      fetchUrlJson: vi.fn(async () => ({ ok: false, status: 404 })),
      fetchUrlBytes: vi.fn(async () => ({ ok: false, status: 404 })),
    }))
    vi.doMock('giget', () => ({
      downloadTemplate: downloadMock,
    }))

    const { resolveRemoteContributionsForPackage } = await import('../src/remote-resolver')
    const packageInfo = {
      packageName: '@nuxt/a11y',
      version: '1.0.0',
      description: 'Accessibility tooling for Nuxt.',
      repository: 'https://github.com/nuxt/a11y',
      homepage: 'https://a11y.nuxt.com/',
    }

    const first = await resolveRemoteContributionsForPackage(packageInfo, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
    })
    const skillPath = join(first.contributions[0]!.sourceDir, 'SKILL.md')
    const firstStat = await fsp.stat(skillPath)

    await new Promise(resolve => setTimeout(resolve, 25))

    const second = await resolveRemoteContributionsForPackage(packageInfo, {
      cacheRoot,
      githubLookupTimeoutMs: 200,
      enableGithubLookup: true,
    })
    const secondStat = await fsp.stat(skillPath)

    expect(second.contributions).toHaveLength(1)
    expect(second.contributions[0]?.sourceDir).toBe(first.contributions[0]?.sourceDir)
    expect(secondStat.mtimeMs).toBe(firstStat.mtimeMs)
    expect(downloadMock).not.toHaveBeenCalled()
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
      fetchUrlJson: vi.fn(async () => ({ ok: false, status: 404 })),
      fetchUrlBytes: vi.fn(async () => ({ ok: false, status: 404 })),
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
