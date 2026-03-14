<script setup lang="ts">
import { coreSkills } from '~/data/core-skills'
</script>

<template>
  <section id="skills" class="relative scroll-mt-16 py-24 sm:py-32">
    <UContainer>
      <div class="mx-auto mb-16 max-w-2xl text-center">
        <p class="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-primary">What's inside</p>
        <h2 class="text-3xl font-bold text-highlighted sm:text-4xl">Filling the gaps AI agents miss</h2>
        <p class="mt-4 text-lg text-muted leading-relaxed">
          AI agents are good out of the box - but they lack Nuxt-specific context.
          Skills provide best practices, footgun avoidance, and module-specific guidance
          maintained by module authors and shipped alongside their packages.
        </p>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CoreCard v-for="(skill, i) in coreSkills" :key="skill.id" :skill="skill" :index="i" />
      </div>
    </UContainer>
  </section>
</template>
