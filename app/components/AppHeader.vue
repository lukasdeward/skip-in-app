<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const items = computed(() => {
  if (user.value) {
    return []
  }

  return [{
    label: 'Home',
    to: '/',
    active: route.path === '/'
  }, {
    label: 'About Skip',
    to: '/about',
    active: route.path.startsWith('/about')
  }, {
    label: 'Blog',
    to: '/blog',
    active: route.path.startsWith('/blog')
  }, {
    label: 'Pricing',
    to: '/pricing',
    active: route.path.startsWith('/pricing')
  }]
})

const loggingOut = ref(false)

const logout = async () => {
  loggingOut.value = true
  await supabase.auth.signOut()
  loggingOut.value = false
  router.push('/')
}
</script>

<template>
  <UHeader>
    <template #left>
      <NuxtLink to="/">
        <AppLogo class="shrink-0" />
      </NuxtLink>
    </template>

    <UNavigationMenu
      :items="items"
      variant="link"
    />

    <template #right>
      <UColorModeButton />

      <template v-if="user">
        <UButton
          label="Log out"
          color="neutral"
          variant="solid"
          :loading="loggingOut"
          @click="logout"
          class="hidden lg:inline-flex"
        />
        <UButton
          icon="i-lucide-log-out"
          color="neutral"
          variant="ghost"
          :loading="loggingOut"
          class="lg:hidden"
          @click="logout"
        />
      </template>
      <template v-else>
        <UButton
          icon="i-lucide-log-in"
          color="neutral"
          variant="ghost"
          to="/login"
          class="lg:hidden"
        />

        <UButton
          label="Sign in"
          color="neutral"
          variant="outline"
          to="/login"
          class="hidden lg:inline-flex"
        />

        <UButton
          label="Sign up"
          color="neutral"
          trailing-icon="i-lucide-arrow-right"
          class="hidden lg:inline-flex"
          to="/signup"
        />
      </template>
    </template>

    <template #body>
      <template v-if="!user">
        <UNavigationMenu
          :items="items"
          orientation="vertical"
          class="-mx-2.5"
        />

        <USeparator class="my-6" />

        <UButton
          label="Sign in"
          color="neutral"
          variant="subtle"
          to="/login"
          block
          class="mb-3"
        />
        <UButton
          label="Sign up"
          color="neutral"
          to="/signup"
          block
        />
      </template>
      <template v-else>
        <UButton
          label="Log out"
          color="neutral"
          variant="solid"
          block
          :loading="loggingOut"
          @click="logout"
        />
      </template>
    </template>
  </UHeader>
</template>
