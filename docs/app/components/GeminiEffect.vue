<script setup lang="ts">
import { motion, AnimatePresence } from 'motion-v'

interface ModuleNode {
  id: string
  label: string
  icon: string
  color: string
  command: string
  docsUrl: string
}

const colorMode = useColorMode()
const betterAuthColor = computed(() => colorMode.value === 'dark' ? '#ffffff' : '#111111')

const modulePool = computed<ModuleNode[]>(() => [
  { id: 'nuxt-ui', label: 'Nuxt UI', icon: 'i-skill-logos-nuxt-ui', color: '#22c55e', command: 'npx nuxt module add @nuxt/ui', docsUrl: 'https://ui.nuxt.com/' },
  { id: 'nuxt-content', label: 'Nuxt Content', icon: 'i-skill-logos-nuxt-content', color: '#22c55e', command: 'npx nuxt module add @nuxt/content', docsUrl: 'https://content.nuxt.com/' },
  { id: 'nuxt-better-auth', label: 'Nuxt Better Auth', icon: 'i-skill-logos-better-auth', color: betterAuthColor.value, command: 'npx nuxt module add @onmax/nuxt-better-auth', docsUrl: 'https://better-auth.nuxt.dev/' },
  { id: 'nuxt-seo', label: 'Nuxt SEO', icon: 'i-skill-logos-nuxt-seo', color: '#38bdf8', command: 'npx nuxt module add nuxt-seo', docsUrl: 'https://nuxtseo.com/' },
  { id: 'vitest', label: 'Vitest', icon: 'i-skill-logos-vitest', color: '#fbbf24', command: 'npx nuxt module add vitest', docsUrl: 'https://vitest.dev/' },
  { id: 'vueuse', label: 'VueUse Nuxt', icon: 'i-skill-logos-vueuse', color: '#34d399', command: 'npx nuxt module add @vueuse/nuxt', docsUrl: 'https://vueuse.org/nuxt/readme.html' },
])

type Phase = 'hidden' | 'pill-appear' | 'typing' | 'morph' | 'line' | 'connected'

interface ModuleState {
  mod: ModuleNode
  phase: Phase
  typedText: string
  lineProgress: number
}

const states = ref<ModuleState[]>([])
const centerPhase = ref<'hidden' | 'typing' | 'revealed'>('hidden')
const centerTypedText = ref('')
const centerPulse = ref(false)
const connectedIcons = ref<{ icon: string, color: string }[]>([])

const centerCommand = 'npx nuxt module add nuxt-skill-hub'

const slots = [
  { x: 12, y: 18, side: 'left' as const },
  { x: 88, y: 18, side: 'right' as const },
  { x: 12, y: 50, side: 'left' as const },
  { x: 88, y: 50, side: 'right' as const },
  { x: 12, y: 82, side: 'left' as const },
  { x: 88, y: 82, side: 'right' as const },
]
const center = { x: 50, y: 50 }

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function typeInto(idx: number, text: string) {
  for (let i = 1; i <= text.length; i++) {
    states.value[idx]!.typedText = text.slice(0, i)
    await delay(35)
  }
}

async function growLine(idx: number) {
  const duration = 700
  const frames = 42
  const interval = duration / frames
  for (let i = 1; i <= frames; i++) {
    let t = i / frames
    t = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
    states.value[idx]!.lineProgress = t
    await delay(interval)
  }
  states.value[idx]!.lineProgress = 1
}

async function typeCenterCommand() {
  for (let i = 1; i <= centerCommand.length; i++) {
    centerTypedText.value = centerCommand.slice(0, i)
    await delay(35)
  }
}

let abortController: AbortController | null = null

async function runAnimation() {
  abortController?.abort()
  const ac = new AbortController()
  abortController = ac

  // Reset state
  centerPhase.value = 'hidden'
  centerTypedText.value = ''
  centerPulse.value = false
  connectedIcons.value = []

  // Shuffle slot order so modules don't always appear top-left first
  const pool = modulePool.value
  const slotOrder = [...Array(pool.length).keys()].sort(() => Math.random() - 0.5)
  const shuffled = slotOrder.map(i => pool[i]!)
  states.value = slots.map((_, i) => ({ mod: shuffled[i]!, phase: 'hidden' as Phase, typedText: '', lineProgress: 0 }))

  const wait = (ms: number) => new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms)
    ac.signal.addEventListener('abort', () => { clearTimeout(id); reject(new Error('aborted')) })
  })

  try {
    await wait(800)
    centerPhase.value = 'typing'
    await wait(400)
    await typeCenterCommand()
    await wait(500)
    centerPhase.value = 'revealed'
    await wait(800)

    // Staggered launch — next module starts mid-way through previous one
    const STAGGER = 1800
    const order = [...Array(shuffled.length).keys()].sort(() => Math.random() - 0.5)
    const promises = order.map((idx, rank) => (async () => {
      await wait(rank * STAGGER)
      const s = states.value[idx]!
      s.phase = 'pill-appear'
      await wait(400)
      s.phase = 'typing'
      await typeInto(idx, s.mod.command)
      await wait(300)
      s.phase = 'morph'
      await wait(500)
      s.phase = 'line'
      await growLine(idx)
      s.phase = 'connected'
      connectedIcons.value = [...connectedIcons.value, { icon: s.mod.icon, color: s.mod.color }]
      centerPulse.value = true
      await wait(250)
      centerPulse.value = false
    })())
    await Promise.all(promises)
  }
  catch { /* aborted */ }
}

