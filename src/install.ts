import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createConsola } from 'consola'
import type { Nuxt } from '@nuxt/schema'
import { detectInstalledTargets, getSupportedTargets } from './agents'
import { extractModuleSpecifier, discoverInstalledPackageFromSpecifier, getTargetSkillRoot, pathExists } from './internal'
import { findFallbackMapEntry } from './fallback-map'

const MANAGED_HINT_START = '<!-- nuxt-skill-hub:start -->'
const MANAGED_HINT_END = '<!-- nuxt-skill-hub:end -->'

interface PendingWrite {
  file: string
  absPath: string
  description: string
  content: string
  action: 'create' | 'modify'
}

function isCancelled(value: unknown): boolean {
  return value === null || typeof value === 'symbol'
}

function toPosix(path: string): string {
  return path.split(/[\\/]/).join('/')
}

export async function runInstallWizard(nuxt: Nuxt): Promise<void> {
  // Skip in CI or non-interactive environments
  if (process.env.CI || process.env.CODEX_SHELL === '1' || !process.stdout.isTTY) {
    return
  }

  const consola = createConsola()
  const rootDir = nuxt.options.rootDir
  const skillName = 'nuxt'
  const pendingWrites: PendingWrite[] = []

  consola.box(
    `nuxt-skill-hub — First-time setup\n`
    + `Let's configure AI agent skills for your Nuxt project.`,
  )

  // ── Step 1: Detect agents ──────────────────────────────────────────────
  const detectedTargets = detectInstalledTargets(rootDir)
  const allTargets = getSupportedTargets()

  if (!detectedTargets.length && !allTargets.length) {
    consola.warn('No AI agents detected. Skills will be generated when an agent is detected.')
    consola.info('Supported agents: claude-code, codex, cursor, codeium, windsurf')
    return
  }

  consola.info(`Detected agents: ${detectedTargets.length ? detectedTargets.join(', ') : 'none'}`)

  let selectedTargets = detectedTargets

  if (detectedTargets.length > 1) {
    const keepAll = await consola.prompt('Generate skills for all detected agents?', {
      type: 'confirm',
      initial: true,
      cancel: 'null',
    })

    if (isCancelled(keepAll)) {
      consola.info('Setup cancelled.')
      return
    }

    if (!keepAll) {
      const chosen = await consola.prompt('Select agents to generate skills for:', {
        type: 'multiselect',
        options: detectedTargets.map(t => ({ label: t, value: t })),
        initial: detectedTargets,
        required: true,
        cancel: 'null',
      })

      if (isCancelled(chosen)) {
        consola.info('Setup cancelled.')
        return
      }

      selectedTargets = (chosen as unknown as Array<{ label: string, value: string }>).map(c => c.value)
    }
  }

  // ── Step 2: Module skills ──────────────────────────────────────────────
  const moduleSpecifiers = (nuxt.options.modules || [])
    .map(entry => extractModuleSpecifier(entry))
    .filter((entry): entry is string => Boolean(entry))

  const uniqueSpecifiers = Array.from(new Set(moduleSpecifiers))
  const availableSkills: Array<{ packageName: string, skillName: string, source: string }> = []

  for (const specifier of uniqueSpecifiers) {
    const pkg = await discoverInstalledPackageFromSpecifier(specifier, rootDir)
    if (!pkg || pkg.packageName === 'nuxt-skill-hub')
      continue

    const fallback = findFallbackMapEntry(pkg.packageName)
    if (fallback) {
      availableSkills.push({ packageName: pkg.packageName, skillName: fallback.skillName, source: 'community' })
    }
  }

  if (availableSkills.length) {
    // Dedupe by skillName (multiple packages can map to same skill)
    const seen = new Set<string>()
    const deduped = availableSkills.filter((s) => {
      if (seen.has(s.skillName))
        return false
      seen.add(s.skillName)
      return true
    })

    consola.info(`Found ${deduped.length} module skill(s):`)
    for (const skill of deduped) {
      consola.log(`  ${skill.packageName} → ${skill.skillName} (${skill.source})`)
    }

    const includeAll = await consola.prompt('Include all available module skills?', {
      type: 'confirm',
      initial: true,
      cancel: 'null',
    })

    if (isCancelled(includeAll)) {
      consola.info('Setup cancelled.')
      return
    }

    // If user wants to exclude some skills, they can configure excludeSkills in nuxt.config later
    if (!includeAll) {
      consola.info('You can exclude specific skills via skillHub.excludeSkills in nuxt.config.ts')
    }
  }
  else {
    consola.info('No module skills found in fallback map. Skills will be resolved at build time.')
  }

  // ── Step 3: .gitignore ─────────────────────────────────────────────────
  const gitignorePath = join(rootDir, '.gitignore')
  const gitignoreExists = existsSync(gitignorePath)
  const currentGitignore = gitignoreExists ? readFileSync(gitignorePath, 'utf8') : ''

  const missingPatterns: string[] = []
  for (const target of selectedTargets) {
    const { targetDir } = getTargetSkillRoot(rootDir, target, skillName)
    const pattern = toPosix(relative(rootDir, targetDir)).replace(/\/?$/, '/')
    if (!currentGitignore.includes(pattern)) {
      missingPatterns.push(pattern)
    }
  }

  if (missingPatterns.length) {
    const addGitignore = await consola.prompt(
      `Add generated skill directories to .gitignore?\n${missingPatterns.map(p => `  ${p}`).join('\n')}`,
      { type: 'confirm', initial: true, cancel: 'null' },
    )

    if (isCancelled(addGitignore)) {
      consola.info('Setup cancelled.')
      return
    }

    if (addGitignore) {
      const block = `\n# nuxt-skill-hub (generated skills)\n${missingPatterns.join('\n')}\n`
      const newContent = currentGitignore.trimEnd() + '\n' + block
      pendingWrites.push({
        file: '.gitignore',
        absPath: gitignorePath,
        description: `Add ${missingPatterns.length} skill directory pattern(s)`,
        content: newContent,
        action: gitignoreExists ? 'modify' : 'create',
      })
    }
  }

  // ── Step 4: CLAUDE.md / AGENTS.md hint ─────────────────────────────────
  const hintBlock = `${MANAGED_HINT_START}\nUse the \`${skillName}\` skill as the first entrypoint for Nuxt tasks in this repository.\n${MANAGED_HINT_END}`

  const hintFileChoice = await consola.prompt('Add a skill hint to help agents discover the skill?', {
    type: 'select',
    options: [
      { label: 'CLAUDE.md', value: 'claude', hint: 'Claude Code project instructions' },
      { label: 'AGENTS.md', value: 'agents', hint: 'Universal agent instructions' },
      { label: 'Both', value: 'both' },
      { label: 'Skip', value: 'skip' },
    ],
    cancel: 'null',
  })

  if (isCancelled(hintFileChoice)) {
    consola.info('Setup cancelled.')
    return
  }

  const addToFile = async (filename: string) => {
    const filePath = join(rootDir, filename)
    const exists = await pathExists(filePath)
    const current = exists ? readFileSync(filePath, 'utf8') : ''
    const regex = new RegExp(`${MANAGED_HINT_START}[\\s\\S]*?${MANAGED_HINT_END}`)

    let newContent: string
    if (regex.test(current)) {
      newContent = current.replace(regex, hintBlock)
    }
    else if (current) {
      newContent = `${current.trimEnd()}\n\n${hintBlock}\n`
    }
    else {
      newContent = `${hintBlock}\n`
    }

    pendingWrites.push({
      file: filename,
      absPath: filePath,
      description: `Add skill hint block`,
      content: newContent,
      action: exists ? 'modify' : 'create',
    })
  }

  if (hintFileChoice === 'claude' || hintFileChoice === 'both') {
    await addToFile('CLAUDE.md')
  }
  if (hintFileChoice === 'agents' || hintFileChoice === 'both') {
    await addToFile('AGENTS.md')
  }

  // ── Step 5: Summary + Confirmation ─────────────────────────────────────
  if (!pendingWrites.length) {
    consola.success('No file changes needed. Setup complete!')
    consola.info(`Run \`nuxt dev\` or \`nuxt prepare\` to generate skills.`)
    return
  }

  consola.log('')
  consola.info('Planned changes:')
  for (const write of pendingWrites) {
    const icon = write.action === 'create' ? '+' : '~'
    consola.log(`  ${icon} ${write.file} — ${write.description}`)
  }
  consola.log('')

  const confirm = await consola.prompt('Apply these changes?', {
    type: 'confirm',
    initial: true,
    cancel: 'null',
  })

  if (isCancelled(confirm) || !confirm) {
    consola.info('Setup cancelled. No files were modified.')
    return
  }

  // ── Step 6: Execute writes ─────────────────────────────────────────────
  for (const write of pendingWrites) {
    writeFileSync(write.absPath, write.content, 'utf8')
    const verb = write.action === 'create' ? 'Created' : 'Updated'
    consola.success(`${verb} ${write.file}`)
  }

  consola.log('')
  consola.box(
    `Setup complete!\n\n`
    + `Run \`nuxt dev\` or \`nuxt prepare\` to generate skills.\n`
    + `Configure options in nuxt.config.ts under \`skillHub\`.`,
  )
}
