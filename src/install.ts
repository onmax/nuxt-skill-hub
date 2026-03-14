import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'pathe'
import { useLogger } from '@nuxt/kit'
import { createConsola } from 'consola'
import { readPackageJSON } from 'pkg-types'
import type { Nuxt } from '@nuxt/schema'
import { detectCurrentTarget, detectInstalledTargets, getSupportedTargets } from './agents'
import { extractModuleSpecifier, discoverInstalledPackageFromSpecifier, getTargetSkillRoot, isValidSkillName, MANAGED_HINT_END, MANAGED_HINT_START, pathExists, resolveExportRoot } from './internal'

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

export async function runInstallWizard(nuxt: Nuxt): Promise<void> {
  const logger = useLogger('nuxt-skill-hub')

  // Skip in CI or non-interactive environments
  if (process.env.CI || !process.stdout.isTTY) {
    logger.info('Non-interactive environment detected, skipping install wizard.')
    return
  }

  const consola = createConsola()
  const rootDir = nuxt.options.rootDir
  const exportRoot = await resolveExportRoot(rootDir)
  const pkg = await readPackageJSON(rootDir).catch(() => null)
  const projectName = (pkg?.name || '').replace(/^@[^/]+\//, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '')
  let skillName = projectName ? `nuxt-${projectName}` : 'nuxt'
  if (!isValidSkillName(skillName)) skillName = 'nuxt'
  const pendingWrites: PendingWrite[] = []

  consola.box(
    `nuxt-skill-hub — First-time setup\n`
    + `Let's configure AI agent skills for your Nuxt project.`,
  )

  // ── Step 1: Detect agents ──
  const currentTarget = detectCurrentTarget()
  let selectedTargets: string[]

  if (currentTarget) {
    consola.info(`Running inside ${currentTarget}, auto-selecting it.`)
    selectedTargets = [currentTarget]
  }
  else {
    const detectedTargets = detectInstalledTargets(rootDir)
    const allTargets = getSupportedTargets()

    if (!detectedTargets.length && !allTargets.length) {
      consola.warn('No AI agents detected. Skills will be generated when an agent is detected.')
      consola.info('Supported agents are sourced from unagent.')
      return
    }

    consola.info(`Detected agents: ${detectedTargets.length ? detectedTargets.join(', ') : 'none'}`)
    selectedTargets = detectedTargets

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
  }

  // ── Step 2: Module skills ──
  const moduleSpecifiers = (nuxt.options.modules || [])
    .map(entry => extractModuleSpecifier(entry))
    .filter((entry): entry is string => Boolean(entry))

  const uniqueSpecifiers = Array.from(new Set(moduleSpecifiers))
  const installedModulePackages: string[] = []

  for (const specifier of uniqueSpecifiers) {
    const pkg = await discoverInstalledPackageFromSpecifier(specifier, rootDir)
    if (!pkg || pkg.packageName === 'nuxt-skill-hub')
      continue

    installedModulePackages.push(pkg.packageName)
  }

  if (installedModulePackages.length) {
    consola.info(`Detected ${installedModulePackages.length} installed module package(s):`)
    for (const packageName of installedModulePackages) {
      consola.log(`  ${packageName}`)
    }
    consola.info('Module skills and metadata routers are resolved automatically at build time.')
  }
  else {
    consola.info('No installed module entries were discovered.')
  }

  // ── Step 3: .gitignore ──
  const gitignorePath = join(exportRoot, '.gitignore')
  const gitignoreExists = existsSync(gitignorePath)
  const currentGitignore = gitignoreExists ? readFileSync(gitignorePath, 'utf8') : ''

  const missingPatterns: string[] = []
  for (const target of selectedTargets) {
    const { targetDir } = getTargetSkillRoot(exportRoot, target, skillName)
    const pattern = relative(exportRoot, targetDir).replace(/\/?$/, '/')
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

  // ── Step 4: CLAUDE.md / AGENTS.md hint ──
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
    const filePath = join(exportRoot, filename)
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
      description: 'Add skill hint block',
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

  // ── Step 5: Summary + Confirmation ──
  if (!pendingWrites.length) {
    consola.success('No file changes needed. Setup complete!')
    consola.info('Run `nuxt dev` or `nuxt prepare` to generate skills.')
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

  // ── Step 6: Execute writes ──
  for (const write of pendingWrites) {
    writeFileSync(write.absPath, write.content, 'utf8')
    const verb = write.action === 'create' ? 'Created' : 'Updated'
    consola.success(`${verb} ${write.file}`)
  }

  consola.log('')
  consola.box(
    `Setup complete!\n\n`
    + `Run \`nuxt dev\` or \`nuxt prepare\` to generate skills.\n`
    + `Configure \`skillHub.skillName\` or \`skillHub.targets\` in nuxt.config.ts if needed.`,
  )
}
