import { describe, expect, it, vi } from 'vitest'

describe('detectInstalledTargets', () => {
  it('uses rootDir when probing project-level github target', async () => {
    vi.resetModules()

    const existsSync = vi.fn((path: string) => path === '/tmp/project/.github')

    vi.doMock('node:os', () => ({
      homedir: () => '/tmp/home',
    }))
    vi.doMock('node:fs', () => ({
      existsSync,
    }))

    const { detectInstalledTargets } = await import('../src/agents')
    const targets = detectInstalledTargets('/tmp/project')

    expect(targets).toContain('github-copilot')
    expect(existsSync).toHaveBeenCalledWith('/tmp/project/.github')
  })
})
