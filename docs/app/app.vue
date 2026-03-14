<script setup lang="ts">
const mobileMenuOpen = ref(false)

const navItems = [
  { label: 'How it works', to: '#how-it-works' },
  { label: 'Skills', to: '#skills' },
  { label: 'Preview', to: '#playground' },
  { label: 'Docs', to: '#docs' },
]
</script>

<template>
  <UApp>
    <header class="fixed inset-x-0 top-0 z-50 border-b border-default bg-default/95 backdrop-blur-sm">
      <UContainer>
        <div class="flex h-12 items-center justify-between">
          <a href="#hero" class="font-mono text-xs font-medium tracking-widest text-highlighted uppercase">
            nuxt-skill-hub
          </a>

          <nav class="hidden items-center gap-6 md:flex">
            <a
              v-for="item in navItems" :key="item.to" :href="item.to"
              class="font-mono text-xs text-muted transition-colors hover:text-highlighted"
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

    <NuxtPage />
  </UApp>
</template>
