import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    'source-dir': { type: 'string' },
    'ref': { type: 'string', default: 'main' },
    'check': { type: 'boolean', default: false },
  },
})
const sourcePath = 'skills/nuxt-modules/references/template-dependencies.md'
const sourceUrl = `https://raw.githubusercontent.com/onmax/nuxt-skills/${encodeURIComponent(values.ref)}/${sourcePath}`
const source = values['source-dir']
  ? await readFile(resolve(values['source-dir'], sourcePath), 'utf8')
  : await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) }).then((response) => {
      if (!response.ok) throw new Error(`Cannot fetch ${sourceUrl}: ${response.status}`)
      return response.text()
    })

if (!source.startsWith('# Template regeneration in development\n')) {
  throw new Error('Unexpected template guidance source')
}

const targetPath = fileURLToPath(new URL('../nuxt-best-practices/rules/module-authoring.md', import.meta.url))
const target = await readFile(targetPath, 'utf8')
const region = /<!-- BEGIN GENERATED TEMPLATE GUIDANCE -->[\s\S]*?<!-- END GENERATED TEMPLATE GUIDANCE -->/
if (!region.test(target)) throw new Error('Missing template guidance markers')

const digest = createHash('sha256').update(source).digest('hex')
const generated = [
  '<!-- BEGIN GENERATED TEMPLATE GUIDANCE -->',
  `<!-- Generated from onmax/nuxt-skills/${sourcePath}; SHA-256: ${digest}. Run pnpm sync:template-guidance; edit the source, not this section. -->`,
  source.trimEnd().replace(/^# /, '### '),
  '<!-- END GENERATED TEMPLATE GUIDANCE -->',
].join('\n\n')
const updated = target.replace(region, () => generated)
if (values.check) {
  if (target !== updated) throw new Error('Template guidance is stale. Run pnpm sync:template-guidance with the same source options.')
  console.log('Template guidance matches nuxt-skills')
}
else {
  await writeFile(targetPath, updated)
  console.log('Synced template guidance from nuxt-skills')
}
