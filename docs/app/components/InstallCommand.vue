<script setup lang="ts">
const command = 'npx nuxt module add nuxt-skill-hub'
const { copy, copied } = useClipboard({ copiedDuring: 2000 })
</script>

<template>
  <div
    class="group relative inline-flex items-center gap-3 rounded-lg border border-default bg-muted px-4 py-2.5 font-mono text-sm backdrop-blur-sm transition-colors hover:border-accented"
    role="button"
    tabindex="0"
    @click="copy(command)"
    @keydown.enter="copy(command)"
  >
    <span class="text-dimmed">$</span>
    <span class="text-default">{{ command }}</span>
    <UIcon
      :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
      :class="copied ? 'text-primary' : 'text-dimmed group-hover:text-muted'"
      class="size-4 transition-colors"
    />
  </div>
</template>
