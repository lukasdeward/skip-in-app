<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { ComputedRef } from 'vue'
import { CurveType, LegendPosition, type BulletLegendItemInterface } from 'vue-chrts'

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

type LinkAnalyticsPoint = {
  date: string
  desktop: number
  mobile: number
}

type LinkAnalyticsResponse = {
  days: number
  series: LinkAnalyticsPoint[]
  totals: {
    desktop: number
    mobile: number
    total: number
  }
}

type RequestError = {
  data?: { message?: string, statusCode?: number }
  statusCode?: number
  message?: string
}

const normalizeRequestError = (error: unknown): RequestError => {
  if (error && typeof error === 'object') {
    return error as RequestError
  }

  return { message: typeof error === 'string' ? error : undefined }
}

const getErrorMessage = (error: unknown, fallback: string) => {
  const normalized = normalizeRequestError(error)
  return normalized.data?.message || normalized.message || fallback
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
const linksError = ref<RequestError | null>(null)
const linksLoaded = ref(false)
const creatingLink = ref(false)
const autoLinkAttempted = ref(false)
const editingLinkId = ref<string | null>(null)
const editingTargetUrl = ref('')
const savingLinkId = ref<string | null>(null)
const linkModalOpen = ref(false)
const analyticsSeries = ref<LinkAnalyticsPoint[]>([])
const analyticsTotals = ref<LinkAnalyticsResponse['totals']>({
  desktop: 0,
  mobile: 0,
  total: 0
})
const analyticsWindow = ref(14)
const analyticsPending = ref(false)
const analyticsError = ref<RequestError | null>(null)
const colorMode = useColorMode()

const analyticsCategories: ComputedRef<Record<string, BulletLegendItemInterface>> = computed(() => ({
  desktop: {
    name: 'Desktop',
    color: '#3b82f6'
  },
  mobile: {
    name: 'Mobile',
    color: '#22c55e'
  }
}))

const analyticsXFormatter = (tick: number): string => {
  return analyticsSeries.value[tick]?.date || ''
}

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
    const { data, error } = await useFetch<TeamLink[]>(`/api/teams/${props.teamId}/links`, {
      server: false,
      key: `team-links-${props.teamId}-${Date.now()}`
    })
    if (error.value) throw error.value
    links.value = data.value || []
    linksLoaded.value = true
  } catch (error: unknown) {
    linksError.value = normalizeRequestError(error)
    links.value = []
    linksLoaded.value = false
  } finally {
    linksPending.value = false
  }

  await maybeAutoCreateLink()
}

const fetchAnalytics = async () => {
  if (!props.teamId) return
  analyticsPending.value = true
  analyticsError.value = null

  try {
    const { data, error } = await useFetch<LinkAnalyticsResponse>(`/api/teams/${props.teamId}/analytics`, {
      server: false,
      key: `team-analytics-${props.teamId}-${Date.now()}`
    })
    if (error.value) throw error.value
    analyticsSeries.value = data.value?.series || []
    analyticsTotals.value = data.value?.totals || { desktop: 0, mobile: 0, total: 0 }
    analyticsWindow.value = data.value?.days || analyticsWindow.value || 14
  } catch (error: unknown) {
    analyticsError.value = normalizeRequestError(error)
    analyticsSeries.value = []
    analyticsTotals.value = { desktop: 0, mobile: 0, total: 0 }
  } finally {
    analyticsPending.value = false
  }
}

const onCreateLink = async (payload: FormSubmitEvent<LinkForm>) => {
  const created = await createLinkFromUrl(payload.data.targetUrl, { trackState: true })
  if (created) {
    resetLinkForm()
    linkModalOpen.value = false
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
    const { error } = await useFetch(`/api/teams/${props.teamId}/links/${link.id}`, {
      method: 'PATCH',
      body: { targetUrl: parsed.data.targetUrl.trim() },
      server: false,
      key: `update-link-${link.id}-${Date.now()}`
    })
    if (error.value) throw error.value
    toast.add({ title: 'Link updated', color: 'success' })
    resetInlineEdit()
    await fetchLinks()
  } catch (error: unknown) {
    const message = getErrorMessage(error, 'Unable to save link')
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
    const { error } = await useFetch(`/api/teams/${props.teamId}/links/${link.id}`, {
      method: 'DELETE',
      server: false,
      key: `delete-link-${link.id}-${Date.now()}`
    })
    if (error.value) throw error.value
    toast.add({ title: 'Link deleted', color: 'success' })
    if (editingLinkId.value === link.id) {
      resetInlineEdit()
    }
    await fetchLinks()
  } catch (error: unknown) {
    const message = getErrorMessage(error, 'Unable to delete link')
    toast.add({ title: 'Delete failed', description: message, color: 'error' })
  }
}

