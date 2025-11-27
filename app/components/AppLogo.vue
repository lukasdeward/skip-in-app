<script setup lang="ts">
const colorMode = useColorMode()

const logoSrc = ref('/skip-in-app.png')

const refreshLogo = () => {
  logoSrc.value = colorMode.value === 'dark' ? '/skip-in-app-white.png' : '/skip-in-app.png'
}

onMounted(() => {
  refreshLogo() // sync once the client has mounted to avoid hydration mismatch
  watch(() => colorMode.value, refreshLogo)
})
</script>

<template>
  <NuxtImg
    :src="logoSrc"
    alt="Skip In-App logo"
    class="h-18 w-auto"
    format="png"
    draggable="false"
  />
</template>
