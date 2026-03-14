<script setup lang="ts">
import { motion } from 'motion-v'

interface FileChange { name: string, additions: number, deletions: number }
interface SkillStep { skill: string, file: string, reason: string }
interface ChatEntry {
  type: 'user' | 'agent' | 'thinking' | 'files'
  text?: string
  files?: FileChange[]
  skillStep?: SkillStep
}

const agents = [
  { name: 'Claude Code', icon: 'i-simple-icons-anthropic' },
  { name: 'Cursor', icon: 'i-simple-icons-cursor' },
  { name: 'Gemini', icon: 'i-simple-icons-googlegemini' },
  { name: 'Codex', icon: 'i-simple-icons-openai' },
]
const agentIndex = ref(0)
const currentAgent = computed(() => agents[agentIndex.value]!)

let agentInterval: ReturnType<typeof setInterval>
onMounted(() => { agentInterval = setInterval(() => { agentIndex.value = (agentIndex.value + 1) % agents.length }, 3000) })
onUnmounted(() => clearInterval(agentInterval))

const CHAR_DELAY = 50
const AGENT_CHAR_DELAY = 30
const PAUSE_SHORT = 600
const PAUSE_MEDIUM = 1200
const PAUSE_READ = 3000
const FILE_STAGGER = 500

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function highlightSkill(text: string) {
  return text.replace(/(\/nuxt-my-project)/g, '<span class="font-semibold text-primary">$1</span>')
}

function formatAgent(html: string) {
  return html.replace(/<code>(.*?)<\/code>/g, '<code class="rounded bg-muted/30 px-1 py-0.5 font-mono text-xs text-highlighted">$1</code>')
}

// For typing: strip HTML tags, type plain text, then commit the full HTML
function stripHtml(html: string) { return html.replace(/<[^>]*>/g, '') }

const entries = ref<ChatEntry[]>([])
const typingRole = ref<'user' | 'agent' | null>(null)
const typingText = ref('')
const isThinking = ref(false)
const liveSkillStep = ref<SkillStep | null>(null)
const sectionEl = ref<HTMLElement | null>(null)
const chatEl = ref<HTMLElement>()
const isDone = ref(false)
const hasStarted = ref(false)
const isRunning = ref(false)
const userScrolledUp = ref(false)

function isAtBottom() {
  if (!chatEl.value) return true
  const { scrollTop, scrollHeight, clientHeight } = chatEl.value
  return scrollHeight - scrollTop - clientHeight < 30
}

function onScroll() {
  userScrolledUp.value = !isAtBottom()
}

function scrollToBottom() {
  if (userScrolledUp.value) return
  nextTick(() => { if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight })
}

async function typeText(text: string, delay = CHAR_DELAY) {
  typingText.value = ''
  for (let i = 0; i <= text.length; i++) {
    typingText.value = text.slice(0, i)
    scrollToBottom()
    await sleep(delay)
  }
}

async function userSays(text: string) {
  typingRole.value = 'user'
  await typeText(text)
  await sleep(PAUSE_SHORT)
  entries.value.push({ type: 'user', text })
  typingText.value = ''
  typingRole.value = null
  scrollToBottom()
  await sleep(PAUSE_MEDIUM)
}

async function agentThinks(step: SkillStep) {
  liveSkillStep.value = step
  isThinking.value = true
  scrollToBottom()
  await sleep(PAUSE_MEDIUM)

  // Hide live block first, wait for leave transition, then commit to history
  isThinking.value = false
  liveSkillStep.value = null
  await sleep(250)
  entries.value.push({ type: 'thinking', skillStep: step, text: step.reason })
  scrollToBottom()
  await sleep(PAUSE_SHORT)
}

async function agentSays(html: string) {
  typingRole.value = 'agent'
  await typeText(stripHtml(html), AGENT_CHAR_DELAY)
  await sleep(PAUSE_SHORT)
  entries.value.push({ type: 'agent', text: html })
  typingText.value = ''
  typingRole.value = null
  scrollToBottom()
}

