import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const home = homedir()
const codexHome = process.env.CODEX_HOME?.trim() || join(home, '.codex')
const claudeHome = process.env.CLAUDE_CONFIG_DIR?.trim() || join(home, '.claude')

export interface AgentTargetConfig {
  projectSkillsDir: string
  detectInstalled: () => boolean
}

export const AGENT_TARGETS = {
  'amp': {
    projectSkillsDir: '.agents/skills',
    detectInstalled: () => existsSync(join(home, '.config/amp')),
  },
  'antigravity': {
    projectSkillsDir: '.agent/skills',
    detectInstalled: () => existsSync(join(home, '.gemini/antigravity')),
  },
  'claude-code': {
    projectSkillsDir: '.claude/skills',
    detectInstalled: () => existsSync(claudeHome),
  },
  'moltbot': {
    projectSkillsDir: 'skills',
    detectInstalled: () => existsSync(join(home, '.moltbot')) || existsSync(join(home, '.clawdbot')),
  },
  'cline': {
    projectSkillsDir: '.cline/skills',
    detectInstalled: () => existsSync(join(home, '.cline')),
  },
  'codebuddy': {
    projectSkillsDir: '.codebuddy/skills',
    detectInstalled: () => existsSync(join(home, '.codebuddy')),
  },
  'codex': {
    projectSkillsDir: '.codex/skills',
    detectInstalled: () => existsSync(codexHome) || existsSync('/etc/codex'),
  },
  'command-code': {
    projectSkillsDir: '.commandcode/skills',
    detectInstalled: () => existsSync(join(home, '.commandcode')),
  },
  'continue': {
    projectSkillsDir: '.continue/skills',
    detectInstalled: () => existsSync(join(home, '.continue')),
  },
  'crush': {
    projectSkillsDir: '.crush/skills',
    detectInstalled: () => existsSync(join(home, '.config/crush')),
  },
  'cursor': {
    projectSkillsDir: '.cursor/skills',
    detectInstalled: () => existsSync(join(home, '.cursor')),
  },
  'droid': {
    projectSkillsDir: '.factory/skills',
    detectInstalled: () => existsSync(join(home, '.factory')),
  },
  'gemini-cli': {
    projectSkillsDir: '.gemini/skills',
    detectInstalled: () => existsSync(join(home, '.gemini')),
  },
  'github-copilot': {
    projectSkillsDir: '.github/skills',
    detectInstalled: () => existsSync(join(home, '.copilot')) || existsSync('.github'),
  },
  'goose': {
    projectSkillsDir: '.goose/skills',
    detectInstalled: () => existsSync(join(home, '.config/goose')),
  },
  'junie': {
    projectSkillsDir: '.junie/skills',
    detectInstalled: () => existsSync(join(home, '.junie')),
  },
  'kilo': {
    projectSkillsDir: '.kilocode/skills',
    detectInstalled: () => existsSync(join(home, '.kilocode')),
  },
  'kimi-cli': {
    projectSkillsDir: '.agents/skills',
    detectInstalled: () => existsSync(join(home, '.kimi')),
  },
  'kiro-cli': {
    projectSkillsDir: '.kiro/skills',
    detectInstalled: () => existsSync(join(home, '.kiro')),
  },
  'kode': {
    projectSkillsDir: '.kode/skills',
    detectInstalled: () => existsSync(join(home, '.kode')),
  },
  'mcpjam': {
    projectSkillsDir: '.mcpjam/skills',
    detectInstalled: () => existsSync(join(home, '.mcpjam')),
  },
  'mux': {
    projectSkillsDir: '.mux/skills',
    detectInstalled: () => existsSync(join(home, '.mux')),
  },
  'opencode': {
    projectSkillsDir: '.opencode/skills',
    detectInstalled: () => existsSync(join(home, '.config/opencode')) || existsSync(claudeHome),
  },
  'openhands': {
    projectSkillsDir: '.openhands/skills',
    detectInstalled: () => existsSync(join(home, '.openhands')),
  },
  'pi': {
    projectSkillsDir: '.pi/skills',
    detectInstalled: () => existsSync(join(home, '.pi/agent')),
  },
  'qoder': {
    projectSkillsDir: '.qoder/skills',
    detectInstalled: () => existsSync(join(home, '.qoder')),
  },
  'qwen-code': {
    projectSkillsDir: '.qwen/skills',
    detectInstalled: () => existsSync(join(home, '.qwen')),
  },
  'roo': {
    projectSkillsDir: '.roo/skills',
    detectInstalled: () => existsSync(join(home, '.roo')),
  },
  'trae': {
    projectSkillsDir: '.trae/skills',
    detectInstalled: () => existsSync(join(home, '.trae')),
  },
  'windsurf': {
    projectSkillsDir: '.windsurf/skills',
    detectInstalled: () => existsSync(join(home, '.codeium/windsurf')),
  },
  'zencoder': {
    projectSkillsDir: '.zencoder/skills',
    detectInstalled: () => existsSync(join(home, '.zencoder')),
  },
  'neovate': {
    projectSkillsDir: '.neovate/skills',
    detectInstalled: () => existsSync(join(home, '.neovate')),
  },
  'pochi': {
    projectSkillsDir: '.pochi/skills',
    detectInstalled: () => existsSync(join(home, '.pochi')),
  },
} as const satisfies Record<string, AgentTargetConfig>

export type SkillHubTarget = keyof typeof AGENT_TARGETS

export function detectInstalledTargets(): SkillHubTarget[] {
  return (Object.keys(AGENT_TARGETS) as SkillHubTarget[])
    .filter(target => AGENT_TARGETS[target].detectInstalled())
}
