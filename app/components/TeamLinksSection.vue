<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{
  teamId: string
  teamSlug?: string | null
  teamName: string
  canManage: boolean
}>()

type TeamLink = {
  id: string
  shortId: number | null
  targetUrl: string
  clickCount: number
  createdAt: string
}

const toast = useToast()

const linkSchema = z.object({
  targetUrl: z.string().trim().url('Enter a valid URL')
})

type LinkForm = z.input<typeof linkSchema>

const newLinkState = reactive<LinkForm>({
  targetUrl: ''
})

const links = ref<TeamLink[]>([])
const linksPending = ref(false)
const linksError = ref<any>(null)
const linksLoaded = ref(false)
const creatingLink = ref(false)
const editingLinkId = ref<string | null>(null)
const editingTargetUrl = ref('')
const savingLinkId = ref<string | null>(null)
const linkModalOpen = ref(false)

const resetLinkForm = () => {
  newLinkState.targetUrl = ''
}

const resetInlineEdit = () => {
  editingLinkId.value = null
  editingTargetUrl.value = ''
  savingLinkId.value = null
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

const onCreateLink = async (payload: FormSubmitEvent<LinkForm>) => {
  if (!props.teamId) return

  creatingLink.value = true

  try {
    const body = {
      targetUrl: payload.data.targetUrl.trim()
    }

    await $fetch(`/api/teams/${props.teamId}/links`, {
      method: 'POST',
      body
    })
    toast.add({ title: 'Link created', color: 'success' })

    resetLinkForm()
    await fetchLinks()
    linkModalOpen.value = false
  } catch (error: any) {
    const message = error?.data?.message || error?.message || 'Unable to save link'
    toast.add({ title: 'Save failed', description: message, color: 'error' })
  } finally {
    creatingLink.value = false
  }
}

const startInlineEdit = (link: TeamLink) => {
  if (!props.canManage || savingLinkId.value) return
  editingLinkId.value = link.id
  editingTargetUrl.value = link.targetUrl
}

const saveInlineEdit = async (link: TeamLink) => {
  if (!props.teamId || !editingLinkId.value) return

  const parsed = linkSchema.safeParse({ targetUrl: editingTargetUrl.value })
  if (!parsed.success) {
    const message = parsed.error.errors?.[0]?.message || 'Enter a valid URL'
    toast.add({ title: 'Invalid URL', description: message, color: 'error' })
    return
  }

  savingLinkId.value = link.id

  try {
    await $fetch(`/api/teams/${props.teamId}/links/${link.id}`, {
      method: 'PATCH',
      body: { targetUrl: parsed.data.targetUrl.trim() }
    })
    toast.add({ title: 'Link updated', color: 'success' })
    resetInlineEdit()
    await fetchLinks()
  } catch (error: any) {
    const message = error?.data?.message || error?.message || 'Unable to save link'
    toast.add({ title: 'Save failed', description: message, color: 'error' })
  } finally {
    savingLinkId.value = null
  }
}

const deleteLink = async (link: TeamLink) => {
  if (!props.teamId || !import.meta.client) return
  const confirmed = window.confirm(`Delete link "${link.targetUrl}"?`)
  if (!confirmed) return

  try {
    await $fetch(`/api/teams/${props.teamId}/links/${link.id}`, { method: 'DELETE' })
    toast.add({ title: 'Link deleted', color: 'success' })
    if (editingLinkId.value === link.id) {
      resetInlineEdit()
    }
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
  resetInlineEdit()
  linkModalOpen.value = false
  if (props.teamId) {
    fetchLinks()
  }
}, { immediate: true })

const buildTeamSlug = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'team'
}

const resolvedTeamSlug = computed(() => {
  const explicit = props.teamSlug?.toString().trim().toLowerCase()
  if (explicit) {
    return encodeURIComponent(explicit)
  }

  return encodeURIComponent(buildTeamSlug(props.teamName || 'team'))
})

const skipDomain = 'skip.social/open'
const resolveLinkIdentifier = (link: TeamLink) => link.shortId ?? link.id
const formatSkipUrlText = (link: TeamLink) => `${skipDomain}/${resolvedTeamSlug.value}?id=${resolveLinkIdentifier(link)}`
const formatSkipUrlHref = (link: TeamLink) => `https://${formatSkipUrlText(link)}`
const { copy } = useClipboard()
const copyingLinkId = ref<string | null>(null)

