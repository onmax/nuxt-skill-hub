import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { loadNuxtRuleFilesFromDir } from '../../shared/nuxt-content'
import { buildHostedSkillFiles } from '../modules/hosted-skill'
import { loadNuxtRuleFiles } from '../server/utils/nuxt-content'

vi.mock('../server/utils/vue-content', () => ({
  loadVueSkillFiles: async () => ({ 'SKILL.md': '# Vue guide' }),
}))

describe('hosted template guidance publication', () => {
  it('publishes the same module pack through the package loader, playground, and hosted skill', async () => {
    const docsRoot = join(process.cwd(), 'docs')
    const packageFiles = await loadNuxtRuleFilesFromDir(join(process.cwd(), 'nuxt-best-practices'))
    const docsFiles = await loadNuxtRuleFiles(docsRoot)
    const hostedFiles = await buildHostedSkillFiles(docsRoot)
    const path = 'rules/module-authoring.md'

    expect(docsFiles[path]).toBe(packageFiles[path])
    expect(hostedFiles[`references/nuxt/${path}`]).toBe(packageFiles[path])
    expect(hostedFiles['SKILL.md']).toContain(`./references/nuxt/${path}`)
  })
})
