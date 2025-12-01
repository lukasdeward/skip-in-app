<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useAuthRedirect } from '~~/composables/useAuthRedirect'

definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Login',
  description: 'Login to your account to continue'
})

const toast = useToast()
const supabase = useSupabaseClient()
const loading = ref(false)
const { redirectUrl } = useAuthRedirect()

const fields = [{
  name: 'email',
  type: 'text' as const,
  label: 'Email',
  placeholder: 'Enter your email',
  required: true
}]

const providers = [{
  label: 'Google',
  icon: 'i-simple-icons-google',
  onClick: () => signInWithProvider('google')
}]

const schema = z.object({
  email: z.string().email('Invalid email')
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true
  const { error } = await supabase.auth.signInWithOtp({
    email: payload.data.email,
    options: {
      emailRedirectTo: redirectUrl.value
    }
  })

  if (error) {
    toast.add({ title: 'Login failed', description: error.message, color: 'error' })
    loading.value = false
    return
  }

  toast.add({ title: 'Magic link sent', description: 'Check your email to finish signing in.' })
  loading.value = false
}

async function signInWithProvider(provider: 'google' | 'github') {
  if (!import.meta.client) return
  loading.value = true
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl.value
    }
  })

  if (error) {
    toast.add({ title: 'Login failed', description: error.message, color: 'error' })
    loading.value = false
  }
}
</script>

<template>
  <UAuthForm
    :fields="fields"
    :schema="schema"
    :providers="providers"
    title="Welcome back"
    icon="i-lucide-lock"
    :submit="{ label: 'Send magic link', loading }"
    @submit="onSubmit"
  >
    <template #description>
      Don't have an account? <ULink
        to="/signup"
        class="text-primary font-medium"
      >Sign up</ULink>.
    </template>

    <template #footer>
      By signing in, you agree to our <ULink
        to="/terms-of-service"
        class="text-primary font-medium"
      >Terms of Service</ULink>.
    </template>
  </UAuthForm>
</template>
