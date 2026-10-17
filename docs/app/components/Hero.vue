<script setup lang="ts">
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
        wrapper: 'mx-auto w-full max-w-5xl text-left sm:text-center',
        header: 'mx-auto max-w-4xl',
        footer: 'mt-10 flex flex-col items-start gap-8 sm:items-center',
      }"
    >
      <template #header>
        <div class="flex flex-col items-start sm:items-center">
          <div
            class="hero-rise [--rise-delay:0ms] mb-6 flex items-start sm:justify-center"
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
          </div>

          <h1
            class="hero-rise [--rise-delay:100ms] max-w-4xl text-left text-5xl font-bold leading-[0.92] tracking-tight text-highlighted text-balance sm:text-center sm:text-7xl"
          >
            Teach your AI agent<br>
            <span class="text-primary">The Nuxt way.</span>
          </h1>

          <p
            class="hero-rise [--rise-delay:200ms] mt-6 max-w-2xl text-left text-lg leading-relaxed text-muted sm:text-center sm:text-xl"
          >
            Install one skill or module. Your agent gets Nuxt best practices, module APIs, and project-specific guidance before it changes your code.
          </p>
        </div>
      </template>

      <template #footer>
        <div
          class="hero-rise [--rise-delay:300ms] flex w-full flex-col items-start gap-3 sm:items-center"
        >
          <InstallCommand />
          <UButton
            to="https://vite-doctor.onmax.me/"
            target="_blank"
            color="neutral"
            variant="link"
            size="sm"
            trailing-icon="i-lucide-arrow-up-right"
            :ui="{ trailingIcon: 'size-3' }"
          >
            Check AI-written Nuxt changes with Doctor.
          </UButton>
        </div>

        <AgentLogos />
      </template>

      <div
        class="hero-rise [--rise-delay:500ms] mx-auto w-full max-w-4xl"
      >
        <GeminiEffect />
      </div>
    </UPageHero>
  </section>
</template>

<style scoped>
/* CSS instead of JS-driven entry animations: the hero must be visible before hydration. */
.hero-rise {
  animation: hero-rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--rise-delay, 0ms);
}

@keyframes hero-rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-rise {
    animation: none;
  }
}
</style>
