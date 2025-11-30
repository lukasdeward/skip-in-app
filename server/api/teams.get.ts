import { createError, defineEventHandler } from 'h3'
import prisma from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const { customerId } = await requireUser(event)

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
        slug: true,
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
