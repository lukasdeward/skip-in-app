<script setup>
const showDiagnostics = useState('open-show-diagnostics', () => false)

const toggleDiagnostics = () => {
  showDiagnostics.value = !showDiagnostics.value
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-white dark:bg-black">
    <main class="flex-1">
      <slot />
    </main>

    <div class="flex justify-center py-6">
      <button
        type="button"
        class="group inline-flex items-center justify-center rounded-full p-2 transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:hover:bg-gray-900"
        aria-label="Toggle diagnostics"
        @click="toggleDiagnostics"
      >
        <AppLogo class="h-8 w-auto transition group-hover:opacity-80" />
      </button>
    </div>
  </div>
</template>
