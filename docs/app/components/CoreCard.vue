<script setup lang="ts">
import { motion } from 'motion-v'
import type { CoreSkill } from '~/data/core-skills'

defineProps<{ skill: CoreSkill, index: number }>()

const tagColors: Record<string, string> = {
  core: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
  safety: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  optimization: 'text-sky-600 dark:text-sky-400 bg-sky-500/10',
  modules: 'text-violet-600 dark:text-violet-400 bg-violet-500/10',
  meta: 'text-stone-500 dark:text-stone-400 bg-stone-500/10',
}
</script>

<template>
  <motion.div
    :initial="{ opacity: 0, y: 24 }"
    :whileInView="{ opacity: 1, y: 0 }"
    :viewport="{ once: true, amount: 0.3 }"
    :transition="{ duration: 0.4, delay: index * 0.06 }"
    class="group relative h-full"
  >
    <div class="h-full overflow-hidden rounded-xl border border-default bg-default p-5 transition-all duration-200 hover:border-accented hover:shadow-md dark:hover:shadow-none">
      <!-- Top: tag + icon -->
      <div class="mb-4 flex items-start justify-between">
        <div class="flex size-10 items-center justify-center rounded-lg bg-primary/8 transition-colors group-hover:bg-primary/15">
          <UIcon :name="skill.icon" class="size-5 text-primary" />
        </div>
        <span
          class="rounded-full px-2 py-0.5 font-mono text-[10px] font-medium"
          :class="tagColors[skill.tag] || tagColors.core"
        >
          {{ skill.tag }}
        </span>
      </div>

      <!-- Title -->
      <h3 class="mb-2 font-mono text-sm font-semibold text-highlighted">{{ skill.title }}</h3>

      <!-- Description -->
      <p class="text-sm text-muted leading-relaxed">{{ skill.description }}</p>

      <!-- Links -->
      <div v-if="skill.links?.length" class="mt-3 flex flex-wrap gap-2">
        <UButton
          v-for="link in skill.links"
          :key="link.href"
          :to="link.href"
          target="_blank"
          size="xs"
          color="neutral"
          variant="subtle"
          icon="i-lucide-external-link"
          trailing
        >
          {{ link.label }}
        </UButton>
      </div>
    </div>
  </motion.div>
</template>