onMounted(runAnimation)

function curvePath(slot: { x: number, y: number }) {
  const fx = slot.x * 10
  const fy = slot.y * 6
  const tx = center.x * 10
  const ty = center.y * 6
  const cx1 = fx + (tx - fx) * 0.45
  const cx2 = fx + (tx - fx) * 0.55
  return `M ${fx} ${fy} C ${cx1} ${fy}, ${cx2} ${ty}, ${tx} ${ty}`
}

function moduleLinkLabel(mod: ModuleNode) {
  return `Open ${mod.label} docs`
}
</script>

<template>
  <div class="mx-auto w-full max-w-4xl">
    <div class="md:hidden">
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
            class="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/25 bg-default px-4 py-3 shadow-[0_0_30px_color-mix(in_srgb,var(--ui-primary)_12%,transparent)]"
          >
            <span class="font-mono text-sm font-semibold tracking-tight text-highlighted">SKILLS.md</span>
            <div class="flex items-center">
              <div
                v-for="mod in modulePool.slice(0, 4)"
                :key="`mobile-icon-${mod.id}`"
                class="-ml-1.5 flex size-6 items-center justify-center rounded-full border border-default bg-muted first:ml-0"
              >
                <UIcon :name="mod.icon" class="size-4" :style="{ color: mod.color }" />
              </div>
            </div>
          </motion.div>

          <div class="relative mt-5 pl-6">
            <div class="absolute bottom-4 left-2 top-2 w-px bg-gradient-to-b from-primary/25 via-primary/14 to-transparent" />

            <motion.a
              v-for="(mod, index) in modulePool"
              :key="`mobile-${mod.id}`"
              :href="mod.docsUrl"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="moduleLinkLabel(mod)"
              :title="moduleLinkLabel(mod)"
              :initial="{ opacity: 0, x: -8 }"
              :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.35, delay: 0.08 * index }"
              class="group relative mb-3 flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-default bg-default/95 px-3 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition-colors hover:border-primary/25 hover:bg-elevated last:mb-0"
            >
              <span class="absolute -left-4 top-1/2 h-px w-4 -translate-y-1/2 bg-primary/20" />

              <div class="min-w-0 flex items-center gap-2.5">
                <div class="flex size-8 shrink-0 items-center justify-center rounded-full border border-default bg-muted">
                  <UIcon :name="mod.icon" class="size-4" :style="{ color: mod.color }" />
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

    <div class="relative hidden md:block" style="aspect-ratio: 10/6">
    <!-- SVG layer: lines + glow -->
    <svg viewBox="0 0 1000 600" class="pointer-events-none absolute inset-0 size-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="cg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" class="[stop-color:var(--ui-primary)]" stop-opacity="0.12" />
          <stop offset="100%" class="[stop-color:var(--ui-primary)]" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Ambient glow -->
      <circle
        v-if="centerPhase !== 'hidden'"
        :cx="center.x * 10"
        :cy="center.y * 6"
        r="90"
        fill="url(#cg)"
        class="transition-opacity duration-700"
      />

      <!-- Connection lines -->
      <path
        v-for="(s, i) in states"
        :key="`line-${s.mod.id}`"
        :d="curvePath(slots[i]!)"
        fill="none"
        :stroke="s.mod.color"
        stroke-width="3"
        :stroke-opacity="s.lineProgress > 0 ? 0.35 : 0"
        :stroke-dasharray="500"
        :stroke-dashoffset="500 * (1 - s.lineProgress)"
      />

      <!-- Center pulse ring -->
      <circle
        v-if="centerPulse"
        :key="`pulse-${connectedIcons.length}`"
        :cx="center.x * 10"
        :cy="center.y * 6"
        r="35"
        fill="none"
        class="[stroke:var(--ui-primary)]"
        stroke-width="2"
        stroke-opacity="0"
      >
        <animate attributeName="r" values="35;65" dur="0.4s" fill="freeze" />
        <animate attributeName="stroke-opacity" values="0.5;0" dur="0.4s" fill="freeze" />
      </circle>
    </svg>

    <!-- Center pill: single persistent container, inner content morphs -->
    <div
      v-if="centerPhase !== 'hidden'"
      class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      <motion.div
        layout
        :initial="{ opacity: 0, scale: 0.95 }"
        :animate="{ opacity: 1, scale: 1 }"
        :transition="{ type: 'spring', stiffness: 300, damping: 22, layout: { type: 'spring', stiffness: 300, damping: 25 } }"
        class="flex items-center overflow-hidden rounded-full border-2 px-4 py-2.5"
        :class="[
          centerPhase === 'revealed' ? 'border-primary/30 bg-default' : 'border-default bg-muted',
          centerPulse ? 'shadow-[0_0_40px_color-mix(in_srgb,var(--ui-primary)_25%,transparent)]' : centerPhase === 'revealed' ? 'shadow-[0_0_20px_color-mix(in_srgb,var(--ui-primary)_10%,transparent)]' : '',
        ]"
      >
        <AnimatePresence mode="popLayout">
          <!-- Typing: npx nuxt module add nuxt-skill-hub -->
          <motion.span
            v-if="centerPhase === 'typing'"
            key="center-cmd"
            :exit="{ opacity: 0 }"
            :transition="{ duration: 0.15 }"
            class="flex items-center"
          >
            <span class="font-mono text-xs text-dimmed whitespace-nowrap">{{ centerTypedText }}</span>
            <span class="ml-0.5 animate-pulse font-mono text-xs text-primary">▌</span>
          </motion.span>

          <!-- Revealed: SKILLS.md + logo stack -->
          <motion.span
            v-else
            key="center-skills"
            :initial="{ opacity: 0 }"
            :animate="{ opacity: 1 }"
            :transition="{ duration: 0.25 }"
            class="flex items-center gap-2"
          >
            <span class="font-mono text-sm font-semibold tracking-tight text-highlighted">SKILLS.md</span>
            <TransitionGroup
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-0 scale-0 !-ml-6"
              enter-to-class="opacity-100 scale-100"
              tag="div"
              class="flex items-center"
            >
              <div
                v-for="logo in connectedIcons"
                :key="logo.icon"
                class="-ml-1.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-default bg-muted first:ml-0"
              >
                <UIcon :name="logo.icon" class="size-4" :style="{ color: logo.color }" />
              </div>
            </TransitionGroup>
          </motion.span>
        </AnimatePresence>
      </motion.div>
    </div>

    <!-- Module pills: single persistent container, inner content morphs -->
    <div
      v-for="(s, i) in states"
      :key="s.mod.id"
      class="absolute z-10 -translate-y-1/2"
      :class="slots[i]!.side === 'left' ? '-translate-x-1/4' : '-translate-x-3/4'"
      :style="{ left: `${slots[i]!.x}%`, top: `${slots[i]!.y}%` }"
    >
      <a
        v-if="s.phase !== 'hidden'"
        :href="s.mod.docsUrl"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="moduleLinkLabel(s.mod)"
        :title="moduleLinkLabel(s.mod)"
        class="group block focus:outline-none"
      >
        <motion.div
          layout
          :initial="{ opacity: 0, scale: 0.95 }"
          :animate="{ opacity: 1, scale: 1 }"
          :transition="{ type: 'spring', stiffness: 350, damping: 22, layout: { type: 'spring', stiffness: 300, damping: 25 } }"
          class="flex h-8 items-center overflow-hidden rounded-full border bg-muted px-3 transition-colors group-hover:border-primary/25 group-hover:bg-default group-focus-visible:border-primary/25 group-focus-visible:bg-default"
          :class="s.phase === 'connected' ? 'border-accented' : 'border-default'"
        >
          <AnimatePresence mode="popLayout">
            <!-- Command text -->
            <motion.span
              v-if="s.phase === 'pill-appear' || s.phase === 'typing'"
              key="cmd"
              :exit="{ opacity: 0 }"
              :transition="{ duration: 0.15 }"
              class="flex items-center"
            >
              <span class="font-mono text-[9px] text-dimmed whitespace-nowrap">{{ s.typedText }}</span>
              <span v-if="s.phase === 'typing'" class="ml-0.5 animate-pulse font-mono text-[9px] text-primary">▌</span>
            </motion.span>

            <!-- Module icon + label -->
            <motion.span
              v-else
              key="mod"
              :initial="{ opacity: 0 }"
              :animate="{ opacity: 1 }"
              :transition="{ duration: 0.25 }"
              class="flex items-center gap-1.5"
            >
              <UIcon :name="s.mod.icon" class="size-3.5 shrink-0" :style="{ color: s.mod.color }" />
              <span class="font-mono text-[10px] font-medium text-highlighted whitespace-nowrap">{{ s.mod.label }}</span>
            </motion.span>
          </AnimatePresence>
        </motion.div>
      </a>
    </div>

    <!-- Reset button -->
    <button
      class="absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-full border border-default bg-muted text-dimmed opacity-0 transition-opacity hover:text-highlighted hover:opacity-100 focus:opacity-100"
      :class="{ '!opacity-60': connectedIcons.length === modulePool.length }"
      @click="runAnimation"
    >
      <UIcon name="i-lucide-rotate-ccw" class="size-3.5" />
    </button>
    </div>
  </div>
</template>
