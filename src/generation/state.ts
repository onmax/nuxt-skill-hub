import { promises as fsp } from 'node:fs'
import { join } from 'pathe'
import { writeFileIfChanged, pathExists } from '../internal'
import { PACKAGE_VERSION } from '../package-info'

const GENERATION_STATE_FILE = '.state.json'

export interface GenerationState {
  fingerprint: string
  generatedAt: string
  packageVersion: string
}

export function getGenerationStatePath(generatedSkillRoot: string): string {
  return join(generatedSkillRoot, GENERATION_STATE_FILE)
}

export async function readGenerationState(generatedSkillRoot: string): Promise<GenerationState | null> {
  const statePath = getGenerationStatePath(generatedSkillRoot)
  if (!(await pathExists(statePath))) {
    return null
  }

  try {
    return JSON.parse(await fsp.readFile(statePath, 'utf8')) as GenerationState
  }
  catch {
    return null
  }
}

export async function writeGenerationState(generatedSkillRoot: string, fingerprint: string): Promise<void> {
  const state: GenerationState = {
    fingerprint,
    generatedAt: new Date().toISOString(),
    packageVersion: PACKAGE_VERSION,
  }

  await writeFileIfChanged(getGenerationStatePath(generatedSkillRoot), `${JSON.stringify(state, null, 2)}\n`)
}

export async function isGeneratedSkillFresh(generatedSkillRoot: string, fingerprint: string): Promise<boolean> {
  const [state, entryExists] = await Promise.all([
    readGenerationState(generatedSkillRoot),
    pathExists(join(generatedSkillRoot, 'SKILL.md')),
  ])

  return Boolean(entryExists && state?.fingerprint === fingerprint)
}
