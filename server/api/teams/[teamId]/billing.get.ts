import { createError, defineEventHandler, getRouterParam } from 'h3'
import prisma from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/auth'
import { planFromPriceId, priceIdToInterval } from '~~/utils/billing'

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

    const { team } = membership
    const interval = priceIdToInterval(team.stripePriceId)
    const subscriptionId = team.stripeSubscriptionId?.startsWith('temp_') ? null : team.stripeSubscriptionId
    const periodEndMs = team.stripeCurrentPeriodEnd?.getTime() || null

    let plan = subscriptionId ? planFromPriceId(team.stripePriceId) : 'FREE'

    if (plan === 'PRO' && team.cancelAtPeriodEnd && periodEndMs && periodEndMs < Date.now()) {
      plan = 'FREE'
    }

    return {
      teamId: team.id,
      plan,
      priceId: team.stripePriceId,
      interval,
      subscriptionId,
      cancelAtPeriodEnd: Boolean(team.cancelAtPeriodEnd),
      currentPeriodEnd: team.stripeCurrentPeriodEnd ? team.stripeCurrentPeriodEnd.toISOString() : null
    }
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    console.error('[teams.billing.get] Failed to load billing details', error)
    throw createError({ statusCode: 500, message: 'Failed to load billing details' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
