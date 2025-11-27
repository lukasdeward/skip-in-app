
<template>
  <div class="max-w-xl mx-auto p-3 mb-6 prose prose-neutral">
    <h1>Imprint</h1>
    <p>
      OneGuard GmbH<br>
      Geschäftsführer: Lukas Deward<br>
      Welserstraße 3, 87463 Dietmannsried, Deutschland<br>
      E-Mail: <a href="mailto:support@oneguard.app">support@oneguard.app</a>
    </p>
  </div>
</template>

<script lang="ts" setup>
import { useSeoMeta } from 'nuxt/app';
import { computed } from 'vue'


const fallbackContent = computed(() => ({
  title: 'Imprint',
  body: 'Contact support@skip-in.app for imprint details.'
}))

useSeoMeta({
  title: fallbackContent.value.title,
  ogTitle: fallbackContent.value.title,
  description: fallbackContent.value.body,
  ogDescription: fallbackContent.value.body
})
</script>
