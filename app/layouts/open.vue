<script setup>
const defaultBackgroundColor = '#ffffff'
const defaultTextColor = '#000000'

const showDiagnostics = useState('open-show-diagnostics', () => false)
const openTheme = useState('open-theme', () => ({
  backgroundColor: defaultBackgroundColor,
  textColor: defaultTextColor
}))

const themeStyles = computed(() => ({
  backgroundColor: openTheme.value?.backgroundColor || defaultBackgroundColor,
  color: openTheme.value?.textColor || defaultTextColor
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
          :background-color="openTheme.value?.backgroundColor || defaultBackgroundColor"
        />
      </button>
    </div>
  </div>
</template>
