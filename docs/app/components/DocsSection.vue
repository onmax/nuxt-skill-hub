<script setup lang="ts">
import { motion } from 'motion-v'

interface Option {
  name: string
  type: string
  default: string
  description: string
}

const options: Option[] = [
  { name: 'skillName', type: 'string', default: 'auto', description: 'Custom skill name. Defaults to nuxt-{package.name}.' },
  { name: 'targets', type: 'SkillHubTarget[]', default: '[]', description: 'Optional explicit agent targets. Leave empty to auto-detect installed agents.' },
]

const expandedRow = ref<number | null>(null)
function toggle(i: number) {
  expandedRow.value = expandedRow.value === i ? null : i
}

const configCode = `modules: ['nuxt-skill-hub'],

  skillHub: {
    targets: ['claude-code'],
  }
`

const { copy, copied } = useClipboard({ copiedDuring: 2000 })
</script>

<template>
  <section id="docs" class="relative scroll-mt-16 py-24 sm:py-32">
    <UContainer>
      <div class="mx-auto mb-16 max-w-2xl text-center">
        <p class="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-primary">Configuration</p>
        <h2 class="text-3xl font-bold text-highlighted sm:text-4xl">Module Options</h2>
        <p class="mt-4 text-lg text-muted leading-relaxed">
          Configure <code class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-sm text-primary">skillHub</code> in your <code class="rounded bg-muted/20 px-1.5 py-0.5 font-mono text-sm text-highlighted">nuxt.config.ts</code> only when you need a custom skill name or explicit agent targets.
        </p>
      </div>

      <motion.div
        :initial="{ opacity: 0, y: 24 }"
        :whileInView="{ opacity: 1, y: 0 }"
        :viewport="{ once: true, amount: 0.1 }"
        :transition="{ duration: 0.5 }"
        class="mx-auto max-w-4xl"
      >
        <!-- Table wrapper -->
        <div class="overflow-hidden rounded-xl border border-default">
          <!-- Header -->
          <div class="hidden items-center gap-4 border-b border-default bg-elevated/50 px-5 py-3 font-mono text-xs font-medium uppercase tracking-wider text-dimmed sm:grid sm:grid-cols-12">
            <span class="col-span-3">Option</span>
            <span class="col-span-3">Type</span>
            <span class="col-span-2">Default</span>
            <span class="col-span-4">Description</span>
          </div>

          <!-- Rows -->
          <div
            v-for="(opt, i) in options" :key="opt.name"
            class="group border-b border-default last:border-b-0 transition-colors hover:bg-elevated/30"
            :class="{ 'bg-elevated/20': expandedRow === i }"
          >
            <!-- Desktop row -->
            <div class="hidden cursor-pointer items-center gap-4 px-5 py-3.5 sm:grid sm:grid-cols-12" @click="toggle(i)">
              <span class="col-span-3 font-mono text-sm font-semibold text-highlighted">{{ opt.name }}</span>
              <span class="col-span-3 font-mono text-xs text-primary/80">{{ opt.type }}</span>
              <span class="col-span-2">
                <code class="rounded bg-muted/20 px-1.5 py-0.5 font-mono text-xs text-muted">{{ opt.default }}</code>
              </span>
              <span class="col-span-4 text-sm text-muted leading-relaxed">{{ opt.description }}</span>
            </div>

            <!-- Mobile row -->
            <button class="flex w-full items-center justify-between px-5 py-3.5 text-left sm:hidden" @click="toggle(i)">
              <div class="flex flex-col gap-1">
                <span class="font-mono text-sm font-semibold text-highlighted">{{ opt.name }}</span>
                <span class="font-mono text-xs text-primary/80">{{ opt.type }}</span>
              </div>
              <UIcon
                name="i-lucide-chevron-down"
                class="size-4 shrink-0 text-dimmed transition-transform duration-200"
                :class="{ 'rotate-180': expandedRow === i }"
              />
            </button>
            <div v-if="expandedRow === i" class="border-t border-default/50 bg-elevated/20 px-5 py-3 sm:hidden">
              <div class="flex items-center gap-2 text-xs text-dimmed">
                <span>Default:</span>
                <code class="rounded bg-muted/20 px-1.5 py-0.5 font-mono text-muted">{{ opt.default }}</code>
              </div>
              <p class="mt-2 text-sm text-muted leading-relaxed">{{ opt.description }}</p>
            </div>
          </div>
        </div>

        <!-- Example config -->
        <motion.div
          :initial="{ opacity: 0, y: 16 }"
          :whileInView="{ opacity: 1, y: 0 }"
          :viewport="{ once: true, amount: 0.3 }"
          :transition="{ duration: 0.4, delay: 0.15 }"
          class="mt-6 overflow-hidden rounded-xl border border-default"
        >
          <div class="flex items-center justify-between border-b border-default bg-elevated/50 px-4 py-2.5">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-file-code" class="size-3.5 text-dimmed" />
              <span class="font-mono text-xs text-dimmed">nuxt.config.ts</span>
            </div>
            <button class="flex items-center gap-1 rounded px-1.5 py-0.5 text-dimmed transition-colors hover:text-muted" @click="copy(configCode)">
              <UIcon :name="copied ? 'i-lucide-check' : 'i-lucide-copy'" :class="copied ? 'text-primary' : ''" class="size-3.5 transition-colors" />
              <span class="font-mono text-xs">{{ copied ? 'Copied' : 'Copy' }}</span>
            </button>
          </div>
          <div class="bg-default p-4 font-mono text-sm leading-relaxed">
            <pre class="overflow-x-auto text-muted"><span class="opacity-45"><span class="text-dimmed">export default</span> <span class="text-highlighted">defineNuxtConfig</span>({</span>
  <span class="text-highlighted">modules</span>: [<span class="text-emerald-500 dark:text-emerald-400">'nuxt-skill-hub'</span>],

  <span class="text-primary">skillHub</span>: {
    <span class="text-highlighted">targets</span>: [<span class="text-emerald-500 dark:text-emerald-400">'claude-code'</span>],
  }
<span class="opacity-45">})</span></pre>
          </div>
        </motion.div>
      </motion.div>
    </UContainer>
  </section>
</template>
