<script setup lang="ts">
import { motion } from 'motion-v'

interface PipelineStage {
  label: string
  color: string
  steps: { title: string, detail: string, icon: string }[]
}

const stages: PipelineStage[] = [
  {
    label: 'Scan',
    color: 'text-cyan-500 dark:text-cyan-400',
    steps: [
      { title: 'Detect AI agents', detail: 'Claude, Cursor, Gemini, Codex folders', icon: 'i-lucide-scan-search' },
      { title: 'Discover modules', detail: 'Nuxt modules, layers, extra packages', icon: 'i-lucide-package-search' },
    ],
  },
  {
    label: 'Resolve',
    color: 'text-primary',
    steps: [
      { title: 'Read from dist', detail: 'Bundled skill files in the package', icon: 'i-lucide-hard-drive' },
      { title: 'Fetch from GitHub', detail: 'Module repository fallback', icon: 'i-simple-icons-github' },
      { title: 'Fallback map', detail: 'Curated community skill map', icon: 'i-lucide-map' },
    ],
  },
  {
    label: 'Write',
    color: 'text-amber-500 dark:text-amber-400',
    steps: [
      { title: 'Generate skill files', detail: 'Merge core + module guidance per agent', icon: 'i-lucide-file-pen-line' },
    ],
  },
]
</script>

<template>
  <section id="resolution" class="relative scroll-mt-16 py-24 sm:py-32">
    <UContainer>
      <motion.div
        :initial="{ opacity: 0, y: 24 }"
        :whileInView="{ opacity: 1, y: 0 }"
        :viewport="{ once: true, amount: 0.2 }"
        :transition="{ duration: 0.5 }"
        class="mx-auto max-w-3xl"
      >
        <div class="mb-12 text-center">
          <p class="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-primary">Pipeline</p>
          <h2 class="text-3xl font-bold text-highlighted sm:text-4xl">How skills are resolved</h2>
          <p class="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Every <code class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-sm text-primary">nuxi prepare</code> walks three stages — scan, resolve, write.
          </p>
        </div>

        <div class="space-y-1">
          <motion.div
            v-for="(stage, si) in stages" :key="stage.label"
            :initial="{ opacity: 0, y: 16 }"
            :whileInView="{ opacity: 1, y: 0 }"
            :viewport="{ once: true, amount: 0.3 }"
            :transition="{ duration: 0.35, delay: si * 0.1 }"
            class="overflow-hidden rounded-xl border border-default"
          >
            <!-- Stage header -->
            <div class="flex items-center gap-3 border-b border-default bg-elevated/50 px-5 py-2.5">
              <span
                class="inline-flex size-5 items-center justify-center rounded font-mono text-[10px] font-bold"
                :class="stage.color"
              >{{ si + 1 }}</span>
              <span class="font-mono text-xs font-medium uppercase tracking-wider" :class="stage.color">{{ stage.label }}</span>
            </div>

            <!-- Steps -->
            <div class="divide-y divide-default/50">
              <div
                v-for="(step, i) in stage.steps" :key="i"
                class="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-elevated/30"
              >
                <div class="flex size-8 shrink-0 items-center justify-center rounded-lg border border-default bg-elevated/50 text-dimmed transition-colors group-hover:text-highlighted">
                  <UIcon :name="step.icon" class="size-4" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-highlighted">{{ step.title }}</p>
                  <p class="mt-0.5 text-sm text-dimmed">{{ step.detail }}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <!-- Pipeline arrow hint -->
        <div class="mt-6 flex justify-center">
          <span class="font-mono text-xs text-dimmed">local first → fallbacks last</span>
        </div>
      </motion.div>
    </UContainer>
  </section>
</template>
