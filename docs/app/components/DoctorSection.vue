<script setup lang="ts">
import { motion } from 'motion-v'

const doctorChecks = [
  {
    icon: 'i-lucide-stethoscope',
    label: 'Hydration',
  },
  {
    icon: 'i-lucide-lock-keyhole',
    label: 'Runtime config',
  },
  {
    icon: 'i-lucide-zap',
    label: 'Nitro + Vite',
  },
] as const
</script>

<template>
  <section
    id="doctor"
    class="relative scroll-mt-16 py-24 sm:py-32"
  >
    <UContainer>
      <motion.div
        :initial="{ opacity: 0, y: 28 }"
        :while-in-view="{ opacity: 1, y: 0 }"
        :viewport="{ once: true, amount: 0.2 }"
        :transition="{ duration: 0.5 }"
        class="grid items-start gap-10 border-t border-default pt-16 lg:grid-cols-[minmax(0,0.82fr)_minmax(520px,1.18fr)] lg:gap-16"
      >
        <div class="min-w-0">
          <p class="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-primary">
            Doctor
          </p>
          <h2 class="max-w-xl text-3xl font-semibold tracking-tight text-highlighted text-balance sm:text-4xl">
            Check AI-written Nuxt changes.
          </h2>
          <p class="mt-4 max-w-xl text-base/7 text-muted sm:text-lg/8">
            Skill Hub teaches the agent before it edits. Doctor verifies the result before review.
          </p>

          <div class="mt-7 flex flex-wrap gap-2.5">
            <div
              v-for="check in doctorChecks"
              :key="check.label"
              class="inline-flex items-center gap-2 rounded-lg border border-default bg-muted px-3 py-2 text-sm font-medium text-muted"
            >
              <UIcon
                :name="check.icon"
                class="size-4 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <span>{{ check.label }}</span>
            </div>
          </div>

          <div class="mt-7 flex flex-wrap items-center gap-3">
            <UButton
              to="https://vite-doctor.onmax.me/"
              target="_blank"
              color="neutral"
              variant="soft"
              trailing-icon="i-lucide-arrow-up-right"
            >
              Open Doctor
            </UButton>
            <UButton
              to="https://vite-doctor.onmax.me/.well-known/skills/doctor/SKILL.md"
              target="_blank"
              color="neutral"
              variant="ghost"
              trailing-icon="i-lucide-file-text"
            >
              View Doctor skill
            </UButton>
          </div>
        </div>

        <div class="min-w-0 overflow-hidden rounded-xl border border-default bg-[#0b0b0b] shadow-lg shadow-neutral-950/10 dark:shadow-black/30">
          <div class="flex items-center gap-2 border-b border-white/[0.08] bg-white/[0.03] px-4 py-2.5">
            <span class="size-2.5 rounded-full bg-red-400/70" />
            <span class="size-2.5 rounded-full bg-yellow-400/70" />
            <span class="size-2.5 rounded-full bg-green-400/70" />
            <span class="ml-2 truncate font-mono text-xs text-neutral-500">~/your-nuxt-app</span>
            <span class="ml-auto hidden font-mono text-xs text-neutral-500 sm:inline">vite-doctor</span>
          </div>
          <div class="min-h-[24rem] space-y-3 px-4 py-4 font-mono text-sm text-neutral-300 sm:px-5 sm:py-5 lg:min-h-[27rem]">
            <p class="flex items-start gap-2">
              <span class="select-none text-emerald-400/90">$</span>
              <span class="min-w-0 break-words text-neutral-100">pnpm dlx vite-doctor . --rules nuxt/hydration</span>
            </p>
            <div class="space-y-2 border-t border-white/[0.08] pt-3 text-xs text-neutral-500">
              <p>loaded nuxt.config.ts</p>
              <p>scanned 38 Vue components</p>
              <p>matched 15 framework rules</p>
            </div>
            <div class="space-y-4 border-t border-white/[0.08] pt-3">
              <div class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5">
                <UIcon
                  name="i-lucide-triangle-alert"
                  class="mt-1 size-3.5 text-amber-300"
                  aria-hidden="true"
                />
                <div class="min-w-0">
                  <p class="break-words font-medium text-neutral-100">
                    nuxt/hydration/no-client-conditional-in-template
                  </p>
                  <p class="break-words text-xs text-neutral-500">
                    app/components/UserMenu.vue:18:5
                  </p>
                  <p class="mt-1 break-words text-xs text-neutral-400">
                    Browser-only state changes the server-rendered markup.
                  </p>
                </div>
              </div>
              <div class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5">
                <UIcon
                  name="i-lucide-circle-alert"
                  class="mt-1 size-3.5 text-rose-300"
                  aria-hidden="true"
                />
                <div class="min-w-0">
                  <p class="break-words font-medium text-neutral-100">
                    nuxt/runtime/no-secret-in-public-config
                  </p>
                  <p class="break-words text-xs text-neutral-500">
                    nuxt.config.ts:42:13
                  </p>
                  <p class="mt-1 break-words text-xs text-neutral-400">
                    Move private keys out of public runtime config.
                  </p>
                </div>
              </div>
            </div>
            <div class="space-y-2 border-t border-white/[0.08] pt-3 text-xs text-neutral-500">
              <p class="text-neutral-300">suggested agent action</p>
              <p class="break-words">Apply the narrow fix, rerun Doctor, and keep the report with the PR.</p>
            </div>
            <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-white/[0.08] pt-3 text-xs text-neutral-500">
              <span class="font-medium text-neutral-200">2 high</span>
              <span class="text-neutral-700" aria-hidden="true">/</span>
              <span>13 warnings</span>
              <span class="text-neutral-700" aria-hidden="true">/</span>
              <span class="inline-flex items-center gap-1 text-emerald-300/90">
                <UIcon
                  name="i-lucide-file-search"
                  class="size-3.5"
                  aria-hidden="true"
                />
                report ready
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </UContainer>
  </section>
</template>
