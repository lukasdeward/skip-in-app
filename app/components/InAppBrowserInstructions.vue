<script setup lang="ts">
defineProps<{
  browserName: string
  error?: string
  logoUrl?: string | null
  teamName?: string | null
  textColor?: string | null
  backgroundColor?: string | null
  highlightColor?: string | null
  platform: string
  instructionImage?: string | null
}>()
</script>

<template>
  <div
    class="relative"
    :style="{ color: textColor || undefined }"
  >
    <UIcon
      name="i-typcn-arrow-back"
      class="absolute -top-2 right-2 h-20 w-20 -rotate-270"
      :style="{ color: highlightColor || '#f97316' }"
      aria-hidden="true"
    />
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-3">
          <img
            v-if="logoUrl"
            :src="logoUrl"
            class="h-12"
          />
      </div>
      <h2 class="text-2xl font-bold text-center mt-5">
        Open {{ teamName }} in {{ browserName }} to continue.
      </h2>
    </div>

    <div v-if="instructionImage" class="mt-8">
      <p class="text-center text-sm opacity-80 mb-3">
        Follow these steps to open in {{ browserName }} from {{ platform }}.
      </p>
      <div
        class="overflow-hidden rounded-2xl border border-dashed shadow-sm"
        :style="{
          borderColor: highlightColor || '#f97316',
          backgroundColor: backgroundColor || undefined
        }"
      >
        <img
          :src="instructionImage"
          :alt="`${platform} in-app instructions`"
          class="block w-full h-auto"
          loading="lazy"
        />
      </div>
    </div>
  </div>
</template>