const openNewLinkModal = () => {
  if (hasReachedLimit.value) {
    toast.add({ title: 'Limit reached', description: 'Free plan allows up to 2 links. Upgrade to add more.', color: 'warning' })
    return
  }
  resetLinkForm()
  linkModalOpen.value = true
}

const createLinkFromUrl = async (
  targetUrl: string,
  options: { silent?: boolean, trackState?: boolean } = {}
) => {
  const { silent = false, trackState = false } = options
  
  if (hasReachedLimit.value) {
    if (!silent) {
      toast.add({ title: 'Limit reached', description: 'Free plan allows up to 2 links. Upgrade to add more.', color: 'warning' })
    }
    return false
  }
  if (!props.teamId) return false
  const parsed = linkSchema.safeParse({ targetUrl })

  if (!parsed.success) {
    if (!silent) {
      const message = parsed.error.errors?.[0]?.message || 'Enter a valid URL'
      toast.add({ title: 'Invalid URL', description: message, color: 'error' })
    }
    return false
  }

  if (trackState) {
    creatingLink.value = true
  }

  try {
    const { error } = await useFetch(`/api/teams/${props.teamId}/links`, {
      method: 'POST',
      body: { targetUrl: parsed.data.targetUrl.trim() },
      server: false,
      key: `create-link-${props.teamId}-${Date.now()}`
    })
    if (error.value) throw error.value

    if (!silent) {
      toast.add({ title: 'Link created', color: 'success' })
    }

    await fetchLinks()
    return true
  } catch (error: unknown) {
    if (!silent) {
      const message = getErrorMessage(error, 'Unable to save link')
      toast.add({ title: 'Save failed', description: message, color: 'error' })
    }
    return false
  } finally {
    if (trackState) {
      creatingLink.value = false
    }
  }
}

const maybeAutoCreateLink = async () => {
  if (!import.meta.client) return
  if (autoLinkAttempted.value) return
  if (!props.canManage) return
  if (linksPending.value || !linksLoaded.value) return
  if (links.value.length > 0) {
    autoLinkAttempted.value = true
    return
  }

  const stored = localStorage.getItem('landing:last-url')?.trim()
  if (!stored) {
    autoLinkAttempted.value = true
    return
  }

  autoLinkAttempted.value = true
  const created = await createLinkFromUrl(stored, { silent: true })

  if (created) {
    try {
      localStorage.removeItem('landing:last-url')
    } catch (error: unknown) {
      console.error('[team-links] Failed to clear landing:last-url', error)
    }
    toast.add({ title: 'Link created', description: 'We added your URL.', color: 'success' })
  }
}

watch(() => props.teamId, () => {
  links.value = []
  linksLoaded.value = false
  autoLinkAttempted.value = false
  resetLinkForm()
  resetInlineEdit()
  linkModalOpen.value = false
  analyticsSeries.value = []
  analyticsTotals.value = { desktop: 0, mobile: 0, total: 0 }
  analyticsWindow.value = 14
  analyticsError.value = null
  analyticsPending.value = false
  if (props.teamId) {
    fetchLinks()
    fetchBilling()
    fetchAnalytics()
  }
}, { immediate: true })

const billingInfo = ref<{ plan?: 'FREE' | 'PRO' | string | null } | null>(null)
const billingPending = ref(false)
const billingError = ref<RequestError | null>(null)

