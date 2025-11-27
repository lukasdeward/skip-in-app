<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const props = withDefaults(defineProps<{
  redirectOnSuccess?: boolean
}>(), {
  redirectOnSuccess: true
})

const emit = defineEmits<{
  (e: 'success', email: string): void
}>()

const toast = useToast()
const supabase = useSupabaseClient()
const router = useRouter()
const loading = ref(false)
const requestURL = useRequestURL()
const redirectTo = computed(() => process.client ? `${window.location.origin}/dashboard` : `${requestURL.origin}/dashboard`)
const linkSent = ref(false)
const lastEmail = ref('')

const fields = [{
  name: 'email',
  type: 'text' as const,
  label: 'Email',
  placeholder: 'Enter your email'
}]

const providers = [{
  label: 'Google',
  icon: 'i-simple-icons-google',
  onClick: () => signUpWithProvider('google')
}, {
  label: 'GitHub',
  icon: 'i-simple-icons-github',
  onClick: () => signUpWithProvider('github')
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
    toast.add({ title: 'Signup failed', description: error.message, color: 'error' })
    loading.value = false
    return
  }

  lastEmail.value = payload.data.email
  linkSent.value = true

  toast.add({ title: 'Magic link sent', description: 'Check your email to finish signing up.' })
  emit('success', payload.data.email)

  if (props.redirectOnSuccess) {
    await router.push('/login')
  }

  loading.value = false
}

async function signUpWithProvider(provider: 'google' | 'github') {
  if (!process.client) return
  loading.value = true
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin
    }
  })

  if (error) {
    toast.add({ title: 'Signup failed', description: error.message, color: 'error' })
    loading.value = false
  }
}
</script>

<template>
  <UAuthForm
    :fields="fields"
    :schema="schema"
    :providers="providers"
    title="Create an account"
    :submit="{ label: 'Create account', loading }"
    @submit="onSubmit"
  >
    <UAlert
      v-if="linkSent"
      color="success"
      variant="subtle"
      icon="i-lucide-mail"
      title="Magic link sent"
      :description="`Open your inbox${lastEmail ? ` (${lastEmail})` : ''} and click the link to continue.`"
      class="mb-4"
    />

    <template #description>
      Already have an account? <ULink
        to="/login"
        class="text-primary font-medium"
      >Login</ULink>.
    </template>

    <template #footer>
      By signing up, you agree to our <ULink
        to="/terms-of-service"
        class="text-primary font-medium"
      >Terms of Service</ULink>.
    </template>
  </UAuthForm>
</template>
