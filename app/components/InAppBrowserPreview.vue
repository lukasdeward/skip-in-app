<script setup lang="ts">
const props = defineProps<{
  backgroundColor?: string | null
  textColor?: string | null
  highlightColor?: string | null
  logoUrl?: string | null
  teamName?: string | null
}>()

const background = computed(() => props.backgroundColor?.trim() || '#f3f4f6')
const primaryTextColor = computed(() => props.textColor?.trim() || '#111827')
const accentColor = computed(() => props.highlightColor?.trim() || '#f97316')

const displayName = computed(() => props.teamName?.trim() || 'Display name')
</script>

<template>
  <div
    class="w-full rounded-3xl border border-gray-200 p-6 shadow-sm"
    :style="{ backgroundColor: background, color: primaryTextColor }"
  >
    <div class="flex items-center gap-3">
      <img
        v-if="logoUrl"
        :src="logoUrl"
        alt="Logo preview"
        class="h-14 w-14 object-contain"
      >
      <div
        v-else
        class="h-14 w-14 flex items-center justify-center text-2xl font-semibold"
        :style="{ color: accentColor }"
      >
        <UIcon
          name="i-lucide-image"
          class="h-8 w-8"
          aria-hidden="true"
        />
      </div>
      <div class="min-w-0">
        <p
          class="text-lg font-semibold truncate"
          :style="{ color: primaryTextColor }"
        >
          {{ displayName }}
        </p>
        <p
          class="text-sm opacity-80 truncate"
          :style="{ color: primaryTextColor }"
        >
          Logo and name preview
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
