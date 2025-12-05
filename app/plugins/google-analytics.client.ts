import { ANALYTICS_CONSENT_COOKIE, GOOGLE_ANALYTICS_ID, type AnalyticsConsent } from '~/types/analytics'

type GtagFunction = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: GtagFunction
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const isProduction = process.env.NODE_ENV === 'production'
  const route = useRoute()
  const isOpenRoute = computed(() => route.path.startsWith('/open'))

  const consent = useCookie<AnalyticsConsent | null>(ANALYTICS_CONSENT_COOKIE, {
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 60 * 60 * 24 * 365,
    default: () => null
  })

  const initialized = useState('ga:initialized', () => false)
  let loader: Promise<void> | null = null

  const setGaDisabled = (disabled: boolean) => {
    (window as typeof window & Record<string, boolean>)[`ga-disable-${GOOGLE_ANALYTICS_ID}`] = disabled
  }

  const loadAnalytics = async () => {
    if (isOpenRoute.value) {
      setGaDisabled(true)
      return false
    }

    if (initialized.value) {
      return true
    }

    if (!loader) {
      loader = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.async = true
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load Google Analytics'))
        document.head.appendChild(script)
      })
    }

    try {
      await loader
    } catch (error) {
      console.error('[analytics] Could not load Google Analytics', error)
      loader = null
      return false
    }

    window.dataLayer = window.dataLayer || []

    if (!window.gtag) {
      window.gtag = (...args: Parameters<GtagFunction>) => {
        window.dataLayer?.push(args)
      }
    }

    window.gtag('js', new Date())
    window.gtag('config', GOOGLE_ANALYTICS_ID, { anonymize_ip: true })
    initialized.value = true

    return true
  }

  const updateConsent = async (value: AnalyticsConsent) => {
    consent.value = value

    if (isOpenRoute.value) {
      setGaDisabled(true)
      return
    }

    if (value === 'granted') {
      setGaDisabled(false)
      const loaded = await loadAnalytics()
      if (loaded) {
        window.gtag?.('consent', 'update', { analytics_storage: 'granted' })
      }
    } else {
      setGaDisabled(true)
      if (initialized.value) {
        window.gtag?.('consent', 'update', { analytics_storage: 'denied' })
      }
    }
  }

  watch(isOpenRoute, async (value) => {
    if (value) {
      setGaDisabled(true)
      return
    }

    if (consent.value === 'granted') {
      await updateConsent('granted')
    } else if (consent.value === 'denied') {
      setGaDisabled(true)
    }
  }, { immediate: true })

  nuxtApp.provide('analytics', {
    consent,
    updateConsent
  })
})
