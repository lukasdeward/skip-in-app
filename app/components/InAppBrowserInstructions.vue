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
}>()
</script>

<template>
  <div :style="{ color: textColor || undefined }">
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
            alt="Team logo"
            class="h-12 object-contain"
          >
        <div class="leading-tight">
          <p class="font-semibold">
            {{ teamName }}
          </p>
        </div>
      </div>
      <h2 class="text-2xl font-semibold text-center">
        Open {{ teamName }} in {{ browserName }} to continue.
      </h2>
    </div>
  </div>
</template>
