import { promises as fsp } from 'node:fs'
import { dirname, join } from 'node:path'

const GITHUB_API_BASE = 'https://api.github.com'

interface GitHubContentEntry {
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  path: string
  name: string
  download_url?: string | null
}

export interface FetchJsonResult<T> {
  ok: boolean
  status: number
  data?: T
  error?: string
}

function encodeGitHubPath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join('/')
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'nuxt-skill-hub',
      },
    })
  }
  finally {
    clearTimeout(timeout)
  }
}

async function fetchJson<T>(url: string, timeoutMs: number): Promise<FetchJsonResult<T>> {
  try {
    const response = await fetchWithTimeout(url, timeoutMs)
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `HTTP ${response.status}`,
      }
    }

    return {
      ok: true,
      status: response.status,
      data: await response.json() as T,
    }
  }
  catch (error) {
    return {
      ok: false,
      status: 0,
      error: (error as Error).message,
    }
  }
}

async function fetchText(url: string, timeoutMs: number): Promise<FetchJsonResult<string>> {
  try {
    const response = await fetchWithTimeout(url, timeoutMs)
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `HTTP ${response.status}`,
      }
    }

    return {
      ok: true,
      status: response.status,
      data: await response.text(),
    }
  }
  catch (error) {
    return {
      ok: false,
      status: 0,
      error: (error as Error).message,
    }
  }
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

export async function fetchGitHubDefaultBranch(repo: string, timeoutMs: number): Promise<string | null> {
  const repoPath = toRepoPath(repo)
  if (!repoPath) {
    return null
  }

  const response = await fetchJson<{ default_branch?: string }>(`${GITHUB_API_BASE}/repos/${repoPath}`, timeoutMs)
  if (!response.ok || !response.data?.default_branch) {
    return null
  }

  return response.data.default_branch
}

export async function fetchGitHubFileText(
  repo: string,
  ref: string,
  filePath: string,
  timeoutMs: number,
): Promise<FetchJsonResult<string>> {
  const repoPath = toRepoPath(repo)
  if (!repoPath) {
    return {
      ok: false,
      status: 0,
      error: 'Invalid GitHub repository format',
    }
  }

  const encodedPath = encodeGitHubPath(filePath)
  const url = `${GITHUB_API_BASE}/repos/${repoPath}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`
  const response = await fetchJson<{ type?: string, content?: string, encoding?: string, download_url?: string | null }>(url, timeoutMs)
  if (!response.ok || !response.data) {
    return {
      ok: false,
      status: response.status,
      error: response.error,
    }
  }

  if (response.data.type !== 'file') {
    return {
      ok: false,
      status: response.status,
      error: 'Requested path is not a file',
    }
  }

  if (response.data.encoding === 'base64' && response.data.content) {
    return {
      ok: true,
      status: response.status,
      data: Buffer.from(response.data.content, 'base64').toString('utf8'),
    }
  }

  if (response.data.download_url) {
    return await fetchText(response.data.download_url, timeoutMs)
  }

  return {
    ok: false,
    status: response.status,
    error: 'No readable content for remote file',
  }
}

export interface DownloadResult {
  ok: boolean
  status?: number
  error?: string
}

export async function downloadGitHubDirectory(
  repo: string,
  ref: string,
  sourcePath: string,
  destinationDir: string,
  timeoutMs: number,
): Promise<DownloadResult> {
  const repoPath = toRepoPath(repo)
  if (!repoPath) {
    return {
      ok: false,
      error: 'Invalid GitHub repository format',
    }
  }

  const normalizedSourcePath = sourcePath.replace(/^\/+/, '').replace(/\/+$/, '')
  const stack = [normalizedSourcePath]
  await fsp.mkdir(destinationDir, { recursive: true })

  while (stack.length) {
    const current = stack.pop() || ''
    const encodedCurrent = encodeGitHubPath(current)
    const url = `${GITHUB_API_BASE}/repos/${repoPath}/contents/${encodedCurrent}?ref=${encodeURIComponent(ref)}`
    const response = await fetchJson<GitHubContentEntry[] | GitHubContentEntry>(url, timeoutMs)
    if (!response.ok || !response.data) {
      return {
        ok: false,
        status: response.status,
        error: response.error,
      }
    }

    const entries = Array.isArray(response.data) ? response.data : [response.data]
    if (!entries.length) {
      return {
        ok: false,
        error: 'No entries returned for remote path',
      }
    }

    for (const entry of entries) {
      if (entry.type === 'dir') {
        stack.push(entry.path)
        continue
      }

      if (entry.type !== 'file' || !entry.download_url) {
        continue
      }

      const fileText = await fetchText(entry.download_url, timeoutMs)
      if (!fileText.ok || fileText.data === undefined) {
        return {
          ok: false,
          status: fileText.status,
          error: fileText.error,
        }
      }

      const relativeFilePath = normalizedSourcePath
        ? entry.path.slice(normalizedSourcePath.length).replace(/^\/+/, '')
        : entry.path
      if (!relativeFilePath || relativeFilePath.includes('..') || relativeFilePath.startsWith('/')) {
        continue
      }
      const targetPath = join(destinationDir, relativeFilePath)
      await fsp.mkdir(dirname(targetPath), { recursive: true })
      await fsp.writeFile(targetPath, fileText.data, 'utf8')
    }
  }

  return { ok: true }
}
