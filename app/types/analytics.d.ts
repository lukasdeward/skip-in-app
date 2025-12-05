import type { Ref } from 'vue'
import type { NuxtApp } from '#app'
import type { AnalyticsConsent } from './analytics'

declare module '#app' {
  interface NuxtApp {
    $analytics: {
      consent: Ref<AnalyticsConsent | null>
      updateConsent: (value: AnalyticsConsent) => Promise<void>
    }
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $analytics: NuxtApp['$analytics']
  }
}
