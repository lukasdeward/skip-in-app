<script setup lang="ts">
import { BILLING, type BillingInterval, type BillingPlan } from '~~/utils/billing'

const props = defineProps<{
  teamId: string
  teamName: string
  canManage: boolean
}>()

type BillingInfo = {
  teamId: string
  plan: BillingPlan
  priceId: string | null
  interval: BillingInterval | null
  subscriptionId: string | null
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
}

const toast = useToast()
const route = useRoute()

const billingInfo = ref<BillingInfo | null>(null)
const billingPending = ref(false)
const billingError = ref<any>(null)
const checkoutLoading = ref<BillingInterval | null>(null)
const portalLoading = ref(false)

const billingQueryState = computed(() => {
  const raw = route.query.billing
  return Array.isArray(raw) ? raw[0] : raw || null
})

const planLabel = computed(() => {
  if (!billingInfo.value) return 'Free'
  if (billingInfo.value.plan === 'PRO') {
    const interval = billingInfo.value.interval === 'year' ? 'yearly' : 'monthly'
    return `Pro (${interval})`
  }
  return 'Free'
})

const formattedPeriodEnd = computed(() => formatDate(billingInfo.value?.currentPeriodEnd))

const statusCopy = computed(() => {
  if (!billingInfo.value || billingInfo.value.plan === 'FREE') {
    return `Free plan • Up to ${BILLING.freeClickLimit.toLocaleString()} link clicks`
  }

  if (billingInfo.value.cancelAtPeriodEnd) {
    return formattedPeriodEnd.value
      ? `Cancels on ${formattedPeriodEnd.value}`
      : 'Cancels at the end of the current period'
  }

  return formattedPeriodEnd.value
    ? `Renews on ${formattedPeriodEnd.value}`
    : 'Active Pro subscription'
})

const canStartCheckout = computed(() => props.canManage && billingInfo.value?.plan !== 'PRO')

const fetchBilling = async () => {
  if (!props.teamId) return
  billingPending.value = true
  billingError.value = null

  try {
    const { data, error } = await useFetch<BillingInfo>(`/api/teams/${props.teamId}/billing`, {
      server: false,
      key: `team-billing-${props.teamId}-${Date.now()}`
    })

    if (error.value) throw error.value
    billingInfo.value = data.value || null
  } catch (error: any) {
    billingError.value = error
    billingInfo.value = null
  } finally {
    billingPending.value = false
  }
}

const startCheckout = async (interval: BillingInterval) => {
  if (!props.canManage) {
    toast.add({ title: 'Permission required', description: 'Only team owners or admins can manage billing.', color: 'warning' })
    return
  }

  if (!props.teamId) return

  checkoutLoading.value = interval

  try {
    const { data, error } = await useFetch<{ url?: string }>(`/api/teams/${props.teamId}/billing/checkout`, {
      method: 'POST',
      body: { interval },
      server: false,
      key: `billing-checkout-${props.teamId}-${interval}-${Date.now()}`
    })

    if (error.value) throw error.value

    const url = data.value?.url

    if (!url) {
      throw new Error('Checkout URL missing')
    }

    window.location.href = url
  } catch (error: any) {
    const message = error?.data?.message || error?.message || 'Unable to start checkout'
    toast.add({ title: 'Checkout failed', description: message, color: 'error' })
  } finally {
    checkoutLoading.value = null
  }
}

const openPortal = async () => {
  if (!props.canManage) {
    toast.add({ title: 'Permission required', description: 'Only team owners or admins can manage billing.', color: 'warning' })
    return
  }

  if (!props.teamId) return

  portalLoading.value = true

  try {
    const { data, error } = await useFetch<{ url?: string }>(`/api/teams/${props.teamId}/billing/portal`, {
      method: 'POST',
      server: false,
      key: `billing-portal-${props.teamId}-${Date.now()}`
    })

    if (error.value) throw error.value

    const url = data.value?.url
    if (!url) {
      throw new Error('Billing portal URL missing')
    }

    window.location.href = url
  } catch (error: any) {
    const message = error?.data?.message || error?.message || 'Unable to open billing portal'
    toast.add({ title: 'Portal unavailable', description: message, color: 'error' })
  } finally {
    portalLoading.value = false
  }
}

const formatDate = (value?: string | null) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(parsed)
}

watch(() => props.teamId, () => {
  billingInfo.value = null
  billingError.value = null
  billingPending.value = false
  checkoutLoading.value = null
  portalLoading.value = false
  fetchBilling()
}, { immediate: true })

watch(billingQueryState, (state) => {
  if (state && !billingPending.value) {
    fetchBilling()
  }
})
</script>

