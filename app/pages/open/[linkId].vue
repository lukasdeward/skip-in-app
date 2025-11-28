<script lang="ts" setup>
definePageMeta({
  layout: 'open'
})

const route = useRoute()
const toast = useToast()
const { copy } = useClipboard()
const linkId = computed(() => route.params.linkId as string)

const shouldShowWebViewWarning = ref(false)
const browserName = ref('Safari')
const detected = ref<null | {
  isWebView: boolean
  isIOS: boolean
  isAndroid: boolean
  isSafari: boolean
  isTikTok: boolean
  isInstagram: boolean
  isFacebook: boolean
  isMessenger: boolean
  isTwitter: boolean
  isWeChat: boolean
  isLine: boolean
  isSnapchat: boolean
  userAgent: string
  brands: string[]
}>(null)

const detectWebView = () => {
  const userAgent = window.navigator.userAgent || window.navigator.vendor || ''
  const brands = (window.navigator.userAgentData?.brands || []).map(({ brand }) => brand)
  const isIOS = /iphone|ipod|ipad/i.test(userAgent)
  const isAndroid = /android/i.test(userAgent)
  const standalone = 'standalone' in window.navigator && window.navigator.standalone
  const isSafari = /safari/i.test(userAgent) && !/crios|fxios|edgios/i.test(userAgent)

  const isTikTok = /(tiktok|ttwebview|bytedancewebview|aweme|musical_ly)/i.test(userAgent)
    || brands.some(brand => /tiktok|bytedance/i.test(brand))
    || /tiktok\.com/i.test(document.referrer || '')

  const isInstagram = /Instagram/i.test(userAgent)
  const isFacebook = /FBAN|FBAV|Facebook/i.test(userAgent)
  const isMessenger = /FB_IAB|Messenger/i.test(userAgent)
  const isTwitter = /Twitter|XiaoMiBrowser|X\/[\d.]+/i.test(userAgent) || /X\s?app/i.test(userAgent)
  const isWeChat = /MicroMessenger|WeChat/i.test(userAgent)
  const isLine = /Line/i.test(userAgent)
  const isSnapchat = /Snapchat/i.test(userAgent)

  const androidWebView = isAndroid
    && (/\bwv\b/i.test(userAgent)
      || (/version\/\d+\.\d+/i.test(userAgent) && !/chrome|samsungbrowser|firefox/i.test(userAgent))
      || isTikTok)

  const iosWebView = isIOS && !standalone && (
    !isSafari
    || isTikTok
    || isInstagram
    || isFacebook
    || isMessenger
    || isTwitter
    || isWeChat
    || isLine
    || isSnapchat
  )

  const inAppBrowser = isInstagram
    || isFacebook
    || isMessenger
    || isWeChat
    || isLine
    || isSnapchat
    || isTwitter
    || isTikTok

  const isWebView = isTikTok || androidWebView || iosWebView || inAppBrowser

  return {
    isWebView,
    isIOS,
    isAndroid,
    isSafari,
    isTikTok,
    isInstagram,
    isFacebook,
    isMessenger,
    isTwitter,
    isWeChat,
    isLine,
    isSnapchat,
    userAgent,
    brands
  }
}

const {
  data,
  pending,
  error,
  refresh
} = await useFetch<{ targetUrl: string }>(() => `/api/open/${linkId.value}`, {
  server: true,
  immediate: true,
  key: () => `open-link-${linkId.value}`
})

const attemptRedirect = async (force = false) => {
  if (!force && shouldShowWebViewWarning.value) return
  if (data.value?.targetUrl) {
    await navigateTo(data.value.targetUrl, { external: true, replace: true })
  }
}

onMounted(() => {
  const info = detectWebView()
  detected.value = info

  if (info.isWebView) {
    browserName.value = info.isIOS ? 'Safari' : 'Chrome'
    shouldShowWebViewWarning.value = true
  } else {
    attemptRedirect()
  }
})

watch(linkId, async () => {
  await refresh()
  await attemptRedirect()
})

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
  if (status.value === 'warning') return `In-app browser detected. Open in ${browserName.value} to continue.`
  const rawError = error.value

  if (rawError && typeof rawError === 'object') {
    const structured = rawError as { data?: { message?: unknown }, message?: unknown }
    const dataMessage = structured.data?.message
    if (typeof dataMessage === 'string') return dataMessage

    if (typeof structured.message === 'string') return structured.message
  }

  return 'Unable to resolve this link.'
})

