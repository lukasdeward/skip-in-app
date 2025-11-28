<script setup lang="ts">
const colorMode = useColorMode()

const props = defineProps<{
  height?: string
  backgroundColor?: string | null
}>()

const normalizeHex = (value?: string | null) => {
  if (!value) return null
  const trimmed = value.trim()
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(trimmed)
  if (!match) return null
  if (trimmed.length === 4 && match[1]) {
    const short = match[1]
    return `#${short[0]}${short[0]}${short[1]}${short[1]}${short[2]}${short[2]}`.toLowerCase()
  }
  return trimmed.toLowerCase()
}

const isDarkBackground = computed(() => {
  const hex = normalizeHex(props.backgroundColor)
  if (!hex) return null
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5
})

const logoSrc = ref('/skip-in-app.png')
const shouldUseLightLogo = computed(() => {
  if (isDarkBackground.value !== null) return isDarkBackground.value
  return colorMode.value === 'dark'
})

watchEffect(() => {
  logoSrc.value = shouldUseLightLogo.value ? '/skip-in-app-white.png' : '/skip-in-app.png'
})

const height = computed(() => props.height ?? 'h-18')
</script>

<template>
  <NuxtImg
    :src="logoSrc"
    alt="Skip In-App logo"
    :class="`${height} w-auto`"
    format="png"
    draggable="false"
  />
</template>
