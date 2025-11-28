<script setup lang="ts">
defineProps<{
  browserName: string
  logoUrl?: string | null
  teamName?: string | null
  textColor?: string | null
  backgroundColor?: string | null
}>()

</script>

<template>
  <div :style="{ color: textColor || undefined }">
    <UIcon
      name="i-typcn-arrow-back"
      class="absolute -top-2 right-2 h-20 w-20 text-orange-500 -rotate-270"
      aria-hidden="true"
    />
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-800 overflow-hidden">
          <img
            v-if="logoUrl"
            :src="logoUrl"
            alt="Team logo"
            class="h-full w-full object-contain"
          />
        </div>
        <div class="leading-tight">
          <p class="text-xs uppercase tracking-wide opacity-80">
            Opening link from
          </p>
          <p class="font-semibold">
            {{ teamName || 'Team link' }}
          </p>
        </div>
      </div>

    </div>
  </div>
</template>
