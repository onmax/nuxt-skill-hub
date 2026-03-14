<script setup lang="ts">
import { motion } from 'motion-v'

defineOptions({
  name: 'InteractivePlayground',
})

const { selectedModules, fileTree, activeFile, activeFilePath, toggleModule, removeModule, addModule, isSelected, selectFile } = usePlayground()
</script>

<template>
  <section
    id="playground"
    class="relative scroll-mt-16 py-24 sm:py-32"
  >
    <UContainer>
      <div class="mb-12 text-center">
        <p class="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-primary">
          Preview
        </p>
        <h2 class="text-3xl font-bold text-highlighted sm:text-4xl">
          Preview the generated skill
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-lg text-muted">
          Toggle modules on the left. The skill file tree updates in real-time.
        </p>
      </div>

      <motion.div
        :initial="{ opacity: 0, y: 32 }"
        :while-in-view="{ opacity: 1, y: 0 }"
        :viewport="{ once: true, amount: 0.2 }"
        :transition="{ duration: 0.5 }"
        class="grid grid-cols-1 gap-6 lg:min-h-[42rem] lg:grid-cols-[300px_1fr]"
      >
        <!-- Left: Module toggles -->
        <div class="h-full rounded-xl border border-default bg-muted p-4">
          <ModuleSelector
            :selected-modules="selectedModules"
            :is-selected="isSelected"
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
