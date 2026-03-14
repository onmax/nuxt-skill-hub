<script setup lang="ts">
import { motion } from 'motion-v'

defineOptions({
  name: 'InteractivePlayground',
})

const { selectedModules, fileTree, activeFile, activeFilePath, moduleAuthorMode, toggleModule, removeModule, addModule, isSelected, selectFile } = usePlayground()

watch(moduleAuthorMode, () => selectFile('SKILL.md'))
</script>

<template>
  <section
    id="playground"
    class="relative scroll-mt-16 py-24 sm:py-32"
  >
    <UContainer>
      <div class="mb-12 text-center">
        <p class="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-primary">
          Playground
        </p>
        <h2 class="text-3xl font-bold text-highlighted sm:text-4xl">
          Inspect the generated skill
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-lg text-muted">
          Toggle modules to see how the skill changes as your stack changes.
        </p>
      </div>

      <motion.div
        :initial="{ opacity: 0, y: 32 }"
        :while-in-view="{ opacity: 1, y: 0 }"
        :viewport="{ once: true, amount: 0.2 }"
        :transition="{ duration: 0.5 }"
        class="grid h-[75vh] max-h-[700px] min-h-[400px] grid-cols-1 gap-6 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)]"
      >
        <!-- Left: Module toggles -->
        <div class="min-h-0 overflow-auto rounded-xl border border-default bg-muted p-4">
          <ModuleSelector
            :selected-modules="selectedModules"
            :is-selected="isSelected"
            v-model:module-author-mode="moduleAuthorMode"
            @toggle="toggleModule"
            @remove="removeModule"
            @add="addModule"
          />
        </div>

        <!-- Right: IDE viewer -->
        <SkillViewer
          :file-tree="fileTree"
          :active-file="activeFile"
          :active-file-path="activeFilePath"
          @select-file="selectFile"
        />
      </motion.div>
    </UContainer>
  </section>
</template>