async function showFiles(files: FileChange[]) {
  await sleep(PAUSE_SHORT)
  for (const file of files) {
    entries.value.push({ type: 'files', files: [file] })
    scrollToBottom()
    await sleep(FILE_STAGGER)
  }
  await sleep(PAUSE_READ)
}

async function runConversation() {
  if (isRunning.value) return

  isRunning.value = true
  isDone.value = false
  entries.value = []
  userScrolledUp.value = false
  try {
    // Round 1: user mentions skill
    await userSays('add a hero secton with a CTA buton using /nuxt-my-project')
    await agentThinks({ skill: 'nuxt-my-project', file: 'nuxt-ui.md', reason: 'Reading UButton props, variants and best practices...' })
    await showFiles([{ name: 'app/components/Hero.vue', additions: 31, deletions: 0 }, { name: 'app/pages/index.vue', additions: 24, deletions: 2 }])
    await agentSays('Added hero with <code>UButton</code> following Nuxt UI conventions.')

    await sleep(PAUSE_READ)

    // Round 2: no skill mentioned - agent auto-discovers
    await userSays('now add seo meta tags to the hompage pls')
    await agentThinks({ skill: 'nuxt-my-project', file: 'nuxt-seo.md', reason: 'Reading useHead and SEO meta patterns...' })
    await showFiles([{ name: 'app/pages/index.vue', additions: 12, deletions: 1 }])
    await agentSays('Added SEO meta with <code>useHead</code> following best practices.')

    await sleep(PAUSE_READ)

    // Round 3: server route
    await userSays('can you create a /api/contact endpint that validates body')
    await agentThinks({ skill: 'nuxt-my-project', file: 'nuxt.md', reason: 'Reading H3 validation and defineEventHandler patterns...' })
    await showFiles([{ name: 'server/api/contact.post.ts', additions: 18, deletions: 0 }])
    await agentSays('Created <code>/api/contact.post</code> with <code>readValidatedBody</code> for input validation.')

    await sleep(PAUSE_READ)

    // Round 4: content module
    await userSays('now lets add a blog secction with nuxt content')
    await agentThinks({ skill: 'nuxt-my-project', file: 'nuxt-content.md', reason: 'Reading collection config and queryCollection patterns...' })
    await showFiles([{ name: 'content.config.ts', additions: 8, deletions: 0 }, { name: 'app/pages/blog/index.vue', additions: 22, deletions: 0 }, { name: 'app/pages/blog/[slug].vue', additions: 19, deletions: 0 }])
    await agentSays('Set up blog with <code>defineCollection</code> and <code>queryCollection</code>.')

    isDone.value = true
  }
  finally {
    isRunning.value = false
  }
}

const { stop: stopSectionObserver } = useIntersectionObserver(
  sectionEl,
  ([entry]) => {
    if (!entry?.isIntersecting || hasStarted.value) return

    hasStarted.value = true
    stopSectionObserver()
    void runConversation()
  },
  {
    threshold: 0.35,
  },
)
</script>

