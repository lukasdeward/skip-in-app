<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{
  teamId: string
  team: {
    id: string
    name: string
    logoUrl?: string | null
    backgroundColor?: string | null
    textColor?: string | null
  }
  canManage: boolean
}>()

const emit = defineEmits<{
  (e: 'updated'): void
}>()

const toast = useToast()
const fallbackBackgroundColor = '#020618'
const fallbackTextColor = '#ffffff'

const settingsSchema = z.object({
  name: z.string().trim().min(1, 'Team name is required'),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional()
})

type SettingsForm = z.input<typeof settingsSchema>

const settingsState = reactive<SettingsForm>({
  name: '',
  backgroundColor: '',
  textColor: ''
})

const savingSettings = ref(false)
const settingsModalOpen = ref(false)

watch(() => props.team, (value) => {
  settingsState.name = value?.name || ''
  settingsState.backgroundColor = value?.backgroundColor || ''
  settingsState.textColor = value?.textColor || ''
}, { immediate: true, deep: true })

const onSubmitSettings = async (payload: FormSubmitEvent<SettingsForm>) => {
  if (!props.teamId) return
  savingSettings.value = true

  try {
    await $fetch(`/api/teams/${props.teamId}`, {
      method: 'PATCH',
      body: {
        name: payload.data.name.trim(),
        backgroundColor: payload.data.backgroundColor?.trim() || null,
        textColor: payload.data.textColor?.trim() || null
      }
    })

    toast.add({ title: 'Settings saved', color: 'success' })
    emit('updated')
    settingsModalOpen.value = false
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

    await $fetch(`/api/teams/${props.teamId}/logo`, {
      method: 'POST',
      body: formData
    })

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
    await $fetch(`/api/teams/${props.teamId}`, {
      method: 'PATCH',
      body: { logoUrl: null }
    })
    toast.add({ title: 'Logo removed', color: 'success' })
    emit('updated')
  } catch (error: any) {
    const message = error?.data?.message || error?.message || 'Unable to remove logo'
    toast.add({ title: 'Remove failed', description: message, color: 'error' })
  }
}

watch(() => props.teamId, () => {
  settingsModalOpen.value = false
  if (logoInput.value) {
    logoInput.value.value = ''
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-6 lg:grid-cols-3">
      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <p class="font-semibold">Team details</p>
            <div class="flex items-center gap-2">
              <UBadge v-if="!canManage" color="neutral" variant="subtle">View only</UBadge>
              <UButton
                label="Edit settings"
                color="neutral"
                size="sm"
                :disabled="!canManage"
                @click="settingsModalOpen = true"
              />
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-muted">Team name</p>
              <p class="font-semibold">{{ team.name }}</p>
            </div>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="flex items-center gap-3">
              <div class="flex-1">
                <p class="text-sm text-muted">Background color</p>
                <p class="font-semibold">{{ team.backgroundColor || 'Default' }}</p>
              </div>
              <div
                class="h-10 w-10 rounded-lg border"
                :style="{ backgroundColor: team.backgroundColor || fallbackBackgroundColor }"
                title="Background preview"
              />
            </div>
            <div class="flex items-center gap-3">
              <div class="flex-1">
                <p class="text-sm text-muted">Text color</p>
                <p class="font-semibold">{{ team.textColor || 'Default' }}</p>
              </div>
              <div
                class="h-10 w-10 rounded-lg border flex items-center justify-center text-sm font-semibold"
                :style="{
                  backgroundColor: team.backgroundColor || fallbackBackgroundColor,
                  color: team.textColor || fallbackTextColor
                }"
                title="Text preview"
              >
                Aa
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <p class="font-semibold">Logo</p>
        </template>
        <div class="flex items-center gap-4">
          <div
            class="h-14 w-14 rounded-xl flex items-center justify-center text-white font-semibold text-lg border border-dashed"
            :style="{
              backgroundColor: team.backgroundColor || fallbackBackgroundColor,
              color: team.textColor || fallbackTextColor
            }"
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
          <div class="space-y-2">
            <div class="flex gap-2">
              <UButton
                icon="i-lucide-upload"
                color="neutral"
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
                :disabled="!canManage"
                @click="removeLogo"
              >
                Remove
              </UButton>
            </div>
            <p class="text-xs text-muted">
              Allowed: PNG, JPG, SVG, GIF, WebP
            </p>
            <input
              ref="logoInput"
              type="file"
              accept="image/jpeg,image/png,image/svg+xml,image/jpg,image/gif,image/webp"
              class="hidden"
              @change="uploadLogo"
            >
          </div>
        </div>
      </UCard>
    </div>

    <UModal v-model:open="settingsModalOpen">
      <template #content="{ close }">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <p class="font-semibold">Edit team settings</p>
              <UBadge v-if="!canManage" color="neutral" variant="subtle">View only</UBadge>
            </div>
          </template>

          <UForm
            :schema="settingsSchema"
            :state="settingsState"
            :disabled="!canManage"
            @submit="onSubmitSettings"
          >
            <div class="grid gap-4 md:grid-cols-2">
              <UFormGroup label="Team name" name="name">
                <UInput v-model="settingsState.name" placeholder="Team name" />
              </UFormGroup>
              <UFormGroup label="Background color" name="backgroundColor">
                <div class="flex items-center gap-2">
                  <UInput v-model="settingsState.backgroundColor" placeholder="#020618" />
                  <div
                    class="h-10 w-10 rounded-lg border"
                    :style="{ backgroundColor: settingsState.backgroundColor || team.backgroundColor || fallbackBackgroundColor }"
                    title="Background preview"
                  />
                </div>
              </UFormGroup>
              <UFormGroup label="Text color" name="textColor">
                <div class="flex items-center gap-2">
                  <UInput v-model="settingsState.textColor" placeholder="#ffffff" />
                  <div
                    class="h-10 w-10 rounded-lg border flex items-center justify-center text-sm font-semibold"
                    :style="{
                      backgroundColor: settingsState.backgroundColor || team.backgroundColor || fallbackBackgroundColor,
                      color: settingsState.textColor || team.textColor || fallbackTextColor
                    }"
                    title="Text preview"
                  >
                    Aa
                  </div>
                </div>
              </UFormGroup>
            </div>

            <div class="flex justify-end gap-2 mt-4">
              <UButton color="neutral" variant="ghost" @click="close">
                Cancel
              </UButton>
              <UButton type="submit" color="neutral" :loading="savingSettings">
                Save changes
              </UButton>
            </div>
          </UForm>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
