import type { SkillHubTarget } from './agents'
import type { SkillSourceKind, SkillResolverKind, SkillTrustLevel } from './render-content'

export type { SkillSourceKind, SkillResolverKind, SkillTrustLevel }

export type SkillHubGenerationMode = 'prepare' | 'manual'
export const DEFAULT_SKILL_HUB_GENERATION_MODE: SkillHubGenerationMode = 'prepare'

export function normalizeGenerationMode(value: string | undefined | null): SkillHubGenerationMode {
  return value === 'manual' ? 'manual' : DEFAULT_SKILL_HUB_GENERATION_MODE
}

export interface ModuleOptions {
  skillName?: string
  targets?: SkillHubTarget[]
  moduleAuthoring?: boolean
  generationMode?: SkillHubGenerationMode
}

export interface AgentSkillDeclaration {
  name: string
  path: string
}

export interface SkillHubContribution {
  packageName: string
  version?: string
  sourceDir: string
  skillName?: string
  description?: string
  sourceKind?: SkillSourceKind
  sourceRepo?: string
  sourceRef?: string
  sourcePath?: string
  repoUrl?: string
  docsUrl?: string
  official?: boolean
  resolver?: SkillResolverKind
  forceIncludeScripts?: boolean
}

export interface SkillHubContributionContext {
  add: (contribution: SkillHubContribution) => void
}

export interface ResolvedContribution extends SkillHubContribution {
  skillName: string
  sourceRoot: string
  sourceKind: SkillSourceKind
  description?: string
  repoUrl?: string
  docsUrl?: string
  official: boolean
  resolver: SkillResolverKind
  forceIncludeScripts: boolean
}

export type ValidationSeverity = 'warning'

export interface ValidationIssue {
  severity: ValidationSeverity
  packageName: string
  skillName: string
  reason: string
  sourceKind?: SkillSourceKind
}

export interface ValidatedContribution {
  contribution: ResolvedContribution
  issues: ValidationIssue[]
}

export interface SkillManifestSkipped {
  packageName: string
  skillName: string
  reason: string
  sourceKind?: SkillSourceKind
}
