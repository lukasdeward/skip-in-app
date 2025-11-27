<script setup lang="ts">
const { data: page } = await useAsyncData('blog', () => queryCollection('blog').first())
const { data: posts } = await useAsyncData('posts', () => queryCollection('posts').all())

const title = page.value?.seo?.title || page.value?.title
const description = page.value?.seo?.description || page.value?.description

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description
})

const formattedPosts = computed(() => posts.value?.map(post => ({
  ...post,
  to: post._path || post.path || `/blog/${post.slug || post._id || ''}`
})) || [])
</script>

<template>
  <div v-if="page">
    <UPageHero
      :title="page.title"
      :description="page.description"
    />

    <UContainer>
      <UBlogPosts>
        <UBlogPost
          v-for="post in formattedPosts"
          :key="post._path || post.path || post.title"
          v-bind="post"
          :to="post.to"
        />
      </UBlogPosts>
    </UContainer>
  </div>
</template>
