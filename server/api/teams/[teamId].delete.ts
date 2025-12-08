import { createError, defineEventHandler, getRouterParam } from 'h3'
import { TeamRole } from '@prisma/client'
import prisma from '~~/server/utils/prisma'
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

  try {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_customerId: { teamId, customerId } },
      include: { team: true }
    })

    if (!membership) {
      throw createError({ statusCode: 404, message: 'Team not found' })
    }

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
        console.error('[teams.id.delete] Failed to cancel Stripe subscription', error)
      }
    }

    await prisma.$transaction([
      prisma.linkAnalytics.deleteMany({ where: { teamId } }),
      prisma.link.deleteMany({ where: { teamId } }),
      prisma.teamMember.deleteMany({ where: { teamId } }),
      prisma.team.delete({ where: { id: teamId } })
    ])

    return { success: true, subscriptionCancelled }
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    console.error('[teams.id.delete] Failed to delete team', error)
    throw createError({ statusCode: 500, message: 'Failed to delete team' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
