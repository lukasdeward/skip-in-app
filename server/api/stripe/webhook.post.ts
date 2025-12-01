import Stripe from 'stripe'
import { createError, defineEventHandler, getHeader, readRawBody } from 'h3'
import type { Customer, Prisma, Team } from '@prisma/client'
import prisma from '~~/server/utils/prisma'
import { getStripeClient, getStripeWebhookSecret } from '~~/server/utils/stripe'

type SubscriptionLike = Stripe.Subscription | null | undefined

const HANDLED_EVENTS = new Set<Stripe.Event.Type>([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.updated'
])

const getMetadataValue = (metadata: Stripe.Metadata | null | undefined, keys: string[]): string | null => {
  if (!metadata) return null

  for (const key of keys) {
    const value = metadata[key]
    if (value) return value
  }

  return null
}

const toStripeId = (input: string | null | { id?: string | null } | undefined): string | null => {
  if (!input) return null
  if (typeof input === 'string') return input
  if (typeof (input as { id?: unknown }).id === 'string') return (input as { id: string }).id
  return null
}

const extractSubscriptionFields = (subscription: SubscriptionLike) => {
  if (!subscription) {
    return {
      subscriptionId: null as string | null,
      priceId: undefined as string | null | undefined,
      currentPeriodEnd: undefined as Date | null | undefined,
      cancelAtPeriodEnd: undefined as boolean | undefined
    }
  }

  return {
    subscriptionId: subscription.id,
    priceId: subscription.items?.data?.[0]?.price?.id ?? null,
    currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end)
  }
}

const buildTeamUpdateInput = (fields: {
  subscriptionId?: string | null
  priceId?: string | null
  currentPeriodEnd?: Date | null
  cancelAtPeriodEnd?: boolean
}): Prisma.TeamUpdateInput => {
  const data: Prisma.TeamUpdateInput = {}

  if (fields.subscriptionId) {
    data.stripeSubscriptionId = fields.subscriptionId
  }

  if (fields.priceId !== undefined) {
    data.stripePriceId = fields.priceId
  }

  if (fields.currentPeriodEnd !== undefined) {
    data.stripeCurrentPeriodEnd = fields.currentPeriodEnd
  }

  if (fields.cancelAtPeriodEnd !== undefined) {
    data.cancelAtPeriodEnd = fields.cancelAtPeriodEnd
  }

  return data
}

const upsertCustomerFromStripe = async (opts: {
  stripeCustomerId: string | null
  metadataCustomerId?: string | null
  fallbackEmail?: string | null
}): Promise<Customer | null> => {
  const { stripeCustomerId, metadataCustomerId, fallbackEmail } = opts
  if (!stripeCustomerId) return null

  const applyUpdate = async (customer: Customer) => {
    const update: Prisma.CustomerUpdateInput = {}

    if (customer.stripeCustomerId !== stripeCustomerId) {
      update.stripeCustomerId = stripeCustomerId
    }

    if (fallbackEmail && fallbackEmail !== customer.email) {
      update.email = fallbackEmail
    }

    if (Object.keys(update).length === 0) return customer

    return prisma.customer.update({
      where: { id: customer.id },
      data: update
    })
  }

  if (metadataCustomerId) {
    const byId = await prisma.customer.findUnique({ where: { id: metadataCustomerId } })
    if (byId) return applyUpdate(byId)
  }

  const byStripeId = await prisma.customer.findUnique({ where: { stripeCustomerId } })
  if (byStripeId) return applyUpdate(byStripeId)

  if (fallbackEmail) {
    const byEmail = await prisma.customer.findUnique({ where: { email: fallbackEmail } })
    if (byEmail) return applyUpdate(byEmail)
  }

  console.warn('[stripe.webhook] Unable to link Stripe customer to local user.', {
    stripeCustomerId,
    metadataCustomerId,
    fallbackEmail
  })

  return null
}

const findTeamForSubscription = async (opts: {
  teamId?: string | null
  subscriptionId?: string | null
  stripeCustomerId?: string | null
  customerId?: string | null
}): Promise<(Team & { customer: Customer }) | null> => {
  const { teamId, subscriptionId, stripeCustomerId, customerId } = opts

  if (teamId) {
    const byId = await prisma.team.findUnique({
      where: { id: teamId },
      include: { customer: true }
    })
    if (byId) return byId
  }

  if (subscriptionId) {
    const bySubscription = await prisma.team.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      include: { customer: true }
    })
    if (bySubscription) return bySubscription
  }

  if (customerId) {
    const byCustomer = await prisma.team.findFirst({
      where: { customerId },
      include: { customer: true }
    })
    if (byCustomer) return byCustomer
  }

  if (stripeCustomerId) {
    const byStripeCustomer = await prisma.team.findFirst({
      where: { customer: { stripeCustomerId } },
      include: { customer: true }
    })
    if (byStripeCustomer) return byStripeCustomer
  }

  return null
}

