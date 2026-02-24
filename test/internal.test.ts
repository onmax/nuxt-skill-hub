import { promises as fsp } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  isValidSkillName,
  parseAgentSkillDeclarations,
  parseSkillFrontmatter,
  resolveContributions,
  resolveGuidancePrecedence,
  shouldIncludeScripts,
  sortAndDedupeContributions,
} from '../src/internal'

describe('parseAgentSkillDeclarations', () => {
  it('returns valid entries and reports invalid declarations', () => {
    const parsed = parseAgentSkillDeclarations({
      agents: {
        skills: [
          { name: 'nuxt-ui', path: './skills/nuxt-ui' },
          { name: 'bad_name', path: './skills/empty-name' },
          { name: 'nuxt-seo', path: '' },
          { foo: 'bar' },
        ],
      },
    }, 'test-module')

    expect(parsed.skills).toEqual([{ name: 'nuxt-ui', path: './skills/nuxt-ui' }])
    expect(parsed.issues).toHaveLength(3)
    expect(parsed.issues.map(issue => issue.packageName)).toEqual(['test-module', 'test-module', 'test-module'])
  })
})

describe('isValidSkillName', () => {
  it('accepts and rejects names using strict skill format', () => {
    expect(isValidSkillName('nuxt-ui')).toBe(true)
    expect(isValidSkillName('Nuxt-ui')).toBe(false)
    expect(isValidSkillName('nuxt_ui')).toBe(false)
    expect(isValidSkillName('nuxt--ui')).toBe(false)
    expect(isValidSkillName(`a${'b'.repeat(64)}`)).toBe(false)
  })
})

describe('parseSkillFrontmatter', () => {
  it('parses name and description from YAML frontmatter', () => {
    const parsed = parseSkillFrontmatter(`---\nname: "nuxt-ui"\ndescription: Test skill\n---\n\n# Body`)

    expect(parsed).toEqual({
      name: 'nuxt-ui',
      description: 'Test skill',
    })
  })

  it('returns null when frontmatter is missing', () => {
    expect(parseSkillFrontmatter('# no frontmatter')).toBeNull()
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

describe('resolveContributions', () => {
  it('skips invalid frontmatter and keeps valid skills', async () => {
    const root = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-'))
    const validDir = join(root, 'skills', 'nuxt-ui')
    const invalidDir = join(root, 'skills', 'nuxt-seo')
    await fsp.mkdir(validDir, { recursive: true })
    await fsp.mkdir(invalidDir, { recursive: true })
    await fsp.writeFile(join(validDir, 'SKILL.md'), '---\nname: nuxt-ui\ndescription: ok\n---\n', 'utf8')
    await fsp.writeFile(join(invalidDir, 'SKILL.md'), '---\nname: nuxt-seo\n---\n', 'utf8')

    const result = await resolveContributions([
      {
        packageName: 'test-mod',
        packageRoot: root,
        skills: [
          { name: 'nuxt-ui', path: './skills/nuxt-ui' },
          { name: 'nuxt-seo', path: './skills/nuxt-seo' },
        ],
        issues: [],
      },
    ])

    expect(result.contributions.map(item => item.skillName)).toEqual(['nuxt-ui'])
    expect(result.issues.some(issue => issue.reason.includes('description'))).toBe(true)
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
