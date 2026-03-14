import {
  detectCurrentAgent as detectUnagentCurrentAgent,
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

function resolveSkillsDir(target: SkillHubTarget, config: AgentConfig | undefined): string | undefined {
  void target
  return config?.skillsDir
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
      return Boolean(resolveSkillsDir(target, config))
    })
    .sort((a, b) => a.localeCompare(b))
}

export function resolveAgentTargetConfig(target: SkillHubTarget): ResolvedAgentTargetConfig | undefined {
  const normalized = normalizeTarget(target)
  if (!normalized) {
    return undefined
  }

  const config = getRawTargetConfig(normalized)
  const skillsDir = resolveSkillsDir(normalized, config)
  if (!config || !skillsDir) {
    return undefined
  }

  return {
    target: normalized,
    configDir: expandPath(config.configDir),
    skillsDir,
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

    if (!resolveSkillsDir(target, config)) {
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

export function detectCurrentTarget(): SkillHubTarget | undefined {
  const current = detectUnagentCurrentAgent()
  if (!current) return undefined
  const skillsDir = resolveSkillsDir(current.id, current.config)
  return skillsDir ? current.id : undefined
}

export function detectInstalledTargets(rootDir: string): SkillHubTarget[] {
  void rootDir

  return Array.from(new Set(
    detectUnagentInstalledAgents()
      .filter(agent => agent.detected === 'config' && resolveSkillsDir(agent.id, agent.config))
      .map(agent => agent.id),
  )).sort((a, b) => a.localeCompare(b))
}
