<script setup lang="ts">
const colorMode = useColorMode()

const logoSrc = computed(() => colorMode.value === 'dark' ? '/skip-in-app-white.png' : '/skip-in-app.png')
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
