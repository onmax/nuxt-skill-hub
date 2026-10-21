<script setup lang="ts">
defineOptions({
  name: 'DocsHeroSection',
})

const agents = [
  { name: 'Claude Code', icon: 'i-simple-icons-anthropic' },
  { name: 'Codex', icon: 'i-simple-icons-openai' },
  { name: 'Cursor', icon: 'i-simple-icons-cursor' },
  { name: 'Gemini', icon: 'i-simple-icons-googlegemini' },
]

// Mirrors the tree in the README's "How it works" section.
const tree = [
  { path: '.claude/skills/nuxt-my-app/', note: '', depth: 0, kind: 'dir' },
  { path: 'SKILL.md', note: 'router', depth: 1, kind: 'router' },
  { path: 'references/', note: '', depth: 1, kind: 'dir' },
  { path: 'nuxt/rules/', note: 'data-fetching-ssr.md, plugins.md, …', depth: 2, kind: 'dir' },
  { path: 'vue/', note: 'Vue best practices', depth: 2, kind: 'dir' },
  { path: 'modules/', note: '@nuxt/ui, @nuxt/content, …', depth: 2, kind: 'dir' },
] as const
</script>

<template>
  <section
    id="hero"
    class="relative isolate overflow-hidden"
  >
    <!-- Background grid -->
    <div
      class="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] dark:opacity-[0.07]"
      :style="{
        backgroundImage: 'linear-gradient(to right, var(--ui-text) 1px, transparent 1px), linear-gradient(to bottom, var(--ui-text) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent)',
      }"
    />

    <!-- Threads, faded into the page at the top and bottom -->
    <div class="hero-threads pointer-events-none absolute inset-x-0 top-[26rem] -z-10 h-[38rem] sm:top-80 lg:top-72 lg:h-[44rem]">
      <ClientOnly>
        <ThreadsBackground />
      </ClientOnly>
    </div>

    <UContainer class="pt-28 pb-16 sm:pt-32 lg:pt-40 lg:pb-24">
      <div class="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
        <div class="min-w-0">
          <div class="hero-rise [--rise-delay:0ms] mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
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
            <ul
              class="flex flex-wrap items-center gap-x-3.5 gap-y-1"
              aria-label="Works with"
            >
              <li
                v-for="agent in agents"
                :key="agent.name"
                class="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted"
              >
                <UIcon
                  :name="agent.icon"
                  class="size-3.5 shrink-0"
                  aria-hidden="true"
                />
                {{ agent.name }}
              </li>
            </ul>
          </div>

          <h1 class="hero-rise [--rise-delay:100ms] text-5xl font-bold leading-[0.95] tracking-tight text-highlighted text-balance sm:text-6xl lg:text-[3.5rem] xl:text-[3.75rem]">
            Teach your AI agent<br>
            <span class="bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-300 bg-clip-text text-transparent dark:from-teal-300 dark:via-emerald-300 dark:to-teal-400">the Nuxt way.</span>
          </h1>

          <p class="hero-rise [--rise-delay:200ms] mt-6 max-w-[34rem] text-lg leading-relaxed text-muted text-pretty sm:text-xl">
            Install one skill or module. Your agent gets Nuxt best practices, module APIs, and project-specific guidance before it changes your code.
          </p>

          <div class="hero-rise [--rise-delay:300ms] mt-8 flex flex-col items-start gap-3">
            <InstallCommand />
            <UButton
              to="https://vite-doctor.onmax.me/"
              target="_blank"
              color="neutral"
              variant="link"
              size="sm"
              class="px-0"
              trailing-icon="i-lucide-arrow-up-right"
              :ui="{ trailingIcon: 'size-3' }"
            >
              Check AI-written Nuxt changes with Doctor.
            </UButton>
          </div>
        </div>

        <div class="hero-rise [--rise-delay:400ms] relative min-w-0">
          <div
            class="absolute -inset-6 -z-10 rounded-[2rem] bg-teal-400/15 blur-3xl dark:bg-teal-400/10"
            aria-hidden="true"
          />
          <div class="overflow-hidden rounded-xl bg-[#0a0b0b]/95 shadow-2xl shadow-neutral-950/20 ring-1 ring-neutral-950/80 backdrop-blur dark:shadow-black/40 dark:ring-white/10">
            <div class="flex items-center gap-2 border-b border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs">
              <span class="size-2.5 rounded-full bg-[#ff5f57]/80" aria-hidden="true" />
              <span class="size-2.5 rounded-full bg-[#ffbd2e]/80" aria-hidden="true" />
              <span class="size-2.5 rounded-full bg-[#28c840]/80" aria-hidden="true" />
              <span class="ml-2 truncate font-mono text-neutral-500">~/my-app</span>
              <span class="ml-auto hidden font-mono text-neutral-600 sm:inline">nuxt prepare</span>
            </div>

            <div class="space-y-4 px-4 py-5 font-mono text-[0.75rem]/6 text-neutral-300 sm:px-5 sm:text-[0.8125rem]/6">
              <p class="term-line [--line:0] flex gap-2">
                <span class="select-none text-teal-300/90" aria-hidden="true">$</span>
                <span class="text-neutral-100">npx nuxi module add nuxt-skill-hub</span>
              </p>

              <div class="space-y-0.5">
                <p class="term-line [--line:1]">
                  <span class="text-sky-300/90">ℹ</span>
                  <span class="text-neutral-400"> Resolved 3 module skill sources in 412ms.</span>
                </p>
                <p class="term-line [--line:2]">
                  <span class="text-teal-300">✔</span>
                  <span class="text-neutral-200"> Generated nuxt-my-app skill for claude-code, codex</span>
                </p>
              </div>

              <div class="term-line [--line:3] border-t border-white/[0.08] pt-4">
                <p
                  v-for="node in tree"
                  :key="node.path"
                  class="flex min-w-0 items-baseline gap-2 whitespace-nowrap"
                  :style="{ paddingLeft: `${node.depth * 1.25}rem` }"
                >
                  <span
                    v-if="node.depth"
                    class="select-none text-neutral-700"
                    aria-hidden="true"
                  >└</span>
                  <span
                    :class="{
                      'text-neutral-100': node.kind === 'dir',
                      'font-medium text-teal-300': node.kind === 'router',
                    }"
                  >{{ node.path }}</span>
                  <span
                    v-if="node.note"
                    class="min-w-0 truncate text-neutral-500"
                  >{{ node.note }}</span>
                </p>
              </div>

              <div class="term-line [--line:4] rounded-md border border-teal-300/10 bg-teal-300/[0.04] px-3 py-2.5 text-neutral-400">
                <span class="text-neutral-200">SKILL.md</span> picks the smallest guide for the task, so your agent reads <span class="text-teal-300">data-fetching-ssr.md</span> before it writes <span class="text-neutral-200">useFetch</span>.
              </div>

              <p class="term-line [--line:5] flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-white/[0.08] pt-3 text-neutral-500">
                <span class="text-teal-300">7 packs routed</span>
                <span class="text-neutral-700" aria-hidden="true">/</span>
                <span class="text-neutral-300">3 module skills</span>
                <span class="text-neutral-700" aria-hidden="true">/</span>
                <span>0 files to commit</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="hero-rise [--rise-delay:600ms] mx-auto mt-20 w-full max-w-4xl lg:mt-28">
        <GeminiEffect />
      </div>
    </UContainer>
  </section>
</template>

<style scoped>
/* CSS instead of JS-driven entry animations: the hero must be visible before hydration. */
.hero-rise {
  animation: hero-rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--rise-delay, 0ms);
}

.term-line {
  animation: term-line 0.4s ease-out both;
  animation-delay: calc(600ms + var(--line) * 220ms);
}

.hero-threads {
  mask-image: linear-gradient(to bottom, transparent, black 25%, black 65%, transparent);
}

@keyframes hero-rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
}

@keyframes term-line {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-rise,
  .term-line {
    animation: none;
  }
}
</style>
