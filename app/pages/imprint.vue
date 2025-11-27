<template>
  <div
    v-if="page"
    class="max-w-xl mx-auto p-3 mb-6"
  >
    <h1 class="text-2xl font-bold mb-4">
      {{ page.title }}
    </h1>
    <div v-html="page.body" />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const { content: page } = useLocalizedContent<any>('imprint')

const seoTitle = computed(() => page.value?.seo?.title || page.value?.title || 'Imprint')
const seoDescription = computed(() => page.value?.seo?.description || '')

useSeoMeta({
  title: seoTitle,
  ogTitle: seoTitle,
  description: seoDescription,
  ogDescription: seoDescription
})
</script>
