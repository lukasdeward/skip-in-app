export const useAuthRedirect = (fallbackPath = '/dashboard') => {
  const route = useRoute()
  const requestURL = useRequestURL()
  const redirectCookie = useSupabaseCookieRedirect()
  const storedRedirect = useState<string | null>('auth-redirect-path', () => redirectCookie.path.value || null)

  if (redirectCookie.path.value) {
    storedRedirect.value = redirectCookie.path.value
    redirectCookie.pluck()
  }
  const normalizedFallback = fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`

  const normalizeRedirect = (value?: string | null) => {
    if (!value) return normalizedFallback
    const trimmed = value.trim()
    if (!trimmed) return normalizedFallback
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  }

  const redirectPath = computed(() => {
    const queryRedirect = route.query.redirect || route.query.redirect_to
    const fromQuery = Array.isArray(queryRedirect) ? queryRedirect[0] : queryRedirect

    return normalizeRedirect(fromQuery || storedRedirect.value)
  })

  const redirectUrl = computed(() => {
    const base = import.meta.client ? window.location.origin : requestURL.origin

    try {
      return new URL(redirectPath.value, base).toString()
    } catch {
      return new URL(normalizedFallback, base).toString()
    }
  })

  return { redirectPath, redirectUrl }
}
