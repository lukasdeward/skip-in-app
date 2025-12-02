import { createError, defineEventHandler, getRequestURL, getRouterParam, readBody } from 'h3'
import { TeamRole } from '@prisma/client'
import prisma from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/auth'
import { getStripeClient } from '~~/server/utils/stripe'
import { intervalToPriceId, isProPriceId, type BillingInterval } from '~~/utils/billing'

export default defineEventHandler(async (event) => {
  const { customerId } = await requireUser(event)
  const teamId = getRouterParam(event, 'teamId')

  if (!teamId) {
    throw createError({ statusCode: 400, message: 'Team ID is required' })
  }

  if (!process.env.DATABASE_URL) {
    throw createError({ statusCode: 503, message: 'Database not configured' })
  }

  const body = await readBody<{ priceId?: string, interval?: BillingInterval }>(event)
  const requestedPriceId = body.priceId?.toString().trim()
  const inferredPriceId = intervalToPriceId(body.interval)
  const priceId = requestedPriceId || inferredPriceId

  if (!priceId || !isProPriceId(priceId)) {
    throw createError({ statusCode: 400, message: 'Invalid price selection' })
  }

  try {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_customerId: { teamId, customerId } },
      include: {
        team: true,
        customer: true
      }
    })

    if (!membership) {
      throw createError({ statusCode: 404, message: 'Team not found' })
    }

    if (membership.role === TeamRole.MEMBER) {
      throw createError({ statusCode: 403, message: 'Insufficient permissions to manage billing' })
    }

    const hasProPrice = isProPriceId(membership.team.stripePriceId)
    const hasRealSubscription = membership.team.stripeSubscriptionId && !membership.team.stripeSubscriptionId.startsWith('temp_')
    const subscriptionExpired = Boolean(
      membership.team.cancelAtPeriodEnd
      && membership.team.stripeCurrentPeriodEnd
      && membership.team.stripeCurrentPeriodEnd.getTime() < Date.now()
    )

    if (hasProPrice && hasRealSubscription && !subscriptionExpired) {
      throw createError({ statusCode: 409, message: 'This team already has an active subscription' })
    }

    const stripe = getStripeClient()
    const requestUrl = getRequestURL(event)
    const origin = requestUrl?.origin || process.env.NUXT_PUBLIC_SITE_URL || ''

    if (!origin) {
      throw createError({ statusCode: 400, message: 'Unable to resolve site URL for checkout redirect' })
    }

    const successUrl = `${origin}/dashboard/${teamId}?billing=success`
    const cancelUrl = `${origin}/dashboard/${teamId}?billing=cancel`

    let stripeCustomerId = membership.customer.stripeCustomerId

    if (!stripeCustomerId || stripeCustomerId.startsWith('temp_')) {
      const createdCustomer = await stripe.customers.create({
        email: membership.customer.email,
        metadata: {
          customerId: membership.customerId,
          teamId
        }
      })

      stripeCustomerId = createdCustomer.id

      await prisma.customer.update({
        where: { id: membership.customerId },
        data: { stripeCustomerId }
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      client_reference_id: teamId,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      subscription_data: {
        metadata: {
          teamId,
          customerId
        }
      },
      metadata: {
        teamId,
        customerId
      }
    })

    return { url: session.url }
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    console.error('[teams.billing.checkout] Failed to create checkout session', error)
    throw createError({ statusCode: 500, message: 'Failed to start checkout session' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
