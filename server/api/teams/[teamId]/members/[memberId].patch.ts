import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { TeamRole } from '@prisma/client'
import prisma from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event).catch(() => null)
  const teamId = getRouterParam(event, 'teamId')
  const memberId = getRouterParam(event, 'memberId')

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (!teamId || !memberId) {
    throw createError({ statusCode: 400, message: 'Team ID and member ID are required' })
  }

  if (!process.env.DATABASE_URL) {
    throw createError({ statusCode: 503, message: 'Database not configured' })
  }

  const body = await readBody<{ role?: TeamRole }>(event)

  try {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_customerId: { teamId, customerId: user.id } }
    })

    if (!membership) {
      throw createError({ statusCode: 404, message: 'Team not found' })
    }

    if (![TeamRole.OWNER, TeamRole.ADMIN].includes(membership.role)) {
      throw createError({ statusCode: 403, message: 'Insufficient permissions' })
    }

    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: { customer: true }
    })

    if (!member || member.teamId !== teamId) {
      throw createError({ statusCode: 404, message: 'Member not found' })
    }

    const requestedRole = body.role

    if (!requestedRole || !Object.values(TeamRole).includes(requestedRole)) {
      throw createError({ statusCode: 400, message: 'A valid role is required' })
    }

    if (member.role === TeamRole.OWNER && membership.role !== TeamRole.OWNER) {
      throw createError({ statusCode: 403, message: 'Only an owner can change owner roles' })
    }

    if (requestedRole !== TeamRole.OWNER) {
      const ownerCount = await prisma.teamMember.count({
        where: { teamId, role: TeamRole.OWNER }
      })

      if (member.role === TeamRole.OWNER && ownerCount <= 1) {
        throw createError({ statusCode: 400, message: 'At least one owner is required' })
      }
    }

    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: { role: requestedRole },
      include: { customer: true }
    })

    return {
      id: updated.id,
      customerId: updated.customerId,
      role: updated.role,
      joinedAt: updated.createdAt,
      email: updated.customer.email,
      name: updated.customer.name
    }
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    console.error('[teams.members.patch] Failed to update member', error)
    throw createError({ statusCode: 500, message: 'Failed to update member' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
