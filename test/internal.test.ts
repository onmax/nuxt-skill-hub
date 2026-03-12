import { promises as fsp } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  discoverInstalledPackageFromDirectory,
  getTargetSkillRoot,
  isValidSkillName,
  parseAgentSkillDeclarations,
  parseSkillFrontmatter,
  resolveContributions,
  resolveGuidancePrecedence,
  shouldIncludeScripts,
  sortAndDedupeContributions,
} from '../src/internal'

afterEach(() => {
  vi.unmock('../src/agents')
  vi.resetModules()
})

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

describe('discoverInstalledPackageFromDirectory', () => {
  it('reads package metadata from a resolved layer directory', async () => {
    const root = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-layer-'))
    await fsp.writeFile(join(root, 'package.json'), JSON.stringify({
      name: 'docus',
      version: '5.8.0',
      repository: {
        type: 'git',
        url: 'git+https://github.com/nuxt-content/docus.git',
      },
    }, null, 2), 'utf8')

    const result = await discoverInstalledPackageFromDirectory(root)

    expect(result).toMatchObject({
      packageName: 'docus',
      version: '5.8.0',
      packageRoot: root,
      repository: 'git+https://github.com/nuxt-content/docus.git',
    })
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
        sourceKind: 'dist',
        official: true,
        resolver: 'agentsField',
        forceIncludeScripts: false,
      },
      {
        packageName: 'a-module',
        skillName: 'a',
        sourceDir: '/tmp/a',
        sourceRoot: '/tmp',
        sourceKind: 'dist',
        official: true,
        resolver: 'agentsField',
        forceIncludeScripts: false,
      },
      {
        packageName: 'a-module',
        skillName: 'a',
        sourceDir: '/tmp/a',
        sourceRoot: '/tmp',
        sourceKind: 'dist',
        official: true,
        resolver: 'agentsField',
        forceIncludeScripts: false,
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

describe('getTargetSkillRoot', () => {
  it('mirrors claude-code skills dir to project-local path', () => {
    const root = '/tmp/project'
    const resolved = getTargetSkillRoot(root, 'claude-code', 'nuxt')

    expect(resolved.targetDir).toBe(join(root, '.claude', 'skills'))
    expect(resolved.skillRoot).toBe(join(root, '.claude', 'skills', 'nuxt'))
    expect(resolved.warning).toBeUndefined()
  })

  it('mirrors nested windsurf config path to project-local rules dir', () => {
    const root = '/tmp/project'
    const resolved = getTargetSkillRoot(root, 'windsurf', 'nuxt')

    expect(resolved.targetDir).toBe(join(root, '.codeium', 'windsurf', 'rules'))
    expect(resolved.skillRoot).toBe(join(root, '.codeium', 'windsurf', 'rules', 'nuxt'))
    expect(resolved.warning).toBeUndefined()
  })

  it('falls back when target configDir is outside the home directory', async () => {
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

    const { getTargetSkillRoot: getTargetSkillRootWithMock } = await import('../src/internal')
    const root = '/tmp/project'
    const resolved = getTargetSkillRootWithMock(root, 'custom-agent', 'nuxt')

    expect(resolved.targetDir).toBe(join(root, '.custom-agent', 'rules'))
    expect(resolved.skillRoot).toBe(join(root, '.custom-agent', 'rules', 'nuxt'))
    expect(resolved.warning).toContain('is not under home')
  })
})
