import { afterEach, describe, expect, it, vi } from 'vitest'

const originalCodexShell = process.env.CODEX_SHELL

afterEach(() => {
  if (originalCodexShell === undefined) {
    delete process.env.CODEX_SHELL
  }
  else {
    process.env.CODEX_SHELL = originalCodexShell
  }
})

describe('detectInstalledTargets', () => {
  it('uses config-based detection and infers codex skills dir', async () => {
    process.env.CODEX_SHELL = '0'
    vi.resetModules()

    vi.doMock('unagent/env', () => ({
      detectInstalledAgents: () => [
        { id: 'codex', detected: 'config', config: {} },
        { id: 'cursor', detected: 'env', config: { skillsDir: 'rules' } },
        { id: 'claude-code', detected: 'both', config: { skillsDir: 'skills' } },
        { id: 'copilot', detected: 'both', config: {} },
        { id: 'windsurf', detected: 'config', config: { skillsDir: 'rules' } },
      ],
      getAgentConfig: vi.fn(),
      getAgentIds: vi.fn(() => []),
      expandPath: (value: string) => value,
    }))

    const { detectInstalledTargets } = await import('../src/agents')
    const targets = detectInstalledTargets('/tmp/project')

    expect(targets).toEqual(['codex', 'windsurf'])
  })

  it('prefers codex target when running inside codex shell', async () => {
    process.env.CODEX_SHELL = '1'
    vi.resetModules()

    vi.doMock('unagent/env', () => ({
      detectInstalledAgents: () => [
        { id: 'codex', detected: 'config', config: {} },
        { id: 'claude-code', detected: 'config', config: { skillsDir: 'skills' } },
      ],
      getAgentConfig: vi.fn(),
      getAgentIds: vi.fn(() => []),
      expandPath: (value: string) => value,
    }))

    const { detectInstalledTargets } = await import('../src/agents')
    const targets = detectInstalledTargets('/tmp/project')

    expect(targets).toEqual(['codex'])
  })
})

describe('validateTargets', () => {
  it('returns valid targets and reports unknown/missing skillsDir targets', async () => {
    vi.resetModules()

    vi.doMock('unagent/env', () => ({
      detectInstalledAgents: vi.fn(() => []),
      getAgentIds: vi.fn(() => []),
      expandPath: (value: string) => value,
      getAgentConfig: (target: string) => {
        if (target === 'claude-code') {
          return { configDir: '~/.claude', skillsDir: 'skills' }
        }
        if (target === 'codex') {
          return { configDir: '~/.codex' }
        }
      },
    }))

    const { validateTargets } = await import('../src/agents')
    const result = validateTargets(['claude-code', 'codex', 'ghost'])

    expect(result.valid).toEqual(['claude-code', 'codex'])
    expect(result.invalid).toEqual([
      { target: 'ghost', reason: 'unknown-target' },
    ])
  })
})
