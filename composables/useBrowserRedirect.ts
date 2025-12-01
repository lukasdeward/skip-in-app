export type BrowserDetection = {
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
  iosMajorVersion: number | null
  iosSupportsSafariScheme: boolean
}

type RedirectBuildResult = {
  url: string
  strategy: 'safari-scheme' | 'chrome-scheme' | 'android-intent' | 'direct'
}

const baseDetection: BrowserDetection = {
  isWebView: false,
  isIOS: false,
  isAndroid: false,
  isSafari: false,
  isTikTok: false,
  isInstagram: false,
  isFacebook: false,
  isMessenger: false,
  isTwitter: false,
  isWeChat: false,
  isLine: false,
  isSnapchat: false,
  userAgent: '',
  brands: [],
  iosMajorVersion: null,
  iosSupportsSafariScheme: false
}

export const useBrowserRedirect = () => {
  const detectInAppBrowser = (): BrowserDetection => {
    if (!import.meta.client) return { ...baseDetection }

    const userAgent = window.navigator.userAgent || window.navigator.vendor || ''
    const navigatorWithUAData = window.navigator as Navigator & { userAgentData?: { brands?: Array<{ brand: string }> } }
    const brands = (navigatorWithUAData.userAgentData?.brands || []).map(({ brand }) => brand)
    const isIOS = /iphone|ipod|ipad/i.test(userAgent)
    const isAndroid = /android/i.test(userAgent)
    const standalone = 'standalone' in window.navigator && window.navigator.standalone
    const isSafari = /safari/i.test(userAgent) && !/crios|fxios|edgios/i.test(userAgent)

    const isTikTok = /(tiktok|ttwebview|bytedancewebview|aweme|musical_ly)/i.test(userAgent)
      || brands.some((brand: string) => /tiktok|bytedance/i.test(brand))
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
    const iosMatch = userAgent.match(/OS\s(\d+)_/i)
    const parsedIOSVersion = iosMatch ? Number.parseInt(iosMatch[1] || '', 10) : null
    const iosMajorVersion = Number.isFinite(parsedIOSVersion) ? parsedIOSVersion : null
    const iosSupportsSafariScheme = typeof iosMajorVersion === 'number' && Number.isInteger(iosMajorVersion) && iosMajorVersion >= 17

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
      brands,
      iosMajorVersion,
      iosSupportsSafariScheme
    }
  }

  const buildSystemBrowserUrl = (targetUrl: string, context?: BrowserDetection): RedirectBuildResult => {
    const trimmed = targetUrl?.trim()
    if (!trimmed) {
      return { url: '', strategy: 'direct' }
    }

    const detection = context ?? detectInAppBrowser()
    const isHttp = /^https?:\/\//i.test(trimmed)

    if (detection.isIOS && isHttp) {
      if (detection.iosSupportsSafariScheme) {
        const safariPrefix = trimmed.startsWith('https://') ? 'x-safari-https://' : 'x-safari-http://'
        return {
          url: trimmed.replace(/^https?:\/\//i, safariPrefix),
          strategy: 'safari-scheme'
        }
      }

      const chromeScheme = trimmed.startsWith('https://') ? 'googlechromes://' : 'googlechrome://'
      return {
        url: trimmed.replace(/^https?:\/\//i, chromeScheme),
        strategy: 'chrome-scheme'
      }
    }

    if (detection.isAndroid && isHttp) {
      const scheme = trimmed.startsWith('http://') ? 'http' : 'https'
      const withoutScheme = trimmed.replace(/^https?:\/\//i, '')
      const fallback = encodeURIComponent(trimmed)
      return {
        url: `intent://${withoutScheme}#Intent;scheme=${scheme};S.browser_fallback_url=${fallback};end`,
        strategy: 'android-intent'
      }
    }

    return { url: trimmed, strategy: 'direct' }
  }

  const redirectToSystemBrowser = (targetUrl: string, context?: BrowserDetection) => {
    if (!import.meta.client) {
      return { attempted: false, ...buildSystemBrowserUrl(targetUrl, context) }
    }

    const { url, strategy } = buildSystemBrowserUrl(targetUrl, context)
    if (!url) {
      return { attempted: false, url, strategy }
    }

    window.location.href = url
    return { attempted: true, url, strategy }
  }

  return {
    detectInAppBrowser,
    buildSystemBrowserUrl,
    redirectToSystemBrowser
  }
}