const copySkipUrl = async (link: TeamLink) => {
  const url = formatSkipUrlHref(link)
  copyingLinkId.value = link.id

  try {
    await copy(url)
    toast.add({ title: 'Link copied', description: url, color: 'neutral' })
  } catch (error: any) {
    const message = error?.message || 'Unable to copy link'
    toast.add({ title: 'Copy failed', description: message, color: 'error' })
  } finally {
    copyingLinkId.value = null
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="font-semibold">
          Links
        </p>
        <p class="text-muted text-sm">
          Routes created for this team.
        </p>
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
      <div
        v-if="linksPending"
        class="flex items-center gap-2 text-muted"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="animate-spin"
        />
        Loading links...
      </div>
      <UAlert
        v-else-if="linksError"
        color="error"
        variant="subtle"
        title="Could not load links"
        :description="linksError?.data?.message || linksError?.message || 'Please try again.'"
      />
      <div
        v-else-if="links.length === 0"
        class="text-muted"
      >
        No links yet. Create your first link to get started.
      </div>
      <div
        v-else
        class="space-y-3"
      >
        <div
          v-for="link in links"
          :key="link.id"
          class="group rounded-xl border border-dashed p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50/50 dark:hover:border-neutral-700 dark:hover:bg-neutral-900/50"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div class="flex-1 space-y-2">
              <div
                v-if="editingLinkId !== link.id"
                class="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1"
                :class="canManage ? 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900' : ''"
                :title="canManage ? 'Click to edit destination URL' : undefined"
                @click="startInlineEdit(link)"
              >
                <a
                  :href="formatSkipUrlHref(link)"
                  target="_blank"
                  rel="noreferrer"
                  class="font-semibold text-sm break-all text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-50"
                  @click.stop
                >
                  {{ formatSkipUrlText(link) }}
                </a>
                <UButton
                  size="2xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-copy"
                  :title="`Copy ${formatSkipUrlText(link)}`"
                  :loading="copyingLinkId === link.id"
                  @click.stop="copySkipUrl(link)"
                />
                <UIcon
                  name="i-lucide-arrow-right"
                  class="text-muted"
                />
                <span class="text-sm font-medium break-all text-neutral-800 dark:text-neutral-100">
                  {{ link.targetUrl }}
                </span>
              </div>
              <form
                v-else
                class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
                @submit.prevent="saveInlineEdit(link)"
              >
                <div class="flex flex-1 flex-wrap items-center gap-2">
                  <a
                    :href="formatSkipUrlHref(link)"
                    target="_blank"
                    rel="noreferrer"
                    class="font-semibold text-sm break-all text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-50"
                    @click.stop
                  >
                    {{ formatSkipUrlText(link) }}
                  </a>
                  <UButton
                    size="2xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-copy"
                    :title="`Copy ${formatSkipUrlText(link)}`"
                    :loading="copyingLinkId === link.id"
                    @click.stop="copySkipUrl(link)"
                  />
                  <UIcon
                    name="i-lucide-arrow-right"
                    class="text-muted"
                  />
                  <UInput
                    v-model="editingTargetUrl"
                    class="w-full sm:w-80"
                    placeholder="https://example.com/landing"
                  />
                </div>
                <div class="flex items-center gap-2">
                  <UButton
                    type="submit"
                    size="xs"
                    color="neutral"
                    :loading="savingLinkId === link.id"
                  >
                    Save
                  </UButton>
                  <UButton
                    type="button"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    @click.stop="resetInlineEdit"
                  >
                    Cancel
                  </UButton>
                </div>
              </form>
            </div>

            <div class="flex items-center gap-2 self-start sm:self-center">
              <UBadge
                color="neutral"
                variant="subtle"
              >
                {{ link.clickCount }} clicks
              </UBadge>
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                :disabled="!canManage"
                class="opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                @click.stop="deleteLink(link)"
              />
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <UModal v-model:open="linkModalOpen">
      <template #content="{ close }">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-semibold">Add link</span>
              <UBadge
                v-if="!canManage"
                color="neutral"
                variant="subtle"
              >
                View only
              </UBadge>
            </div>
          </template>

          <UForm
            :schema="linkSchema"
            :state="newLinkState"
            :disabled="!canManage"
            @submit="onCreateLink"
          >
            <UFormGroup
              label="Target URL"
              name="targetUrl"
            >
              <UInput
                v-model="newLinkState.targetUrl"
                placeholder="https://example.com/landing"
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
                type="submit"
                color="neutral"
                :loading="creatingLink"
              >
                Create link
              </UButton>
            </div>
          </UForm>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
