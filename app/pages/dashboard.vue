<script setup lang="ts">
const user = useSupabaseUser()

useSeoMeta({
  title: 'Dashboard',
  description: 'Manage your Skip links, teams, and forwarding destinations.'
})
</script>

<template>
  <div class="space-y-10">
    <UPageHero
      title="Dashboard"
      description="Welcome back. Use this space to manage your Skip links, teams, and preferences."
    />

    <UPageSection
      title="Account"
      description="Quick glance at who is signed in."
    >
      <UCard>
        <p v-if="user">Signed in as {{ user.email }}.</p>
        <p v-else>Please sign in to access your dashboard.</p>
      </UCard>
    </UPageSection>

    <UPageSection
      title="Coming soon"
      description="Add links, manage team branding, and view analytics here."
    >
      <UCard>
        <p class="text-muted">
          Your dashboard is ready. Product areas will appear here as they are built out.
        </p>
      </UCard>
    </UPageSection>
  </div>
</template>
