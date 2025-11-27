<template>
  <div class="min-h-screen flex flex-col bg-white dark:bg-black">
    <main class="flex-1">
      <slot />
    </main>

    <div class="flex justify-center py-6">
      <AppLogo class="h-10 w-auto" />
    </div>
  </div>
</template>
