<script setup lang="ts">
import { motion } from 'motion-v'

defineOptions({
  name: 'DocsHeroSection',
})
</script>

<template>
  <section
    id="hero"
    class="relative min-h-screen overflow-hidden"
  >
    <!-- Background dot grid -->
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
      :style="{
        backgroundImage: 'radial-gradient(circle, var(--ui-primary) 0.5px, transparent 0.5px)',
        backgroundSize: '32px 32px',
      }"
    />

    <!-- Gradient fade at bottom -->
    <div class="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[var(--ui-bg)] to-transparent" />

    <UPageHero
      class="relative"
      :ui="{
        root: 'min-h-screen',
        container: 'flex min-h-screen flex-col gap-14 pt-32 pb-20 sm:gap-y-20 sm:pt-40 sm:pb-24 lg:pt-48 lg:pb-32',
        wrapper: 'mx-auto w-full max-w-5xl text-center',
        header: 'mx-auto max-w-4xl',
        footer: 'mt-10 flex flex-col items-center gap-8',
      }"
    >
      <template #header>
        <div class="flex flex-col items-center">
          <motion.div
            :initial="{ opacity: 0, y: 20 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5 }"
            class="mb-6 flex flex-col items-center gap-3"
          >
            <UBadge
              color="neutral"
              variant="outline"
              size="sm"
              class="font-mono"
            >
              <UIcon
                name="i-lucide-flask-conical"
                class="mr-1 size-3"
              />
              Experimental
            </UBadge>
            <p class="font-mono text-xs font-medium uppercase tracking-[0.34em] text-primary">
              nuxt-skill-hub
            </p>
          </motion.div>

          <motion.h1
            :initial="{ opacity: 0, y: 20 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, delay: 0.1 }"
            class="max-w-4xl text-center text-5xl font-bold leading-[0.92] tracking-tight text-highlighted text-balance sm:text-7xl"
          >
            Teach your AI agent<br>
            <span class="text-primary">Nuxt.</span>
          </motion.h1>

          <motion.p
            :initial="{ opacity: 0, y: 20 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, delay: 0.2 }"
            class="mt-6 max-w-2xl text-center text-lg leading-relaxed text-muted sm:text-xl"
          >
            Install one module. Your agent gets best practices, module APIs, and patterns for every Nuxt module in your project.
          </motion.p>
        </div>
      </template>

      <template #footer>
        <motion.div
          :initial="{ opacity: 0, y: 20 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.3 }"
        >
          <InstallCommand />
        </motion.div>

        <AgentLogos />
      </template>

      <motion.div
        :initial="{ opacity: 0, y: 24 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.8, delay: 0.5 }"
        class="mx-auto w-full max-w-4xl"
      >
        <GeminiEffect />
      </motion.div>
    </UPageHero>
  </section>
</template>
