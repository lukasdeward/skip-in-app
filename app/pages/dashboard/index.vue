<script setup lang="ts">
import { breakpointsTailwind } from '@vueuse/core'

const user = useSupabaseUser()
const toast = useToast()
const router = useRouter()

useSeoMeta({
  title: 'Dashboard',
  description: 'Manage your Skip links, teams, and forwarding destinations.'
})

type TeamSummary = {
  id: string
  name: string
  slug?: string | null
  logoUrl?: string | null
  backgroundColor?: string | null
  textColor?: string | null
  highlightColor?: string | null
}

const fallbackBackgroundColor = '#020618'
const fallbackTextColor = '#ffffff'

const breakpoints = useBreakpoints(breakpointsTailwind)
const isDesktop = breakpoints.greaterOrEqual('lg')
const skeletonCardCount = computed(() => isDesktop.value ? 6 : 3)

const {
  data: teams,
  pending: teamsPending,
  error: teamsError,
  execute: loadTeams
} = useFetch<TeamSummary[]>('/api/teams', { default: () => [] })

const teamsFetched = ref(false)
const autoTeamCreated = ref(false)

watchEffect(async () => {
  if (user.value) {
    teamsFetched.value = false
    try {
      await loadTeams()
    } finally {
      teamsFetched.value = true
    }
  } else {
    teams.value = []
    teamsFetched.value = false
  }
})

const newTeamName = ref('')
const creatingTeam = ref(false)

const extractDomainName = (input: string) => {
  const match = input.trim().match(/^(?:https?:\/\/)?(?:www\.)?([^\/:]+)/i)
  const host = match?.[1] || input.trim()
  const base = host.split('.')[0] || host
  const cleaned = base.replace(/[^a-zA-Z0-9]/g, '')
  if (!cleaned) return 'Team'
  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`
}

const createTeam = async (overrideName?: string, options: { silent?: boolean } = {}): Promise<TeamSummary | null> => {
  const { silent = false } = options
  const name = (overrideName ?? newTeamName.value).trim()

  if (!name) {
    if (!silent) {
      toast.add({ title: 'Team name required', description: 'Add a name to create your team.', color: 'warning' })
    }
    return null
  }
  if (name.includes('-')) {
    if (!silent) {
      toast.add({ title: 'Invalid name', description: 'Team name cannot include dashes.', color: 'warning' })
    }
    return null
  }

  creatingTeam.value = true

  try {
    const { data, error } = await useFetch<TeamSummary>('/api/teams', {
      method: 'POST',
      body: { name },
      server: false,
      key: `create-team-${Date.now()}`
    })
    if (error.value) throw error.value

    if (!silent) {
      toast.add({ title: 'Team created', description: `${name} is ready.`, color: 'success' })
    }
    newTeamName.value = ''
    await loadTeams()
    return data.value || null
  } catch (error: any) {
    if (!silent) {
      const message = error?.data?.message || error?.message || 'Unable to create team'
      toast.add({ title: 'Creation failed', description: message, color: 'error' })
    }
    return null
  } finally {
    creatingTeam.value = false
  }
}

const tryAutoCreateTeam = async () => {
  if (!import.meta.client) return
  if (autoTeamCreated.value) return
  if (!teamsFetched.value || teamsPending.value || teamsError.value) return
  if (!teams.value || teams.value.length > 0) return

  const stored = localStorage.getItem('landing:last-url')?.trim()
  if (!stored) return

  const parsedName = extractDomainName(stored)

  autoTeamCreated.value = true
  newTeamName.value = parsedName

  try {
    const created = await createTeam(parsedName, { silent: true })
    if (created?.id) {
      await router.push(`/dashboard/${created.id}`)
    }
  } catch (error) {
    console.error('[dashboard] Auto team creation failed', error)
  }
}

watch([teamsFetched, teams, () => user.value], () => {
  if (!user.value) return
  tryAutoCreateTeam()
})
</script>

<template>
  <div class="space-y-10">
    <UPageSection
      title="Teams"
      description="Your teams and workspaces."
    >
      <div
        v-if="!user"
        class="text-muted"
      >
        Sign in to view your teams.
      </div>

      <div
        v-else
        class="space-y-4"
      >
        <UAlert
          v-if="teamsError"
          color="error"
          variant="subtle"
          title="Could not load teams"
          :description="teamsError?.message || 'Please try again.'"
        />

        <div
          v-if="teamsPending"
          class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <UCard
            v-for="index in skeletonCardCount"
            :key="index"
            class="border border-dashed"
            :ui="{ body: 'flex items-center gap-4' }"
          >
            <USkeleton class="h-12 w-12 rounded-xl" />
            <div class="flex-1 space-y-2">
              <USkeleton class="h-4 w-[160px]" />
              <USkeleton class="h-3 w-[120px]" />
              <USkeleton class="h-8 w-28 rounded-lg" />
            </div>
          </UCard>
        </div>

        <div
          v-else
          class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <NuxtLink
            v-for="team in teams"
            :key="team.id"
            :to="`/dashboard/${team.id}`"
          >
            <UCard
              :ui="{ body: 'flex items-center gap-4' }"
              class="border border-dashed"
            >
              <div
                class="h-12 w-12 rounded-xl flex items-center justify-center text-white font-semibold"
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
              <div>
                <p class="font-medium">{{ team.name }}</p>
                <p class="text-muted text-sm">Team ID: {{ team.id }}</p>
                <div class="mt-2">
                  <UButton
                    label="Open team"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :to="`/dashboard/${team.id}`"
                    trailing-icon="i-lucide-arrow-up-right"
                  />
                </div>
              </div>
            </UCard>
          </NuxtLink>

          <UCard class="border-dashed flex flex-col justify-between">
            <div class="space-y-3">
              <p class="font-medium">
                Create a new team
              </p>
              <p class="text-muted text-sm">
                Spin up a workspace for your next project.
              </p>
              <UInput
                v-model="newTeamName"
                class="w-full"
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
                @click="() => createTeam()"
              />
            </div>
          </UCard>
        </div>
      </div>
    </UPageSection>
  </div>
</template>
