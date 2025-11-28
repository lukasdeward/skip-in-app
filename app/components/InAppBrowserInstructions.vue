<script setup lang="ts">
const props = defineProps<{
  browserName: string
}>()

const steps = computed(() => [
  'Tap the menu in the top right corner.',
  `Choose "Open in browser" or "Open in ${props.browserName}".`,
  `If you cannot, copy the link and paste it into ${props.browserName}.`
])
</script>

<template>
  <div class="relative rounded-lg border border-dashed bg-gray-50 p-4 dark:bg-gray-900/40">
    <UIcon
      name="i-typcn-arrow-back"
      class="absolute -top-6 right-2 h-10 w-10 text-orange-500 -rotate-[135deg]"
      aria-hidden="true"
    />
    <div class="flex items-start gap-3">
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-800">
        <UIcon
          name="i-lucide-info"
          class="h-6 w-6 text-amber-500"
        />
      </div>
      <div class="flex-1 space-y-3">
        <div>
          <p class="font-semibold">
            Open in your browser
          </p>
          <p class="text-muted text-sm">
            Move out of the in-app browser so the link can complete.
          </p>
        </div>
        <ul class="space-y-2 text-sm">
          <li
            v-for="step in steps"
            :key="step"
            class="flex gap-2"
          >
            <UIcon
              name="i-lucide-check"
              class="mt-0.5 h-4 w-4 text-emerald-500"
            />
            <span class="leading-snug">{{ step }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
