import { createError, defineEventHandler, getRequestURL, getRouterParam } from 'h3'
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
      include: { customer: true }
    })

    if (!membership) {
      throw createError({ statusCode: 404, message: 'Team not found' })
    }

    if (membership.role === TeamRole.MEMBER) {
      throw createError({ statusCode: 403, message: 'Insufficient permissions to manage billing' })
    }

    const stripe = getStripeClient()
    const requestUrl = getRequestURL(event)
    const origin = requestUrl?.origin || process.env.NUXT_PUBLIC_SITE_URL || ''

    if (!origin) {
      throw createError({ statusCode: 400, message: 'Unable to resolve site URL for portal redirect' })
    }

    const returnUrl = `${origin}/dashboard/${teamId}?billing=return`

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

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl
    })

    return { url: session.url }
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    console.error('[teams.billing.portal] Failed to create portal session', error)
    throw createError({ statusCode: 500, message: 'Failed to open billing portal' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
