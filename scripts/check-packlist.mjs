import { execFileSync } from 'node:child_process'

const output = execFileSync('npm', ['pack', '--dry-run'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
})

const forbiddenEntries = [
  'docs/',
  'playground/',
  'test/',
  '.codex/',
  'src/',
]

const leakedEntries = forbiddenEntries.filter(entry => output.includes(entry))

if (leakedEntries.length) {
  console.error(`Forbidden files leaked into npm pack output: ${leakedEntries.join(', ')}`)
  process.exit(1)
}
