<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Login',
  description: 'Login to your account to continue'
})

const toast = useToast()
const supabase = useSupabaseClient()
const router = useRouter()
const loading = ref(false)
const requestURL = useRequestURL()
const redirectTo = computed(() => process.client ? `${window.location.origin}/dashboard` : `${requestURL.origin}/dashboard`)

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
}, {
  label: 'GitHub',
  icon: 'i-simple-icons-github',
  onClick: () => signInWithProvider('github')
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
      emailRedirectTo: redirectTo.value
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
  if (!process.client) return
  loading.value = true
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectTo.value
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
        to="/"
        class="text-primary font-medium"
      >Terms of Service</ULink>.
    </template>
  </UAuthForm>
</template>
