<script setup lang="ts">
const route = useRoute()
const user = useSupabaseUser()
const teamId = computed(() => route.params.teamId as string)

type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER'
type TeamDetails = {
  id: string
  name: string
  slug?: string | null
  logoUrl?: string | null
  backgroundColor?: string | null
  textColor?: string | null
  highlightColor?: string | null
  font?: string | null
  role: TeamRole
}

const fallbackBackgroundColor = '#020618'
const fallbackTextColor = '#ffffff'

const tabs = [
  { label: 'Links', value: 'links', icon: 'i-lucide-link' },
  { label: 'Settings', value: 'settings', icon: 'i-lucide-settings' },
  { label: 'Members', value: 'members', icon: 'i-lucide-users' },
  { label: 'Billing', value: 'billing', icon: 'i-lucide-credit-card' }
]

const activeTab = ref('links')

const team = ref<TeamDetails | null>(null)
const teamPending = ref(false)
const teamError = ref<any>(null)
const isTeamNotFound = computed(() => {
  const status = teamError.value?.statusCode || teamError.value?.data?.statusCode
  return status === 404
})

const loadTeam = async () => {
  if (!user.value || !teamId.value) return

  teamPending.value = true
  teamError.value = null

  try {
    const { data, error } = await useFetch<TeamDetails>(`/api/teams/${teamId.value}`, {
      server: false,
      key: `team-details-${teamId.value}-${Date.now()}`
    })
    if (error.value) throw error.value
    team.value = data.value || null
  } catch (error: any) {
    teamError.value = error
    team.value = null
  } finally {
    teamPending.value = false
  }
}

watch([() => user.value, teamId], ([currentUser]) => {
  if (currentUser) {
    loadTeam()
  } else {
    team.value = null
    teamError.value = null
  }
}, { immediate: true })

const canManageTeam = computed(() => team.value?.role !== 'MEMBER')
const canManageMembers = computed(() => ['OWNER', 'ADMIN'].includes(team.value?.role || ''))

const handleTeamUpdated = async () => {
  await loadTeam()
}

watch(teamId, () => {
  activeTab.value = 'links'
})
</script>

<template>
  <div class="space-y-10 max-w-7xl mx-auto">
    <div
      v-if="teamPending"
      class="w-full space-y-6"
    >
      <UCard>
        <div class="flex flex-col gap-4 md:flex-row md:items-center">
          <USkeleton class="h-14 w-14 rounded-xl" />
          <div class="flex-1 min-w-0 space-y-2">
            <USkeleton class="h-4 w-40 sm:w-56" />
            <USkeleton class="h-3 w-28 sm:w-36" />
          </div>
          <USkeleton class="h-9 w-32 rounded-lg" />
        </div>
      </UCard>
      <div class="px-4 space-y-4">
        <div class="space-y-3">
          <USkeleton class="h-4 w-28 sm:w-32" />
          <div class="flex flex-wrap gap-2">
            <USkeleton class="h-8 w-24 rounded-lg" />
            <USkeleton class="h-8 w-24 rounded-lg" />
            <USkeleton class="h-8 w-24 rounded-lg" />
          </div>
        </div>
        <UCard>
          <div class="space-y-4">
            <USkeleton class="h-4 w-48 sm:w-60" />
            <div class="grid gap-3 md:grid-cols-2">
              <USkeleton class="h-10 w-full rounded-lg" />
              <USkeleton class="h-10 w-full rounded-lg" />
              <USkeleton class="h-10 w-full rounded-lg md:col-span-2" />
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <UAlert
      v-else-if="isTeamNotFound"
      color="warning"
      variant="subtle"
      title="Team not found"
      :description="`We couldn't find team ${teamId}.`"
    />

    <UAlert
      v-else-if="teamError"
      color="error"
      variant="subtle"
      title="Could not load team"
      :description="teamError?.data?.message || teamError?.message || 'Please try again.'"
    />

    <template v-else-if="team">
      <UCard :ui="{ body: 'flex items-center gap-4' }">
        <div
          class="h-14 w-14 rounded-xl flex items-center justify-center text-white font-semibold text-lg"
          :style="{
            backgroundColor: team.backgroundColor || fallbackBackgroundColor,
            color: team.textColor || fallbackTextColor
          }"
        >
          <span
            v-if="team.logoUrl"
            class="sr-only"
          >{{ team.name }}</span>
          <img
            v-if="team.logoUrl"
            :src="team.logoUrl"
            alt=""
            class="h-10 w-10 object-contain"
            loading="lazy"
          />
          <span v-else>{{ team.name.slice(0, 2).toUpperCase() }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xl font-semibold truncate">
            {{ team.name }}
          </p>
          <p class="text-muted text-sm">
            Role: {{ team.role.toLowerCase() }}
          </p>
        </div>
        <UButton
          label="Back to dashboard"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          to="/dashboard"
        />
      </UCard>

      <div class="px-4">
        <div class="overflow-x-auto -mx-2 px-2 pb-2">
          <UTabs
            v-model="activeTab"
            :items="tabs"
            color="neutral"
            :ui="{
              list: 'flex-nowrap w-max gap-2 ml-18',
              trigger: 'whitespace-nowrap flex-shrink-0'
            }"
          />
        </div>

        <div
          v-if="activeTab === 'links'"
          class="space-y-4"
        >
          <TeamLinksSection
            :team-id="team.id"
            :team-name="team.name"
            :team-slug="team.slug"
            :can-manage="canManageTeam"
          />
        </div>

        <div
          v-else-if="activeTab === 'settings'"
          class="space-y-6"
        >
          <TeamSettingsSection
            :team-id="team.id"
            :team="team"
            :can-manage="canManageTeam"
            @updated="handleTeamUpdated"
          />
        </div>

        <div
          v-else-if="activeTab === 'members'"
          class="space-y-4"
        >
          <TeamMembersSection
            :team-id="team.id"
            :can-manage="canManageMembers"
            :viewer-role="team.role"
          />
        </div>

        <div
          v-else-if="activeTab === 'billing'"
          class="space-y-4"
        >
          <TeamBillingSection
            :team-id="team.id"
            :team-name="team.name"
            :can-manage="canManageTeam"
          />
        </div>
      </div>
    </template>

    <UAlert
      v-else
      color="warning"
      variant="subtle"
      title="No team to show"
      description="Select a team from the dashboard to manage it."
    />
  </div>
</template>
