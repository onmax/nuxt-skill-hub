import SkillHubModule from '../../../src/module'

export default defineNuxtConfig({
  modules: [SkillHubModule],
  skillHub: {
    targetMode: 'explicit',
    targets: ['github-copilot'],
  },
})
