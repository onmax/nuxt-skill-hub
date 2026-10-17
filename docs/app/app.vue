<script setup lang="ts">
import { MotionConfig } from 'motion-v'

const mobileMenuOpen = ref(false)

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

          <div class="flex items-center gap-1">
            <UButton to="https://github.com/onmax/nuxt-skill-hub" target="_blank" variant="ghost" color="neutral" size="xs" icon="i-simple-icons-github" aria-label="GitHub" />
            <UColorModeButton variant="ghost" color="neutral" size="xs" />
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
            class="rounded-lg px-3 py-2.5 font-mono text-sm text-muted transition-colors hover:bg-elevated hover:text-highlighted"
            @click="mobileMenuOpen = false"
          >
            {{ item.label }}
          </a>
        </nav>
        <div class="mt-4 border-t border-default pt-4">
          <UButton to="https://github.com/onmax/nuxt-skill-hub" target="_blank" variant="ghost" color="neutral" size="sm" icon="i-simple-icons-github" class="w-full justify-start font-mono text-xs">
            GitHub
          </UButton>
        </div>
      </template>
    </UDrawer>

    <MotionConfig reduced-motion="user">
      <NuxtPage />
    </MotionConfig>
  </UApp>
</template>
