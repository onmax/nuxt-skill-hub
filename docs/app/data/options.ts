export interface Option {
  name: string
  type: string
  default: string
  description: string
}

export const options: Option[] = [
  { name: 'skillName', type: 'string', default: 'auto', description: 'Custom skill name. Defaults to nuxt-{package.name}.' },
  { name: 'targets', type: 'SkillHubTarget[]', default: '[]', description: 'Optional explicit agent targets. Leave empty to auto-detect installed agents.' },
  { name: 'moduleAuthoring', type: 'boolean', default: 'false', description: 'Adds module-author guidance on top of the default Nuxt app skill.' },
  { name: 'generationMode', type: '\'prepare\' | \'manual\'', default: 'prepare', description: '`prepare` writes the skill on `nuxt prepare`. `manual` writes nothing.' },
  { name: 'remote', type: 'boolean | object', default: 'enabled', description: 'Controls remote module skill lookup, concurrency, cache refresh, timing logs, timeout, and .well-known context budgets.' },
]
