<script setup lang="ts">
export interface GraphModule {
  id: string
  label: string
  iconUrl: string
  docsUrl: string
  hasSkill: boolean
}

const props = defineProps<{
  modules: GraphModule[]
}>()

// Coordinates share the 896x480 viewBox. The stage is always 56rem wide where it renders (lg+),
// so SVG units match CSS pixels and lines meet the pills and card edges.
const WIDTH = 896
const HEIGHT = 480
const PILL_WIDTH = 208
const CARD_WIDTH = 240
const CARD_HEADER = 44
const CARD_PAD = 8
const ROW_HEIGHT = 28
const ROWS = 6
const CARD_HEIGHT = CARD_HEADER + CARD_PAD * 2 + ROW_HEIGHT * ROWS
const CARD_TOP = (HEIGHT - CARD_HEIGHT) / 2
const PILL_YS = [96, 240, 384]

interface Slot {
  side: 'left' | 'right'
  y: number
  path: string
}

// Slots alternate sides, so slot k fills card row k and no two lines cross.
const SLOTS: Slot[] = Array.from({ length: ROWS }, (_, k) => {
  const side = k % 2 ? 'right' : 'left'
  const y = PILL_YS[Math.floor(k / 2)]!
  const rowY = CARD_TOP + CARD_HEADER + CARD_PAD + ROW_HEIGHT * k + ROW_HEIGHT / 2
  // Start and end a few units under the pill and card so the stroke never shows a gap.
  const dir = side === 'left' ? 1 : -1
  const from = side === 'left' ? PILL_WIDTH - 8 : WIDTH - PILL_WIDTH + 8
  const to = WIDTH / 2 - dir * (CARD_WIDTH / 2 - 8)
  const bend = (to - from) / 2
  return { side, y, path: `M ${from} ${y} C ${from + bend} ${y}, ${to - bend} ${rowY}, ${to} ${rowY}` }
})

// 0 hidden, 1 pill shown, 2 line drawing, 3 connected
type Step = 0 | 1 | 2 | 3

const picks = ref<GraphModule[]>([])
const steps = ref<Step[]>([])
const cycle = ref(0)
const leaving = ref(false)

const nodes = computed(() => picks.value.map((mod, k) => ({ mod, slot: SLOTS[k]!, step: steps.value[k] ?? 0 })))
const rows = computed(() => SLOTS.map((_, k) => (steps.value[k] === 3 && !leaving.value ? picks.value[k] : undefined)))
const connectedCount = computed(() => rows.value.filter(Boolean).length)

function shuffle<T>(items: T[]) {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

// The first cycle shows the featured order; later cycles deal from a shuffled deck so every module gets a turn.
let deck: GraphModule[] = []
function dealPicks() {
  const pool = props.modules
  if (pool.length <= ROWS) return [...pool]
  if (!deck.length && !picks.value.length) deck = [...pool]
  if (deck.length < ROWS) deck = [...deck, ...shuffle(pool.filter(m => !deck.includes(m) && !picks.value.includes(m)))]
  return deck.splice(0, ROWS)
}

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason)
    const onAbort = () => {
      clearTimeout(id)
      reject(signal.reason)
    }
    const id = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

const stage = useTemplateRef<HTMLElement>('stage')
const isHovered = useElementHover(stage)
const { focused: hasFocus } = useFocusWithin(stage)
const isEngaged = computed(() => isHovered.value || hasFocus.value)

