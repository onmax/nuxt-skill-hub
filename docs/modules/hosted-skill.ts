import { promises as fsp } from 'node:fs'
import { defineNuxtModule } from 'nuxt/kit'
import { dirname, join } from 'pathe'
import { createSkillEntrypoint, DEFAULT_NUXT_CONTENT_METADATA, selectLinkedPacks, UPSTREAM_VUE_GUIDE_URL, type SkillEntrypointOptions } from '../../shared/skill-render'
import { loadNuxtRuleFiles } from '../server/utils/nuxt-content'
import { loadVueSkillFiles } from '../server/utils/vue-content'

const SKILL_NAME = 'nuxt'

const projectGuidanceSection = `## Project-specific guidance
This hosted skill covers Nuxt itself. Module APIs (Nuxt UI, Nuxt Content, NuxtHub, and others) change between versions, so check the installed module's docs before relying on exact props or options.

For guidance that matches the modules and versions installed in a project, add the Nuxt module there:

\`\`\`bash
npx nuxi module add nuxt-skill-hub
\`\`\`

\`nuxt prepare\` then writes a local skill that also includes each installed module's skill.`

export async function buildHostedSkillFiles(docsRoot: string): Promise<Record<string, string>> {
  const [nuxtFiles, vueFiles] = await Promise.all([loadNuxtRuleFiles(docsRoot), loadVueSkillFiles(docsRoot)])
  // Without a bundled Vue guide, link to the upstream copy instead of failing the build.
  const hasVueGuide = Boolean(vueFiles['SKILL.md'])
  if (!hasVueGuide) {
    console.warn(`[hosted-skill] Vue guide unavailable, linking to ${UPSTREAM_VUE_GUIDE_URL}`)
  }

  const entrypointOptions: SkillEntrypointOptions = {
    moduleAuthoring: true,
    installedPackages: DEFAULT_NUXT_CONTENT_METADATA.packs.flatMap(pack => pack.packages || []),
    extraSections: [projectGuidanceSection],
    vueGuideHref: hasVueGuide ? undefined : UPSTREAM_VUE_GUIDE_URL,
  }
  const files: Record<string, string> = {
    'SKILL.md': createSkillEntrypoint(SKILL_NAME, DEFAULT_NUXT_CONTENT_METADATA, entrypointOptions),
  }

  for (const pack of selectLinkedPacks(DEFAULT_NUXT_CONTENT_METADATA, entrypointOptions)) {
    files[`references/nuxt/${pack.relativePath}`] = nuxtFiles[pack.relativePath]!
  }
  if (hasVueGuide) {
    for (const [path, contents] of Object.entries(vueFiles)) files[`references/vue/${path}`] = contents
  }

  return files
}

function readDescription(skill: string): string {
  const match = skill.match(/^description: (.+)$/m)
  return match ? JSON.parse(match[1]!) : ''
}

// Serves the hosted skill at /.well-known/skills so `npx skills add https://nuxt-skill.onmax.me/`
// installs the same router and rule packs that the Nuxt module generates.
export default defineNuxtModule({
  meta: { name: 'hosted-skill' },
  async setup(_options, nuxt) {
    // Outside buildDir, which Nuxt clears before building.
    const outDir = join(nuxt.options.rootDir, 'node_modules/.cache/hosted-skills')

    nuxt.options.nitro.publicAssets ||= []
    nuxt.options.nitro.publicAssets.push({ dir: outDir, baseURL: '/.well-known/skills', maxAge: 0 })

    if (nuxt.options._prepare) {
      return
    }

    const files = await buildHostedSkillFiles(nuxt.options.rootDir)
    const index = {
      skills: [{
        name: SKILL_NAME,
        description: readDescription(files['SKILL.md']!),
        files: Object.keys(files).sort((a, b) => a === 'SKILL.md' ? -1 : b === 'SKILL.md' ? 1 : a.localeCompare(b)),
      }],
    }

    await fsp.rm(outDir, { recursive: true, force: true })
    for (const [path, contents] of Object.entries(files)) {
      const target = join(outDir, SKILL_NAME, path)
      await fsp.mkdir(dirname(target), { recursive: true })
      await fsp.writeFile(target, contents, 'utf8')
    }
    await fsp.writeFile(join(outDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8')
  },
})
