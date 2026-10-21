<script setup lang="ts">
import { MotionConfig } from 'motion-v'

const mobileMenuOpen = ref(false)

const repo = 'onmax/nuxt-skill-hub'
// The repository's stars, read once when the page is generated. ungh caches GitHub's API, so builds on shared runners
// don't hit its rate limit. If the request fails, the button just says GitHub.
const { data: stars } = await useAsyncData('github-stars', () =>
  $fetch<{ repo?: { stars?: number } }>(`https://ungh.cc/repos/${repo}`, { timeout: 5000 })
    .then(response => response.repo?.stars ?? null)
    .catch(() => null))
const starsLabel = computed(() => stars.value == null ? '' : new Intl.NumberFormat('en', { notation: 'compact' }).format(stars.value))

const navItems = [
  { label: 'How it works', to: '#how-it-works' },
  { label: 'Doctor', to: '#doctor' },
  { label: 'Skills', to: '#skills' },
  { label: 'Playground', to: '#playground' },
  { label: 'Docs', to: '#docs' },
]

// Highlight the nav item for the section that crosses the upper third of the viewport.
const activeSection = ref('')
onMounted(() => {
  const sections = navItems
    .map(item => document.querySelector<HTMLElement>(item.to))
    .filter((section): section is HTMLElement => Boolean(section))
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) activeSection.value = `#${entry.target.id}`
      else if (activeSection.value === `#${entry.target.id}`) activeSection.value = ''
    }
  }, { rootMargin: '-30% 0px -65% 0px' })
  sections.forEach(section => observer.observe(section))
  onBeforeUnmount(() => observer.disconnect())
})
</script>

<template>
  <UApp>
    <header class="fixed inset-x-0 top-0 z-50 border-b border-default bg-default/95 backdrop-blur-sm">
      <UContainer>
        <div class="flex h-12 items-center justify-between">
          <a href="#hero" class="flex items-center gap-2 text-sm font-semibold text-highlighted">
            <img src="/icon.png" alt="Nuxt Skill Hub" class="size-6 rounded">
            Nuxt Skill Hub
          </a>

          <nav class="hidden items-center gap-6 md:flex">
            <a
              v-for="item in navItems" :key="item.to" :href="item.to"
              class="font-mono text-xs transition-colors hover:text-highlighted"
              :class="activeSection === item.to ? 'text-highlighted' : 'text-muted'"
              :aria-current="activeSection === item.to ? 'location' : undefined"
            >
              {{ item.label }}
            </a>
          </nav>

          <div class="flex items-center gap-1.5">
            <a
              href="https://npmx.dev/package/nuxt-skill-hub"
              target="_blank"
              class="hidden h-8 items-center gap-1.5 rounded-md px-2 font-mono text-xs text-muted transition-colors hover:bg-elevated hover:text-highlighted lg:inline-flex"
              title="nuxt-skill-hub on npmx"
            >
              <svg viewBox="0 0 153 153" class="size-3.5" aria-hidden="true"><path fill="currentColor" d="M17.6 107.2h24.1v23.7h-24zM119.8.8 116.2 11 69.9 142l-3.6 10.2h15.5l3.6-10.2 11.7-33.2L135.4.8z" /></svg>
              nuxt-skill-hub
            </a>
            <a
              :href="`https://github.com/${repo}`"
              target="_blank"
              class="inline-flex h-8 items-center gap-2 rounded-md border border-default px-2.5 text-xs font-medium text-default transition-colors hover:bg-elevated hover:text-highlighted"
              :aria-label="stars == null ? 'nuxt-skill-hub on GitHub' : `nuxt-skill-hub on GitHub, ${stars} stars`"
            >
              <UIcon name="i-simple-icons-github" class="size-4" />
              <span class="hidden sm:inline">GitHub</span>
              <span v-if="starsLabel" class="inline-flex items-center gap-1 border-l border-default pl-2 font-mono tabular-nums sm:ml-0.5">
                <UIcon name="i-lucide-star" class="size-3" />
                {{ starsLabel }}
              </span>
            </a>
            <UColorModeButton variant="ghost" color="neutral" size="sm" />
            <button class="ml-1 flex size-8 items-center justify-center text-muted transition-colors hover:text-highlighted md:hidden" aria-label="Menu" @click="mobileMenuOpen = true">
              <UIcon name="i-lucide-menu" class="size-4" />
            </button>
          </div>
        </div>
      </UContainer>
    </header>

    <!-- Mobile nav -->
    <UDrawer v-model:open="mobileMenuOpen" direction="right" inset :handle="false" title="Navigation" :ui="{ content: 'max-w-xs ms-auto' }">
      <template #body>
        <nav class="flex flex-col gap-1">
          <a
            v-for="item in navItems" :key="item.to" :href="item.to"
            class="rounded-lg px-3 py-2.5 font-mono text-sm transition-colors hover:bg-elevated hover:text-highlighted"
            :class="activeSection === item.to ? 'bg-elevated text-highlighted' : 'text-muted'"
            :aria-current="activeSection === item.to ? 'location' : undefined"
            @click="mobileMenuOpen = false"
          >
            {{ item.label }}
          </a>
        </nav>
        <div class="mt-4 border-t border-default pt-4">
          <UButton to="https://github.com/onmax/nuxt-skill-hub" target="_blank" variant="ghost" color="neutral" size="sm" icon="i-simple-icons-github" class="w-full justify-start font-mono text-xs">
            GitHub
          </UButton>
          <UButton to="https://npmx.dev/package/nuxt-skill-hub" target="_blank" variant="ghost" color="neutral" size="sm" icon="i-lucide-package" class="w-full justify-start font-mono text-xs">
            npmx
          </UButton>
        </div>
      </template>
    </UDrawer>

    <MotionConfig reduced-motion="user">
      <NuxtPage />
    </MotionConfig>
  </UApp>
</template>
