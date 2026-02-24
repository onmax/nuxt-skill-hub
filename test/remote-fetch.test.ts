import { describe, expect, it } from 'vitest'
import { parseGitHubRepo } from '../src/remote-fetch'

describe('parseGitHubRepo', () => {
  it('parses common GitHub repository URL formats', () => {
    expect(parseGitHubRepo('onmax/nuxt-skills')).toBe('onmax/nuxt-skills')
    expect(parseGitHubRepo('https://github.com/onmax/nuxt-skills')).toBe('onmax/nuxt-skills')
    expect(parseGitHubRepo('https://github.com/onmax/nuxt-skills.git')).toBe('onmax/nuxt-skills')
    expect(parseGitHubRepo('git+https://github.com/onmax/nuxt-skills.git')).toBe('onmax/nuxt-skills')
    expect(parseGitHubRepo('git@github.com:onmax/nuxt-skills.git')).toBe('onmax/nuxt-skills')
    expect(parseGitHubRepo('git://github.com/onmax/nuxt-skills.git')).toBe('onmax/nuxt-skills')
  })

  it('returns null for non-GitHub values', () => {
    expect(parseGitHubRepo('https://example.com/onmax/nuxt-skills')).toBeNull()
    expect(parseGitHubRepo('')).toBeNull()
    expect(parseGitHubRepo(undefined)).toBeNull()
  })
})
