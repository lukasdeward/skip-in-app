<script setup>
const colorMode = useColorMode()
const darkBackgroundColor = '#020618'
const lightBackgroundColor = '#ffffff'
const darkTextColor = '#ffffff'
const lightTextColor = '#0f172a'
const currentColorScheme = computed<'light' | 'dark'>(() => colorMode.value === 'dark' ? 'dark' : 'light')
const defaultBackgroundColor = computed(() => currentColorScheme.value === 'dark' ? darkBackgroundColor : lightBackgroundColor)
const defaultTextColor = computed(() => currentColorScheme.value === 'dark' ? darkTextColor : lightTextColor)

const showDiagnostics = useState('open-show-diagnostics', () => false)
const openTheme = useState('open-theme', () => ({
  backgroundColor: defaultBackgroundColor.value,
  textColor: defaultTextColor.value
}))

const themeStyles = computed(() => ({
  backgroundColor: openTheme.value?.backgroundColor || defaultBackgroundColor.value,
  color: openTheme.value?.textColor || defaultTextColor.value
}))

const toggleDiagnostics = () => {
  showDiagnostics.value = !showDiagnostics.value
}
</script>

<template>
  <div
    class="min-h-screen flex flex-col"
    :style="themeStyles"
  >
    <main class="flex-1">
      <slot />
    </main>

    <div class="flex justify-center py-6">
      <button
        type="button"
        class="group inline-flex items-center justify-center p-2 transition focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:hover:bg-gray-900"
        aria-label="Toggle diagnostics"
        @click="toggleDiagnostics"
      >
        <AppLogo
          height="h-8"
          class="w-auto transition group-hover:opacity-80"
          :background-color="openTheme.value?.backgroundColor || defaultBackgroundColor.value"
        />
      </button>
    </div>
  </div>
</template>
