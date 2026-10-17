import { configDefaults } from 'vitest/config'
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    exclude: [...configDefaults.exclude, '.claude/worktrees/**'],
  },
})
