import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { TeamRole } from '@prisma/client'
import prisma from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/auth'
import { isProPriceId } from '~~/utils/billing'

const validateUrl = (value?: string | null) => {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.toString()
  } catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  const { customerId } = await requireUser(event)
  const teamId = getRouterParam(event, 'teamId')

  if (!teamId) {
    throw createError({ statusCode: 400, message: 'Team ID is required' })
  }

  if (!process.env.DATABASE_URL) {
    throw createError({ statusCode: 503, message: 'Database not configured' })
  }

  const body = await readBody<{
    targetUrl?: string
  }>(event)

  try {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_customerId: { teamId, customerId } },
      include: {
        team: {
          select: { stripePriceId: true }
        }
      }
    })

    if (!membership) {
      throw createError({ statusCode: 404, message: 'Team not found' })
    }

    if (membership.role === TeamRole.MEMBER) {
      throw createError({ statusCode: 403, message: 'Insufficient permissions' })
    }

    const targetUrl = validateUrl(body.targetUrl?.trim())

    if (!targetUrl) {
      throw createError({ statusCode: 400, message: 'A valid target URL is required' })
    }

    const isPro = isProPriceId(membership.team?.stripePriceId)

    if (!isPro) {
      const linkCount = await prisma.link.count({ where: { teamId } })
      if (linkCount >= 2) {
        throw createError({ statusCode: 403, message: 'Free plan allows up to 2 links. Upgrade to add more.' })
      }
    }

    const link = await prisma.$transaction(async (tx) => {
      const { _max } = await tx.link.aggregate({
        where: { teamId },
        _max: { shortId: true }
      })

      const nextShortId = (_max?.shortId ?? 0) + 1

      return tx.link.create({
        data: {
          teamId,
          targetUrl,
          shortId: nextShortId
        }
      })
    })

    return {
      id: link.id,
      shortId: link.shortId,
      targetUrl: link.targetUrl,
      createdAt: link.createdAt
    }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw createError({ statusCode: 409, message: 'A short link already exists for this team' })
    }

    if (error?.statusCode) {
      throw error
    }

    console.error('[teams.links.post] Failed to create link', error)
    throw createError({ statusCode: 500, message: 'Failed to create link' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
