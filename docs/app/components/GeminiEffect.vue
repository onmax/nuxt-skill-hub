<script setup lang="ts">
import { motion } from 'motion-v'
import type { NuxtModuleResult } from '../../server/api/nuxt-modules.get'
import type { GraphModule } from './ModuleGraph.vue'

interface ModuleNode extends GraphModule {
  command: string
}

function moduleIconUrl(icon: string) {
  return `https://raw.githubusercontent.com/nuxt/modules/main/icons/${icon}`
}

// Ordered: the mobile list and the first desktop cycle show the first few.
const FEATURED_MODULES = [
  '@nuxt/ui',
  '@nuxt/content',
  '@nuxt/image',
  '@nuxtjs/i18n',
  '@pinia/nuxt',
  '@vueuse/nuxt',
  '@nuxt/fonts',
  '@nuxt/icon',
  '@nuxtjs/color-mode',
  '@nuxt/eslint',
  '@nuxthub/core',
  '@nuxtjs/seo',
  '@nuxt/scripts',
  '@nuxtjs/supabase',
  '@sidebase/nuxt-auth',
  '@nuxt/test-utils',
  '@nuxtjs/sitemap',
  'nuxt-og-image',
  '@nuxtjs/mdc',
  '@nuxt/a11y',
]

const { data: apiData } = await useFetch('/api/nuxt-modules')

const modulePool = computed<ModuleNode[]>(() => {
  const modules = apiData.value?.modules
  if (!modules?.length) return []
  // Well-known modules only: api.nuxt.com has stats for few modules, so ranking by
  // stars or downloads mostly surfaced obscure ones.
  return modules
    .filter((m: NuxtModuleResult) => m.icon && FEATURED_MODULES.includes(m.npm))
    .sort((a: NuxtModuleResult, b: NuxtModuleResult) => FEATURED_MODULES.indexOf(a.npm) - FEATURED_MODULES.indexOf(b.npm))
    .map((m: NuxtModuleResult) => ({
      id: m.npm,
      label: m.npm,
      iconUrl: moduleIconUrl(m.icon),
      command: `npx nuxt module add ${m.npm}`,
      docsUrl: m.website ?? m.github ?? '',
      hasSkill: m.skillAvailability === 'real',
    }))
})

function moduleLinkLabel(mod: ModuleNode) {
  return `Open ${mod.label} docs`
}
</script>

<template>
  <div class="mx-auto w-full max-w-4xl">
    <!-- Below lg: static list using the first 6 modules -->
    <div class="lg:hidden">
      <div class="relative overflow-hidden rounded-[2rem] border border-default/80 bg-default/90 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div
          class="pointer-events-none absolute inset-0 opacity-[0.06]"
          :style="{
            backgroundImage: 'radial-gradient(circle, var(--ui-primary) 0.5px, transparent 0.5px)',
            backgroundSize: '24px 24px',
          }"
        />

        <div class="relative">
          <motion.div
            :initial="{ opacity: 0, y: 12 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45 }"
            class="motion-reduce:opacity-100! motion-reduce:transform-none! inline-flex max-w-full items-center gap-2 rounded-full border border-primary/25 bg-default px-4 py-3 shadow-[0_0_30px_color-mix(in_srgb,var(--ui-primary)_12%,transparent)]"
          >
            <span class="font-mono text-sm font-semibold tracking-tight text-highlighted">SKILL.md</span>
            <div class="flex items-center">
              <div
                v-for="mod in modulePool.slice(0, 4)"
                :key="`mobile-icon-${mod.id}`"
                class="-ml-1.5 flex size-6 items-center justify-center rounded-full border border-default bg-muted first:ml-0"
              >
                <img :src="mod.iconUrl" :alt="mod.label" class="size-4 rounded-full">
              </div>
            </div>
          </motion.div>

          <div class="relative mt-5 pl-6">
            <div class="absolute bottom-4 left-2 top-2 w-px bg-gradient-to-b from-primary/25 via-primary/14 to-transparent" />

            <motion.a
              v-for="(mod, index) in modulePool.slice(0, 6)"
              :key="`mobile-${mod.id}`"
              :href="mod.docsUrl"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="moduleLinkLabel(mod)"
              :title="moduleLinkLabel(mod)"
              :initial="{ opacity: 0, x: -8 }"
              :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.35, delay: 0.08 * index }"
              class="motion-reduce:opacity-100! motion-reduce:transform-none! group relative mb-3 flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-default bg-default/95 px-3 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition-colors hover:border-primary/25 hover:bg-elevated last:mb-0"
            >
              <span class="absolute -left-4 top-1/2 h-px w-4 -translate-y-1/2 bg-primary/20" />

              <div class="min-w-0 flex items-center gap-2.5">
                <div class="flex size-8 shrink-0 items-center justify-center rounded-full border border-default bg-muted">
                  <img :src="mod.iconUrl" :alt="mod.label" class="size-4 rounded-full">
                </div>
                <div class="min-w-0">
                  <p class="truncate font-mono text-sm font-medium text-highlighted">{{ mod.label }}</p>
                  <p class="truncate font-mono text-[11px] text-dimmed">{{ mod.command }}</p>
                </div>
              </div>

              <UIcon name="i-lucide-arrow-up-right" class="size-4 shrink-0 text-dimmed transition-colors group-hover:text-primary" />
            </motion.a>
          </div>
        </div>
      </div>
    </div>

    <!-- lg and up: modules wire their guides into SKILL.md -->
    <ModuleGraph class="hidden lg:block" :modules="modulePool" />
  </div>
</template>
