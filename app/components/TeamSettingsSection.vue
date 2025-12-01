<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{
  teamId: string
  team: {
    id: string
    name: string
    slug?: string | null
    logoUrl?: string | null
    backgroundColor?: string | null
    textColor?: string | null
    highlightColor?: string | null
  }
  canManage: boolean
}>()

const emit = defineEmits<{
  (e: 'updated'): void
}>()

const toast = useToast()
const fallbackBackgroundColor = '#020618'
const fallbackTextColor = '#ffffff'
const fallbackHighlightColor = '#f97316'

const handlePattern = /^[a-z0-9]+$/

const settingsSchema = z.object({
  name: z.string().trim().min(1, 'Team name is required').refine(value => !value.includes('-'), {
    message: 'Team name cannot include dashes'
  }),
  slug: z.string()
    .trim()
    .min(1, 'Team handle is required')
    .max(32, 'Team handle must be 32 characters or fewer')
    .regex(handlePattern, 'Use lowercase letters and numbers only'),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  highlightColor: z.string().optional()
})

type SettingsForm = z.input<typeof settingsSchema>

const settingsState = reactive<SettingsForm>({
  name: '',
  slug: '',
  backgroundColor: fallbackBackgroundColor,
  textColor: fallbackTextColor,
  highlightColor: fallbackHighlightColor
})

const savingSettings = ref(false)

const buildDefaultHandle = (value: string) => {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '') || 'team'
}

const previewBackgroundColor = computed(() => settingsState.backgroundColor?.trim()
  || props.team.backgroundColor?.trim()
  || fallbackBackgroundColor)

const previewTextColor = computed(() => settingsState.textColor?.trim()
  || props.team.textColor?.trim()
  || fallbackTextColor)

const previewHighlightColor = computed(() => settingsState.highlightColor?.trim()
  || props.team.highlightColor?.trim()
  || fallbackHighlightColor)

const previewTeamName = computed(() => settingsState.name?.trim() || props.team.name)

watch(() => settingsState.slug, (value) => {
  const normalized = value?.toLowerCase() || ''
  if (normalized !== value) {
    settingsState.slug = normalized
  }
})

watch(() => props.team, (value) => {
  settingsState.name = value?.name || ''
  settingsState.slug = value?.slug || buildDefaultHandle(value?.name || 'team')
  settingsState.backgroundColor = value?.backgroundColor || fallbackBackgroundColor
  settingsState.textColor = value?.textColor || fallbackTextColor
  settingsState.highlightColor = value?.highlightColor || fallbackHighlightColor
}, { immediate: true, deep: true })

const onSubmitSettings = async (payload: FormSubmitEvent<SettingsForm>) => {
  if (!props.teamId) return
  savingSettings.value = true

  try {
    const { error } = await useFetch(`/api/teams/${props.teamId}`, {
      method: 'PATCH',
      body: {
        name: payload.data.name.trim(),
        slug: payload.data.slug.trim().toLowerCase(),
        backgroundColor: payload.data.backgroundColor?.trim() || null,
        textColor: payload.data.textColor?.trim() || null,
        highlightColor: payload.data.highlightColor?.trim() || null
      },
      server: false,
      key: `update-team-settings-${props.teamId}-${Date.now()}`
    })
    if (error.value) throw error.value

    toast.add({ title: 'Settings saved', color: 'success' })
    emit('updated')
  } catch (error: any) {
    const message = error?.data?.message || error?.message || 'Unable to save settings'
    toast.add({ title: 'Save failed', description: message, color: 'error' })
  } finally {
    savingSettings.value = false
  }
}

const logoInput = ref<HTMLInputElement | null>(null)
const logoUploading = ref(false)
const allowedLogoTypes = [
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/jpg',
  'image/gif',
  'image/webp'
]

const triggerLogoPicker = () => logoInput.value?.click()

const uploadLogo = async (event: Event) => {
  const file = (event.target as HTMLInputElement)?.files?.[0]
  if (!file || !props.teamId) return

  if (!allowedLogoTypes.includes(file.type)) {
    toast.add({ title: 'Unsupported file', description: 'Please choose a PNG, JPG, SVG, GIF, or WebP image.', color: 'warning' })
    return
  }

  logoUploading.value = true

  try {
    const formData = new FormData()
    formData.append('logo', file)

    const { error } = await useFetch(`/api/teams/${props.teamId}/logo`, {
      method: 'POST',
      body: formData,
      server: false,
      key: `upload-logo-${props.teamId}-${Date.now()}`
    })
    if (error.value) throw error.value

    toast.add({ title: 'Logo updated', color: 'success' })
    emit('updated')
  } catch (error: any) {
    const message = error?.data?.message || error?.message || 'Failed to upload logo'
    toast.add({ title: 'Upload failed', description: message, color: 'error' })
  } finally {
    logoUploading.value = false
    if (logoInput.value) {
      logoInput.value.value = ''
    }
  }
}

