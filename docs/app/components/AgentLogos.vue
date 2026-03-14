<script setup lang="ts">
import { motion } from 'motion-v'

const agents = [
  { name: 'Claude Code', icon: 'i-simple-icons-anthropic' },
  { name: 'Cursor', icon: 'i-simple-icons-cursor' },
  { name: 'Gemini', icon: 'i-simple-icons-googlegemini' },
  { name: 'Codex', icon: 'i-simple-icons-openai' },
]
</script>

<template>
  <motion.div
    :initial="{ opacity: 0, y: 12 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.4, delay: 0.4 }"
    class="flex flex-col items-center gap-3"
  >
    <p class="font-mono text-xs text-dimmed">Works with your AI agent</p>
    <div class="flex items-center -space-x-2">
      <UTooltip
        v-for="(agent, i) in agents"
        :key="agent.name"
        :text="agent.name"
        group="agents"
      >
        <div
          class="flex size-9 items-center justify-center rounded-full border-2 border-[var(--ui-bg)] bg-elevated transition-transform hover:z-10 hover:scale-110"
          :style="{ zIndex: agents.length - i }"
        >
          <UIcon :name="agent.icon" class="size-4 text-muted" />
        </div>
      </UTooltip>
      <!-- "Any agent" indicator -->
      <UTooltip text="Any AI agent" group="agents">
        <div
          class="flex size-9 items-center justify-center rounded-full border-2 border-[var(--ui-bg)] bg-elevated transition-transform hover:z-10 hover:scale-110"
          :style="{ zIndex: 0 }"
        >
          <UIcon name="i-lucide-ellipsis" class="size-4 text-dimmed" />
        </div>
      </UTooltip>
    </div>
  </motion.div>
</template>
