import { describe, expect, it, vi } from 'vitest'

vi.mock('unagent/env', () => ({
  detectInstalledAgents: vi.fn(() => []),
  getAgentConfig: vi.fn(),
  getAgentIds: vi.fn(() => []),
  expandPath: (value: string) => value,
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { detectInstalledAgents, getAgentConfig } = await import('unagent/env') as any
const { detectInstalledTargets, validateTargets } = await import('../src/agents')

describe('detectInstalledTargets', () => {
  it('uses config-based detection without inferring missing skills dirs', () => {
    vi.mocked(detectInstalledAgents).mockReturnValue([
      { id: 'codex', detected: 'config', config: {} },
      { id: 'cursor', detected: 'env', config: { skillsDir: 'rules' } },
      { id: 'claude-code', detected: 'both', config: { skillsDir: 'skills' } },
      { id: 'copilot', detected: 'both', config: {} },
      { id: 'windsurf', detected: 'config', config: { skillsDir: 'rules' } },
    ])

    const targets = detectInstalledTargets()
    expect(targets).toEqual(['codex', 'windsurf'])
  })
})

describe('validateTargets', () => {
  it('returns valid targets and reports unknown/missing skillsDir targets', () => {
    vi.mocked(getAgentConfig).mockImplementation((target: string) => {
      if (target === 'claude-code') return { configDir: '~/.claude', skillsDir: 'skills' }
      if (target === 'codex') return { configDir: '~/.codex' }
      return undefined
    })

    const result = validateTargets(['claude-code', 'codex', 'ghost'])
    expect(result.valid).toEqual(['claude-code', 'codex'])
    expect(result.invalid).toEqual([
      { target: 'ghost', reason: 'unknown-target' },
    ])
  })
})
