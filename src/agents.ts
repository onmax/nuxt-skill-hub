import {
  detectInstalledAgents as detectUnagentInstalledAgents,
  expandPath,
  getAgentConfig as getUnagentAgentConfig,
  getAgentIds,
  type AgentConfig,
} from 'unagent/env'

export type SkillHubTarget = string

export interface ResolvedAgentTargetConfig {
  target: SkillHubTarget
  configDir: string
  skillsDir: string
}

export type InvalidTargetReason = 'unknown-target' | 'missing-skills-dir'

export interface InvalidTarget {
  target: SkillHubTarget
  reason: InvalidTargetReason
}

function normalizeTarget(target: string): string {
  return target.trim()
}

function getRawTargetConfig(target: SkillHubTarget): AgentConfig | undefined {
  return getUnagentAgentConfig(target)
}

export function getSupportedTargets(): SkillHubTarget[] {
  return getAgentIds()
    .filter((target) => {
      const config = getRawTargetConfig(target)
      return Boolean(config?.skillsDir)
    })
    .sort((a, b) => a.localeCompare(b))
}

export function resolveAgentTargetConfig(target: SkillHubTarget): ResolvedAgentTargetConfig | undefined {
  const normalized = normalizeTarget(target)
  if (!normalized) {
    return undefined
  }

  const config = getRawTargetConfig(normalized)
  if (!config?.skillsDir) {
    return undefined
  }

  return {
    target: normalized,
    configDir: expandPath(config.configDir),
    skillsDir: config.skillsDir,
  }
}

export function validateTargets(targets: SkillHubTarget[]): { valid: SkillHubTarget[], invalid: InvalidTarget[] } {
  const uniqueTargets = Array.from(new Set(targets.map(normalizeTarget).filter(Boolean)))
  const valid: SkillHubTarget[] = []
  const invalid: InvalidTarget[] = []

  for (const target of uniqueTargets) {
    const config = getRawTargetConfig(target)
    if (!config) {
      invalid.push({
        target,
        reason: 'unknown-target',
      })
      continue
    }

    if (!config.skillsDir) {
      invalid.push({
        target,
        reason: 'missing-skills-dir',
      })
      continue
    }

    valid.push(target)
  }

  return { valid, invalid }
}

export function detectInstalledTargets(rootDir: string): SkillHubTarget[] {
  void rootDir

  const detected = detectUnagentInstalledAgents()
    .filter(agent => agent.detected === 'config' && agent.config.skillsDir)
    .map(agent => agent.id)

  return Array.from(new Set(detected)).sort((a, b) => a.localeCompare(b))
}
