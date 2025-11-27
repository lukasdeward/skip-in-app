import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { TeamRole } from '@prisma/client'
import prisma from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event).catch(() => null)
  const teamId = getRouterParam(event, 'teamId')

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (!teamId) {
    throw createError({ statusCode: 400, message: 'Team ID is required' })
  }

  if (!process.env.DATABASE_URL) {
    throw createError({ statusCode: 503, message: 'Database not configured' })
  }

  const body = await readBody<{
    email?: string
    customerId?: string
    role?: TeamRole
  }>(event)

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

    const identifier = body.customerId?.trim() || body.email?.trim().toLowerCase()

    if (!identifier) {
      throw createError({ statusCode: 400, message: 'Customer ID or email is required' })
    }

    const customer = body.customerId
      ? await prisma.customer.findUnique({ where: { id: body.customerId.trim() } })
      : await prisma.customer.findUnique({ where: { email: identifier } })

    if (!customer) {
      throw createError({ statusCode: 404, message: 'User not found' })
    }

    const existing = await prisma.teamMember.findUnique({
      where: { teamId_customerId: { teamId, customerId: customer.id } }
    })

    if (existing) {
      throw createError({ statusCode: 409, message: 'User is already a member of this team' })
    }

    const role = body.role && Object.values(TeamRole).includes(body.role) ? body.role : TeamRole.MEMBER

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        customerId: customer.id,
        role
      },
      include: { customer: true }
    })

    return {
      id: member.id,
      customerId: member.customerId,
      role: member.role,
      joinedAt: member.createdAt,
      email: member.customer.email,
      name: member.customer.name
    }
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    console.error('[teams.members.post] Failed to add member', error)
    throw createError({ statusCode: 500, message: 'Failed to add member' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
