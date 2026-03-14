<script setup lang="ts">
import { motion, AnimatePresence } from 'motion-v'
import type { SkillFile, SkillFileTree } from '~/data/skill-files'

const props = defineProps<{
  fileTree: SkillFileTree[]
  activeFile?: SkillFile
  activeFilePath: string
}>()

const emit = defineEmits<{
  selectFile: [path: string]
}>()

const renderMarkdown = useLocalStorage('playground-render-md', true)
const renderedMarkdown = shallowRef<Awaited<ReturnType<typeof parseMarkdown>> | null>(null)
const renderMarkdownPending = ref(false)
const renderMarkdownError = ref<string | null>(null)
const mobilePane = ref<'files' | 'content'>('files')

function findTreeItem(items: SkillFileTree[], path: string): SkillFileTree | undefined {
  for (const item of items) {
    if (item.value === path) return item
    if (item.children) {
      const child = findTreeItem(item.children, path)
      if (child) return child
    }
  }
}

const selected = ref<SkillFileTree | undefined>(findTreeItem(props.fileTree, props.activeFilePath))

watch(selected, (val) => {
  if (val?.value && !val.value.startsWith('dir:')) {
    emit('selectFile', val.value)
    mobilePane.value = 'content'
  }
})

watch(
  () => [props.fileTree, props.activeFilePath] as const,
  ([fileTree, activeFilePath]) => {
    const next = findTreeItem(fileTree, activeFilePath)
    if (selected.value?.value !== next?.value) selected.value = next
  },
  { immediate: true },
)

// Rotating agent names
const agents = [
  { prefix: '.claude' },
  { prefix: '.cursor' },
  { prefix: '.gemini' },
  { prefix: '.codex' },
]
const agentIndex = ref(0)
const currentAgent = computed(() => agents[agentIndex.value]!)
const canRenderMarkdown = computed(() =>
  /\.md$/i.test(props.activeFile?.path || ''),
)
const shouldRenderMarkdown = computed(() =>
  Boolean(props.activeFile && renderMarkdown.value && canRenderMarkdown.value),
)

watch(
  () => [shouldRenderMarkdown.value, props.activeFile?.content] as const,
  async ([enabled, content], _, onCleanup) => {
    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })

    if (!enabled || !content) {
      renderedMarkdown.value = null
      renderMarkdownPending.value = false
      renderMarkdownError.value = null
      return
    }

    renderMarkdownPending.value = true
    renderMarkdownError.value = null

    try {
      const parsed = await parseMarkdown(content)
      if (!cancelled) {
        renderedMarkdown.value = parsed
      }
    }
    catch (error) {
      if (!cancelled) {
        renderedMarkdown.value = null
        renderMarkdownError.value = error instanceof Error ? error.message : 'Failed to render markdown.'
      }
    }
    finally {
      if (!cancelled) {
        renderMarkdownPending.value = false
      }
    }
  },
  { immediate: true },
)

let interval: ReturnType<typeof setInterval>
onMounted(() => {
  interval = setInterval(() => {
    agentIndex.value = (agentIndex.value + 1) % agents.length
  }, 3000)
})
onUnmounted(() => clearInterval(interval))
</script>