// Hold the finished graph while the pointer or focus is on it, so links don't vanish under the user.
function whenIdle(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (!isEngaged.value) return resolve()
    const stop = watch(isEngaged, (engaged) => {
      if (engaged) return
      stop()
      signal.removeEventListener('abort', onAbort)
      resolve()
    })
    const onAbort = () => {
      stop()
      reject(signal.reason)
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

const STAGGER = 700

async function play(signal: AbortSignal) {
  const wait = (ms: number) => delay(ms, signal)
  while (true) {
    // Fresh keys mount fresh elements, so nothing animates backwards between cycles.
    cycle.value++
    picks.value = dealPicks()
    steps.value = picks.value.map(() => 0)
    leaving.value = false
    await wait(400)
    await Promise.all(picks.value.map(async (_, k) => {
      await wait(k * STAGGER)
      steps.value[k] = 1
      await wait(350)
      steps.value[k] = 2
      await wait(650)
      steps.value[k] = 3
    }))
    await wait(3200)
    await whenIdle(signal)
    leaving.value = true
    await wait(450)
  }
}

function showStaticFrame() {
  if (!picks.value.length) picks.value = props.modules.slice(0, ROWS)
  steps.value = picks.value.map(() => 3)
  leaving.value = false
}

// Observe the stage itself: it is display:none below lg, so the loop never runs there.
const isOnScreen = useElementVisibility(stage)
const documentVisibility = useDocumentVisibility()
const isActive = computed(() => isOnScreen.value && documentVisibility.value === 'visible')
const prefersReducedMotion = usePreferredReducedMotion()
const reduceMotion = computed(() => prefersReducedMotion.value === 'reduce')

let controller: AbortController | undefined
function stop() {
  controller?.abort()
  controller = undefined
}

watch([isActive, reduceMotion, () => props.modules.length], ([active, reduce, count]) => {
  stop()
  if (!count) return
  if (reduce) return showStaticFrame()
  if (!active) return
  controller = new AbortController()
  play(controller.signal).catch(() => { /* aborted */ })
}, { immediate: true })
onBeforeUnmount(stop)

function moduleLinkLabel(mod: GraphModule) {
  return `Open ${mod.label} docs`
}
</script>

<template>
  <div
    ref="stage"
    class="relative mx-auto w-full max-w-[56rem]"
    :style="{ aspectRatio: `${WIDTH} / ${HEIGHT}` }"
  >
    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="pointer-events-none absolute inset-0 size-full overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="module-graph-glow">
          <stop offset="0%" stop-color="var(--ui-primary)" stop-opacity="0.16" />
          <stop offset="100%" stop-color="var(--ui-primary)" stop-opacity="0" />
        </radialGradient>
      </defs>
      <ellipse :cx="WIDTH / 2" :cy="HEIGHT / 2" rx="230" ry="170" fill="url(#module-graph-glow)" />

      <g
        v-for="node in nodes"
        :key="`${cycle}-${node.mod.id}`"
        class="graph-line"
        :class="{ 'is-visible': node.step > 0 && !leaving }"
      >
        <path :d="node.slot.path" class="graph-track" fill="none" />
        <path
          :d="node.slot.path"
          class="graph-wire"
          :class="{ 'is-drawn': node.step >= 2 }"
          pathLength="1"
          fill="none"
        />
        <path
          v-if="node.step === 2"
          :d="node.slot.path"
          class="graph-pulse"
          pathLength="1"
          fill="none"
        />
      </g>
    </svg>

    <!-- SKILL.md: each module that connects fills the row its line plugs into -->
    <div
      class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-default shadow-[0_1px_2px_rgb(15_23_42/0.06),0_16px_40px_-16px_rgb(15_23_42/0.22)] ring-1 ring-default dark:shadow-[0_16px_40px_-16px_rgb(0_0_0/0.6)]"
      :style="{ width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px` }"
    >
      <div
        class="flex items-center gap-2 border-b border-default px-3"
        :style="{ height: `${CARD_HEADER}px` }"
      >
        <UIcon name="i-lucide-file-text" class="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span class="font-mono text-sm font-semibold tracking-tight text-highlighted">SKILL.md</span>
        <span class="ml-auto flex items-center gap-1 font-mono text-[11px] text-dimmed">
          <!-- Old and new digits share one grid cell, so they roll past each other without shifting the label -->
          <span class="inline-grid overflow-hidden tabular-nums">
            <Transition name="graph-count">
              <span :key="connectedCount" class="col-start-1 row-start-1">{{ connectedCount }}</span>
            </Transition>
          </span>
          {{ connectedCount === 1 ? 'module' : 'modules' }}
        </span>
      </div>
      <ul :style="{ padding: `${CARD_PAD}px 0` }">
        <li
          v-for="(mod, k) in rows"
          :key="k"
          class="relative px-3"
          :style="{ height: `${ROW_HEIGHT}px` }"
        >
          <Transition name="graph-row">
            <div
              v-if="mod"
              :key="`${cycle}-${mod.id}`"
              class="absolute inset-x-3 inset-y-0 flex items-center gap-2"
            >
              <img :src="mod.iconUrl" alt="" class="size-3.5 shrink-0 rounded-sm">
              <span class="min-w-0 flex-1 truncate font-mono text-xs text-default">{{ mod.label }}</span>
              <span class="shrink-0 font-mono text-[10px] text-dimmed">{{ mod.hasSkill ? 'skill' : 'docs' }}</span>
            </div>
            <div
              v-else
              class="absolute inset-x-3 inset-y-0 flex items-center gap-2"
              aria-hidden="true"
            >
              <span class="size-3.5 shrink-0 rounded-sm bg-elevated" />
              <span class="h-1.5 rounded-full bg-elevated" :style="{ width: `${44 + ((k * 37) % 40)}%` }" />
            </div>
          </Transition>
        </li>
      </ul>
    </div>

    <!-- Module pills -->
    <a
      v-for="node in nodes"
      :key="`${cycle}-${node.mod.id}`"
      :href="node.mod.docsUrl"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="moduleLinkLabel(node.mod)"
      :title="moduleLinkLabel(node.mod)"
      :inert="node.step === 0 || leaving"
      class="graph-pill group absolute flex h-9 items-center gap-2 rounded-full bg-default px-3 shadow-[0_1px_2px_rgb(15_23_42/0.06),0_6px_16px_-8px_rgb(15_23_42/0.18)] ring-1 outline-none focus-visible:ring-2 focus-visible:ring-primary"
      :class="[
        node.slot.side === 'left' ? 'left-0 flex-row' : 'right-0 flex-row-reverse',
        node.step === 3 ? 'ring-primary/35' : 'ring-default',
        { 'is-visible': node.step > 0 && !leaving, 'from-right': node.slot.side === 'right' },
      ]"
      :style="{ top: `${(node.slot.y / HEIGHT) * 100}%`, width: `${PILL_WIDTH}px` }"
    >
      <img :src="node.mod.iconUrl" alt="" class="size-4 shrink-0 rounded-sm">
      <span
        class="min-w-0 flex-1 truncate font-mono text-xs font-medium text-highlighted"
        :class="node.slot.side === 'right' && 'text-right'"
      >{{ node.mod.label }}</span>
      <span
        class="graph-port size-1.5 shrink-0 rounded-full"
        :class="node.step === 3 ? 'bg-primary' : 'bg-accented'"
        aria-hidden="true"
      />
    </a>
  </div>
</template>

<style scoped>
.graph-line {
  opacity: 0;
  transition: opacity 300ms cubic-bezier(0.23, 1, 0.32, 1);
}

.graph-line.is-visible {
  opacity: 1;
}

.graph-track {
  stroke: var(--ui-border-accented);
  stroke-width: 1;
  stroke-dasharray: 2 4;
}

/* pathLength="1" makes dash units a fraction of the curve, whatever its real length */
.graph-wire {
  stroke: var(--ui-primary);
  stroke-width: 1.5;
  stroke-opacity: 0.6;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  transition: stroke-dashoffset 650ms cubic-bezier(0.77, 0, 0.175, 1);
}

.graph-wire.is-drawn {
  stroke-dashoffset: 0;
}

/* A short bright segment that rides the head of the wire into the card */
.graph-pulse {
  stroke: var(--ui-primary);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 0.1 1;
  animation: graph-pulse 650ms cubic-bezier(0.77, 0, 0.175, 1) both;
}

@keyframes graph-pulse {
  from {
    stroke-dashoffset: 0.1;
  }
  to {
    stroke-dashoffset: -0.9;
  }
}

.graph-pill {
  opacity: 0;
  transform: translate(-8px, -50%) scale(0.97);
  transition:
    opacity 300ms cubic-bezier(0.23, 1, 0.32, 1),
    transform 300ms cubic-bezier(0.23, 1, 0.32, 1),
    box-shadow 200ms ease;
}

.graph-pill.from-right {
  transform: translate(8px, -50%) scale(0.97);
}

.graph-pill.is-visible {
  opacity: 1;
  transform: translate(0, -50%);
}

.graph-port {
  transition: background-color 200ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .graph-pill:hover {
    --tw-ring-color: color-mix(in oklab, var(--ui-primary) 50%, transparent);
  }
}

.graph-row-enter-active {
  transition:
    opacity 240ms cubic-bezier(0.23, 1, 0.32, 1),
    transform 240ms cubic-bezier(0.23, 1, 0.32, 1),
    filter 240ms cubic-bezier(0.23, 1, 0.32, 1);
}

.graph-row-leave-active {
  transition:
    opacity 200ms cubic-bezier(0.23, 1, 0.32, 1),
    transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

/* Text rises into its row; the exit is a smaller lift so it stays softer than the entrance */
.graph-row-enter-from {
  opacity: 0;
  filter: blur(2px);
  transform: translateY(8px);
}

.graph-row-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.graph-count-enter-active,
.graph-count-leave-active {
  transition:
    opacity 200ms cubic-bezier(0.23, 1, 0.32, 1),
    transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

.graph-count-enter-from {
  opacity: 0;
  transform: translateY(100%);
}

.graph-count-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

@media (prefers-reduced-motion: reduce) {
  .graph-line,
  .graph-wire,
  .graph-pill,
  .graph-port,
  .graph-row-enter-active,
  .graph-row-leave-active,
  .graph-count-enter-active,
  .graph-count-leave-active {
    transition: none;
  }

  .graph-pill,
  .graph-pill.from-right {
    transform: translate(0, -50%);
  }

  .graph-pulse {
    display: none;
  }
}
</style>
