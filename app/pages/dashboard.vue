<script setup lang="ts">
const user = useSupabaseUser()
const toast = useToast()

useSeoMeta({
  title: 'Dashboard',
  description: 'Manage your Skip links, teams, and forwarding destinations.'
})

type TeamSummary = {
  id: string
  name: string
  logoUrl?: string | null
  primaryColor?: string | null
}

const {
  data: teams,
  pending: teamsPending,
  error: teamsError,
  execute: loadTeams
} = useLazyFetch<TeamSummary[]>('/api/teams', { default: () => [] })

watchEffect(() => {
  if (user.value) {
    loadTeams()
  } else {
    teams.value = []
  }
})

const newTeamName = ref('')
const creatingTeam = ref(false)

const createTeam = async () => {
  const name = newTeamName.value.trim()

  if (!name) {
    toast.add({ title: 'Team name required', description: 'Add a name to create your team.', color: 'warning' })
    return
  }

  creatingTeam.value = true

  try {
    await $fetch('/api/teams', {
      method: 'POST',
      body: { name }
    })

    toast.add({ title: 'Team created', description: `${name} is ready.`, color: 'success' })
    newTeamName.value = ''
    await loadTeams()
  } catch (error: any) {
    const message = error?.data?.statusMessage || error?.message || 'Unable to create team'
    toast.add({ title: 'Creation failed', description: message, color: 'error' })
  } finally {
    creatingTeam.value = false
  }
}
</script>

<template>
  <div class="space-y-10">

    <UPageSection
      title="Teams"
      description="Your teams and workspaces."
    >
      <div v-if="!user" class="text-muted">
        Sign in to view your teams.
      </div>

      <div v-else class="space-y-4">
        <UAlert
          v-if="teamsError"
          color="error"
          variant="subtle"
          title="Could not load teams"
          :description="teamsError?.message || 'Please try again.'"
        />

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <UCard
            v-for="team in teams"
            :key="team.id"
            :ui="{ body: 'flex items-center gap-4' }"
            class="border border-dashed"
          >
            <div
              class="h-12 w-12 rounded-xl flex items-center justify-center text-white font-semibold"
              :style="{ backgroundColor: team.primaryColor || '#020618' }"
            >
              <span v-if="team.logoUrl" class="sr-only">{{ team.name }}</span>
              <NuxtImg
                v-if="team.logoUrl"
                :src="team.logoUrl"
                alt=""
                class="h-10 w-10 object-contain"
              />
              <span v-else>{{ team.name.slice(0, 2).toUpperCase() }}</span>
            </div>
            <div>
              <p class="font-medium">{{ team.name }}</p>
              <p class="text-muted text-sm">Team ID: {{ team.id }}</p>
            </div>
          </UCard>

          <UCard class="border-dashed flex flex-col justify-between">
            <div class="space-y-3">
              <p class="font-medium">Create a new team</p>
              <p class="text-muted text-sm">Spin up a workspace for your next project.</p>
              <UInput
                v-model="newTeamName"
                placeholder="Team name"
                :disabled="creatingTeam || teamsPending"
              />
            </div>
            <div class="mt-4">
              <UButton
                label="Create team"
                icon="i-lucide-plus"
                color="neutral"
                :loading="creatingTeam"
                block
                @click="createTeam"
              />
            </div>
          </UCard>
        </div>

        <div v-if="teamsPending" class="text-muted text-sm">
          <UIcon
            name="i-lucide-loader-2"
            class="animate-spin inline-block mr-2"
          />
        </div>

        <div v-else-if="!teams?.length" class="text-muted text-sm">
          You have no teams yet. Create one to get started.
        </div>
      </div>
    </UPageSection>

  </div>
</template>
