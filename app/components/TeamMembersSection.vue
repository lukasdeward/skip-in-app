<script setup lang="ts">
type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER'
type TeamMember = {
  id: string
  customerId: string
  email: string
  name?: string | null
  role: TeamRole
  joinedAt: string
}

const props = withDefaults(defineProps<{
  teamId: string
  canManage: boolean
  viewerRole?: TeamRole
}>(), {
  viewerRole: 'MEMBER'
})

const toast = useToast()
const user = useSupabaseUser()
const currentUserId = computed(() => user.value?.sub || '')
const viewerRole = computed<TeamRole>(() => props.viewerRole || 'MEMBER')

const memberRoleOptions = [
  { label: 'Owner', value: 'OWNER' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Member', value: 'MEMBER' }
]

const inviteRoleOptions = computed(() => memberRoleOptions.filter(option => option.value !== 'OWNER'))
const roleItemsForMember = (member: TeamMember) => {
  if (member.role === 'OWNER') return memberRoleOptions
  return memberRoleOptions.filter(option => option.value !== 'OWNER')
}

const members = ref<TeamMember[]>([])
const membersPending = ref(false)
const membersError = ref<any>(null)
const membersLoaded = ref(false)
const memberSaving = ref(false)
const memberModalOpen = ref(false)
const ownershipModalOpen = ref(false)
const ownershipSaving = ref(false)

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

watch(ownershipModalOpen, (open) => {
  if (!open) {
    ownershipSaving.value = false
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

const isSelf = (member: TeamMember) => member.customerId === currentUserId.value

const canEditMemberRole = (member: TeamMember) => {
  if (!props.canManage) return false
  if (isSelf(member)) return false
  if (member.role === 'OWNER' && viewerRole.value !== 'OWNER') return false
  return true
}

const canTransferOwnership = (member: TeamMember) => viewerRole.value === 'OWNER' && canEditMemberRole(member) && member.role !== 'OWNER'

const ownershipCandidates = computed(() => members.value.filter(member => !isSelf(member) && member.role !== 'OWNER'))

const inviteMember = async () => {
  if (!props.teamId || !inviteState.email.trim()) {
    toast.add({ title: 'Email required', description: 'Add an email to invite a member.', color: 'warning' })
    return
  }

  if (inviteState.role === 'OWNER' && viewerRole.value !== 'OWNER') {
    toast.add({ title: 'Owners only', description: 'Only an owner can assign the owner role.', color: 'warning' })
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

    toast.add({ title: 'Login link sent', description: 'We emailed a login link and added them to your team.', color: 'success' })
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

  if (isSelf(member)) {
    toast.add({ title: 'Not allowed', description: 'You cannot change your own role.', color: 'warning' })
    return
  }

  if (role === 'OWNER' && viewerRole.value !== 'OWNER') {
    toast.add({ title: 'Owners only', description: 'Only an owner can assign the owner role.', color: 'warning' })
    return
  }

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

const showTransferOwnership = (member: TeamMember) => isSelf(member) && viewerRole.value === 'OWNER' && member.role === 'OWNER'

const transferOwnership = () => {
  ownershipModalOpen.value = true
}

const confirmOwnershipTransfer = async (member: TeamMember) => {
  ownershipSaving.value = true

  try {
    await updateMemberRole(member, 'OWNER')
    ownershipModalOpen.value = false
  } finally {
    ownershipSaving.value = false
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
  ownershipModalOpen.value = false
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
          Manage access and roles. We send a login link before adding someone to your team.
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
              {{ member.name || 'No name' }} · Joined {{ new Date(member.joinedAt).toLocaleDateString() }}<span v-if="isSelf(member)"> · You</span>
            </p>
          </div>
          <div class="flex items-center gap-2 self-end">
            <USelectMenu
              v-if="member.role != 'OWNER' && canEditMemberRole(member)"
              :model-value="member.role"
              :items="roleItemsForMember(member)"
              @update:model-value="role => updateMemberRole(member, role as TeamRole)"
            />
            <UButton
              v-else-if="showTransferOwnership(member)"
              size="xs"
              color="neutral"
              variant="soft"
              @click="transferOwnership"
            >
              Transfer ownership
            </UButton>
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
                <p class="text-xs text-muted mt-1">
                  They will receive a login link before being added to this team.
                </p>
              </UFormGroup>
              <UFormGroup
                label="Role"
              name="role"
            >
              <USelectMenu
                v-model="inviteState.role"
                :items="inviteRoleOptions"
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

    <UModal v-model:open="ownershipModalOpen">
      <template #content="{ close }">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <p class="font-semibold">
                Transfer ownership
              </p>
            </div>
          </template>

          <div class="space-y-3">
            <p class="text-sm text-muted">
              Choose a member to promote to owner. They will gain full control of this team.
            </p>

            <div v-if="ownershipCandidates.length === 0" class="text-sm text-muted">
              No eligible members to transfer ownership to.
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="candidate in ownershipCandidates"
                :key="candidate.id"
                class="flex items-center justify-between gap-3 border border-dashed rounded-xl p-3"
              >
                <div class="space-y-1">
                  <p class="font-semibold break-all">
                    {{ candidate.email }}
                  </p>
                  <p class="text-sm text-muted">
                    {{ candidate.name || 'No name' }} · Joined {{ new Date(candidate.joinedAt).toLocaleDateString() }}
                  </p>
                </div>
                <UButton
                  color="neutral"
                  size="xs"
                  :loading="ownershipSaving"
                  @click="confirmOwnershipTransfer(candidate)"
                >
                  Make owner
                </UButton>
              </div>
            </div>

            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                @click="close"
              >
                Cancel
              </UButton>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
