<script setup lang="ts">
const footerLinks = [
  { label: 'GitHub', to: 'https://github.com/onmax/nuxt-skill-hub' },
  { label: 'npmx', to: 'https://npmx.dev/package/nuxt-skill-hub' },
  { label: 'Vite Doctor', to: 'https://vite-doctor.onmax.me/' },
  { label: 'Releases', to: 'https://github.com/onmax/nuxt-skill-hub/releases' },
]
</script>

<template>
  <div class="bg-default">
    <Hero />
    <SingleEntryPoint />
    <DoctorSection />
    <CoreGrid />
    <Playground />
    <DocsSection />
    <ResolutionSteps />

    <footer class="border-t border-default py-10">
      <UContainer>
        <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-start gap-3">
            <img src="/icon.png" alt="" class="size-8 rounded-md">
            <div>
              <p class="text-sm font-semibold text-highlighted">
                Nuxt Skill Hub
              </p>
              <p class="mt-0.5 text-sm text-pretty text-muted">
                Experimental. Skills add context, but they don't replace the docs.
              </p>
            </div>
          </div>
          <nav aria-label="Project links" class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            <a v-for="link in footerLinks" :key="link.to" :href="link.to" target="_blank" class="transition-colors hover:text-highlighted">
              {{ link.label }}
            </a>
          </nav>
        </div>
      </UContainer>
    </footer>
  </div>
</template>
