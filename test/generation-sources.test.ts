import { describe, expect, it } from 'vitest'
import { collectWorkspaceDiscoverySources } from '../src/generation/sources'

describe('collectWorkspaceDiscoverySources', () => {
  it('includes non-node_modules local discoveries and skips installed package roots', () => {
    const rootDir = '/repo/apps/web'

    const contributions = collectWorkspaceDiscoverySources(rootDir, [
      {
        packageName: 'web-app',
        version: '1.0.0',
        packageRoot: '/repo/apps/web',
        skills: [{ name: 'web-skill', path: './skills/web-skill' }],
        issues: [],
      },
      {
        packageName: 'workspace-module',
        version: '1.0.0',
        packageRoot: '/repo/packages/workspace-module',
        skills: [{ name: 'workspace-skill', path: './skills/workspace-skill' }],
        issues: [],
      },
      {
        packageName: 'installed-module',
        version: '1.0.0',
        packageRoot: '/repo/node_modules/installed-module',
        skills: [{ name: 'installed-skill', path: './skills/installed-skill' }],
        issues: [],
      },
    ])

    expect(contributions).toEqual([
      expect.objectContaining({
        packageName: 'web-app',
        skillName: 'web-skill',
        sourceDir: '/repo/apps/web/skills/web-skill',
        sourceRoot: '/repo/apps/web',
      }),
      expect.objectContaining({
        packageName: 'workspace-module',
        skillName: 'workspace-skill',
        sourceDir: '/repo/packages/workspace-module/skills/workspace-skill',
        sourceRoot: '/repo/packages/workspace-module',
      }),
    ])
  })
})
