import { describe, expect, it } from 'vitest'
import { DEFAULT_CORE_CONTENT_METADATA, createSkillEntrypoint } from '../src/render-content'

describe('createSkillEntrypoint', () => {
  it('omits the monorepo scope section for standalone apps', () => {
    const entry = createSkillEntrypoint('nuxt', DEFAULT_CORE_CONTENT_METADATA)

    expect(entry).toContain('# Nuxt Skill Router')
    expect(entry).toContain('## Activation Flow')
    expect(entry).toContain('## Always Apply')
    expect(entry).toContain('## Precedence')
    expect(entry).not.toContain('## Monorepo Scope')
  })

  it('renders a hard monorepo scope warning when a scope path is provided', () => {
    const entry = createSkillEntrypoint('nuxt-web', DEFAULT_CORE_CONTENT_METADATA, 'apps/web')

    expect(entry).toContain('## Monorepo Scope')
    expect(entry).toContain('`apps/web`')
    expect(entry).toContain('Treat files and tasks outside `apps/web` as out of scope unless the user explicitly redirects you there.')
  })
})
