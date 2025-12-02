export const BILLING = {
  freeClickLimit: 10000,
  pro: {
    productId: 'prod_TWszP0vVwqXPLU',
    monthlyPriceId: 'price_1SZpDRDsn88I70K9bFYxOCcY',
    yearlyPriceId: 'price_1SZpDcDsn88I70K9iwKbHAjg',
    monthlyLabel: '19 EUR / month',
    yearlyLabel: '190 EUR / year'
  }
}

export type BillingInterval = 'month' | 'year'
export type BillingPlan = 'FREE' | 'PRO'

export const priceIdToInterval = (priceId?: string | null): BillingInterval | null => {
  if (!priceId) return null
  if (priceId === BILLING.pro.monthlyPriceId) return 'month'
  if (priceId === BILLING.pro.yearlyPriceId) return 'year'
  return null
}

export const intervalToPriceId = (interval?: BillingInterval | null): string | null => {
  if (!interval) return null
  if (interval === 'month') return BILLING.pro.monthlyPriceId
  if (interval === 'year') return BILLING.pro.yearlyPriceId
  return null
}

export const isProPriceId = (priceId?: string | null): boolean => Boolean(priceIdToInterval(priceId))

export const planFromPriceId = (priceId?: string | null): BillingPlan => (isProPriceId(priceId) ? 'PRO' : 'FREE')
