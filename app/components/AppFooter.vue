<script setup lang="ts">
const user = useSupabaseUser()

const resourcesColumn = {
  label: 'Resources',
  children: [{
    label: 'Blog',
    to: '/blog'
  }, {
    label: 'Pricing',
    to: '/pricing'
  }]
}

const legalColumn = {
  label: 'Legal',
  children: [{
    label: 'Data protection',
    to: '/data-protection'
  }, {
    label: 'Imprint',
    to: '/imprint'
  }, {
    label: 'Terms of Service',
    to: '/terms-of-service'
  }]
}

const columns = computed(() => user.value ? [legalColumn] : [resourcesColumn, legalColumn])
</script>

<template>
  <USeparator
    icon="i-famicons-arrow-redo"
    class="h-px"
  />

  <UFooter :ui="{ top: 'border-b border-default' }">
    <template #top>
      <UContainer>
        <UFooterColumns :columns="columns" />
      </UContainer>
    </template>

    <template #left>
      <div class="flex items-center gap-3">
        <AppLogo class="shrink-0" />
        <p class="text-muted text-sm">
          Built with ❤️ in Munich • © {{ new Date().getFullYear() }}
        </p>
      </div>
    </template>

    <template #right>
      <UButton
        to="https://www.linkedin.com/in/dewardlukas/"
        target="_blank"
        icon="i-simple-icons-linkedin"
        aria-label="Lukas Deward on LinkedIn"
        color="neutral"
        variant="ghost"
      />
    </template>
  </UFooter>
</template>
