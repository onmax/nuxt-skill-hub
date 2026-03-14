import type { SkillAvailability } from '~/data/skill-packages'

export interface NuxtModuleResult {
  name: string
  npm: string
  description: string
  icon: string
  downloads: number
  github?: string
  website?: string
  skillAvailability: SkillAvailability
  type: string
}

export function useNuxtModuleSearch() {
  const query = ref('')
  const debouncedQuery = refDebounced(query, 200)

  // Fetch all modules once, cached by useFetch
  const { data, status } = useFetch<{ modules: NuxtModuleResult[] }>('/api/nuxt-modules', {
    default: () => ({ modules: [] }),
  })

  const allModules = computed(() => data.value?.modules ?? [])
  const loading = computed(() => status.value === 'pending')

  // Popular = top by downloads
  const popular = computed(() =>
    [...allModules.value].sort((a, b) => b.downloads - a.downloads).slice(0, 12),
  )

  // Filtered by query (name or description)
  const results = computed(() => {
    const excludedPackages = new Set(['tailwindcss'])
    const q = debouncedQuery.value.toLowerCase().trim()
    const source = !q
      ? popular.value
      : allModules.value.filter(m => m.name.includes(q) || m.npm.includes(q) || m.description?.toLowerCase().includes(q))

    return source
      .filter(m => m.skillAvailability !== 'unavailable' && !excludedPackages.has(m.npm))
      .slice(0, 20)
  })

  return { query, results, allModules, popular, loading }
}
