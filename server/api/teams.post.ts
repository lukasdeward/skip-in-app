import { createError, defineEventHandler, readBody } from 'h3'
import { randomUUID } from 'crypto'
import { TeamRole } from '~~/prisma/client'
import { serverSupabaseUser } from '#supabase/server'
import prisma from '~/server/utils/prisma'


export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (!process.env.DATABASE_URL) {
    throw createError({ statusCode: 503, message: 'Database not configured' })
  }

  const body = await readBody<{ name?: string }>(event)
  const name = body?.name?.trim()

  if (!name) {
    throw createError({ statusCode: 400, message: 'Team name is required' })
  }

  try {
    const email = user.email || (user.user_metadata as Record<string, any> | undefined)?.email || `${user.id}@example.com`

    await prisma.customer.upsert({
      where: { id: user.id },
      update: {
        email
      },
      create: {
        id: user.id,
        email,
        stripeCustomerId: `temp_${randomUUID()}`
      }
    })

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
    console.error('[teams.post] Failed to create team', error)
    throw createError({ statusCode: 500, message: error?.message || 'Failed to create team' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
