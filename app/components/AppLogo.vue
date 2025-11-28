<script setup lang="ts">
const colorMode = useColorMode()

const logoSrc = ref('/skip-in-app.png')

const refreshLogo = () => {
  logoSrc.value = colorMode.value === 'dark' ? '/skip-in-app-white.png' : '/skip-in-app.png'
}

const props = defineProps<{height?: string}>()

onMounted(() => {
  refreshLogo() // sync once the client has mounted to avoid hydration mismatch
  watch(() => colorMode.value, refreshLogo)
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
