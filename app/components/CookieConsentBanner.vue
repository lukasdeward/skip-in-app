<script setup lang="ts">
import { ANALYTICS_CONSENT_COOKIE, type AnalyticsConsent } from '~/types/analytics'

const isProduction = process.env.NODE_ENV === 'production'
const consent = useCookie<AnalyticsConsent | null>(ANALYTICS_CONSENT_COOKIE, {
  sameSite: 'lax',
  secure: isProduction,
  maxAge: 60 * 60 * 24 * 365,
  default: () => null
})

const pending = ref<'granted' | 'denied' | null>(null)
const { $analytics } = useNuxtApp()
const route = useRoute()
const isOpenRoute = computed(() => route.path.startsWith('/open'))

const showBanner = computed(() => consent.value === null && !isOpenRoute.value)

const updateConsent = async (value: AnalyticsConsent) => {
  if (pending.value) {
    return
  }

  pending.value = value

  try {
    await $analytics.updateConsent(value)
  } finally {
    pending.value = null
  }
}
</script>

<template>
  <div
    v-if="showBanner"
    class="fixed inset-x-4 bottom-4 z-50"
  >
    <UCard
      class="max-w-3xl mx-auto shadow-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-gray-900/90 backdrop-blur"
      :ui="{ footer: 'pt-0' }"
    >
      <div class="flex flex-col gap-4 md:flex-row md:items-center">
        <div class="flex-1 space-y-1">
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-50">
            Cookies and analytics
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            We use Google Analytics to learn how Skip is used. Accept to help us improve, or decline to disable analytics cookies.
          </p>
        </div>

        <div class="flex flex-wrap gap-2 md:justify-end">
          <UButton
            color="neutral"
            variant="ghost"
            label="Decline"
            :loading="pending === 'denied'"
            :disabled="pending === 'granted'"
            @click="updateConsent('denied')"
          />

          <UButton
            color="primary"
            label="Accept"
            :loading="pending === 'granted'"
            :disabled="pending === 'denied'"
            @click="updateConsent('granted')"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <UIcon name="i-lucide-shield-check" />
          <NuxtLink
            to="/data-protection"
            class="hover:underline font-medium"
          >
            Learn how we handle data
          </NuxtLink>
        </div>
      </template>
    </UCard>
  </div>
</template>
