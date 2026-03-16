<script setup lang="ts">
import { motion, AnimatePresence } from 'motion-v'
import type { NuxtModuleResult } from '../../server/api/nuxt-modules.get'

interface ModuleNode {
  id: string
  label: string
  icon: string
  iconUrl: string
  command: string
  docsUrl: string
  stars: number
  color?: string
}

interface SlotPosition {
  x: number
  y: number
  side: 'left' | 'right'
}

type Phase = 'hidden' | 'pill-appear' | 'typing' | 'morph' | 'line' | 'connected'

interface ModuleState {
  mod: ModuleNode
  phase: Phase
  typedText: string
  lineProgress: number
  color?: string
}

const states = ref<ModuleState[]>([])
const slots = ref<SlotPosition[]>([])
const centerPhase = ref<'hidden' | 'typing' | 'revealed'>('hidden')
const centerTypedText = ref('')
const centerPulse = ref(false)
const connectedIcons = ref<{ iconUrl: string }[]>([])
const containerOpacity = ref(1)

const centerCommand = 'npx nuxt module add nuxt-skill-hub'

const center = { x: 50, y: 50 }

function moduleIconUrl(icon: string) {
  return `https://raw.githubusercontent.com/nuxt/modules/main/icons/${icon}`
}

const colorCache = new Map<string, string>()

function extractDominantColor(iconUrl: string): Promise<string | undefined> {
  if (colorCache.has(iconUrl)) return Promise.resolve(colorCache.get(iconUrl))
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || 32
      canvas.height = img.naturalHeight || 32
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let rSum = 0, gSum = 0, bSum = 0, count = 0
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!, a = data[i + 3]!
        // Skip transparent and near-white/near-black pixels
        if (a < 128) continue
        const max = Math.max(r, g, b), min = Math.min(r, g, b)
        if (max - min < 20) continue // skip grays
        rSum += r; gSum += g; bSum += b; count++
      }
      if (count < 10) { resolve(undefined); return }
      const color = `rgb(${Math.round(rSum / count)}, ${Math.round(gSum / count)}, ${Math.round(bSum / count)})`
      colorCache.set(iconUrl, color)
      resolve(color)
    }
    img.onerror = () => resolve(undefined)
    img.src = iconUrl
  })
}

// Fetch modules from API
const { data: apiData } = await useFetch('/api/nuxt-modules')

const modulePool = computed<ModuleNode[]>(() => {
  const modules = apiData.value?.modules
  if (!modules?.length) return []
  return modules
    .filter((m: NuxtModuleResult) => m.icon)
    .map((m: NuxtModuleResult) => ({
      id: m.npm,
      label: m.name,
      icon: m.icon,
      iconUrl: moduleIconUrl(m.icon),
      command: `npx nuxt module add ${m.npm}`,
      docsUrl: m.website ?? m.github ?? '',
      stars: m.stars,
    }))
})

// Normal distribution via Box-Muller, clamped to [1, 8], centered ~5.5
function randomModuleCount(): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return Math.round(Math.min(8, Math.max(1, 5.5 + z * 1.2)))
}

// Star-weighted sampling without replacement
function weightedSample(pool: ModuleNode[], count: number): ModuleNode[] {
  if (pool.length <= count) return [...pool].sort(() => Math.random() - 0.5)
  const maxStars = Math.max(...pool.map(m => m.stars), 1)
  const floor = maxStars * 0.05
  const items = pool.map(m => ({ mod: m, weight: Math.max(m.stars, floor) }))
  const result: ModuleNode[] = []
  for (let i = 0; i < count; i++) {
    const totalWeight = items.reduce((sum, it) => sum + it.weight, 0)
    let r = Math.random() * totalWeight
    let picked = 0
    for (let j = 0; j < items.length; j++) {
      r -= items[j]!.weight
      if (r <= 0) { picked = j; break }
    }
    result.push(items[picked]!.mod)
    items.splice(picked, 1)
  }
  return result
}

