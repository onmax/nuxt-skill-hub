import { describe, expect, it } from 'vitest'
import {
  parseAgentSkillDeclarations,
  resolveGuidancePrecedence,
  shouldIncludeScripts,
  sortAndDedupeContributions,
} from '../src/internal'

describe('parseAgentSkillDeclarations', () => {
  it('returns only valid entries', () => {
    const parsed = parseAgentSkillDeclarations({
      agents: {
        skills: [
          { name: 'nuxt-ui', path: './skills/nuxt-ui' },
          { name: ' ', path: './skills/empty-name' },
          { name: 'nuxt-seo', path: '' },
          { foo: 'bar' },
        ],
      },
    })

    expect(parsed).toEqual([
      { name: 'nuxt-ui', path: './skills/nuxt-ui' },
    ])
  })
})

describe('sortAndDedupeContributions', () => {
  it('removes duplicates and keeps deterministic ordering', () => {
    const sorted = sortAndDedupeContributions([
      {
        packageName: 'z-module',
        skillName: 'z',
        sourceDir: '/tmp/z',
        sourceRoot: '/tmp',
      },
      {
        packageName: 'a-module',
        skillName: 'a',
        sourceDir: '/tmp/a',
        sourceRoot: '/tmp',
      },
      {
        packageName: 'a-module',
        skillName: 'a',
        sourceDir: '/tmp/a',
        sourceRoot: '/tmp',
      },
    ])

    expect(sorted).toHaveLength(2)
    expect(sorted[0]?.packageName).toBe('a-module')
    expect(sorted[1]?.packageName).toBe('z-module')
  })
})

describe('resolveGuidancePrecedence', () => {
  it('returns module precedence only for matching scope', () => {
    expect(resolveGuidancePrecedence('test-nuxt-seo', 'test-nuxt-seo')).toBe('module')
    expect(resolveGuidancePrecedence('test-nuxt-seo', 'test-nuxt-ui')).toBe('core')
    expect(resolveGuidancePrecedence(undefined, 'test-nuxt-ui')).toBe('core')
  })
})

describe('shouldIncludeScripts', () => {
  it('enforces never, allowlist, always policies', () => {
    expect(shouldIncludeScripts('never', [], 'test-nuxt-seo')).toBe(false)
    expect(shouldIncludeScripts('allowlist', ['test-nuxt-seo'], 'test-nuxt-seo')).toBe(true)
    expect(shouldIncludeScripts('allowlist', ['test-nuxt-seo'], 'test-nuxt-ui')).toBe(false)
    expect(shouldIncludeScripts('always', [], 'test-nuxt-ui')).toBe(true)
  })
})
