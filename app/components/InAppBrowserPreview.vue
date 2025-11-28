<script setup lang="ts">
const props = defineProps<{
  backgroundColor?: string | null
  textColor?: string | null
  highlightColor?: string | null
  logoUrl?: string | null
}>()

const background = computed(() => props.backgroundColor?.trim() || '#f3f4f6')
const primaryTextColor = computed(() => props.textColor?.trim() || '#111827')
const accentColor = computed(() => props.highlightColor?.trim() || '#f97316')
const logoBorder = computed(() => props.textColor?.trim() || '#e5e7eb')
</script>

<template>
  <div
    class="w-full rounded-3xl border border-gray-200 p-6 shadow-sm"
    :style="{ backgroundColor: background, color: primaryTextColor }"
  >
    <div class="flex items-center gap-4">
      <div
        class="h-14 w-14 rounded-2xl flex items-center justify-center bg-white shadow-sm overflow-hidden border"
        :style="{ borderColor: logoBorder }"
      >
        <img
          v-if="logoUrl"
          :src="logoUrl"
          alt="Logo preview"
          class="h-full w-full object-cover"
        >
        <UIcon
          v-else
          name="i-lucide-image"
          class="h-6 w-6"
          :style="{ color: accentColor }"
          aria-hidden="true"
        />
      </div>
      <div class="space-y-1">
        <p
          class="text-sm opacity-80"
          :style="{ color: primaryTextColor }"
        >
          Live theme demo
        </p>
        <p
          class="text-lg font-semibold"
          :style="{ color: primaryTextColor }"
        >
          Your link shell with brand styling
        </p>
      </div>
    </div>

    <div class="mt-6 space-y-3">
      <div class="flex items-center gap-3">
        <span
          class="h-3 w-16 rounded-full"
          :style="{ backgroundColor: accentColor }"
        />
        <span
          class="text-sm"
          :style="{ color: primaryTextColor }"
        >Accent color</span>
      </div>
    </div>
  </div>
</template>
