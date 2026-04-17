import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const spec = `${pkg.name}@${pkg.version}`

try {
  const publishedVersion = execFileSync('npm', ['view', spec, 'version', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()

  if (publishedVersion) {
    console.error(`${spec} is already published on npm. Bump package.json before publishing.`)
    process.exit(1)
  }
}
catch (error) {
  const stderr = String(error.stderr || '')
  const stdout = String(error.stdout || '')
  const output = `${stderr}\n${stdout}`

  if (output.includes('E404') || output.includes('404 Not Found')) {
    process.exit(0)
  }

  console.error(`Could not verify whether ${spec} is already published on npm.`)
  if (stderr.trim()) console.error(stderr.trim())
  if (stdout.trim()) console.error(stdout.trim())
  process.exit(1)
}
