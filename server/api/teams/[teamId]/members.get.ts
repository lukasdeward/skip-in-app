import { createError, defineEventHandler, getRouterParam } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { PrismaClient } from '@prisma/client'

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

  const prisma = new PrismaClient()

  try {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_customerId: { teamId, customerId: user.id } }
    })

    if (!membership) {
      throw createError({ statusCode: 404, message: 'Team not found' })
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      orderBy: { createdAt: 'asc' },
      include: { customer: true }
    })

    return members.map(member => ({
      id: member.id,
      customerId: member.customerId,
      role: member.role,
      joinedAt: member.createdAt,
      email: member.customer.email,
      name: member.customer.name
    }))
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    console.error('[teams.members.get] Failed to load members', error)
    throw createError({ statusCode: 500, message: 'Failed to load members' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
