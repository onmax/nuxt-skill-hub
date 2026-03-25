import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockEnsureStableSkillWrappers = vi.fn(async () => {})
const mockGenerateSkillTree = vi.fn(async () => {})
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  start: vi.fn(),
  success: vi.fn(),
}

const mockResolveTargets = vi.fn(() => ({
  targets: ['claude'],
  invalidTargets: [],
}))

vi.mock('@nuxt/kit', () => ({
  defineNuxtModule: (definition: unknown) => definition,
  useLogger: () => mockLogger,
}))

vi.mock('std-env', () => ({
  isCI: false,
  isTest: false,
}))

vi.mock('../src/generator', () => ({
  ensureStableSkillWrappers: mockEnsureStableSkillWrappers,
  generateSkillTree: mockGenerateSkillTree,
}))

vi.mock('../src/internal', () => ({
  resolveExportRoot: vi.fn(async () => '/repo'),
  deriveSkillName: vi.fn(async () => 'nuxt-test'),
  detectConflictingSkills: vi.fn(() => []),
  formatConflictWarning: vi.fn((value: string) => value),
  isValidSkillName: vi.fn(() => true),
  resolveTargets: mockResolveTargets,
}))

describe('module setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveTargets.mockReturnValue({
      targets: ['claude'],
      invalidTargets: [],
    })
  })

  it('falls back to prepare mode when generationMode is invalid', async () => {
    vi.resetModules()
    const { default: importedModule } = await import('../src/module')
    const moduleDefinition = importedModule as unknown as {
      setup: (options: Record<string, unknown>, nuxt: unknown) => Promise<void>
    }

    const prepareHooks = new Map<string, () => Promise<void>>()
    const nuxt = {
      options: {
        rootDir: '/repo',
        buildDir: '/repo/.nuxt',
        _prepare: true,
      },
      hook: vi.fn((name: string, handler: () => Promise<void>) => {
        prepareHooks.set(name, handler)
      }),
    }

    await moduleDefinition.setup({
      skillName: 'nuxt-test',
      generationMode: 'manul',
      targets: ['claude'],
    }, nuxt)

    expect(mockEnsureStableSkillWrappers).toHaveBeenCalledWith(expect.objectContaining({
      generationMode: 'prepare',
    }))
    expect(mockLogger.warn).toHaveBeenCalledWith('Invalid skillHub.generationMode "manul". Falling back to "prepare".')

    const runGeneration = prepareHooks.get('prepare:types')
    expect(runGeneration).toBeTypeOf('function')

    await runGeneration?.()

    expect(mockGenerateSkillTree).toHaveBeenCalledWith(expect.objectContaining({
      generationMode: 'prepare',
    }))
  })

  it('skips generation entirely during typecheck', async () => {
    vi.resetModules()
    const originalArgv = [...process.argv]
    process.argv.splice(2, 0, 'typecheck')

    try {
      const { default: importedModule } = await import('../src/module')
      const moduleDefinition = importedModule as unknown as {
        setup: (options: Record<string, unknown>, nuxt: unknown) => Promise<void>
      }

      const prepareHooks = new Map<string, () => Promise<void>>()
      const nuxt = {
        options: {
          rootDir: '/repo',
          buildDir: '/repo/.nuxt',
          _prepare: true,
        },
        hook: vi.fn((name: string, handler: () => Promise<void>) => {
          prepareHooks.set(name, handler)
        }),
      }

      await moduleDefinition.setup({
        skillName: 'nuxt-test',
        generationMode: 'prepare',
        targets: ['claude'],
      }, nuxt)

      expect(mockLogger.info).toHaveBeenCalledWith('Skipping skill generation during typecheck')
      expect(mockEnsureStableSkillWrappers).not.toHaveBeenCalled()
      expect(mockGenerateSkillTree).not.toHaveBeenCalled()
      expect(prepareHooks.size).toBe(0)
    }
    finally {
      process.argv.length = 0
      process.argv.push(...originalArgv)
    }
  })
})
