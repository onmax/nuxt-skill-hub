import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const spec = `${pkg.name}@${pkg.version}`

// npm view exits non-zero when the package/version is missing — that's the pass case.
let published = ''
try {
  published = execFileSync('npm', ['view', spec, 'version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
}
catch {}

if (published) {
  console.error(`${spec} is already published on npm. Bump package.json before publishing.`)
  process.exit(1)
}
