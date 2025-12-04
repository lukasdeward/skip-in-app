<script lang="ts" setup>
import type { BrowserDetection } from '~~/composables/useBrowserRedirect'
import { useBrowserRedirect } from '~~/composables/useBrowserRedirect'

const instructionImages = {
  tiktok: '/instructions/tiktok.png',
  instagram: '/instructions/instagram.png',
  snapchat: '/instructions/snapchat.png'
} as const

definePageMeta({
  layout: 'open'
})

type TeamTheme = {
  logoUrl: string | null
  teamName: string | null
  teamSlug: string | null
  backgroundColor: string | null
  textColor: string | null
  highlightColor: string | null
}

type OpenLinkEntry = {
  id: string
  shortId: number | null
  title: string | null
  targetUrl: string
}

type OpenLinkResponse = TeamTheme & (
  | {
    type: 'single'
    link: OpenLinkEntry
  }
  | {
    type: 'list'
    links: OpenLinkEntry[]
  }
)

const showDiagnostics = useState('open-show-diagnostics', () => false)
const requestURL = import.meta.server ? useRequestURL() : null
const requestHref = computed(() => requestURL?.href || (import.meta.client ? window.location.href : ''))
const requestBody = computed(() => ({ url: requestHref.value }))

const defaultBackgroundColor = '#ffffff'
const defaultTextColor = '#000000'
const defaultHighlightColor = '#f97316'

type InstructionKey = keyof typeof instructionImages

const { detectInAppBrowser, redirectToSystemBrowser } = useBrowserRedirect()

const shouldShowWebViewWarning = ref(false)
const browserName = ref('Safari')
const detected = ref<BrowserDetection | null>(null)
const activeRedirectTarget = ref('')

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

const singleLink = computed(() => data.value?.type === 'single' ? data.value.link : null)
const isListView = computed(() => data.value?.type === 'list')
const listLinks = computed(() => data.value?.type === 'list' ? data.value.links : [])
const redirectTargetUrl = computed(() => ensureUtmSourceSkipsocial(singleLink.value?.targetUrl))

const listLinksWithHref = computed(() => listLinks.value.map(link => ({
  ...link,
  href: ensureUtmSourceSkipsocial(link.targetUrl)
})))

const isLocalhost = computed(() => {
  if (!import.meta.client) return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
})

const resetRedirectState = () => {
  activeRedirectTarget.value = ''
}

const resolveDetection = () => {
  const info = detectInAppBrowser()
  detected.value = info
  browserName.value = info.isIOS ? 'Safari' : 'Chrome'
  shouldShowWebViewWarning.value = info.isWebView
  return info
}

const startRedirectFlow = async (
  targetUrl?: string | null,
  options: { allowLocalhost?: boolean } = {}
) => {
  const url = ensureUtmSourceSkipsocial(targetUrl)
  if (!url) return

  activeRedirectTarget.value = url

  const info = resolveDetection()
  if (isLocalhost.value && !options.allowLocalhost) return
  if (!import.meta.client) return

  if (info.isWebView) {
    redirectToSystemBrowser(url, info)
    return
  }

  await navigateTo(url, { external: true, replace: true })
}

const maybeAutoRedirect = async () => {
  if (isListView.value) {
    resetRedirectState()
    return
  }

  if (!redirectTargetUrl.value) {
    resetRedirectState()
    return
  }

  await startRedirectFlow(redirectTargetUrl.value)
}

onMounted(() => {
  resolveDetection()
  maybeAutoRedirect()
})

watch(
  requestHref,
  async (value, oldValue) => {
    if (!value || value === oldValue) return
    await refresh()
    resolveDetection()
    await maybeAutoRedirect()
  }
)

const handleListSelect = async (payload: { link: OpenLinkEntry, href: string }) => {
  const target = ensureUtmSourceSkipsocial(payload.href || payload.link.targetUrl)
  if (!target) return

  await startRedirectFlow(target, { allowLocalhost: true })
}

watch(listLinks, () => {
  if (isListView.value) {
    resetRedirectState()
  }
})

const showInAppRedirect = computed(() => shouldShowWebViewWarning.value && !!activeRedirectTarget.value)

const status = computed<'loading' | 'redirecting' | 'warning' | 'error' | 'list'>(() => {
  if (error.value) return 'error'
  if (pending.value) return 'loading'
  if (showInAppRedirect.value) return 'warning'
  if (isListView.value) return 'list'
  return 'redirecting'
})

const message = computed(() => {
  if (status.value === 'loading') return 'Looking up your Skip link...'
  if (status.value === 'redirecting') return 'Redirecting you to your destination...'
  if (status.value === 'warning') return 'Open this page in your system browser to continue.'
  if (status.value === 'list') return ''
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
  if (!detected.value || !showInAppRedirect.value) return null

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

const pageTitle = computed(() => {
  if (isListView.value) {
    if (teamName.value) {
      return `${teamName.value} links`
    }
    return 'Skip links'
  }

  return redirectTargetUrl.value || singleLink.value?.targetUrl || 'Redirecting...'
})

useSeoMeta({
  title: pageTitle.value
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
      <div class="space-y-8">
        <div
          v-if="status === 'error'"
          class="rounded-xl border border-red-300/60 bg-red-50/70 px-4 py-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-100"
        >
          {{ message }}
        </div>


          <InAppBrowserInstructions
            v-else-if="status === 'warning'"
            class="mt-2"
            :browser-name="browserName"
            :logo-url="logoUrl || undefined"
            :team-name="teamName || undefined"
            :text-color="textColor"
            :background-color="backgroundColor"
            :highlight-color="highlightColor"
            :platform="primaryPlatform"
            :instruction-image="instructionImage || undefined"
          />

        <OpenLinkList
          v-else-if="status === 'list'"
          :links="listLinksWithHref"
          :logo-url="logoUrl || undefined"
          :team-name="teamName || undefined"
          :text-color="textColor"
          :highlight-color="highlightColor"
          :format-target-url="ensureUtmSourceSkipsocial"
          @select="handleListSelect"
        />

        <div
          v-else
          class="flex items-center gap-2 text-sm opacity-80"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="h-5 w-5 animate-spin"
          />
          {{ message }}
        </div>
      </div>
    </div>

    <div class="max-w-3xl py-6">
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