<template>
  <div class="flex min-h-[32rem] overflow-hidden rounded-xl border border-default bg-elevated md:h-full md:min-h-0">
    <div class="flex w-full flex-col md:hidden">
      <div class="flex items-center justify-between gap-3 border-b border-default bg-muted/70 px-3 py-2">
        <div class="flex items-center gap-2 rounded-full border border-default bg-default p-1">
          <UButton
            size="xs"
            color="neutral"
            :variant="mobilePane === 'files' ? 'soft' : 'ghost'"
            icon="i-lucide-folder-tree"
            class="rounded-full"
            @click="mobilePane = 'files'"
          >
            Files
          </UButton>
          <UButton
            size="xs"
            color="neutral"
            :variant="mobilePane === 'content' ? 'soft' : 'ghost'"
            icon="i-lucide-file-text"
            class="rounded-full"
            @click="mobilePane = 'content'"
          >
            Preview
          </UButton>
        </div>
        <span class="truncate font-mono text-[11px] text-dimmed">
          {{ currentAgent.prefix }}/skills/nuxt
        </span>
      </div>

      <div
        v-show="mobilePane === 'files'"
        class="flex min-h-0 flex-1 flex-col bg-muted"
      >
        <div class="border-b border-default px-3 py-2 font-mono text-xs text-dimmed">
          Select a file
        </div>
        <div class="min-h-0 flex-1 overflow-auto p-2">
          <UTree
            v-model="selected"
            :items="fileTree"
            color="primary"
            size="xs"
            :ui="{
              link: 'font-mono text-xs',
              linkLeadingIcon: 'size-3.5',
            }"
          />
        </div>
      </div>

      <div
        v-show="mobilePane === 'content'"
        class="flex min-h-0 flex-1 flex-col"
      >
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-default px-3 py-2">
          <div class="flex min-w-0 items-center gap-2">
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-arrow-left"
              class="rounded-full"
              @click="mobilePane = 'files'"
            />
            <span class="truncate font-mono text-xs text-muted">
              {{ activeFile?.name || 'Select a file' }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <USwitch
              v-if="canRenderMarkdown"
              v-model="renderMarkdown"
              size="xs"
            />
            <UButton
              v-if="activeFile?.sourceHref"
              :to="activeFile.sourceHref"
              target="_blank"
              color="neutral"
              variant="outline"
              size="xs"
              icon="i-lucide-external-link"
            />
          </div>
        </div>
        <div class="min-h-0 flex-1 overflow-auto p-3">
          <div
            v-if="renderMarkdownPending"
            class="flex h-full min-h-40 items-center justify-center text-dimmed"
          >
            <p class="font-mono text-xs">
              Rendering markdown...
            </p>
          </div>
          <div
            v-else-if="renderMarkdownError"
            class="rounded-lg border border-error/30 bg-error/5 p-3 font-mono text-xs text-error"
          >
            {{ renderMarkdownError }}
          </div>
          <MDCRenderer
            v-else-if="renderedMarkdown"
            tag="article"
            :body="renderedMarkdown.body"
            :data="renderedMarkdown.data"
            class="text-sm leading-7 text-default [&_a]:text-primary [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_h1]:mb-4 [&_h1]:font-mono [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:font-mono [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-mono [&_h3]:text-base [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:my-3 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-default [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs"
          />
          <pre
            v-else-if="activeFile"
            class="font-mono text-xs leading-relaxed whitespace-pre-wrap text-default"
          ><code>{{ activeFile.content }}</code></pre>
          <div
            v-else
            class="flex h-48 items-center justify-center text-dimmed"
          >
            <p class="font-mono text-xs">
              Click a file to view its contents
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Sidebar: file tree -->
    <div class="hidden w-56 shrink-0 flex-col border-r border-default bg-muted md:flex">
      <div class="flex h-12 items-center gap-2 border-b border-default px-4">
        <div class="flex gap-1.5">
          <span class="size-2.5 rounded-full bg-red-400/60 dark:bg-red-500/60" />
          <span class="size-2.5 rounded-full bg-yellow-400/60 dark:bg-yellow-500/60" />
          <span class="size-2.5 rounded-full bg-green-400/60 dark:bg-green-500/60" />
        </div>
        <div class="flex items-baseline gap-0 overflow-hidden font-mono text-xs text-dimmed">
          <AnimatePresence mode="wait">
            <motion.span
              :key="currentAgent.prefix"
              :initial="{ opacity: 0, y: 8 }"
              :animate="{ opacity: 1, y: 0 }"
              :exit="{ opacity: 0, y: -8 }"
              :transition="{ duration: 0.2 }"
              class="inline-block"
            >
              {{ currentAgent.prefix }}
            </motion.span>
          </AnimatePresence>
          <span>/skills/nuxt</span>
        </div>
      </div>
      <div class="min-h-0 flex-1 overflow-auto p-2">
        <UTree
          v-model="selected"
          :items="fileTree"
          color="primary"
          size="xs"
          :ui="{
            link: 'font-mono text-xs',
            linkLeadingIcon: 'size-3.5',
          }"
        />
      </div>
    </div>

    <!-- Main: file content -->
    <div class="hidden min-w-0 flex-1 flex-col md:flex">
      <div class="flex h-12 items-center justify-between gap-3 border-b border-default px-4">
        <span class="font-mono text-xs text-muted">
          {{ activeFile?.name || 'Select a file' }}
        </span>
        <div class="flex items-center gap-2">
          <div
            v-if="canRenderMarkdown"
            class="flex items-center gap-2 rounded-md border border-default bg-default/40 px-2 py-1"
          >
            <span class="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              Render MD
            </span>
            <USwitch
              v-model="renderMarkdown"
              size="xs"
            />
          </div>
          <UButton
            v-if="activeFile?.sourceHref"
            :to="activeFile.sourceHref"
            target="_blank"
            color="neutral"
            variant="outline"
            size="xs"
            icon="i-lucide-external-link"
            :ui="{ leadingIcon: 'size-3' }"
          >
            Source
          </UButton>
        </div>
      </div>
      <div class="min-h-0 flex-1 overflow-auto p-4">
        <div
          v-if="renderMarkdownPending"
          class="flex h-full min-h-40 items-center justify-center text-dimmed"
        >
          <p class="font-mono text-xs">
            Rendering markdown...
          </p>
        </div>
        <div
          v-else-if="renderMarkdownError"
          class="rounded-lg border border-error/30 bg-error/5 p-3 font-mono text-xs text-error"
        >
          {{ renderMarkdownError }}
        </div>
        <MDCRenderer
          v-else-if="renderedMarkdown"
          tag="article"
          :body="renderedMarkdown.body"
          :data="renderedMarkdown.data"
          class="text-sm leading-7 text-default [&_a]:text-primary [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_h1]:mb-4 [&_h1]:font-mono [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:font-mono [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-mono [&_h3]:text-base [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:my-3 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-default [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs"
        />
        <pre
          v-else-if="activeFile"
          class="font-mono text-xs text-default leading-relaxed whitespace-pre-wrap"
        ><code>{{ activeFile.content }}</code></pre>
        <div
          v-else
          class="flex h-48 items-center justify-center text-dimmed"
        >
          <p class="font-mono text-xs">
            Click a file to view its contents
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
