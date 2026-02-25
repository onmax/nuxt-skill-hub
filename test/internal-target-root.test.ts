import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unmock('../src/agents')
  vi.unmock('node:os')
  vi.resetModules()
})

describe('getTargetSkillRoot fallback behavior', () => {
  it('falls back when agent configDir is outside home directory', async () => {
    vi.resetModules()

    vi.doMock('../src/agents', () => ({
      detectInstalledTargets: vi.fn(() => []),
      validateTargets: vi.fn(() => ({ valid: [], invalid: [] })),
      resolveAgentTargetConfig: vi.fn(() => ({
        target: 'custom-agent',
        configDir: '/opt/custom-agent-config',
        skillsDir: 'rules',
      })),
    }))

    const { getTargetSkillRoot } = await import('../src/internal')
    const resolved = getTargetSkillRoot('/tmp/project', 'custom-agent', 'nuxt')

    expect(resolved.targetDir).toBe(join('/tmp/project', '.custom-agent', 'rules'))
    expect(resolved.skillRoot).toBe(join('/tmp/project', '.custom-agent', 'rules', 'nuxt'))
    expect(resolved.warning).toContain('is not under home')
  })
})
