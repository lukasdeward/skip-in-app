import { createError, defineEventHandler, readBody } from 'h3'
import { randomUUID } from 'crypto'
import { TeamRole } from '@prisma/client'
import prisma from '~~/server/utils/prisma'
import { generateUniqueTeamSlug } from '~~/server/utils/teamSlug'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const { user, customerId } = await requireUser(event)

  if (!process.env.DATABASE_URL) {
    throw createError({ statusCode: 503, message: 'Database not configured' })
  }

  const body = await readBody<{ name?: string }>(event)
  const name = body?.name?.trim()

  if (!name) {
    throw createError({ statusCode: 400, message: 'Team name is required' })
  }

  if (name.includes('-')) {
    throw createError({ statusCode: 400, message: 'Team name cannot include dashes' })
  }

  try {
    const email = user.email || (user.user_metadata as Record<string, any> | undefined)?.email || `${user.id}@example.com`

    await prisma.customer.upsert({
      where: { id: customerId },
      update: {
        email
      },
      create: {
        id: customerId,
        email,
        stripeCustomerId: `temp_${randomUUID()}`
      }
    })

    const slug = await generateUniqueTeamSlug(name, prisma)

    const team = await prisma.team.create({
      data: {
        name,
        slug,
        customerId,
        stripeSubscriptionId: `temp_${randomUUID()}`
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        backgroundColor: true,
        textColor: true,
        highlightColor: true
      }
    })

    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        customerId,
        role: TeamRole.OWNER
      }
    })

    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
      logoUrl: team.logoUrl,
      backgroundColor: team.backgroundColor,
      textColor: team.textColor,
      highlightColor: team.highlightColor
    }
  } catch (error: any) {
    console.error('[teams.post] Failed to create team', error)
    throw createError({ statusCode: 500, message: error?.message || 'Failed to create team' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
