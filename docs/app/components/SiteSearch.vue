<script setup lang="ts">
import { DEFAULT_NUXT_CONTENT_METADATA } from '~~/shared/skill-preview'
import { options } from '~/data/options'

const open = defineModel<boolean>('open', { default: false })

// Same key as the playground, so picking a rule pack opens it there.
const playgroundFile = useLocalStorage('playground-active-file', 'SKILL.md')

function goTo(hash: string) {
  open.value = false
  location.hash = hash
}

const sections = [
  { label: 'How it works', hash: '#how-it-works', icon: 'i-lucide-route' },
  { label: 'Doctor', hash: '#doctor', icon: 'i-lucide-stethoscope' },
  { label: 'What your agent learns', hash: '#skills', icon: 'i-lucide-book-open' },
  { label: 'Playground', hash: '#playground', icon: 'i-lucide-folder-tree' },
  { label: 'Configuration', hash: '#docs', icon: 'i-lucide-settings-2' },
  { label: 'How the skill gets built', hash: '#resolution', icon: 'i-lucide-workflow' },
]

const links = [
  { label: 'GitHub', to: 'https://github.com/onmax/nuxt-skill-hub', icon: 'i-simple-icons-github' },
  { label: 'npmx', to: 'https://npmx.dev/package/nuxt-skill-hub', icon: 'i-lucide-package' },
  { label: 'Vite Doctor', to: 'https://vite-doctor.onmax.me/', icon: 'i-lucide-stethoscope' },
  { label: 'Releases', to: 'https://github.com/onmax/nuxt-skill-hub/releases', icon: 'i-lucide-tag' },
]

const groups = computed(() => [
  {
    id: 'sections',
    label: 'Sections',
    items: sections.map(section => ({ label: section.label, icon: section.icon, onSelect: () => goTo(section.hash) })),
  },
  {
    id: 'rules',
    label: 'Rule packs',
    items: DEFAULT_NUXT_CONTENT_METADATA.packs.map(pack => ({
      label: pack.title,
      description: pack.example ? `“${pack.example}”` : pack.relativePath,
      icon: 'i-lucide-file-text',
      onSelect() {
        // Packs gated on a module or on module authoring aren't in the default playground, so they open on GitHub.
        if (pack.packages || pack.moduleAuthoring) {
          open.value = false
          navigateTo(`https://github.com/onmax/nuxt-skill-hub/blob/main/nuxt-best-practices/${pack.relativePath}`, { external: true, open: { target: '_blank' } })
          return
        }
        playgroundFile.value = `references/nuxt/${pack.relativePath}`
        goTo('#playground')
      },
    })),
  },
  {
    id: 'options',
    label: 'Options',
    items: options.map(option => ({
      label: `skillHub.${option.name}`,
      description: option.description.replaceAll('`', ''),
      icon: 'i-lucide-sliders-horizontal',
      onSelect: () => goTo('#docs'),
    })),
  },
  {
    id: 'links',
    label: 'Links',
    items: links.map(link => ({ label: link.label, icon: link.icon, to: link.to, target: '_blank', onSelect: () => (open.value = false) })),
  },
])

defineShortcuts({
  meta_k: {
    usingInput: true,
    handler: () => (open.value = !open.value),
  },
})
</script>

<template>
  <UModal v-model:open="open" title="Search" description="Sections, rule packs, and options" :ui="{ content: 'sm:max-w-xl' }">
    <template #content>
      <UCommandPalette
        :groups="groups"
        placeholder="Search sections, rule packs, options…"
        :fuse="{ fuseOptions: { ignoreLocation: true, threshold: 0.3, keys: ['label', 'description'] }, resultLimit: 20 }"
        class="max-h-[min(32rem,70dvh)]"
        close
        @update:open="open = $event"
      />
    </template>
  </UModal>
</template>
