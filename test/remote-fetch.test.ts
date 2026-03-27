import { describe, expect, it, vi } from 'vitest'
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

describe('remote fetch memoization', () => {
  it('memoizes default branch lookups per repo', async () => {
    const ofetchMock = vi.fn(async () => ({ repo: { defaultBranch: 'main' } }))

    vi.resetModules()
    vi.doMock('ofetch', () => ({
      ofetch: ofetchMock,
    }))

    const { fetchGitHubDefaultBranch } = await import('../src/remote-fetch')

    expect(await fetchGitHubDefaultBranch('onmax/nuxt-skills', 200)).toBe('main')
    expect(await fetchGitHubDefaultBranch('https://github.com/onmax/nuxt-skills', 400)).toBe('main')
    expect(ofetchMock).toHaveBeenCalledTimes(1)
  })

  it('memoizes file and directory fetches per repo/ref/path', async () => {
    const ofetchMock = vi.fn(async (url: string) => {
      if (url.includes('/git/trees/')) {
        return {
          tree: [
            { path: 'skills/nuxt-ui', type: 'tree' },
            { path: 'skills/nuxt-seo', type: 'tree' },
          ],
        }
      }

      return '{"name":"nuxt-skills"}'
    })

    vi.resetModules()
    vi.doMock('ofetch', () => ({
      ofetch: ofetchMock,
    }))

    const { fetchGitHubFileText, listGitHubDirectory } = await import('../src/remote-fetch')

    await fetchGitHubFileText('onmax/nuxt-skills', 'main', 'package.json', 200)
    await fetchGitHubFileText('onmax/nuxt-skills', 'main', 'package.json', 200)
    expect(await listGitHubDirectory('onmax/nuxt-skills', 'main', 'skills', 200)).toEqual(['nuxt-seo', 'nuxt-ui'])
    expect(await listGitHubDirectory('onmax/nuxt-skills', 'main', 'skills', 200)).toEqual(['nuxt-seo', 'nuxt-ui'])
    expect(ofetchMock).toHaveBeenCalledTimes(2)
  })
})
