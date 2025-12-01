<script setup lang="ts">
import { useAuthRedirect } from '~~/composables/useAuthRedirect'

definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Confirming login...'
})

type OtpType = 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email_change'

const supabase = useSupabaseClient()
const route = useRoute()
const { redirectPath } = useAuthRedirect()

const status = ref<'verifying' | 'success' | 'error'>('verifying')
const errorMessage = ref('')
const redirectTarget = redirectPath

const verify = async () => {
  if (!import.meta.client) return

  const tokenHash = route.query.token_hash as string | undefined
  const type = route.query.type as OtpType | undefined

  if (!tokenHash || !type) {
    status.value = 'error'
    errorMessage.value = 'Missing token information. Please request a new magic link.'
    return
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type
  })

  if (error) {
    status.value = 'error'
    errorMessage.value = error.message || 'Verification failed. Please request a new magic link.'
    return
  }

  status.value = 'success'
  await navigateTo(redirectTarget.value, { replace: true })
}

onMounted(() => {
  verify()
})
</script>

<template>
  <div class="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center">
    <div v-if="status === 'verifying'" class="flex flex-col items-center gap-2">
      <UIcon name="i-lucide-loader-2" class="animate-spin h-6 w-6" />
      <p class="text-sm text-muted">Confirming your login, please wait...</p>
      <UButton to="/login" color="neutral" variant="ghost">
        Cancel
      </UButton>
    </div>

    <div v-else-if="status === 'error'" class="space-y-3 max-w-md">
      <p class="text-lg font-semibold">We couldn’t confirm your login</p>
      <p class="text-sm text-muted">
        {{ errorMessage }}
      </p>
      <div class="flex justify-center gap-2">
        <UButton to="/login" color="neutral">
          Back to login
        </UButton>
      </div>
    </div>

    <div v-else-if="status === 'success'" class="space-y-2">
      <p class="text-lg font-semibold">Login confirmed</p>
      <p class="text-sm text-muted">
        Redirecting you to your dashboard...
      </p>
    </div>
  </div>
</template>
