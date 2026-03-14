<script setup lang="ts">
defineOgImage('Home')
</script>

<template>
  <div class="bg-default">
    <Hero />
    <SingleEntryPoint />
    <CoreGrid />
    <Playground />
    <DocsSection />
    <ResolutionSteps />

    <!-- Footer -->
    <footer class="border-t border-default py-12">
      <UContainer>
        <div class="flex flex-col items-center gap-4 text-center">
          <p class="font-mono text-xs text-dimmed">
            nuxt-skill-hub is experimental. Skills complement docs - they don't replace them.
          </p>
          <div class="flex gap-4">
            <UButton
              to="https://github.com/onmax/nuxt-skill-hub"
              target="_blank"
              variant="ghost"
              color="neutral"
              icon="i-simple-icons-github"
              size="sm"
            >
              GitHub
            </UButton>
          </div>
        </div>
      </UContainer>
    </footer>
  </div>
</template>
