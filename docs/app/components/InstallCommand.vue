<script setup lang="ts">
const commandTabs = [
  {
    label: 'For agents',
    value: 'agents',
    icon: 'i-lucide-bot',
  },
  {
    label: 'For humans',
    value: 'humans',
    icon: 'i-lucide-user',
  },
] as const

const packageManagers = [
  {
    label: 'pnpm',
    value: 'pnpm',
    icon: 'i-simple-icons-pnpm',
    moduleCommand: 'pnpm dlx nuxi module add nuxt-skill-hub',
  },
  {
    label: 'npm',
    value: 'npm',
    icon: 'i-simple-icons-npm',
    moduleCommand: 'npx nuxi module add nuxt-skill-hub',
  },
  {
    label: 'bun',
    value: 'bun',
    icon: 'i-simple-icons-bun',
    moduleCommand: 'bunx nuxi module add nuxt-skill-hub',
  },
  {
    label: 'yarn',
    value: 'yarn',
    icon: 'i-simple-icons-yarn',
    moduleCommand: 'yarn dlx nuxi module add nuxt-skill-hub',
  },
] as const

type CommandTab = (typeof commandTabs)[number]['value']
type PackageManager = (typeof packageManagers)[number]['value']

const activeCommandTab = shallowRef<CommandTab>('agents')
const activePackageManager = shallowRef<PackageManager>('pnpm')
const copiedCommand = shallowRef<string | null>(null)
const selectedPackageManager = computed(
  () =>
    packageManagers.find(manager => manager.value === activePackageManager.value)
    ?? packageManagers[0],
)
const skillsCommand = 'npx skills add https://nuxt-skill.onmax.me/'
const activeCommand = computed(() =>
  activeCommandTab.value === 'agents'
    ? skillsCommand
    : selectedPackageManager.value.moduleCommand,
)
const isCopied = computed(() => copiedCommand.value === activeCommand.value)
const copyLabel = computed(() => isCopied.value ? 'Copied command' : 'Copy command')
const { copy } = useClipboard({ copiedDuring: 1500 })

let copiedTimeout: ReturnType<typeof setTimeout> | undefined

async function copyActiveCommand() {
  await copy(activeCommand.value)
  copiedCommand.value = activeCommand.value
  if (copiedTimeout) clearTimeout(copiedTimeout)
  copiedTimeout = setTimeout(() => {
    if (copiedCommand.value === activeCommand.value) {
      copiedCommand.value = null
    }
  }, 1500)
}

watch([activePackageManager, activeCommandTab], () => {
  copiedCommand.value = null
})

onUnmounted(() => {
  if (copiedTimeout) clearTimeout(copiedTimeout)
})
</script>

