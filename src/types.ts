import type { SkillHubTarget } from './agents'

export type SkillSourceKind = 'dist' | 'github' | 'generated'
export type SkillResolverKind = 'agentsField' | 'githubHeuristic' | 'metadataRouter'
export type SkillTrustLevel = 'official' | 'community'

export interface ModuleOptions {
  skillName?: string
  targets?: SkillHubTarget[]
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

export interface SkillManifest {
  version: 1
  generatedAt: string
  skillName: string
  target: SkillHubTarget
  targetDir: string
  modules: Array<{
    packageName: string
    version?: string
    skillName: string
    sourceDir: string
    destination: string
    scriptsIncluded: boolean
    description?: string
    sourceKind: SkillSourceKind
    sourceLabel: string
    sourceRepo?: string
    sourceRef?: string
    sourcePath?: string
    repoUrl?: string
    docsUrl?: string
    official: boolean
    trustLevel: SkillTrustLevel
    resolver: SkillResolverKind
    wrapperPath?: string
  }>
  skipped: SkillManifestSkipped[]
}
