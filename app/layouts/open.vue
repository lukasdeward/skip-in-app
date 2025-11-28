<script setup>
const showDiagnostics = useState('open-show-diagnostics', () => false)
const openTheme = useState('open-theme', () => ({
  backgroundColor: '#020618',
  textColor: '#ffffff'
}))

const themeStyles = computed(() => ({
  backgroundColor: openTheme.value.backgroundColor || '#020618',
  color: openTheme.value.textColor || '#ffffff'
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
        <AppLogo height="h-8" class="w-auto transition group-hover:opacity-80" />
      </button>
    </div>
  </div>
</template>
