<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{
  teamId: string
  canManage: boolean
}>()

type TeamLink = {
  id: string
  slug: string
  targetUrl: string
  title?: string | null
  description?: string | null
  clickCount: number
  createdAt: string
}

const toast = useToast()

const linkSchema = z.object({
  slug: z.string().trim().min(1, 'Slug is required').regex(/^[a-zA-Z0-9-]+$/, 'Use letters, numbers, and dashes'),
  targetUrl: z.string().trim().url('Enter a valid URL'),
  title: z.string().optional(),
  description: z.string().optional()
})

type LinkForm = z.input<typeof linkSchema>

const linkState = reactive<LinkForm>({
  slug: '',
  targetUrl: '',
  title: '',
  description: ''
})

const links = ref<TeamLink[]>([])
const linksPending = ref(false)
const linksError = ref<any>(null)
const linksLoaded = ref(false)
const linkSaving = ref(false)
const editingLinkId = ref<string | null>(null)
const linkModalOpen = ref(false)

const resetLinkForm = () => {
  linkState.slug = ''
  linkState.targetUrl = ''
  linkState.title = ''
  linkState.description = ''
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
      slug: payload.data.slug.trim(),
      targetUrl: payload.data.targetUrl.trim(),
      title: payload.data.title?.trim() || undefined,
      description: payload.data.description?.trim() || undefined
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
  linkState.slug = link.slug
  linkState.targetUrl = link.targetUrl
  linkState.title = link.title || ''
  linkState.description = link.description || ''
  linkModalOpen.value = true
}

const deleteLink = async (link: TeamLink) => {
  if (!props.teamId || !process.client) return
  const confirmed = window.confirm(`Delete link "${link.slug}"?`)
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
            <div class="flex items-center gap-2">
              <p class="font-semibold text-sm break-all">/{{ link.slug }}</p>
              <UBadge color="neutral" variant="subtle">{{ link.clickCount }} clicks</UBadge>
            </div>
            <p class="text-sm break-all">{{ link.targetUrl }}</p>
            <p v-if="link.title" class="text-sm text-muted">Title: {{ link.title }}</p>
            <p v-if="link.description" class="text-sm text-muted">{{ link.description }}</p>
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
            <UFormGroup label="Slug" name="slug" description="Only letters, numbers, and dashes.">
              <UInput v-model="linkState.slug" placeholder="promo" />
            </UFormGroup>
            <UFormGroup label="Target URL" name="targetUrl">
              <UInput v-model="linkState.targetUrl" placeholder="https://example.com/landing" />
            </UFormGroup>
            <UFormGroup label="Title" name="title">
              <UInput v-model="linkState.title" placeholder="Optional title" />
            </UFormGroup>
            <UFormGroup label="Description" name="description">
              <UTextarea v-model="linkState.description" placeholder="Optional description" :rows="3" />
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
