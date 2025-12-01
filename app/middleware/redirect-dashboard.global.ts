import { useAuthRedirect } from "~~/composables/useAuthRedirect"

export default defineNuxtRouteMiddleware((to) => {
  const legalPaths = ['/imprint', '/data-protection', '/terms-of-service']
  const isLegalRoute = legalPaths.some(path => to.path.startsWith(path))
  const authPaths = ['/login', '/signup', '/confirm']
  const isAuthRoute = authPaths.some(path => to.path.startsWith(path))
  const isOpenRoute = to.path.startsWith('/open/')
  const isDashboardRoute = to.path.startsWith('/dashboard')
  const session = useSupabaseSession()
  const { redirectPath } = useAuthRedirect()

  const handleRedirect = () => {
    const isAuthenticated = !!session.value

    if (isLegalRoute || isOpenRoute) return

    if (isAuthRoute) {
      if (isAuthenticated) {
        return navigateTo(redirectPath.value)
      }
      return
    }

    if (isDashboardRoute && !isAuthenticated) {
      return navigateTo('/login')
    }

    if (!isDashboardRoute && isAuthenticated) {
      return navigateTo('/dashboard')
    }
  }

  const result = handleRedirect()

  if (import.meta.client) {
    watch(() => session.value, () => {
      handleRedirect()
    })
  }

  return result
})
