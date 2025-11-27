<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const props = withDefaults(defineProps<{
  redirectOnSuccess?: boolean
}>(), {
  redirectOnSuccess: true
})

const emit = defineEmits<{
  (e: 'success'): void
}>()

const toast = useToast()
const supabase = useSupabaseClient()
const router = useRouter()
const loading = ref(false)

const fields = [{
  name: 'name',
  type: 'text' as const,
  label: 'Name',
  placeholder: 'Enter your name'
}, {
  name: 'email',
  type: 'text' as const,
  label: 'Email',
  placeholder: 'Enter your email'
}, {
  name: 'password',
  label: 'Password',
  type: 'password' as const,
  placeholder: 'Enter your password'
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
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Must be at least 8 characters')
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true
  const { error } = await supabase.auth.signUp({
    email: payload.data.email,
    password: payload.data.password,
    options: {
      data: { name: payload.data.name }
    }
  })

  if (error) {
    toast.add({ title: 'Signup failed', description: error.message, color: 'error' })
    loading.value = false
    return
  }

  toast.add({ title: 'Check your email', description: 'We sent a confirmation link to finish signup.' })
  emit('success')

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
    <template #description>
      Already have an account? <ULink
        to="/login"
        class="text-primary font-medium"
      >Login</ULink>.
    </template>

    <template #footer>
      By signing up, you agree to our <ULink
        to="/"
        class="text-primary font-medium"
      >Terms of Service</ULink>.
    </template>
  </UAuthForm>
</template>
