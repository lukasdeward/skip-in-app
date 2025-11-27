<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{
  teamId: string
  canManage: boolean
}>()

type TeamLink = {
  id: string
  targetUrl: string
  clickCount: number
  createdAt: string
}

const toast = useToast()

const linkSchema = z.object({
  targetUrl: z.string().trim().url('Enter a valid URL')
})

type LinkForm = z.input<typeof linkSchema>

const linkState = reactive<LinkForm>({
  targetUrl: ''
})

const links = ref<TeamLink[]>([])
const linksPending = ref(false)
const linksError = ref<any>(null)
const linksLoaded = ref(false)
const linkSaving = ref(false)
const editingLinkId = ref<string | null>(null)
const linkModalOpen = ref(false)

const resetLinkForm = () => {
  linkState.targetUrl = ''
  editingLinkId.value = null
}

watch(linkModalOpen, (open) => {
  if (!open) {
    resetLinkForm()
  }
})

const fetchLinks = async () => {
  if (!props.teamId) return
  linksPending.value = true
  linksError.value = null

  try {
    links.value = await $fetch<TeamLink[]>(`/api/teams/${props.teamId}/links`)
    linksLoaded.value = true
  } catch (error: any) {
    linksError.value = error
    links.value = []
  } finally {
    linksPending.value = false
  }
}

const onSubmitLink = async (payload: FormSubmitEvent<LinkForm>) => {
  if (!props.teamId) return

  linkSaving.value = true

  try {
    const body = {
      targetUrl: payload.data.targetUrl.trim()
    }

    if (editingLinkId.value) {
      await $fetch(`/api/teams/${props.teamId}/links/${editingLinkId.value}`, {
        method: 'PATCH',
        body
      })
      toast.add({ title: 'Link updated', color: 'success' })
    } else {
      await $fetch(`/api/teams/${props.teamId}/links`, {
        method: 'POST',
        body
      })
      toast.add({ title: 'Link created', color: 'success' })
    }

    resetLinkForm()
    await fetchLinks()
    linkModalOpen.value = false
  } catch (error: any) {
    const message = error?.data?.message || error?.message || 'Unable to save link'
    toast.add({ title: 'Save failed', description: message, color: 'error' })
  } finally {
    linkSaving.value = false
  }
}

const startEditLink = (link: TeamLink) => {
  editingLinkId.value = link.id
  linkState.targetUrl = link.targetUrl
  linkModalOpen.value = true
}

const deleteLink = async (link: TeamLink) => {
  if (!props.teamId || !process.client) return
  const confirmed = window.confirm(`Delete link "${link.targetUrl}"?`)
  if (!confirmed) return

  try {
    await $fetch(`/api/teams/${props.teamId}/links/${link.id}`, { method: 'DELETE' })
    toast.add({ title: 'Link deleted', color: 'success' })
    await fetchLinks()
  } catch (error: any) {
    const message = error?.data?.message || error?.message || 'Unable to delete link'
    toast.add({ title: 'Delete failed', description: message, color: 'error' })
  }
}

const openNewLinkModal = () => {
  resetLinkForm()
  linkModalOpen.value = true
}

watch(() => props.teamId, () => {
  links.value = []
  linksLoaded.value = false
  resetLinkForm()
  linkModalOpen.value = false
  if (props.teamId) {
    fetchLinks()
  }
}, { immediate: true })

const skipDomain = 'skip.social/open'
const formatSkipUrlText = (id: string) => `${skipDomain}/${id}`
const formatSkipUrlHref = (id: string) => `https://${formatSkipUrlText(id)}`
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="font-semibold">Links</p>
        <p class="text-muted text-sm">Routes created for this team.</p>
      </div>
      <div class="flex gap-2">
        <UButton
          label="New link"
          icon="i-lucide-plus"
          color="neutral"
          :disabled="!canManage"
          @click="openNewLinkModal"
        />
        <UButton
          icon="i-lucide-rotate-ccw"
          color="neutral"
          variant="ghost"
          :loading="linksPending"
          @click="fetchLinks"
        />
      </div>
    </div>

    <UCard>
      <div v-if="linksPending" class="flex items-center gap-2 text-muted">
        <UIcon name="i-lucide-loader-2" class="animate-spin" />
        Loading links...
      </div>
      <UAlert
        v-else-if="linksError"
        color="error"
        variant="subtle"
        title="Could not load links"
        :description="linksError?.data?.message || linksError?.message || 'Please try again.'"
      />
      <div v-else-if="links.length === 0" class="text-muted">
        No links yet. Create your first link to get started.
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="link in links"
          :key="link.id"
          class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 border border-dashed rounded-xl p-4"
        >
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-xs uppercase text-muted">Skip Url</p>
              <a
                :href="formatSkipUrlHref(link.id)"
                target="_blank"
                rel="noreferrer"
                class="font-semibold text-sm break-all"
              >
                {{ formatSkipUrlText(link.id) }}
              </a>
              <UBadge color="neutral" variant="subtle">{{ link.clickCount }} clicks</UBadge>
            </div>
            <p class="text-sm text-muted break-all">Destination: {{ link.targetUrl }}</p>
          </div>

          <div class="flex items-center gap-2 self-end">
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              :disabled="!canManage"
              @click="startEditLink(link)"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              :disabled="!canManage"
              @click="deleteLink(link)"
            />
          </div>
        </div>
      </div>
    </UCard>

    <UModal v-model:open="linkModalOpen">
      <template #content="{ close }">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-semibold">{{ editingLinkId ? 'Edit link' : 'Add link' }}</span>
              <UBadge v-if="!canManage" color="neutral" variant="subtle">View only</UBadge>
            </div>
          </template>

          <UForm
            :schema="linkSchema"
            :state="linkState"
            :disabled="!canManage"
            @submit="onSubmitLink"
          >
            <UFormGroup label="Target URL" name="targetUrl">
              <UInput v-model="linkState.targetUrl" placeholder="https://example.com/landing" />
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
                type="submit"
                color="neutral"
                :loading="linkSaving"
              >
                {{ editingLinkId ? 'Update link' : 'Create link' }}
              </UButton>
            </div>
          </UForm>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
