<script setup lang="ts">
useSeoMeta({
  title: 'About Skip',
  description: 'Learn more about Skip and how we simplify in-app operations.'
})
</script>

<template>
  <UContainer class="py-12 space-y-12">
    <div class="space-y-4">
      <h1 class="text-4xl font-semibold tracking-tight">
        About Skip
      </h1>
      <p class="text-lg text-muted">
        Skip helps teams streamline in-app experiences with a focus on reliability, speed, and clarity.
      </p>
    </div>

    <UPageColumns class="gap-8">
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">
            What we do
          </h2>
        </template>
        <p class="text-muted">
          We provide tools that make in-app flows faster to build and easier to maintain, so your users always get a smooth experience.
        </p>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">
            Our approach
          </h2>
        </template>
        <p class="text-muted">
          We pair thoughtful design with dependable infrastructure, giving teams confidence as they ship updates and new features.
        </p>
      </UCard>
    </UPageColumns>
  </UContainer>
</template>
