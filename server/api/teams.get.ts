import { createError, defineEventHandler } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event).catch(() => null)

  if (!user) {
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
            customerId: user.id
          }
        }
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        primaryColor: true
      }
    })
  } catch (error: any) {
    console.error('[teams.get] Failed to load teams', error)
    throw createError({ statusCode: 500, message: error?.message || 'Failed to load teams' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
