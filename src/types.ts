import type { SkillHubTarget } from './agents'
import type { SkillSourceKind, SkillResolverKind, SkillTrustLevel } from './render-content'

export type { SkillSourceKind, SkillResolverKind, SkillTrustLevel }

export interface ModuleOptions {
  skillName?: string
  targets?: SkillHubTarget[]
  moduleAuthoring?: boolean
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