<template>
  <section ref="sectionEl" id="how-it-works" class="relative scroll-mt-16 py-24 sm:py-32">
    <UContainer>
      <div class="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <!-- Left: text -->
        <motion.div
          :initial="{ opacity: 0, x: -20 }"
          :whileInView="{ opacity: 1, x: 0 }"
          :viewport="{ once: true, amount: 0.3 }"
          :transition="{ duration: 0.5 }"
        >
          <p class="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-primary">How it works</p>
          <h2 class="text-3xl font-bold text-highlighted sm:text-4xl">
            Keep prompting.<br>
            <span class="text-primary">Your agent gets the Nuxt context.</span>
          </h2>
          <ul class="mt-6 flex flex-col gap-3">
            <li class="flex items-start gap-2.5 text-muted">
              <UIcon name="i-lucide-folder-search" class="mt-0.5 size-4 shrink-0 text-primary" />
              <span class="flex flex-wrap items-center gap-2">
                Agents already know how to search your codebase.
                <UButton
                  to="https://vercel.com/blog/how-to-build-agents-with-filesystems-and-bash"
                  target="_blank"
                  variant="soft"
                  color="neutral"
                  size="xs"
                  trailing-icon="i-lucide-external-link"
                  class="shrink-0"
                  :ui="{ trailingIcon: 'size-3' }"
                >
                  Learn more
                </UButton>
              </span>
            </li>
            <li class="flex items-start gap-2.5 text-muted">
              <UIcon name="i-lucide-sparkles" class="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Generated from your Nuxt stack</span>
            </li>
            <li class="flex items-start gap-2.5 text-muted">
              <UIcon name="i-lucide-file-text" class="mt-0.5 size-4 shrink-0 text-primary" />
              <span>A single root skill becomes the entry point for your agent</span>
            </li>
            <li class="flex items-start gap-2.5 text-muted">
              <UIcon name="i-lucide-terminal" class="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Skill name matches your project: <code class="rounded bg-primary/10 px-1 py-0.5 font-mono text-xs text-primary">nuxt-{package.name}</code></span>
            </li>
          </ul>
        </motion.div>

        <!-- Right: animated conversation -->
        <motion.div
          :initial="{ opacity: 0, x: 20 }"
          :whileInView="{ opacity: 1, x: 0 }"
          :viewport="{ once: true, amount: 0.3 }"
          :transition="{ duration: 0.5, delay: 0.15 }"
        >
          <div class="flex h-[420px] flex-col overflow-hidden rounded-xl border border-default bg-default">
            <!-- Window chrome -->
            <div class="flex items-center gap-2 border-b border-default px-4 py-2.5">
              <div class="size-2.5 rounded-full bg-red-400/60" />
              <div class="size-2.5 rounded-full bg-yellow-400/60" />
              <div class="size-2.5 rounded-full bg-green-400/60" />
              <div class="relative ml-2 flex h-4 items-center overflow-hidden">
                <div
                  v-for="(agent, i) in agents" :key="agent.name"
                  class="absolute flex items-center gap-1.5 transition-all duration-300 ease-out"
                  :class="i === agentIndex ? 'translate-y-0 opacity-100' : i === (agentIndex - 1 + agents.length) % agents.length ? '-translate-y-full opacity-0' : 'translate-y-full opacity-0'"
                >
                  <UIcon :name="agent.icon" class="size-3 text-dimmed" />
                  <span class="font-mono text-xs text-dimmed">{{ agent.name }}</span>
                </div>
              </div>
            </div>

            <!-- Chat -->
            <div ref="chatEl" class="flex flex-1 flex-col gap-2 overflow-y-auto p-4 scroll-smooth" @scroll="onScroll">
              <!-- History -->
              <template v-for="(entry, i) in entries" :key="i">
                <!-- User -->
                <div v-if="entry.type === 'user'" class="flex justify-end">
                  <div class="max-w-[85%] rounded-lg rounded-tr-none bg-primary/10 px-3 py-1.5">
                    <p class="text-sm text-highlighted" v-html="highlightSkill(entry.text!)" />
                  </div>
                </div>
                <!-- Thinking (skill resolution) -->
                <div v-else-if="entry.type === 'thinking' && entry.skillStep" class="max-w-[90%] shrink-0 overflow-hidden rounded-lg border border-default">
                  <div class="flex items-center gap-2 bg-elevated/50 px-3 py-2">
                    <UIcon name="i-lucide-book-open" class="size-3.5 text-primary" />
                    <span class="font-mono text-xs text-dimmed">Reading skill</span>
                    <span class="font-mono text-xs font-medium text-primary">{{ entry.skillStep.skill }}</span>
                    <UIcon name="i-lucide-chevron-right" class="size-3 text-dimmed" />
                    <span class="font-mono text-xs font-semibold text-highlighted">{{ entry.skillStep.file }}</span>
                  </div>
                  <div class="px-3 py-2">
                    <p class="font-mono text-xs text-muted">{{ entry.text }}</p>
                  </div>
                </div>
                <!-- Agent -->
                <div v-else-if="entry.type === 'agent'" class="max-w-[85%] rounded-lg rounded-tl-none bg-elevated/80 px-3 py-1.5">
                  <p class="text-sm text-muted" v-html="formatAgent(entry.text!)" />
                </div>
                <!-- Files -->
                <div v-else-if="entry.type === 'files' && entry.files" class="flex items-center gap-2 rounded-md bg-elevated/50 px-2.5 py-1">
                  <UIcon name="i-lucide-file-code" class="size-3 shrink-0 text-dimmed" />
                  <span class="flex-1 truncate font-mono text-xs text-muted">{{ entry.files[0]!.name }}</span>
                  <span v-if="entry.files[0]!.additions" class="font-mono text-xs text-green-500">+{{ entry.files[0]!.additions }}</span>
                  <span v-if="entry.files[0]!.deletions" class="font-mono text-xs text-red-400">-{{ entry.files[0]!.deletions }}</span>
                </div>
              </template>

              <!-- Live: thinking (skill resolution) -->
              <Transition
                enter-active-class="transition duration-300 ease-out"
                enter-from-class="translate-y-1 opacity-0"
                enter-to-class="translate-y-0 opacity-100"
                leave-active-class="transition duration-200 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
              >
                <div
                  v-if="isThinking && liveSkillStep"
                  class="max-w-[90%] shrink-0 translate-y-0 transform-gpu overflow-hidden rounded-lg border border-default opacity-100 [will-change:transform,opacity]"
                >
                  <div class="flex items-center gap-2 bg-elevated/50 px-3 py-2">
                    <UIcon name="i-lucide-book-open" class="size-3.5 animate-pulse text-primary" />
                    <span class="font-mono text-xs text-dimmed">Reading skill</span>
                    <span class="font-mono text-xs font-medium text-primary">{{ liveSkillStep.skill }}</span>
                    <UIcon name="i-lucide-chevron-right" class="size-3 text-dimmed" />
                    <span class="font-mono text-xs font-semibold text-highlighted">{{ liveSkillStep.file }}</span>
                  </div>
                  <div class="px-3 py-2">
                    <p class="font-mono text-xs text-muted">{{ liveSkillStep.reason }}</p>
                  </div>
                </div>
              </Transition>

              <!-- Live: typing user -->
              <div v-if="typingRole === 'user' && typingText" class="flex justify-end">
                <div class="max-w-[85%] rounded-lg rounded-tr-none bg-primary/10 px-3 py-1.5">
                  <p class="text-sm">
                    <span class="text-highlighted" v-html="highlightSkill(typingText)" />
                    <span class="ml-0.5 inline-block h-3.5 w-0.5 translate-y-0.5 animate-pulse bg-primary" />
                  </p>
                </div>
              </div>

              <!-- Live: typing agent -->
              <div v-if="typingRole === 'agent' && typingText" class="max-w-[85%] rounded-lg rounded-tl-none bg-elevated/80 px-3 py-1.5">
                <p class="text-sm">
                  <span class="text-muted">{{ typingText }}</span>
                  <span class="ml-0.5 inline-block h-3.5 w-0.5 translate-y-0.5 animate-pulse bg-muted" />
                </p>
              </div>
            </div>

            <!-- Replay button -->
            <Transition
              enter-active-class="transition duration-300 ease-out"
              enter-from-class="translate-y-2 opacity-0"
              enter-to-class="translate-y-0 opacity-100"
            >
              <div v-if="isDone" class="flex justify-center border-t border-default px-4 py-3">
                <UButton size="sm" variant="soft" icon="i-lucide-rotate-ccw" @click="runConversation()">
                  Replay
                </UButton>
              </div>
            </Transition>
          </div>
        </motion.div>
      </div>
    </UContainer>
  </section>
</template>
