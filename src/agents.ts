import {
  detectCurrentAgent as detectUnagentCurrentAgent,
  detectInstalledAgents as detectUnagentInstalledAgents,
  expandPath,
  getAgentConfig,
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
  if (config?.skillsDir) {
    return config.skillsDir
  }

  if (target === 'codex') {
    return 'skills'
  }

  return undefined
}

export function getSupportedTargets(): SkillHubTarget[] {
  return getAgentIds()
    .filter(target => Boolean(resolveSkillsDir(target, getAgentConfig(target))))
    .sort((a, b) => a.localeCompare(b))
}

export function resolveAgentTargetConfig(target: SkillHubTarget): ResolvedAgentTargetConfig | undefined {
  const normalized = target.trim()
  if (!normalized) {
    return undefined
  }

  const config = getAgentConfig(normalized)
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
  const uniqueTargets = Array.from(new Set(targets.map(target => target.trim()).filter(Boolean)))
  const valid: SkillHubTarget[] = []
  const invalid: InvalidTarget[] = []

  for (const target of uniqueTargets) {
    const config = getAgentConfig(target)
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

export function detectInstalledTargets(): SkillHubTarget[] {
  return Array.from(new Set(
    detectUnagentInstalledAgents()
      .filter(agent => agent.detected === 'config' && resolveSkillsDir(agent.id, agent.config))
      .map(agent => agent.id),
  )).sort((a, b) => a.localeCompare(b))
}
