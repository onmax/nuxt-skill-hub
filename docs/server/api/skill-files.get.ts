import { loadCoreMetadata, loadCoreRuleFiles } from '../utils/core-content'
import { createReferencesIndexContent, createSkillEntrypoint } from '~~/shared/skill-preview'

export default defineEventHandler(async () => {
  const coreFiles = Object.entries(await loadCoreRuleFiles())
    .sort((a, b) => a[0].localeCompare(b[0]))
  const metadata = await loadCoreMetadata()

  const skillEntrypoint = createSkillEntrypoint('nuxt', metadata)
  const referencesIndex = createReferencesIndexContent(metadata, [])

  // Build manifest
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    skillName: 'nuxt',
    target: 'claude-code',
    targetDir: '.claude/skills/nuxt',
    modules: [],
    skipped: [],
  }

  return {
    metadata,
    skillEntrypoint,
    referencesIndex,
    manifest,
    coreFiles: Object.fromEntries(coreFiles),
  }
})
