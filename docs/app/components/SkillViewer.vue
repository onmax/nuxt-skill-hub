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
const mobilePane = ref<'files' | 'content'>('files')
const renderedMarkdownClass = 'text-base leading-7 text-default [&_.comark-content_a]:cursor-pointer [&_.comark-content_a]:text-primary [&_.comark-content_a]:underline [&_.comark-content_code]:rounded-sm [&_.comark-content_code]:bg-muted [&_.comark-content_code]:px-1 [&_.comark-content_code]:py-0.5 [&_.comark-content_code]:font-mono [&_.comark-content_code]:text-[0.85em] [&_.comark-content_h1]:mb-4 [&_.comark-content_h1]:font-mono [&_.comark-content_h1]:text-2xl [&_.comark-content_h1]:font-semibold [&_.comark-content_h2]:mb-3 [&_.comark-content_h2]:mt-6 [&_.comark-content_h2]:font-mono [&_.comark-content_h2]:text-xl [&_.comark-content_h2]:font-semibold [&_.comark-content_h3]:mb-2 [&_.comark-content_h3]:mt-5 [&_.comark-content_h3]:font-mono [&_.comark-content_h3]:text-lg [&_.comark-content_h3]:font-semibold [&_.comark-content_li]:ml-5 [&_.comark-content_li]:list-disc [&_.comark-content_p]:my-3 [&_.comark-content_pre]:my-4 [&_.comark-content_pre]:overflow-x-auto [&_.comark-content_pre]:rounded-lg [&_.comark-content_pre]:border [&_.comark-content_pre]:border-default [&_.comark-content_pre]:bg-muted [&_.comark-content_pre]:p-3 [&_.comark-content_pre]:font-mono [&_.comark-content_pre]:text-sm'
const comarkComponents = {
  ProseA: 'a',
  a: 'a',
}

function findTreeItem(items: SkillFileTree[], path: string): SkillFileTree | undefined {
  for (const item of items) {
    if (item.value === path) return item
    if (item.children) {
      const child = findTreeItem(item.children, path)
      if (child) return child
    }
  }
}

function getTreeItemKey(item: SkillFileTree): string {
  return item.value || item.label
}

function serializeTree(items: SkillFileTree[]): string {
  return items.map((item) => {
    const value = item.value || item.label
    const children = item.children?.length ? `(${serializeTree(item.children)})` : ''
    return `${value}${children}`
  }).join('|')
}

const selected = ref<SkillFileTree | undefined>(findTreeItem(props.fileTree, props.activeFilePath))
const treeKey = computed(() => serializeTree(props.fileTree))
const treeUi = {
  link: 'font-mono text-xs group/tl',
  linkLeadingIcon: 'size-3.5',
  linkTrailingIcon: 'opacity-80 group-hover/tl:opacity-90 transition-all duration-200 group-data-expanded/tl:opacity-100 group-data-expanded/tl:rotate-90',
  listWithChildren: 'ms-2 ps-0.5',
}

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
function handleMarkdownClick(e: MouseEvent) {
  const anchor = (e.target as HTMLElement).closest('a')
  if (!anchor) return
  const href = anchor.getAttribute('href')
  if (!href) return
  e.preventDefault()
  if (href.startsWith('http://') || href.startsWith('https://')) {
    navigateTo(href, { external: true, open: { target: '_blank' } })
    return
  }
  emit('selectFile', href.replace(/^\.\//, ''))
}

const canRenderMarkdown = computed(() =>
  /\.md$/i.test(props.activeFile?.path || ''),
)
const shouldRenderMarkdown = computed(() =>
  Boolean(props.activeFile && renderMarkdown.value && canRenderMarkdown.value),
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
  <div class="flex h-full max-h-full min-h-0 overflow-hidden rounded-xl border border-default bg-elevated">
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
            :key="`mobile:${treeKey}`"
            v-model="selected"
            :items="fileTree"
            :get-key="getTreeItemKey"
            color="primary"
            size="xs"
            trailing-icon="i-lucide-chevron-right"
            :ui="treeUi"
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
            v-if="shouldRenderMarkdown"
            :class="renderedMarkdownClass"
            @click="handleMarkdownClick"
          >
            <Suspense :key="activeFilePath">
              <Comark
                :markdown="activeFile?.content || ''"
                :components="comarkComponents"
              />
              <template #fallback>
                <div class="flex h-full min-h-40 items-center justify-center text-dimmed">
                  <p class="font-mono text-xs">
                    Rendering markdown...
                  </p>
                </div>
              </template>
            </Suspense>
          </div>
          <pre
            v-else-if="activeFile"
            class="overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap text-default"
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
          :key="`desktop:${treeKey}`"
          v-model="selected"
          :items="fileTree"
          :get-key="getTreeItemKey"
          color="primary"
          size="xs"
          trailing-icon="i-lucide-chevron-right"
          :ui="treeUi"
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
          v-if="shouldRenderMarkdown"
          :class="renderedMarkdownClass"
          @click="handleMarkdownClick"
        >
          <Suspense :key="activeFilePath">
            <Comark
              :markdown="activeFile?.content || ''"
              :components="comarkComponents"
            />
            <template #fallback>
              <div class="flex h-full min-h-40 items-center justify-center text-dimmed">
                <p class="font-mono text-xs">
                  Rendering markdown...
                </p>
              </div>
            </template>
          </Suspense>
        </div>
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