<template>
  <div class="flex w-full max-w-2xl flex-col items-stretch gap-3">
    <div class="flex w-full flex-wrap items-center justify-start gap-3">
      <div
        class="relative inline-grid grid-cols-2 gap-1 rounded-lg border border-default bg-muted p-1 text-sm"
        role="tablist"
        aria-label="Installation audience"
      >
        <span
          class="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%_-_0.75rem)/2)] rounded-md bg-default shadow-sm ring-1 ring-black/5 transition-transform duration-[360ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none dark:ring-white/10"
          :style="{
            transform: activeCommandTab === 'humans' ? 'translateX(calc(100% + 0.25rem))' : 'translateX(0)',
          }"
          aria-hidden="true"
        />
        <button
          v-for="tab in commandTabs"
          :key="tab.value"
          type="button"
          role="tab"
          :aria-selected="activeCommandTab === tab.value"
          class="relative z-10 inline-flex min-w-32 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-[color,transform] duration-150 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35"
          :class="
            activeCommandTab === tab.value
              ? 'text-highlighted'
              : 'text-dimmed hover:text-muted'
          "
          @click="activeCommandTab = tab.value"
        >
          <UIcon
            :name="tab.icon"
            class="size-3.5 shrink-0"
            aria-hidden="true"
          />
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <Transition name="manager-panel">
        <div
          v-if="activeCommandTab === 'humans'"
          class="flex shrink-0 items-center gap-1 rounded-lg border border-default bg-muted p-1 text-sm"
          role="radiogroup"
          aria-label="Package manager"
        >
          <button
            v-for="manager in packageManagers"
            :key="manager.value"
            type="button"
            role="radio"
            :tabindex="activeCommandTab === 'humans' ? 0 : -1"
            :aria-checked="activePackageManager === manager.value"
            :aria-label="manager.label"
            class="inline-flex h-8 min-w-8 items-center justify-center overflow-hidden rounded-md font-medium transition-[width,color,transform,background-color,box-shadow] duration-[220ms] ease-out active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35 motion-reduce:transition-none"
            :class="
              activePackageManager === manager.value
                ? 'w-22 bg-default px-2.5 text-highlighted shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'w-8 px-0 text-dimmed grayscale hover:text-muted'
            "
            @click="activePackageManager = manager.value"
          >
            <UIcon
              :name="manager.icon"
              class="size-3.5 shrink-0"
              aria-hidden="true"
            />
            <span
              class="overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin-left] duration-[180ms] ease-out motion-reduce:transition-none"
              :class="
                activePackageManager === manager.value
                  ? 'ml-1.5 max-w-12 opacity-100'
                  : 'ml-0 max-w-0 opacity-0'
              "
            >
              {{ manager.label }}
            </span>
          </button>
        </div>
      </Transition>
    </div>

    <UButton
      type="button"
      color="neutral"
      variant="ghost"
      :aria-label="copyLabel"
      class="group inline-flex w-full items-center gap-1.5 rounded-lg border border-default bg-muted px-3 py-2.5 text-left font-mono text-sm backdrop-blur-sm transition-[border-color,background-color] duration-200 hover:border-accented hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35"
      @click="copyActiveCommand"
    >
      <span
        class="text-dimmed select-none"
        aria-hidden="true"
      >$</span>
      <span class="relative block min-w-0 flex-1 overflow-hidden text-default">
        <Transition
          name="command-swap"
          mode="out-in"
        >
          <code
            :key="activeCommand"
            class="block overflow-x-auto whitespace-nowrap py-0.5 [scrollbar-width:thin]"
          >
            {{ activeCommand }}
          </code>
        </Transition>
      </span>
      <span class="relative ml-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors group-hover:bg-default">
        <Transition
          name="copy-icon"
          mode="out-in"
        >
          <UIcon
            :key="isCopied ? 'check' : 'copy'"
            :name="isCopied ? 'i-lucide-check' : 'i-lucide-copy'"
            class="size-3.5"
            :class="isCopied ? 'text-primary' : ''"
            aria-hidden="true"
          />
        </Transition>
      </span>
    </UButton>
  </div>
</template>

<style scoped>
.command-swap-enter-active,
.command-swap-leave-active {
  transition:
    opacity 180ms cubic-bezier(0.23, 1, 0.32, 1),
    filter 180ms cubic-bezier(0.23, 1, 0.32, 1),
    transform 180ms cubic-bezier(0.23, 1, 0.32, 1);
}

.command-swap-enter-from,
.command-swap-leave-to {
  opacity: 0;
  filter: blur(1px);
  transform: translateY(2px);
}

.copy-icon-enter-active,
.copy-icon-leave-active {
  transition:
    opacity 200ms cubic-bezier(0.23, 1, 0.32, 1),
    filter 200ms cubic-bezier(0.23, 1, 0.32, 1),
    transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

.copy-icon-enter-from,
.copy-icon-leave-to {
  opacity: 0;
  filter: blur(1px);
  transform: scale(0.5);
}

.manager-panel-enter-active,
.manager-panel-leave-active {
  transform-origin: left center;
  transition:
    opacity 180ms cubic-bezier(0.23, 1, 0.32, 1),
    filter 180ms cubic-bezier(0.23, 1, 0.32, 1),
    transform 180ms cubic-bezier(0.23, 1, 0.32, 1);
}

.manager-panel-enter-from,
.manager-panel-leave-to {
  opacity: 0;
  filter: blur(1px);
  transform: translateY(1px) scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .command-swap-enter-active,
  .command-swap-leave-active,
  .copy-icon-enter-active,
  .copy-icon-leave-active,
  .manager-panel-enter-active,
  .manager-panel-leave-active {
    transition-duration: 0ms;
  }
}
</style>
