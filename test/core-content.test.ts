import { describe, expect, it } from 'vitest'
import { createSkillEntrypoint } from '../src/core-content'

describe('createSkillEntrypoint', () => {
  it('omits the monorepo scope section for standalone apps', () => {
    const entry = createSkillEntrypoint('nuxt')

    expect(entry).toContain('# Nuxt Super Skill')
    expect(entry).not.toContain('## Monorepo Scope')
  })

  it('renders a hard monorepo scope warning when a scope path is provided', () => {
    const entry = createSkillEntrypoint('nuxt-web', 'apps/web')

    expect(entry).toContain('## Monorepo Scope')
    expect(entry).toContain('`apps/web`')
    expect(entry).toContain('Treat files and tasks outside `apps/web` as out of scope unless the user explicitly redirects you there.')
  })
})
