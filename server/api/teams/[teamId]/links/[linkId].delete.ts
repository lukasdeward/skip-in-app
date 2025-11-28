import { createError, defineEventHandler, getRouterParam } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { TeamRole } from '@prisma/client'
import prisma from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event).catch(() => null)
  const teamId = getRouterParam(event, 'teamId')
  const linkId = getRouterParam(event, 'linkId')
  const customerId = typeof user?.id === 'string' ? user.id : user?.id?.toString()

  if (!user || !customerId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (!teamId || !linkId) {
    throw createError({ statusCode: 400, message: 'Team ID and link ID are required' })
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

    if (membership.role === TeamRole.MEMBER) {
      throw createError({ statusCode: 403, message: 'Insufficient permissions' })
    }

    const existing = await prisma.link.findUnique({ where: { id: linkId } })

    if (!existing || existing.teamId !== teamId) {
      throw createError({ statusCode: 404, message: 'Link not found' })
    }

    await prisma.link.delete({ where: { id: linkId } })

    return { success: true }
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    console.error('[teams.links.delete] Failed to delete link', error)
    throw createError({ statusCode: 500, message: 'Failed to delete link' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
