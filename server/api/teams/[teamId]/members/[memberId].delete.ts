import { createError, defineEventHandler, getRouterParam } from 'h3'
import { TeamRole } from '@prisma/client'
import prisma from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const { customerId } = await requireUser(event)
  const teamId = getRouterParam(event, 'teamId')
  const memberId = getRouterParam(event, 'memberId')

  if (!teamId || !memberId) {
    throw createError({ statusCode: 400, message: 'Team ID and member ID are required' })
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

    if (![TeamRole.OWNER, TeamRole.ADMIN].includes(membership.role)) {
      throw createError({ statusCode: 403, message: 'Insufficient permissions' })
    }

    const member = await prisma.teamMember.findUnique({
      where: { id: memberId }
    })

    if (!member || member.teamId !== teamId) {
      throw createError({ statusCode: 404, message: 'Member not found' })
    }

    if (member.role === TeamRole.OWNER && membership.role !== TeamRole.OWNER) {
      throw createError({ statusCode: 403, message: 'You are not allowed to remove an owner' })
    }

    if (member.role === TeamRole.OWNER) {
      const ownerCount = await prisma.teamMember.count({
        where: { teamId, role: TeamRole.OWNER }
      })

      if (ownerCount <= 1) {
        throw createError({ statusCode: 400, message: 'At least one owner is required' })
      }
    }

    await prisma.teamMember.delete({ where: { id: memberId } })

    return { success: true }
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    console.error('[teams.members.delete] Failed to remove member', error)
    throw createError({ statusCode: 500, message: 'Failed to remove member' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
