import { createError, defineEventHandler, getRouterParam } from 'h3'
import prisma from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const { customerId } = await requireUser(event)
  const teamId = getRouterParam(event, 'teamId')

  if (!teamId) {
    throw createError({ statusCode: 400, message: 'Team ID is required' })
  }

  if (!process.env.DATABASE_URL) {
    throw createError({ statusCode: 503, message: 'Database not configured' })
  }

  try {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_customerId: { teamId, customerId } }
    })

    if (!membership) {
      throw createError({ statusCode: 404, message: 'Team not found' })
    }

    const links = await prisma.link.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' }
    })

    const missingShortIds = links.filter(link => link.shortId == null)

    if (missingShortIds.length > 0) {
      let nextShortId = links.reduce((max, link) => Math.max(max, link.shortId ?? 0), 0) + 1

      await prisma.$transaction(async (tx) => {
        for (const link of missingShortIds) {
          await tx.link.update({
            where: { id: link.id },
            data: { shortId: nextShortId }
          })

          link.shortId = nextShortId
          nextShortId += 1
        }
      })
    }

    return links.map(link => ({
      id: link.id,
      shortId: link.shortId,
      title: link.title,
      targetUrl: link.targetUrl,
      createdAt: link.createdAt
    }))
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    console.error('[teams.links.get] Failed to load links', error)
    throw createError({ statusCode: 500, message: 'Failed to load links' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