const targetUrl = computed(() => data.value?.targetUrl ?? null)

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

const copyState = ref<'idle' | 'copied'>('idle')
const copying = ref(false)
let copyResetTimer: ReturnType<typeof setTimeout> | null = null

const copyButtonLabel = computed(() => copyState.value === 'copied' ? 'Link copied' : 'Copy link')

const copyLink = async () => {
  if (!import.meta.client || !targetUrl.value) return
  copying.value = true

  try {
    await copy(targetUrl.value)
    copyState.value = 'copied'

    if (copyResetTimer) {
      clearTimeout(copyResetTimer)
    }

    copyResetTimer = setTimeout(() => {
      copyState.value = 'idle'
      copyResetTimer = null
    }, 1800)
  } catch (err: unknown) {
    const description = err instanceof Error ? err.message : 'Please try again.'
    toast.add({ title: 'Copy failed', description, color: 'error' })
  } finally {
    copying.value = false
  }
}

useSeoMeta({
  title: data.value?.targetUrl ?? 'Redirecting...'
})
</script>

<template>
  <div class="max-w-3xl mx-auto py-16 px-4">
    <UCard class="border border-dashed">
      <div class="flex items-center gap-3">
        <UIcon
          v-if="status === 'loading'"
          name="i-lucide-loader-2"
          class="animate-spin h-6 w-6 text-muted"
        />
        <UIcon
          v-else-if="status === 'redirecting'"
          name="i-lucide-arrow-up-right"
          class="h-6 w-6 text-muted"
        />
        <UIcon
          v-else-if="status === 'warning'"
          name="i-lucide-alert-triangle"
          class="h-6 w-6 text-amber-500"
        />
        <UIcon
          v-else
          name="i-lucide-alert-circle"
          class="h-6 w-6 text-error"
        />
        <div>
          <p class="font-semibold">
            Skip link
          </p>
          <p class="text-muted text-sm">
            {{ message }}
          </p>
        </div>
      </div>

      <p
        v-if="status === 'warning'"
        class="mt-3 text-sm text-muted"
      >
        In-app browsers sometimes block redirects. Copy the link or open it in {{ browserName }} to continue.
      </p>

      <InAppBrowserInstructions
        v-if="status === 'warning'"
        class="mt-4"
        :browser-name="browserName"
      />

      <div class="mt-6 flex flex-wrap gap-2 items-center">
        <UButton
          v-if="status === 'warning' && targetUrl"
          color="neutral"
          variant="outline"
          icon="i-lucide-copy"
          :label="copyButtonLabel"
          :loading="copying"
          @click="copyLink"
        />
        <UButton
          v-if="targetUrl"
          :to="targetUrl"
          target="_blank"
          rel="noreferrer"
          color="neutral"
          icon="i-lucide-external-link"
          label="Open manually"
        />
        <template v-if="status === 'warning'">
          <UButton
            color="warning"
            variant="subtle"
            icon="i-lucide-info"
            :label="`Open in ${browserName}`"
            :to="targetUrl || undefined"
            target="_blank"
            rel="noreferrer"
          />
        </template>
        <UButton
          v-if="status === 'error'"
          color="neutral"
          variant="outline"
          icon="i-lucide-rotate-ccw"
          label="Try again"
          @click="retry"
        />
        <UButton
          color="neutral"
          variant="ghost"
          to="/"
          label="Back home"
        />
      </div>

      <div
        v-if="detectedLabels.length > 0"
        class="mt-6 space-y-2 text-sm"
      >
        <p class="font-semibold">
          WebView diagnostics
        </p>
        <div class="grid grid-cols-1 gap-2">
          <div
            v-for="item in detectedLabels"
            :key="item.label"
            class="flex flex-col sm:flex-row sm:items-start sm:gap-2 border border-dashed rounded-lg p-3"
          >
            <span class="text-muted w-32 shrink-0">{{ item.label }}</span>
            <span class="break-all">{{ item.value }}</span>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
