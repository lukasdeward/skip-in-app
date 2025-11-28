import { createError, defineEventHandler, getRouterParam } from 'h3'
import prisma from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const linkId = getRouterParam(event, 'linkId')

  if (!linkId) {
    throw createError({ statusCode: 400, message: 'Link ID is required' })
  }

  if (!process.env.DATABASE_URL) {
    throw createError({ statusCode: 503, message: 'Database not configured' })
  }

  try {
    const link = await prisma.link.update({
      where: { id: linkId },
      data: { clickCount: { increment: 1 } },
      select: {
        targetUrl: true,
        team: {
          select: {
            logoUrl: true,
            name: true,
            backgroundColor: true,
            textColor: true
          }
        }
      }
    })

    return {
      targetUrl: link.targetUrl,
      logoUrl: link.team?.logoUrl ?? null,
      teamName: link.team?.name ?? null,
      backgroundColor: link.team?.backgroundColor ?? null,
      textColor: link.team?.textColor ?? null
    }
  } catch (error: any) {
    if (error?.code === 'P2025') {
      throw createError({ statusCode: 404, message: 'Link not found' })
    }

    console.error('[open.link.get] Failed to resolve link', error)
    throw createError({ statusCode: 500, message: 'Failed to resolve link' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
