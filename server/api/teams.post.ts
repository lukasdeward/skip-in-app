import { createError, defineEventHandler, readBody } from 'h3'
import { randomUUID } from 'crypto'
import { TeamRole } from '~~/prisma/client'
import { serverSupabaseUser } from '#supabase/server'
import { PrismaClient } from '~~/prisma/client'


export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<{ name?: string }>(event)
  const name = body?.name?.trim()

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Team name is required' })
  }

  const prisma = new PrismaClient()

  try {
    const team = await prisma.team.create({
      data: {
        name,
        customerId: user.id,
        stripeSubscriptionId: `temp_${randomUUID()}`
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        primaryColor: true
      }
    })

    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        customerId: user.id,
        role: TeamRole.OWNER
      }
    })

    await prisma.$disconnect()

    return {
      id: team.id,
      name: team.name,
      logoUrl: team.logoUrl,
      primaryColor: team.primaryColor
    }
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to create team' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
