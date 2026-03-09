import { promises as fsp } from 'node:fs'
import { dirname, join } from 'pathe'
import { execFileSync } from 'node:child_process'
import { ofetch, type FetchOptions } from 'ofetch'

const GITHUB_API_BASE = 'https://api.github.com'
let cachedGitHubToken: string | null | undefined

interface GitHubContentEntry {
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  path: string
  name: string
  download_url?: string | null
}

function encodeGitHubPath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join('/')
}

function resolveGitHubToken(): string | undefined {
  if (cachedGitHubToken !== undefined) {
    return cachedGitHubToken || undefined
  }

  const envToken = process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim()
  if (envToken) {
    cachedGitHubToken = envToken
    return cachedGitHubToken
  }

  try {
    const token = execFileSync('gh', ['auth', 'token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    cachedGitHubToken = token || null
  }
  catch {
    cachedGitHubToken = null
  }

  return cachedGitHubToken || undefined
}

function githubFetchOptions(timeoutMs: number): FetchOptions {
  const token = resolveGitHubToken()
  return {
    timeout: timeoutMs,
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'nuxt-skill-hub',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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

export async function listGitHubDirectory(repo: string, ref: string, dirPath: string, timeoutMs: number): Promise<string[]> {
  const repoPath = toRepoPath(repo)
  if (!repoPath) return []

  const encodedPath = encodeGitHubPath(dirPath)
  const url = `${GITHUB_API_BASE}/repos/${repoPath}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`

  try {
    const data = await ofetch<GitHubContentEntry[] | GitHubContentEntry>(url, githubFetchOptions(timeoutMs))
    const entries = Array.isArray(data) ? data : [data]
    return entries.filter(e => e.type === 'dir').map(e => e.name)
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

  try {
    const data = await ofetch<{ default_branch?: string }>(`${GITHUB_API_BASE}/repos/${repoPath}`, githubFetchOptions(timeoutMs))
    return data.default_branch || null
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

  const encodedPath = encodeGitHubPath(filePath)
  const url = `${GITHUB_API_BASE}/repos/${repoPath}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`

  try {
    const data = await ofetch<{ type?: string, content?: string, encoding?: string, download_url?: string | null }>(url, githubFetchOptions(timeoutMs))

    if (data.type !== 'file') {
      return { ok: false, error: 'Requested path is not a file' }
    }

    if (data.encoding === 'base64' && data.content) {
      return { ok: true, data: Buffer.from(data.content, 'base64').toString('utf8') }
    }

    if (data.download_url) {
      const text = await ofetch<string>(data.download_url, { ...githubFetchOptions(timeoutMs), responseType: 'text' })
      return { ok: true, data: text }
    }

    return { ok: false, error: 'No readable content for remote file' }
  }
  catch (error) {
    return { ok: false, error: (error as Error).message }
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
    return { ok: false, error: 'Invalid GitHub repository format' }
  }

  const normalizedSourcePath = sourcePath.replace(/^\/+/, '').replace(/\/+$/, '')
  const stack = [normalizedSourcePath]
  await fsp.mkdir(destinationDir, { recursive: true })
  const opts = githubFetchOptions(timeoutMs)

  while (stack.length) {
    const current = stack.pop() || ''
    const encodedCurrent = encodeGitHubPath(current)
    const url = `${GITHUB_API_BASE}/repos/${repoPath}/contents/${encodedCurrent}?ref=${encodeURIComponent(ref)}`

    let entries: GitHubContentEntry[]
    try {
      const data = await ofetch<GitHubContentEntry[] | GitHubContentEntry>(url, opts)
      entries = Array.isArray(data) ? data : [data]
    }
    catch (error) {
      return { ok: false, error: (error as Error).message }
    }

    if (!entries.length) {
      return { ok: false, error: 'No entries returned for remote path' }
    }

    for (const entry of entries) {
      if (entry.type === 'dir') {
        stack.push(entry.path)
        continue
      }

      if (entry.type !== 'file' || !entry.download_url) {
        continue
      }

      try {
        const fileText = await ofetch<string>(entry.download_url, { ...opts, responseType: 'text' })
        const relativeFilePath = normalizedSourcePath
          ? entry.path.slice(normalizedSourcePath.length).replace(/^\/+/, '')
          : entry.path
        if (!relativeFilePath || relativeFilePath.includes('..') || relativeFilePath.startsWith('/')) {
          continue
        }
        const targetPath = join(destinationDir, relativeFilePath)
        await fsp.mkdir(dirname(targetPath), { recursive: true })
        await fsp.writeFile(targetPath, fileText, 'utf8')
      }
      catch (error) {
        return { ok: false, error: (error as Error).message }
      }
    }
  }

  return { ok: true }
}