const syncTeamSubscription = async (opts: {
  teamId?: string | null
  subscriptionFields: ReturnType<typeof extractSubscriptionFields>
  stripeCustomerId?: string | null
  customerId?: string | null
}) => {
  const { teamId, subscriptionFields, stripeCustomerId, customerId } = opts
  const team = await findTeamForSubscription({
    teamId,
    subscriptionId: subscriptionFields.subscriptionId,
    stripeCustomerId,
    customerId
  })

  if (!team) {
    console.warn('[stripe.webhook] No matching team found for subscription update.', {
      teamId,
      subscriptionId: subscriptionFields.subscriptionId,
      stripeCustomerId,
      customerId
    })
    return
  }

  const update = buildTeamUpdateInput({
    subscriptionId: subscriptionFields.subscriptionId ?? team.stripeSubscriptionId,
    priceId: subscriptionFields.priceId,
    currentPeriodEnd: subscriptionFields.currentPeriodEnd,
    cancelAtPeriodEnd: subscriptionFields.cancelAtPeriodEnd
  })

  if (Object.keys(update).length === 0) return

  await prisma.team.update({
    where: { id: team.id },
    data: update
  })
}

const handleCheckoutSessionCompleted = async (session: Stripe.Checkout.Session, stripe: Stripe) => {
  const stripeCustomerId = toStripeId(session.customer)
  const metadataTeamId = getMetadataValue(session.metadata, ['teamId', 'team_id', 'team'])
  const metadataCustomerId = getMetadataValue(session.metadata, ['customerId', 'customer_id', 'userId', 'user_id'])
  const subscriptionId = toStripeId(session.subscription)
  const email = session.customer_details?.email || null

  let subscription: Stripe.Subscription | null = null

  if (subscriptionId) {
    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId)
    } catch (error) {
      console.error('[stripe.webhook] Failed to fetch subscription after checkout completion.', error)
    }
  }

  const linkedCustomer = await upsertCustomerFromStripe({
    stripeCustomerId,
    metadataCustomerId,
    fallbackEmail: email
  })

  await syncTeamSubscription({
    teamId: metadataTeamId,
    subscriptionFields: extractSubscriptionFields(subscription ?? (subscriptionId ? { id: subscriptionId } as Stripe.Subscription : null)),
    stripeCustomerId,
    customerId: linkedCustomer?.id || metadataCustomerId || null
  })
}

const handleSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
  const stripeCustomerId = toStripeId(subscription.customer)
  const metadataTeamId = getMetadataValue(subscription.metadata, ['teamId', 'team_id', 'team'])
  const metadataCustomerId = getMetadataValue(subscription.metadata, ['customerId', 'customer_id', 'userId', 'user_id'])
  const email = subscription.customer_email || null

  const linkedCustomer = await upsertCustomerFromStripe({
    stripeCustomerId,
    metadataCustomerId,
    fallbackEmail: email
  })

  await syncTeamSubscription({
    teamId: metadataTeamId,
    subscriptionFields: extractSubscriptionFields(subscription),
    stripeCustomerId,
    customerId: linkedCustomer?.id || metadataCustomerId || null
  })
}

export default defineEventHandler(async (event) => {
  try {
    const stripe = getStripeClient()
    const webhookSecret = getStripeWebhookSecret()
    const rawBody = await readRawBody(event)
    const signature = getHeader(event, 'stripe-signature')

    if (!rawBody) {
      throw createError({ statusCode: 400, message: 'Missing webhook payload' })
    }

    if (!signature) {
      throw createError({ statusCode: 400, message: 'Missing Stripe signature header' })
    }

    let stripeEvent: Stripe.Event

    try {
      stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } catch (error: any) {
      console.error('[stripe.webhook] Signature verification failed.', error)
      throw createError({ statusCode: 400, message: `Webhook Error: ${error?.message || 'Invalid signature'}` })
    }

    if (!HANDLED_EVENTS.has(stripeEvent.type)) {
      return { received: true }
    }

    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(stripeEvent.data.object as Stripe.Checkout.Session, stripe)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.paused':
      case 'customer.subscription.deleted':
        await handleSubscriptionUpdated(stripeEvent.data.object as Stripe.Subscription)
        break

      default:
        break
    }

    return { received: true }
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    console.error('[stripe.webhook] Unexpected error while handling webhook.', error)
    throw createError({ statusCode: 500, message: 'Failed to handle webhook' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
