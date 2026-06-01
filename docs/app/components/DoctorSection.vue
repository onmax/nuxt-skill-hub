<script setup lang="ts">
import { motion } from 'motion-v'

const diagnosticChecks = [
  {
    icon: 'i-lucide-droplets',
    label: 'Hydration',
    detail: 'SSR drift',
    iconClass: 'text-sky-500 dark:text-sky-300',
  },
  {
    icon: 'i-lucide-shield-alert',
    label: 'Secrets',
    detail: 'public config',
    iconClass: 'text-rose-500 dark:text-rose-300',
  },
  {
    icon: 'i-lucide-clipboard-check',
    label: 'Vite Doctor',
    detail: 'report ready',
    iconClass: 'text-emerald-500 dark:text-emerald-300',
  },
] as const

const scanStats = [
  ['loaded', 'nuxt.config.ts'],
  ['scanned', '38 Vue components'],
  ['matched', '15 Nuxt rules'],
] as const

const findings = [
  {
    icon: 'i-lucide-triangle-alert',
    iconClass: 'text-amber-300',
    title: 'nuxt/hydration/no-client-conditional-in-template',
    location: 'app/components/UserMenu.vue:18:5',
    detail: 'Browser-only state changes the server-rendered markup.',
  },
  {
    icon: 'i-lucide-circle-alert',
    iconClass: 'text-rose-300',
    title: 'nuxt/runtime/no-secret-in-public-config',
    location: 'nuxt.config.ts:42:13',
    detail: 'Move private keys out of public runtime config.',
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
        class="grid items-start gap-9 border-t border-default pt-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(520px,1.2fr)] lg:gap-16"
      >
        <div class="min-w-0">
          <p class="mb-3 font-mono text-xs font-medium uppercase tracking-wide text-primary">
            Doctor
          </p>
          <h2 class="max-w-[22ch] text-3xl font-semibold tracking-tight text-highlighted text-balance sm:text-4xl lg:max-w-[15ch]">
            Catch the AI slop your agents ship.
          </h2>
          <p class="mt-4 max-w-[58ch] text-base/7 text-muted text-pretty sm:text-lg/8">
            Doctor scans your project before review and flags framework bugs agents often miss.
          </p>

          <div class="mt-7 grid max-w-xl grid-cols-1 gap-2 min-[520px]:grid-cols-3">
            <div
              v-for="check in diagnosticChecks"
              :key="check.label"
              class="rounded-lg border border-default bg-elevated/40 px-3 py-3"
            >
              <div class="flex items-center gap-2">
                <UIcon
                  :name="check.icon"
                  class="size-4"
                  :class="check.iconClass"
                  aria-hidden="true"
                />
                <span class="font-medium text-highlighted">{{ check.label }}</span>
              </div>
              <p class="mt-1 font-mono text-xs text-dimmed">
                {{ check.detail }}
              </p>
            </div>
          </div>

          <div class="mt-7 flex flex-wrap items-center gap-3">
            <UButton
              to="https://vite-doctor.onmax.me/"
              target="_blank"
              color="primary"
              size="lg"
              icon="i-lucide-stethoscope"
              trailing-icon="i-lucide-arrow-up-right"
              :ui="{ leadingIcon: 'size-4', trailingIcon: 'size-4' }"
            >
              Check diagnosis
            </UButton>
            <UButton
              to="https://vite-doctor.onmax.me/.well-known/skills/doctor/SKILL.md"
              target="_blank"
              color="neutral"
              variant="outline"
              size="lg"
              trailing-icon="i-lucide-file-text"
              :ui="{ trailingIcon: 'size-4' }"
            >
              View Doctor skill
            </UButton>
          </div>
        </div>

        <div class="min-w-0 overflow-hidden rounded-lg border border-neutral-900/10 bg-[#0b0b0b] shadow-2xl shadow-neutral-950/10 ring-1 ring-white/10 dark:border-white/10 dark:shadow-black/30">
          <div class="flex items-center gap-2 border-b border-white/[0.08] bg-white/[0.04] px-4 py-2.5">
            <span class="size-2.5 rounded-full bg-red-400/80" />
            <span class="size-2.5 rounded-full bg-yellow-400/80" />
            <span class="size-2.5 rounded-full bg-green-400/80" />
            <span class="ml-2 truncate font-mono text-xs text-neutral-500">~/your-nuxt-app</span>
            <span class="ml-auto hidden items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-1 font-mono text-[11px] text-emerald-300 sm:inline-flex">
              <span class="size-1.5 rounded-full bg-emerald-300" />
              diagnosis ready
            </span>
          </div>
          <div class="min-h-[19rem] space-y-4 px-4 py-4 font-mono text-sm text-neutral-300 sm:px-5 sm:py-5 lg:min-h-[26rem]">
            <p class="flex items-start gap-2 rounded-md bg-white/[0.03] px-3 py-2 ring-1 ring-white/[0.06]">
              <span class="select-none text-emerald-400/90">$</span>
              <span class="min-w-0 break-words text-neutral-100">pnpm dlx vite-doctor . --rules nuxt/hydration</span>
            </p>

            <div class="grid grid-cols-1 gap-2 text-xs text-neutral-500 min-[520px]:grid-cols-3">
              <div
                v-for="[label, value] in scanStats"
                :key="label"
                class="rounded-md border border-white/[0.06] px-3 py-2"
              >
                <p class="text-neutral-600">
                  {{ label }}
                </p>
                <p class="mt-1 truncate text-neutral-300">
                  {{ value }}
                </p>
              </div>
            </div>

            <div class="space-y-4 border-t border-white/[0.08] pt-3">
              <div
                v-for="finding in findings"
                :key="finding.title"
                class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5"
              >
                <UIcon
                  :name="finding.icon"
                  class="mt-1 size-3.5"
                  :class="finding.iconClass"
                  aria-hidden="true"
                />
                <div class="min-w-0">
                  <p class="break-words font-medium text-neutral-100">
                    {{ finding.title }}
                  </p>
                  <p class="break-words text-xs text-neutral-500">
                    {{ finding.location }}
                  </p>
                  <p class="mt-1 break-words text-xs text-neutral-400">
                    {{ finding.detail }}
                  </p>
                </div>
              </div>
            </div>
            <div class="rounded-md border border-emerald-300/10 bg-emerald-300/[0.04] px-3 py-3 text-xs text-neutral-500">
              <p class="text-neutral-300">suggested agent action</p>
              <p class="mt-1 break-words">Apply the narrow fix, rerun Doctor, then discharge the PR with the report attached.</p>
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