// Generate randomized slot positions for N modules
function generateSlots(count: number): SlotPosition[] {
  const leftCount = Math.ceil(count / 2)
  const rightCount = count - leftCount
  const result: SlotPosition[] = []

  function spreadY(n: number): number[] {
    if (n === 1) return [50]
    const margin = 15
    const range = 100 - 2 * margin
    const step = range / (n - 1)
    return Array.from({ length: n }, (_, i) => margin + i * step + (Math.random() - 0.5) * step * 0.4)
  }

  for (const y of spreadY(leftCount)) {
    result.push({ x: 8 + Math.random() * 10, y, side: 'left' })
  }
  for (const y of spreadY(rightCount)) {
    result.push({ x: 82 + Math.random() * 10, y, side: 'right' })
  }
  return result
}

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
  containerOpacity.value = 1

  const pool = modulePool.value
  if (!pool.length) return

  const count = randomModuleCount()
  const selected = weightedSample(pool, count)
  const generatedSlots = generateSlots(count)

  slots.value = generatedSlots
  states.value = generatedSlots.map((_, i) => ({
    mod: selected[i]!,
    phase: 'hidden' as Phase,
    typedText: '',
    lineProgress: 0,
  }))

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

    // Pre-extract colors for all selected modules
    await Promise.all(states.value.map(async (s) => {
      const color = await extractDominantColor(s.mod.iconUrl)
      if (color) s.color = color
    }))

    const STAGGER = 1800
    const order = [...Array(selected.length).keys()].sort(() => Math.random() - 0.5)
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
      connectedIcons.value = [...connectedIcons.value, { iconUrl: s.mod.iconUrl }]
      centerPulse.value = true
      await wait(250)
      centerPulse.value = false
    })())
    await Promise.all(promises)

    // Pause then fade out and restart
    await wait(2500)
    containerOpacity.value = 0
    await wait(900)
    runAnimation()
  }
  catch { /* aborted */ }
}

onMounted(runAnimation)

function curvePath(slot: SlotPosition) {
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
    <!-- Mobile: static list using first 6 from API -->
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
              class="group relative mb-3 flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-default bg-default/95 px-3 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition-colors hover:border-primary/25 hover:bg-elevated last:mb-0"
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

    <!-- Desktop: animated effect -->
    <div
      class="relative hidden md:block transition-opacity duration-[800ms]"
      :style="{ opacity: containerOpacity, aspectRatio: '10/6' }"
    >
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
          :stroke="s.color || 'var(--ui-primary)'"
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

      <!-- Center pill -->
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
            <!-- Typing command -->
            <motion.span
              v-if="centerPhase === 'typing'"
              key="center-cmd"
              :exit="{ opacity: 0 }"
              :transition="{ duration: 0.15 }"
              class="flex items-center"
            >
              <span class="font-mono text-sm text-dimmed whitespace-nowrap">{{ centerTypedText }}</span>
              <span class="ml-0.5 animate-pulse font-mono text-sm text-primary">▌</span>
            </motion.span>

            <!-- Revealed: SKILLS.md + icon stack -->
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
                  :key="logo.iconUrl"
                  class="-ml-1.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-default bg-muted first:ml-0"
                >
                  <img :src="logo.iconUrl" alt="" class="size-4 rounded-full">
                </div>
              </TransitionGroup>
            </motion.span>
          </AnimatePresence>
        </motion.div>
      </div>

      <!-- Module pills -->
      <div
        v-for="(s, i) in states"
        :key="`${s.mod.id}-${i}`"
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
            class="flex h-8 items-center rounded-full border bg-muted transition-colors group-hover:border-primary/25 group-hover:bg-default group-focus-visible:border-primary/25 group-focus-visible:bg-default"
            :class="s.phase === 'connected' && !s.color ? 'border-accented' : 'border-default'"
            :style="s.phase === 'connected' && s.color ? { borderColor: s.color + '60' } : {}"
          >
            <AnimatePresence mode="popLayout">
              <!-- Command text -->
              <motion.span
                v-if="s.phase === 'pill-appear' || s.phase === 'typing'"
                key="cmd"
                :exit="{ opacity: 0 }"
                :transition="{ duration: 0.15 }"
                class="flex items-center px-3"
              >
                <span class="font-mono text-xs text-dimmed whitespace-nowrap">{{ s.typedText }}</span>
                <span v-if="s.phase === 'typing'" class="ml-0.5 animate-pulse font-mono text-xs text-primary">▌</span>
              </motion.span>

              <!-- Module icon + label -->
              <motion.span
                v-else
                key="mod"
                :initial="{ opacity: 0 }"
                :animate="{ opacity: 1 }"
                :transition="{ duration: 0.25 }"
                class="flex items-center gap-1.5 px-3"
              >
                <img :src="s.mod.iconUrl" :alt="s.mod.label" class="size-3.5 shrink-0 rounded-full">
                <span class="font-mono text-xs font-medium text-highlighted whitespace-nowrap">{{ s.mod.label }}</span>
              </motion.span>
            </AnimatePresence>
          </motion.div>
        </a>
      </div>

    </div>
  </div>
</template>
