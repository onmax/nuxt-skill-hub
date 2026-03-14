import { promises as fsp } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  discoverInstalledPackageFromDirectory,
  getTargetSkillRoot,
  isValidSkillName,
  parseAgentSkillDeclarations,
  resolveExportRoot,
  resolveContributions,
  resolveMonorepoScopePath,
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
    expect(result.contributions[0]?.description).toBe('ok')
    expect(result.issues.some(issue => issue.reason.includes('description'))).toBe(true)
  })

  it('accepts quoted and multiline frontmatter descriptions', async () => {
    const root = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-'))
    const skillDir = join(root, 'skills', 'nuxt-ui')
    await fsp.mkdir(skillDir, { recursive: true })
    await fsp.writeFile(
      join(skillDir, 'SKILL.md'),
      [
        '---',
        'name: "nuxt-ui"',
        'description: |',
        '  Handles "Nuxt UI: forms" tasks.',
        '  Includes multiline guidance.',
        '---',
        '',
        '# Body',
      ].join('\n'),
      'utf8',
    )

    const result = await resolveContributions([
      {
        packageName: 'test-mod',
        packageRoot: root,
        skills: [
          { name: 'nuxt-ui', path: './skills/nuxt-ui' },
        ],
        issues: [],
      },
    ])

    expect(result.issues).toEqual([])
    expect(result.contributions[0]?.description).toBe('Handles "Nuxt UI: forms" tasks.\nIncludes multiline guidance.')
  })

  it('reports missing YAML frontmatter when a skill file has no frontmatter block', async () => {
    const root = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-'))
    const skillDir = join(root, 'skills', 'nuxt-ui')
    await fsp.mkdir(skillDir, { recursive: true })
    await fsp.writeFile(join(skillDir, 'SKILL.md'), '# No frontmatter\n', 'utf8')

    const result = await resolveContributions([
      {
        packageName: 'test-mod',
        packageRoot: root,
        skills: [
          { name: 'nuxt-ui', path: './skills/nuxt-ui' },
        ],
        issues: [],
      },
    ])

    expect(result.contributions).toEqual([])
    expect(result.issues).toContainEqual(expect.objectContaining({
      packageName: 'test-mod',
      skillName: 'nuxt-ui',
      reason: 'SKILL.md must include YAML frontmatter',
    }))
  })
})

describe('resolveExportRoot', () => {
  it('returns the nearest pnpm workspace root', async () => {
    const root = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-workspace-'))
    const workspaceRoot = join(root, 'repo')
    const appRoot = join(workspaceRoot, 'apps', 'web')

    await fsp.mkdir(appRoot, { recursive: true })
    await fsp.writeFile(join(workspaceRoot, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n', 'utf8')

    expect(await resolveExportRoot(appRoot)).toBe(workspaceRoot)
  })

  it('returns the nearest package workspace root', async () => {
    const root = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-workspace-'))
    const workspaceRoot = join(root, 'repo')
    const appRoot = join(workspaceRoot, 'packages', 'docs')

    await fsp.mkdir(appRoot, { recursive: true })
    await fsp.writeFile(join(workspaceRoot, 'package.json'), JSON.stringify({
      private: true,
      workspaces: ['packages/*'],
    }, null, 2), 'utf8')

    expect(await resolveExportRoot(appRoot)).toBe(workspaceRoot)
  })

  it('prefers the nearest enclosing workspace marker', async () => {
    const root = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-workspace-'))
    const outerRoot = join(root, 'outer')
    const innerRoot = join(outerRoot, 'inner')
    const appRoot = join(innerRoot, 'apps', 'web')

    await fsp.mkdir(appRoot, { recursive: true })
    await fsp.writeFile(join(outerRoot, 'pnpm-workspace.yaml'), 'packages:\n  - inner/*\n', 'utf8')
    await fsp.writeFile(join(innerRoot, 'package.json'), JSON.stringify({
      private: true,
      workspaces: ['apps/*'],
    }, null, 2), 'utf8')

    expect(await resolveExportRoot(appRoot)).toBe(innerRoot)
  })

  it('falls back to the app root when no workspace marker exists', async () => {
    const appRoot = await fsp.mkdtemp(join(tmpdir(), 'skill-hub-app-'))
    expect(await resolveExportRoot(appRoot)).toBe(appRoot)
  })
})

describe('getTargetSkillRoot', () => {
  it('mirrors claude-code skills dir to project-local path', () => {
    const root = '/tmp/project'
    const resolved = getTargetSkillRoot(root, 'claude-code', 'nuxt')

    expect(resolved.targetDir).toBe(join(root, '.claude', 'skills'))
    expect(resolved.skillRoot).toBe(join(root, '.claude', 'skills', 'nuxt'))
  })

  it('mirrors nested windsurf config path to project-local rules dir', () => {
    const root = '/tmp/project'
    const resolved = getTargetSkillRoot(root, 'windsurf', 'nuxt')

    expect(resolved.targetDir).toBe(join(root, '.codeium', 'windsurf', 'rules'))
    expect(resolved.skillRoot).toBe(join(root, '.codeium', 'windsurf', 'rules', 'nuxt'))
  })

  it('throws when target configDir is outside the home directory', async () => {
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

    expect(() => getTargetSkillRootWithMock(root, 'custom-agent', 'nuxt')).toThrow('is not under home')
  })

  it('keeps skill roots distinct for multiple apps sharing a workspace export root', () => {
    const exportRoot = '/tmp/workspace'
    const webSkill = getTargetSkillRoot(exportRoot, 'claude-code', 'nuxt-web')
    const adminSkill = getTargetSkillRoot(exportRoot, 'claude-code', 'nuxt-admin')

    expect(webSkill.targetDir).toBe(adminSkill.targetDir)
    expect(webSkill.skillRoot).toBe(join(exportRoot, '.claude', 'skills', 'nuxt-web'))
    expect(adminSkill.skillRoot).toBe(join(exportRoot, '.claude', 'skills', 'nuxt-admin'))
    expect(resolveMonorepoScopePath('/tmp/workspace/apps/web', exportRoot)).toBe('apps/web')
    expect(resolveMonorepoScopePath(exportRoot, exportRoot)).toBeUndefined()
  })
})
