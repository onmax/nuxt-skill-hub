import { describe, expect, it } from 'vitest'
import { resolveSkillAvailability } from '../docs/app/data/skill-packages'
import { createMetadataRouterSkillFiles, resolveMetadataRouterSkillName } from '../docs/shared/skill-preview'

describe('docs playground metadata routing', () => {
  it('distinguishes real, generated, and unavailable module guidance', () => {
    expect(resolveSkillAvailability('@nuxt/ui')).toBe('real')
    expect(resolveSkillAvailability('@nuxt/a11y', 'https://github.com/nuxt/a11y', 'https://a11y.nuxt.com')).toBe('generated')
    expect(resolveSkillAvailability('unknown-module')).toBe('unavailable')
  })

  it('builds metadata-routed preview files', () => {
    const skillName = resolveMetadataRouterSkillName('@nuxt/a11y')
    const files = createMetadataRouterSkillFiles({
      packageName: '@nuxt/a11y',
      skillName,
      repoUrl: 'https://github.com/nuxt/a11y',
      docsUrl: 'https://a11y.nuxt.com',
    })

    expect(skillName).toBe('nuxt-a11y')
    expect(files['SKILL.md']).toContain('This skill was generated from package metadata')
    expect(files['SKILL.md']).toContain('[https://github.com/nuxt/a11y](https://github.com/nuxt/a11y)')
    expect(files['references/index.md']).toContain('Official docs')
  })
})