<template>
  <div class="space-y-4">
    <UAlert
      v-if="billingQueryState === 'success'"
      color="success"
      variant="subtle"
      icon="i-lucide-badge-check"
      title="Payment success"
      description="Your subscription was updated."
    />

    <UAlert
      v-else-if="billingQueryState === 'cancel'"
      color="warning"
      variant="subtle"
      icon="i-lucide-info"
      title="Checkout canceled"
      description="No changes were made to your subscription."
    />

    <UAlert
      v-if="billingError"
      color="error"
      variant="subtle"
      icon="i-lucide-octagon-alert"
      title="Could not load billing"
      :description="billingError?.data?.message || billingError?.message || 'Please try again.'"
    />

    <div
      v-else-if="billingPending"
      class="space-y-3"
    >
      <USkeleton class="h-20 w-full rounded-lg" />
      <div class="grid gap-3 md:grid-cols-2">
        <USkeleton class="h-64 w-full rounded-lg" />
        <USkeleton class="h-64 w-full rounded-lg" />
      </div>
    </div>

    <template v-else>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm text-muted">
                Current plan for {{ teamName }}
              </p>
              <p class="text-lg font-semibold">
                {{ planLabel }}
              </p>
            </div>
            <div class="flex gap-2">
              <UBadge
                v-if="billingInfo?.plan === 'PRO'"
                color="primary"
                variant="subtle"
              >
                Pro active
              </UBadge>
              <UBadge
                v-else
                color="neutral"
                variant="subtle"
              >
                Free plan
              </UBadge>
            </div>
          </div>
        </template>

        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div class="space-y-1">
            <p class="text-base font-medium">
              {{ statusCopy }}
            </p>
            <p class="text-sm text-muted">
              Free includes {{ BILLING.freeClickLimit.toLocaleString() }} link clicks. Pro unlocks unlimited clicks.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton
              icon="i-lucide-external-link"
              label="Manage in Stripe"
              color="neutral"
              variant="outline"
              :loading="portalLoading"
              :disabled="!canManage"
              @click="openPortal"
            />
          </div>
        </div>
      </UCard>

      <div class="grid gap-4 md:grid-cols-2">
        <UCard
          :ui="{ body: 'flex flex-col gap-4 h-full' }"
          class="border-dashed"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-lg font-semibold">
                Free
              </p>
              <p class="text-sm text-muted">
                Start fast with no credit card.
              </p>
            </div>
            <UBadge
              v-if="billingInfo?.plan === 'FREE'"
              color="neutral"
              variant="solid"
            >
              Current
            </UBadge>
          </div>

          <div class="space-y-2">
            <p class="text-3xl font-bold">
              0 EUR
            </p>
            <ul class="space-y-1 text-sm text-muted">
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="text-success" />
                Up to {{ BILLING.freeClickLimit.toLocaleString() }} link clicks
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="text-success" />
                All core features
              </li>
            </ul>
          </div>

          <div class="mt-auto">
            <UButton
              label="Manage plan"
              color="neutral"
              variant="soft"
              :disabled="!canManage"
              @click="openPortal"
            />
            <p
              v-if="!canManage"
              class="mt-2 text-xs text-muted"
            >
              Only team owners or admins can change billing.
            </p>
          </div>
        </UCard>

        <UCard :ui="{ body: 'flex flex-col gap-4 h-full' }">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-lg font-semibold">
                Pro
              </p>
              <p class="text-sm text-muted">
                Unlimited clicks plus premium support.
              </p>
            </div>
            <UBadge
              v-if="billingInfo?.plan === 'PRO'"
              color="primary"
              variant="solid"
            >
              Current
            </UBadge>
          </div>

          <div class="space-y-3">
            <div class="flex items-baseline gap-2">
              <p class="text-3xl font-bold">
                {{ BILLING.pro.monthlyLabel }}
              </p>
              <UBadge color="neutral" variant="subtle">
                Monthly
              </UBadge>
            </div>
            <UButton
              block
              color="primary"
              :loading="checkoutLoading === 'month'"
              :disabled="!canStartCheckout || billingPending"
              label="Choose monthly"
              @click="startCheckout('month')"
            />
          </div>

          <div class="space-y-3">
            <div class="flex items-baseline gap-2">
              <p class="text-3xl font-bold">
                {{ BILLING.pro.yearlyLabel }}
              </p>
              <UBadge color="primary" variant="subtle">
                Best value
              </UBadge>
            </div>
            <UButton
              block
              color="primary"
              variant="soft"
              :loading="checkoutLoading === 'year'"
              :disabled="!canStartCheckout || billingPending"
              label="Choose yearly"
              @click="startCheckout('year')"
            />
          </div>

          <ul class="space-y-1 text-sm text-muted">
            <li class="flex items-center gap-2">
              <UIcon name="i-lucide-check" class="text-success" />
              Unlimited link clicks
            </li>
            <li class="flex items-center gap-2">
              <UIcon name="i-lucide-check" class="text-success" />
              Priority support
            </li>
          </ul>

          <p
            v-if="billingInfo?.plan === 'PRO' && !canStartCheckout"
            class="text-xs text-muted"
          >
            To change your plan, open the Stripe portal.
          </p>
        </UCard>
      </div>
    </template>
  </div>
</template>
