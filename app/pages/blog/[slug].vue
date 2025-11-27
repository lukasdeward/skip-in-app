<script setup lang="ts">
const route = useRoute()

const { data: page } = await useAsyncData(route.path, () => queryCollection('posts').path(route.path).first())

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found' })
}

const title = page.value?.seo?.title || page.value?.title
const description = page.value?.seo?.description || page.value?.description

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  ogImage: page.value?.image?.src
})
</script>

<template>
  <div v-if="page">
    <UPageHero
      :title="page.title"
      :description="page.description"
      :badge="page.badge"
      :image="page.image"
      :authors="page.authors"
      :date="page.date"
    />

    <UContainer>
      <UPage>
        <ContentRenderer :value="page">
          <ContentRendererMarkdown :value="page" />
        </ContentRenderer>
      </UPage>
    </UContainer>
  </div>
</template>
