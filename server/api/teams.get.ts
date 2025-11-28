import { createError, defineEventHandler } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import prisma from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event).catch(() => null)
  const customerId = typeof user?.id === 'string' ? user.id : user?.id?.toString()

  if (!user || !customerId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (!process.env.DATABASE_URL) {
    console.warn('[teams.get] DATABASE_URL missing; returning empty list.')
    return []
  }

  try {
    return await prisma.team.findMany({
      where: {
        members: {
          some: {
            customerId
          }
        }
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        backgroundColor: true,
        textColor: true,
        highlightColor: true
      }
    })
  } catch (error: any) {
    console.error('[teams.get] Failed to load teams', error)
    throw createError({ statusCode: 500, message: error?.message || 'Failed to load teams' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
