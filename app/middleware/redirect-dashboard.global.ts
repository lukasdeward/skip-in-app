export default defineNuxtRouteMiddleware((to) => {
  const legalPaths = ['/imprint', '/data-protection', '/terms-of-service']
  const isLegalRoute = legalPaths.some(path => to.path.startsWith(path))
  const isOpenRoute = to.path.startsWith('/open/')
  const isDashboardRoute = to.path.startsWith('/dashboard')
  const user = useSupabaseUser()

  const handleRedirect = () => {
    if (isLegalRoute || isOpenRoute) return

    if (isDashboardRoute && !user.value) {
      return navigateTo('/login')
    }

    if (!isDashboardRoute && user.value) {
      return navigateTo('/dashboard')
    }
  }

  const result = handleRedirect()

  if (process.client) {
    watch(() => user.value, () => {
      handleRedirect()
    })
  }

  return result
})
