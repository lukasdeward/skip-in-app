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
      where: { teamId_customerId: { teamId, customerId } },
      include: { team: true }
    })

    if (!membership) {
      throw createError({ statusCode: 404, message: 'Team not found' })
    }

    const { team } = membership

    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
      logoUrl: team.logoUrl,
      backgroundColor: team.backgroundColor,
      textColor: team.textColor,
      highlightColor: team.highlightColor,
      font: team.font,
      role: membership.role
    }
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    console.error('[teams.id.get] Failed to load team', error)
    throw createError({ statusCode: 500, message: 'Failed to load team' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
