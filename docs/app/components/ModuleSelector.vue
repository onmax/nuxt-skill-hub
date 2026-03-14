<script setup lang="ts">
import { motion, AnimatePresence } from 'motion-v'
import type { SelectedModule } from '~/data/modules'
import type { NuxtModuleResult } from '~/composables/useNuxtModuleSearch'

const props = defineProps<{
  selectedModules: SelectedModule[]
  isSelected: (npm: string) => boolean
}>()

const emit = defineEmits<{
  toggle: [id: string]
  remove: [id: string]
  add: [mod: NuxtModuleResult]
}>()

const addModalOpen = ref(false)
const onlyWithSkill = ref(false)
const searchTerm = ref('')
const { allModules, loading } = useNuxtModuleSearch()

const enabledCount = computed(() => props.selectedModules.filter(m => m.enabled).length)
const visibleModules = computed(() => props.selectedModules.filter(m => !m.locked))

function formatDownloads(n: number) {
  if (!n) return ''
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function moduleIconUrl(icon: string) {
  return `https://raw.githubusercontent.com/nuxt/modules/main/icons/${icon}`
}

const sortedModules = computed(() => [...allModules.value].sort((a, b) => b.downloads - a.downloads))

const groups = computed(() => [{
  id: 'modules',
  label: 'Nuxt Modules',
  postFilter: (searchTerm: string, items: any[]) => {
    let filtered = items
    if (onlyWithSkill.value) filtered = filtered.filter((i: any) => i._skillAvailability !== 'unavailable')
    return searchTerm ? filtered : filtered.slice(0, 7)
  },
  items: sortedModules.value.map((mod) => {
    const selected = props.isSelected(mod.npm)
    const canAdd = mod.skillAvailability !== 'unavailable' && !selected
    return {
      label: mod.name,
      description: mod.description,
      avatar: mod.icon ? { src: moduleIconUrl(mod.icon) } : undefined,
      icon: mod.icon ? undefined : 'i-lucide-puzzle',
      suffix: formatDownloads(mod.downloads),
      _skillAvailability: mod.skillAvailability,
      _selected: selected,
      _official: mod.type === 'official',
      _onmax: mod.npm.startsWith('@onmax/'),
      disabled: !canAdd,
      onSelect() {
        if (canAdd) {
          emit('add', mod)
          addModalOpen.value = false
        }
      },
    }
  }),
}])
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <!-- Header -->
    <div class="mb-3 flex items-center justify-between px-1">
      <p class="font-mono text-xs font-medium uppercase tracking-wider text-dimmed">
        Modules
      </p>
      <UBadge color="primary" variant="subtle" size="xs">
        {{ enabledCount }} active
      </UBadge>
    </div>

    <!-- Active modules list -->
    <div class="min-h-0 flex-1 space-y-1 overflow-y-auto">
      <AnimatePresence>
        <motion.div
          v-for="mod in visibleModules"
          :key="mod.id"
          :initial="{ opacity: 0, height: 0 }"
          :animate="{ opacity: 1, height: 'auto' }"
          :exit="{ opacity: 0, height: 0 }"
          :transition="{ duration: 0.2 }"
        >
          <div
            class="group flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors"
            :class="mod.enabled ? 'border-primary/20 bg-primary/6 text-highlighted' : 'border-transparent text-dimmed'"
          >
            <UIcon
              v-if="mod.icon"
              :name="mod.icon"
              class="size-4 shrink-0"
              :class="mod.enabled ? mod.color : ''"
            />
            <img
              v-else-if="mod.iconUrl"
              :src="mod.iconUrl"
              :alt="mod.label"
              class="size-4 shrink-0 rounded-sm dark:brightness-0 dark:invert"
            >
            <UIcon v-else name="i-lucide-puzzle" class="size-4 shrink-0 text-dimmed" />

            <span class="min-w-0 flex-1 truncate font-mono text-xs">{{ mod.label }}</span>

            <!-- Sparkle / Remove swap (fixed size to avoid CLS) -->
            <div class="relative flex size-5 shrink-0 items-center justify-center">
              <UTooltip
                v-if="mod.skillAvailability !== 'unavailable'"
                :text="mod.skillAvailability === 'real' ? 'Module skill available' : 'Metadata-routed module guidance'"
              >
                <UIcon
                  :name="mod.skillAvailability === 'real' ? 'i-lucide-sparkles' : 'i-lucide-route'"
                  class="size-3 text-primary group-hover:opacity-0"
                />
              </UTooltip>
              <UButton
                icon="i-lucide-x"
                size="xs"
                color="neutral"
                variant="ghost"
                class="absolute inset-0 opacity-0 group-hover:opacity-100"
                @click="emit('remove', mod.id)"
              />
            </div>

            <USwitch
              :model-value="mod.enabled"
              :disabled="mod.skillAvailability === 'unavailable'"
              size="xs"
              @update:model-value="emit('toggle', mod.id)"
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>

    <!-- Add module button -->
    <div class="mt-3 px-1">
      <UButton
        icon="i-lucide-plus"
        variant="outline"
        color="neutral"
        size="sm"
        block
        @click="addModalOpen = true"
      >
        Add module
      </UButton>
    </div>

    <!-- Command palette modal -->
    <UModal v-model:open="addModalOpen" :ui="{ content: 'sm:max-w-lg' }">
      <template #content>
        <div class="flex flex-col divide-y divide-default">
          <UInput
            v-model="searchTerm"
            icon="i-lucide-search"
            placeholder="Search Nuxt modules..."
            variant="none"
            autofocus
            size="lg"
          />
          <div class="flex items-center gap-2 px-3 py-1.5">
            <USwitch v-model="onlyWithSkill" size="xs" />
            <span class="font-mono text-xs text-muted">Only with guidance</span>
          </div>
        </div>
        <UCommandPalette
          v-model:search-term="searchTerm"
          :groups="groups"
          :loading="loading"
          :input="false"
          :fuse="{ fuseOptions: { ignoreLocation: true, threshold: 0.2, keys: ['label', 'description'] }, matchAllWhenSearchEmpty: true, resultLimit: 50 }"
          @update:open="addModalOpen = $event"
        >
          <template #item-trailing="{ item }">
            <div class="flex items-center gap-1.5">
              <UBadge v-if="item._official" color="primary" variant="subtle" size="sm">
                Official
              </UBadge>
              <UBadge v-if="item._selected" color="primary" variant="soft" size="sm">
                Added
              </UBadge>
              <UBadge v-else-if="item._skillAvailability === 'unavailable'" color="neutral" variant="outline" size="sm">
                No skill
              </UBadge>
              <UBadge v-else-if="item._skillAvailability === 'generated'" color="neutral" variant="soft" size="sm">
                Router
              </UBadge>
              <UIcon v-else name="i-lucide-sparkles" class="size-3 text-primary" />
              <span v-if="item.suffix" class="font-mono text-[10px] text-dimmed">{{ item.suffix }}</span>
            </div>
          </template>
        </UCommandPalette>
      </template>
    </UModal>
  </div>
</template>
