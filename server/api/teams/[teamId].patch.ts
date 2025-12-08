import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { TeamRole } from '@prisma/client'
import prisma from '~~/server/utils/prisma'
import { generateUniqueTeamSlug } from '~~/server/utils/teamSlug'
import { requireUser } from '~~/server/utils/auth'
import { getStripeClient } from '~~/server/utils/stripe'

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
    action?: string
    name?: string
    slug?: string | null
    backgroundColor?: string | null
    textColor?: string | null
    highlightColor?: string | null
    // TODO: remove primaryColor once all clients use backgroundColor
    primaryColor?: string | null
    logoUrl?: string | null
    font?: string | null
  }>(event)

  try {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_customerId: { teamId, customerId } },
      include: { team: true }
    })

    if (!membership) {
      throw createError({ statusCode: 404, message: 'Team not found' })
    }

    const action = body.action?.toString()

    if (action === 'deleteTeam') {
      if (membership.role !== TeamRole.OWNER) {
        throw createError({ statusCode: 403, message: 'Only the owner can delete this team' })
      }

      const subscriptionId = membership.team?.stripeSubscriptionId
      let subscriptionCancelled = false

      if (subscriptionId && !subscriptionId.startsWith('temp_') && process.env.NUXT_STRIPE_SECRET) {
        try {
          const stripe = getStripeClient()
          await stripe.subscriptions.cancel(subscriptionId)
          subscriptionCancelled = true
        } catch (error) {
          console.error('[teams.id.patch] Failed to cancel Stripe subscription', error)
        }
      }

      await prisma.$transaction([
        prisma.linkAnalytics.deleteMany({ where: { teamId } }),
        prisma.link.deleteMany({ where: { teamId } }),
        prisma.teamMember.deleteMany({ where: { teamId } }),
        prisma.team.delete({ where: { id: teamId } })
      ])

      return { success: true, subscriptionCancelled }
    }

    if (membership.role === TeamRole.MEMBER) {
      throw createError({ statusCode: 403, message: 'Insufficient permissions' })
    }

    const updates: Record<string, any> = {}

    if (body.name !== undefined) {
      const name = body.name?.toString().trim()
      if (!name) {
        throw createError({ statusCode: 400, message: 'Team name cannot be empty' })
      }
      if (name.includes('-')) {
        throw createError({ statusCode: 400, message: 'Team name cannot include dashes' })
      }
      updates.name = name
      if (body.slug === undefined) {
        updates.slug = await generateUniqueTeamSlug(name, prisma, teamId)
      }
    }

    if (body.slug !== undefined) {
      const slug = body.slug?.toString().trim().toLowerCase()
      if (!slug) {
        throw createError({ statusCode: 400, message: 'Team handle cannot be empty' })
      }

      if (slug.length > 32) {
        throw createError({ statusCode: 400, message: 'Team handle must be 32 characters or fewer' })
      }

      if (!/^[a-z0-9]+$/.test(slug)) {
        throw createError({ statusCode: 400, message: 'Team handle can only include lowercase letters and numbers' })
      }

      const existing = await prisma.team.findFirst({
        where: {
          slug,
          id: { not: teamId }
        },
        select: { id: true }
      })

      if (existing) {
        throw createError({ statusCode: 400, message: 'That handle is already taken' })
      }

      updates.slug = slug
    }

    const providedBackground = body.backgroundColor ?? body.primaryColor
    if (providedBackground !== undefined) {
      const color = providedBackground?.toString().trim()
      updates.backgroundColor = color || null
    }

    if (body.textColor !== undefined) {
      const color = body.textColor?.toString().trim()
      updates.textColor = color || null
    }

    if (body.highlightColor !== undefined) {
      const color = body.highlightColor?.toString().trim()
      updates.highlightColor = color || null
    }

    if (body.logoUrl !== undefined) {
      const url = body.logoUrl?.toString().trim()
      updates.logoUrl = url || null
    }

    if (body.font !== undefined) {
      const font = body.font?.toString().trim()
      updates.font = font || null
    }

    if (Object.keys(updates).length === 0) {
      throw createError({ statusCode: 400, message: 'No updates provided' })
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: updates
    })

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

    console.error('[teams.id.patch] Failed to update team', error)
    throw createError({ statusCode: 500, message: 'Failed to update team' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
