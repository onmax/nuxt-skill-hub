import type { SkillHubTarget } from './agents'

export type TargetMode = 'detected' | 'explicit'
export type IncludeScriptsMode = 'never' | 'allowlist' | 'always'

export interface ModuleOptions {
  enabled?: boolean
  skillName?: string
  targets?: SkillHubTarget[]
  targetMode?: TargetMode
  discoverDependencySkills?: boolean
  includeScripts?: IncludeScriptsMode
  scriptAllowlist?: string[]
  writeAgentsHint?: boolean
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
}

export interface SkillHubContributionContext {
  add: (contribution: SkillHubContribution) => void
}

export interface ResolvedContribution extends SkillHubContribution {
  sourceRoot: string
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
  }>
}
