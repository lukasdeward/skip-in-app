<script lang="ts" setup>
import type { BrowserDetection } from '~~/composables/useBrowserRedirect'
import { useBrowserRedirect } from '~~/composables/useBrowserRedirect'
import instagramInstructions from '~/assets/instructions/instagram.png'
import snapchatInstructions from '~/assets/instructions/snapchat.png'
import tiktokInstructions from '~/assets/instructions/tiktok.png'

definePageMeta({
  layout: 'open'
})

type OpenLinkResponse = {
  targetUrl: string
  logoUrl: string | null
  teamName: string | null
  backgroundColor: string | null
  textColor: string | null
  highlightColor: string | null
}

const showDiagnostics = useState('open-show-diagnostics', () => false)
const requestURL = import.meta.server ? useRequestURL() : null
const requestHref = computed(() => requestURL?.href || (import.meta.client ? window.location.href : ''))
const requestBody = computed(() => ({ url: requestHref.value }))

const defaultBackgroundColor = '#ffffff'
const defaultTextColor = '#000000'
const defaultHighlightColor = '#f97316'

const instructionImages = {
  tiktok: tiktokInstructions,
  instagram: instagramInstructions,
  snapchat: snapchatInstructions
} as const

type InstructionKey = keyof typeof instructionImages

const { detectInAppBrowser, redirectToSystemBrowser } = useBrowserRedirect()

const shouldShowWebViewWarning = ref(false)
const browserName = ref('Safari')
const detected = ref<BrowserDetection | null>(null)

const {
  data,
  pending,
  error,
  refresh
} = await useFetch<OpenLinkResponse>('/api/open/resolve', {
  method: 'POST',
  body: requestBody,
  server: true,
  lazy: false,
  immediate: true,
  key: () => `open-link-${requestHref.value}`
})

