import { describe, expect, it, vi } from 'vitest'

describe('detectInstalledTargets', () => {
  it('uses unagent config-based detection and excludes agents without skillsDir', async () => {
    vi.resetModules()

    vi.doMock('unagent/env', () => ({
      detectInstalledAgents: () => [
        { id: 'codex', detected: 'config', config: {} },
        { id: 'cursor', detected: 'env', config: { skillsDir: 'rules' } },
        { id: 'copilot', detected: 'both', config: {} },
        { id: 'claude-code', detected: 'both', config: { skillsDir: 'skills' } },
        { id: 'windsurf', detected: 'config', config: { skillsDir: 'rules' } },
      ],
      getAgentConfig: vi.fn(),
      getAgentIds: vi.fn(() => []),
      expandPath: (value: string) => value,
    }))

    const { detectInstalledTargets } = await import('../src/agents')
    const targets = detectInstalledTargets('/tmp/project')

    expect(targets).toEqual(['claude-code', 'windsurf'])
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
        if (target === 'copilot') {
          return { configDir: '~/.config/github-copilot' }
        }
      },
    }))

    const { validateTargets } = await import('../src/agents')
    const result = validateTargets(['claude-code', 'copilot', 'ghost'])

    expect(result.valid).toEqual(['claude-code'])
    expect(result.invalid).toEqual([
      { target: 'copilot', reason: 'missing-skills-dir' },
      { target: 'ghost', reason: 'unknown-target' },
    ])
  })
})