const removeLogo = async () => {
  if (!props.teamId) return

  try {
    const { error } = await useFetch(`/api/teams/${props.teamId}`, {
      method: 'PATCH',
      body: { logoUrl: null },
      server: false,
      key: `remove-logo-${props.teamId}-${Date.now()}`
    })
    if (error.value) throw error.value
    toast.add({ title: 'Logo removed', color: 'success' })
    emit('updated')
  } catch (error: any) {
    const message = error?.data?.message || error?.message || 'Unable to remove logo'
    toast.add({ title: 'Remove failed', description: message, color: 'error' })
  }
}

watch(() => props.teamId, () => {
  if (logoInput.value) {
    logoInput.value.value = ''
  }
})
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-3">
    <div class="space-y-6 lg:col-span-2">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex w-full items-center justify-between gap-2">
              <p class="font-semibold">
                Team settings
              </p>
              <UBadge
                v-if="!canManage"
                color="neutral"
                variant="subtle"
              >
                View only
              </UBadge>
            <UButton
              type="submit"
              form="team-settings-form"
              color="neutral"
              :loading="savingSettings"
              :disabled="!canManage"
            >
              Publish
            </UButton>
            </div>
          </div>
        </template>

        <UForm
          id="team-settings-form"
          :schema="settingsSchema"
          :state="settingsState"
          :disabled="!canManage"
          class="space-y-8"
          @submit="onSubmitSettings"
          v-slot="{ errors }"
        >
          <div class="flex flex-wrap items-center gap-4">
            <div
              class="h-16 w-16 rounded-xl flex items-center justify-center text-white font-semibold text-lg border border-dashed"
              :style="{
                backgroundColor: previewBackgroundColor,
                color: previewTextColor
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
            <div class="flex-1 min-w-60 space-y-1">
              <p class="text-sm font-semibold">
                Logo
              </p>
              <div class="flex flex-wrap items-center gap-2">
                <UButton
                  icon="i-lucide-upload"
                  color="neutral"
                  size="sm"
                  :loading="logoUploading"
                  :disabled="!canManage"
                  @click="triggerLogoPicker"
                >
                  Upload logo
                </UButton>
                <UButton
                  v-if="team.logoUrl"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  :disabled="!canManage"
                  @click="removeLogo"
                >
                  Remove
                </UButton>
                <p class="text-xs text-muted">
                  PNG, JPG, SVG, GIF, WebP
                </p>
              </div>
              <input
                ref="logoInput"
                type="file"
                accept="image/jpeg,image/png,image/svg+xml,image/jpg,image/gif,image/webp"
                class="hidden"
                @change="uploadLogo"
              >
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1">
              <p class="text-sm font-semibold">
                Team name
              </p>
              <UInput
                v-model="settingsState.name"
                placeholder="Team name"
              />
              <p
                v-if="errors?.[0]"
                class="text-xs text-red-500"
              >
                {{ errors[0] }}
              </p>
            </div>

            <div class="space-y-1">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-semibold">
                  Team URL handle
                </p>
                <p class="text-xs text-muted">
                  Lowercase letters and numbers only.
                </p>
              </div>
              <UInput
                v-model="settingsState.slug"
                placeholder="acme"
              />
              <p
                v-if="errors?.[0]"
                class="text-xs text-red-500"
              >
                {{ errors[0] }}
              </p>
            </div>
          </div>

          <div class="space-y-4">
            <div>
              <p class="text-sm font-semibold">
                Theme colors
              </p>
              <p class="text-xs text-muted">
                Set background, text, and accent colors for your experience.
              </p>
            </div>

            <div class="grid gap-4 sm:grid-cols-3">
                <div class="flex flex-col items-start gap-3">
                  <p>Background color</p>
                  <UInput
                    v-model="settingsState.backgroundColor"
                    type="color"
                  />
                  <UInput
                    v-model="settingsState.backgroundColor"
                    placeholder="#020618"
                  />
                </div>

                <div class="flex flex-col items-start gap-3">
                  <p>Text color</p>
                  <UInput
                    v-model="settingsState.textColor"
                    type="color"
                  />
                  <UInput
                    v-model="settingsState.textColor"
                    placeholder="#ffffff"
                  />
                </div>

                <div class="flex flex-col items-start gap-3">
                  <p>Accent color</p>
                  <UInput
                    v-model="settingsState.highlightColor"
                    type="color"
                  />
                  <UInput
                    v-model="settingsState.highlightColor"
                    placeholder="#f97316"
                  />
                </div>
            </div>
          </div>
        </UForm>
      </UCard>
    </div>

    <div class="lg:col-span-1">
      <UCard class="lg:sticky lg:top-4">
        <template #header>
          <div class="flex items-center justify-between">
            <p class="font-semibold">
              Preview
            </p>
            <UButton
              type="submit"
              form="team-settings-form"
              color="neutral"
              :loading="savingSettings"
              :disabled="!canManage"
            >
              Publish
            </UButton>
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-muted">
            Quick visual check of your logo, text, and accent colors before publishing.
          </p>
          <div class="flex justify-center">
            <InAppBrowserPreview
              class="w-full max-w-md"
              :background-color="previewBackgroundColor"
              :text-color="previewTextColor"
              :highlight-color="previewHighlightColor"
              :team-name="previewTeamName"
              :logo-url="team.logoUrl || undefined"
            />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