const ensureUtmSourceSkipsocial = (rawUrl?: string | null) => {
  const trimmed = rawUrl?.trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    url.searchParams.set('utm_source', 'skipsocial')
    return url.toString()
  } catch {
    const hasParam = /[?&]utm_source=/i.test(trimmed)
    const cleaned = hasParam ? trimmed.replace(/([?&]utm_source=)[^&#]*/i, '$1skipsocial') : trimmed
    if (hasParam) return cleaned
    const separator = cleaned.includes('?') ? '&' : '?'
    return `${cleaned}${separator}utm_source=skipsocial`
  }
}

const redirectTargetUrl = computed(() => ensureUtmSourceSkipsocial(data.value?.targetUrl))

const isLocalhost = computed(() => {
  if (!import.meta.client) return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
})

const attemptRedirect = async (force = false) => {
  // Never auto-redirect when debugging locally to keep the interstitial visible.
  if (!force && isLocalhost.value) return
  if (!redirectTargetUrl.value) return

  if (detected.value?.isWebView) {
    redirectToSystemBrowser(redirectTargetUrl.value, detected.value)
    return
  }

  await navigateTo(redirectTargetUrl.value, { external: true, replace: true })
}

onMounted(() => {
  const info = detectInAppBrowser()
  detected.value = info
  showDiagnostics.value = false

  if (info.isWebView) {
    browserName.value = info.isIOS ? 'Safari' : 'Chrome'
    shouldShowWebViewWarning.value = true

    if (!isLocalhost.value && redirectTargetUrl.value) {
      redirectToSystemBrowser(redirectTargetUrl.value, info)
    }
  } else {
    attemptRedirect()
  }
})

watch(
  requestHref,
  async (value, oldValue) => {
    if (!value || value === oldValue) return
    await refresh()
    await attemptRedirect()
  }
)

const retry = async () => {
  await refresh()
  await attemptRedirect()
}

const status = computed<'loading' | 'redirecting' | 'warning' | 'error'>(() => {
  if (error.value) return 'error'
  if (shouldShowWebViewWarning.value) return 'warning'
  if (pending.value) return 'loading'
  return 'redirecting'
})

const message = computed(() => {
  if (status.value === 'loading') return 'Looking up your Skip link...'
  if (status.value === 'redirecting') return 'Redirecting you to your destination...'
  const rawError = error.value

  if (rawError && typeof rawError === 'object') {
    const structured = rawError as { data?: { message?: unknown, statusCode?: number }, message?: unknown, statusCode?: number }
    const statusCode = structured.statusCode ?? structured.data?.statusCode
    if (statusCode === 404) {
      return 'We could not find a link for this team.'
    }

    const dataMessage = structured.data?.message
    if (typeof dataMessage === 'string') return dataMessage

    if (typeof structured.message === 'string') return structured.message
  }

  return 'Unable to resolve this link.'
})

const backgroundColor = computed(() => data.value?.backgroundColor?.trim() || defaultBackgroundColor)
const textColor = computed(() => data.value?.textColor?.trim() || defaultTextColor)
const highlightColor = computed(() => data.value?.highlightColor?.trim() || defaultHighlightColor)

const themeStyles = computed(() => ({
  backgroundColor: backgroundColor.value,
  color: textColor.value
}))

useHead(() => ({
  bodyAttrs: {
    style: `background-color:${themeStyles.value.backgroundColor};color:${themeStyles.value.color};`
  }
}))

const toggleDiagnostics = () => {
  showDiagnostics.value = !showDiagnostics.value
}

const primaryPlatform = computed(() => {
  if (!detected.value) return 'Unknown'

  const flags = [
    { label: 'TikTok', active: detected.value.isTikTok },
    { label: 'Instagram', active: detected.value.isInstagram },
    { label: 'Facebook', active: detected.value.isFacebook },
    { label: 'Messenger', active: detected.value.isMessenger },
    { label: 'Twitter / X', active: detected.value.isTwitter },
    { label: 'WeChat', active: detected.value.isWeChat },
    { label: 'Line', active: detected.value.isLine },
    { label: 'Snapchat', active: detected.value.isSnapchat }
  ].filter(item => item.active).map(item => item.label)

  return flags.length > 0 ? flags.join(', ') : 'Unknown'
})

const instructionImage = computed(() => {
  if (!detected.value || !shouldShowWebViewWarning.value) return null

  const options = [
    { active: detected.value.isTikTok, key: 'tiktok' },
    { active: detected.value.isInstagram, key: 'instagram' },
    { active: detected.value.isSnapchat, key: 'snapchat' }
  ] as Array<{ active: boolean, key: InstructionKey }>

  const match = options.find(option => option.active)
  return match ? instructionImages[match.key] : null
})

const detectedLabels = computed(() => {
  if (!detected.value) return []

  return [
    { label: 'WebView detected', value: detected.value.isWebView ? 'Yes' : 'No' },
    { label: 'Platform', value: detected.value.isIOS ? 'iOS' : detected.value.isAndroid ? 'Android' : 'Other' },
    { label: 'Browser', value: detected.value.isSafari ? 'Safari' : browserName.value },
    { label: 'In-app source', value: primaryPlatform.value },
    { label: 'User agent', value: detected.value.userAgent },
    { label: 'UA brands', value: detected.value.brands.join(', ') || 'None' }
  ]
})


const logoUrl = computed(() => data.value?.logoUrl)
const teamName = computed(() => data.value?.teamName)

useSeoMeta({
  title: redirectTargetUrl.value || data.value?.targetUrl || 'Redirecting...'
})
</script>

<template>
  <div
    class="min-h-screen flex flex-col justify-between"
    :style="themeStyles"
  >
    <div
      class="max-w-5xl mx-auto w-full px-4 pt-6 space-y-6"
      :style="{ color: textColor }"
    >

      <InAppBrowserInstructions
        class="mt-2"
        :browser-name="browserName"
        :logo-url="logoUrl || undefined"
        :team-name="teamName || undefined"
        :text-color="textColor"
        :background-color="backgroundColor"
        :highlight-color="highlightColor"
        :platform="primaryPlatform"
        :instruction-image="instructionImage || undefined"
        :error="status === 'error' ? message : undefined"
      />

      <div class="max-w-3xl py-10">
        <div
          v-if="showDiagnostics && detectedLabels.length > 0"
          class="mt-6 space-y-2 text-sm"
          :style="{ color: textColor }"
        >
          <p class="font-semibold">
            WebView diagnostics
          </p>
          <div class="grid grid-cols-1 gap-2">
            <div
              v-for="item in detectedLabels"
              :key="item.label"
              class="flex flex-col sm:flex-row sm:items-start sm:gap-2 border border-dashed rounded-lg p-3"
              :style="{ borderColor: textColor }"
            >
              <span class="w-32 shrink-0 opacity-80">{{ item.label }}</span>
              <span class="break-all">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex justify-center py-6">
      <button
        type="button"
        class="group inline-flex items-center justify-center p-2 transition focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:hover:bg-gray-900"
        aria-label="Toggle diagnostics"
        @click="toggleDiagnostics"
      >
        <AppLogo
          height="h-8"
          class="w-auto transition group-hover:opacity-80"
          :background-color="backgroundColor"
        />
      </button>
    </div>
  </div>
</template>
