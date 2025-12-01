import Stripe from 'stripe'

const STRIPE_API_VERSION = '2025-11-17.clover' as Stripe.LatestApiVersion

let cachedStripe: Stripe | null = null

export const getStripeClient = () => {
  if (cachedStripe) return cachedStripe

  const secret = process.env.NUXT_STRIPE_SECRET

  if (!secret) {
    throw new Error('NUXT_STRIPE_SECRET is not set; Stripe cannot initialize.')
  }

  cachedStripe = new Stripe(secret, { apiVersion: STRIPE_API_VERSION })
  return cachedStripe
}

export const getStripeWebhookSecret = () => {
  const secret = process.env.NUXT_STRIPE_WEBHOOK_SECRET

  if (!secret) {
    throw new Error('NUXT_STRIPE_WEBHOOK_SECRET is not set; webhook verification cannot proceed.')
  }

  return secret
}

export const stripeApiVersion = STRIPE_API_VERSION