const fetchBilling = async () => {
  if (!props.teamId) return
  billingPending.value = true
  billingError.value = null

  try {
    const { data, error } = await useFetch<{ plan?: 'FREE' | 'PRO' | string | null }>(`/api/teams/${props.teamId}/billing`, {
      server: false,
      key: `team-billing-links-${props.teamId}-${Date.now()}`
    })
    if (error.value) throw error.value
    billingInfo.value = data.value || null
  } catch (error: unknown) {
    billingError.value = normalizeRequestError(error)
    billingInfo.value = null
  } finally {
    billingPending.value = false
  }
}

const isFreePlan = computed(() => billingInfo.value ? billingInfo.value.plan !== 'PRO' : false)
const linkLimit = 2
const hasReachedLimit = computed(() => isFreePlan.value && links.value.length >= linkLimit)
const hasAnalyticsData = computed(() => analyticsTotals.value.total > 0)

const buildTeamSlug = (value: string) => {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()

  return cleaned || 'team'
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
const formatSkipUrlText = (link: TeamLink) => `${skipDomain}/${resolvedTeamSlug.value}-${resolveLinkIdentifier(link)}`
const formatSkipUrlHref = (link: TeamLink) => `https://${formatSkipUrlText(link)}`
const { copy } = useClipboard()
const copyingLinkId = ref<string | null>(null)

const copySkipUrl = async (link: TeamLink) => {
  const url = formatSkipUrlHref(link)
  copyingLinkId.value = link.id

  try {
    await copy(url)
    toast.add({ title: 'Link copied', description: url, color: 'neutral' })
  } catch (error: unknown) {
    const message = getErrorMessage(error, 'Unable to copy link')
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
          :disabled="!canManage || hasReachedLimit"
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
      <template #header>
        <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="font-semibold">
              Link analytics
            </p>
            <p class="text-muted text-sm">
              Opens by device in the last {{ analyticsWindow }} days.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UBadge
              color="neutral"
              variant="subtle"
            >
              {{ analyticsTotals.total }} opens
            </UBadge>
            <UButton
              icon="i-lucide-rotate-ccw"
              color="neutral"
              variant="ghost"
              :loading="analyticsPending"
              :disabled="analyticsPending"
              @click="fetchAnalytics"
            />
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <div class="flex flex-wrap gap-2 text-sm">
          <UBadge
            color="neutral"
            variant="subtle"
          >
            Desktop: {{ analyticsTotals.desktop }}
          </UBadge>
          <UBadge
            color="success"
            variant="subtle"
          >
            Mobile: {{ analyticsTotals.mobile }}
          </UBadge>
        </div>

        <div class="min-h-[260px]">
          <div
            v-if="analyticsPending"
            class="flex items-center gap-2 text-muted"
          >
            <UIcon
              name="i-lucide-loader-2"
              class="animate-spin"
            />
            Loading analytics...
          </div>
          <UAlert
            v-else-if="analyticsError"
            color="error"
            variant="subtle"
            title="Could not load analytics"
            :description="analyticsError?.data?.message || analyticsError?.message || 'Please try again.'"
          />
          <div
            v-else-if="analyticsSeries.length === 0"
            class="text-muted"
          >
            No analytics yet. Share your Skip links to start seeing opens.
          </div>
          <div
            v-else
            class="space-y-3"
          >
            <p
              v-if="!hasAnalyticsData"
              class="text-muted text-sm"
            >
              No opens yet. Charts will populate as soon as links are visited.
            </p>
            <AreaChart
              :key="colorMode.value"
              :data="analyticsSeries"
              :height="280"
              :categories="analyticsCategories"
              :y-grid-line="true"
              :x-formatter="analyticsXFormatter"
              :curve-type="CurveType.MonotoneX"
              :legend-position="LegendPosition.BottomCenter"
              :hide-legend="false"
            />
          </div>
        </div>
      </div>
    </UCard>

    <UAlert
      v-if="hasReachedLimit"
      color="warning"
      variant="soft"
      icon="i-lucide-lock"
      title="Link limit reached on Free"
      description="Free teams can create up to 2 links. Upgrade to Pro for unlimited links."
    />

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
                <div class="flex flex-1 flex-wrap items-center gap-2 w-full">
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
                    size="xs"
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
