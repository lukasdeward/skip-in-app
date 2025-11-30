import { createError, type H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'

export type AuthContext = {
  user: Awaited<ReturnType<typeof serverSupabaseUser>>
  customerId: string
}

export const requireUser = async (event: H3Event): Promise<AuthContext> => {
  const user = await serverSupabaseUser(event)
  console.log('Authenticated user:', user)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const customerId = typeof user.sub === 'string' ? user.sub : ''

  if (!customerId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  event.context.user = user
  event.context.customerId = customerId

  return { user, customerId }
}
