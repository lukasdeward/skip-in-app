<script setup lang="ts">
const props = defineProps<{
  teamId: string
  canManage: boolean
}>()

type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER'
type TeamMember = {
  id: string
  customerId: string
  email: string
  name?: string | null
  role: TeamRole
  joinedAt: string
}

const toast = useToast()

const memberRoleOptions = [
  { label: 'Owner', value: 'OWNER' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Member', value: 'MEMBER' }
]

const members = ref<TeamMember[]>([])
const membersPending = ref(false)
const membersError = ref<any>(null)
const membersLoaded = ref(false)
const memberSaving = ref(false)
const memberModalOpen = ref(false)

const inviteState = reactive<{ email: string, role: TeamRole }>({
  email: '',
  role: 'MEMBER'
})

watch(memberModalOpen, (open) => {
  if (!open) {
    inviteState.email = ''
    inviteState.role = 'MEMBER'
  }
})

const fetchMembers = async () => {
  if (!props.teamId) return
  membersPending.value = true
  membersError.value = null

  try {
    const { data, error } = await useFetch<TeamMember[]>(`/api/teams/${props.teamId}/members`, {
      server: false,
      key: `team-members-${props.teamId}-${Date.now()}`
    })
    if (error.value) throw error.value
    members.value = data.value || []
    membersLoaded.value = true
  } catch (error: any) {
    membersError.value = error
    members.value = []
  } finally {
    membersPending.value = false
  }
}

const inviteMember = async () => {
  if (!props.teamId || !inviteState.email.trim()) {
    toast.add({ title: 'Email required', description: 'Add an email to invite a member.', color: 'warning' })
    return
  }

  memberSaving.value = true

  try {
    const { error } = await useFetch(`/api/teams/${props.teamId}/members`, {
      method: 'POST',
      body: {
        email: inviteState.email.trim().toLowerCase(),
        role: inviteState.role
      },
      server: false,
      key: `add-member-${props.teamId}-${Date.now()}`
    })
    if (error.value) throw error.value

    toast.add({ title: 'Member added', color: 'success' })
    inviteState.email = ''
    inviteState.role = 'MEMBER'
    memberModalOpen.value = false
    await fetchMembers()
  } catch (error: any) {
    const message = error?.data?.message || error?.message || 'Unable to add member'
    toast.add({ title: 'Action failed', description: message, color: 'error' })
  } finally {
    memberSaving.value = false
  }
}

const updateMemberRole = async (member: TeamMember, role: TeamRole) => {
  if (!props.teamId || member.role === role) return

  try {
    const { error } = await useFetch(`/api/teams/${props.teamId}/members/${member.id}`, {
      method: 'PATCH',
      body: { role },
      server: false,
      key: `update-member-${member.id}-${Date.now()}`
    })
    if (error.value) throw error.value
    toast.add({ title: 'Role updated', color: 'success' })
    await fetchMembers()
  } catch (error: any) {
    const message = error?.data?.message || error?.message || 'Unable to update role'
    toast.add({ title: 'Update failed', description: message, color: 'error' })
  }
}

const removeMember = async (member: TeamMember) => {
  if (!props.teamId || !import.meta.client) return
  const confirmed = window.confirm(`Remove ${member.email} from this team?`)
  if (!confirmed) return

  try {
    const { error } = await useFetch(`/api/teams/${props.teamId}/members/${member.id}`, {
      method: 'DELETE',
      server: false,
      key: `remove-member-${member.id}-${Date.now()}`
    })
    if (error.value) throw error.value
    toast.add({ title: 'Member removed', color: 'success' })
    await fetchMembers()
  } catch (error: any) {
    const message = error?.data?.message || error?.message || 'Unable to remove member'
    toast.add({ title: 'Remove failed', description: message, color: 'error' })
  }
}

watch(() => props.teamId, () => {
  members.value = []
  membersLoaded.value = false
  inviteState.email = ''
  inviteState.role = 'MEMBER'
  memberModalOpen.value = false
  if (props.teamId) {
    fetchMembers()
  }
}, { immediate: true })
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="font-semibold">
          Team members
        </p>
        <p class="text-muted text-sm">
          Manage access and roles.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          label="Add member"
          icon="i-lucide-user-plus"
          color="neutral"
          :disabled="!canManage"
          @click="memberModalOpen = true"
        />
        <UButton
          icon="i-lucide-rotate-ccw"
          color="neutral"
          variant="ghost"
          :loading="membersPending"
          @click="fetchMembers"
        />
      </div>
    </div>

    <UCard>
      <div
        v-if="membersPending"
        class="flex items-center gap-2 text-muted"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="animate-spin"
        />
        Loading members...
      </div>
      <UAlert
        v-else-if="membersError"
        color="error"
        variant="subtle"
        title="Could not load members"
        :description="membersError?.data?.message || membersError?.message || 'Please try again.'"
      />
      <div
        v-else-if="members.length === 0"
        class="text-muted"
      >
        No members found.
      </div>
      <div
        v-else
        class="space-y-3"
      >
        <div
          v-for="member in members"
          :key="member.id"
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-dashed rounded-xl p-4"
        >
          <div class="space-y-1">
            <p class="font-semibold break-all">
              {{ member.email }}
            </p>
            <p class="text-sm text-muted">
              {{ member.name || 'No name' }} · Joined {{ new Date(member.joinedAt).toLocaleDateString() }}
            </p>
          </div>
          <div class="flex items-center gap-2 self-end">
            <USelectMenu
              v-if="canManage"
              :model-value="member.role"
              :options="memberRoleOptions"
              value-attribute="value"
              option-attribute="label"
              @update:model-value="role => updateMemberRole(member, role as TeamRole)"
            />
            <UBadge
              v-else
              color="neutral"
              variant="subtle"
            >
              {{ member.role.toLowerCase() }}
            </UBadge>
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              :disabled="!canManage"
              @click="removeMember(member)"
            />
          </div>
        </div>
      </div>
    </UCard>

    <UModal v-model:open="memberModalOpen">
      <template #content="{ close }">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <p class="font-semibold">
                Add member
              </p>
              <UBadge
                v-if="!canManage"
                color="neutral"
                variant="subtle"
              >
                View only
              </UBadge>
            </div>
          </template>

          <div
            v-if="!canManage"
            class="text-muted text-sm"
          >
            Only owners and admins can invite or modify members.
          </div>
          <div
            v-else
            class="space-y-3"
          >
            <UForm @submit.prevent="inviteMember">
              <UFormGroup
                label="Email"
                name="email"
              >
                <UInput
                  v-model="inviteState.email"
                  placeholder="member@example.com"
                />
              </UFormGroup>
              <UFormGroup
                label="Role"
                name="role"
              >
                <USelectMenu
                  v-model="inviteState.role"
                  :options="memberRoleOptions"
                  value-attribute="value"
                  option-attribute="label"
                />
              </UFormGroup>
              <div class="flex justify-end gap-2">
                <UButton
                  color="neutral"
                  variant="ghost"
                  @click="close"
                >
                  Cancel
                </UButton>
                <UButton
                  :loading="memberSaving"
                  color="neutral"
                  type="submit"
                >
                  Add member
                </UButton>
              </div>
            </UForm>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
