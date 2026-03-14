import { ofetch } from 'ofetch'

const GITHUB_API_BASE = 'https://api.github.com'
const UNGH_API_BASE = 'https://ungh.cc'

interface GitHubTreeEntry {
  path: string
  type: 'blob' | 'tree'
}

function githubFetchOptions(timeoutMs: number) {
  return {
    timeout: timeoutMs,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'nuxt-skill-hub',
    },
  }
}

function encodeGitHubPath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join('/')
}

function toRepoPath(value: string): string | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  const direct = trimmed
    .replace(/^git\+/, '')
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/^git:\/\/github\.com\//, '')
    .replace(/^git@github\.com:/, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/, '')

  if (/^[\w.-]+\/[\w.-]+$/.test(direct)) {
    return direct
  }

  try {
    const url = new URL(trimmed.replace(/^git\+/, ''))
    if (url.hostname !== 'github.com') {
      return null
    }

    const pathname = url.pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '')
    if (/^[\w.-]+\/[\w.-]+$/.test(pathname)) {
      return pathname
    }
  }
  catch {
    // ignore invalid URL formats
  }

  return null
}

export function parseGitHubRepo(input: string | undefined | null): string | null {
  if (!input) {
    return null
  }

  return toRepoPath(input)
}

export async function listGitHubDirectory(repo: string, ref: string, dirPath: string, timeoutMs: number): Promise<string[]> {
  const repoPath = toRepoPath(repo)
  if (!repoPath) {
    return []
  }

  const normalizedDirPath = dirPath.replace(/^\/+|\/+$/g, '')
  const prefix = normalizedDirPath ? `${normalizedDirPath}/` : ''

  try {
    const data = await ofetch<{ tree?: GitHubTreeEntry[] }>(
      `${GITHUB_API_BASE}/repos/${repoPath}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
      githubFetchOptions(timeoutMs),
    )

    const entries = new Set<string>()
    for (const entry of data.tree || []) {
      if (entry.type !== 'tree' || !entry.path.startsWith(prefix)) {
        continue
      }

      const remainder = entry.path.slice(prefix.length)
      if (remainder && !remainder.includes('/')) {
        entries.add(remainder)
      }
    }

    return Array.from(entries).sort((a, b) => a.localeCompare(b))
  }
  catch {
    return []
  }
}

export async function fetchGitHubDefaultBranch(repo: string, timeoutMs: number): Promise<string | null> {
  const repoPath = toRepoPath(repo)
  if (!repoPath) {
    return null
  }

  const [owner, name] = repoPath.split('/')
  if (!owner || !name) {
    return null
  }

  try {
    const data = await ofetch<{ repo?: { defaultBranch?: string } }>(
      `${UNGH_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
      githubFetchOptions(timeoutMs),
    )
    return data.repo?.defaultBranch || null
  }
  catch {
    return null
  }
}

export async function fetchGitHubFileText(
  repo: string,
  ref: string,
  filePath: string,
  timeoutMs: number,
): Promise<{ ok: boolean, data?: string, status?: number, error?: string }> {
  const repoPath = toRepoPath(repo)
  if (!repoPath) {
    return { ok: false, error: 'Invalid GitHub repository format' }
  }

  try {
    const data = await ofetch(
      `https://raw.githubusercontent.com/${repoPath}/${encodeURIComponent(ref)}/${encodeGitHubPath(filePath)}`,
      {
        ...githubFetchOptions(timeoutMs),
        responseType: 'text' as const,
      },
    )
    return { ok: true, data }
  }
  catch (error) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status?: number }).status)
      : undefined

    return {
      ok: false,
      status,
      error: (error as Error).message,
    }
  }
}
