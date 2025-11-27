<script lang="ts" setup>
definePageMeta({
  layout: 'open'
})

useSeoMeta({
  title: 'Opening link | Skip'
})

const route = useRoute()
const linkId = computed(() => route.params.linkId as string)

const {
  data,
  pending,
  error,
  refresh
} = await useFetch<{ targetUrl: string }>(() => `/api/open/${linkId.value}`, {
  server: true,
  immediate: true,
  key: () => `open-link-${linkId.value}`
})

const attemptRedirect = async () => {
  if (data.value?.targetUrl) {
    await navigateTo(data.value.targetUrl, { external: true, replace: true })
  }
}

await attemptRedirect()

watch(linkId, async () => {
  await refresh()
  await attemptRedirect()
})

const status = computed<'loading' | 'redirecting' | 'error'>(() => {
  if (pending.value) return 'loading'
  if (error.value) return 'error'
  return 'redirecting'
})

const message = computed(() => {
  if (status.value === 'loading') return 'Looking up your Skip link...'
  if (status.value === 'redirecting') return 'Redirecting you to your destination...'
  return (error.value as any)?.data?.message || (error.value as any)?.message || 'Unable to resolve this link.'
})

const targetUrl = computed(() => data.value?.targetUrl ?? null)
</script>

<template>
  <div class="max-w-3xl mx-auto py-16 px-4">
    <UCard class="border border-dashed">
      <div class="flex items-center gap-3">
        <UIcon
          v-if="status === 'loading'"
          name="i-lucide-loader-2"
          class="animate-spin h-6 w-6 text-muted"
        />
        <UIcon
          v-else-if="status === 'redirecting'"
          name="i-lucide-arrow-up-right"
          class="h-6 w-6 text-muted"
        />
        <UIcon
          v-else
          name="i-lucide-alert-circle"
          class="h-6 w-6 text-error"
        />
        <div>
          <p class="font-semibold">Skip link</p>
          <p class="text-muted text-sm">{{ message }}</p>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap gap-2 items-center">
        <UButton
          v-if="targetUrl"
          :to="targetUrl"
          target="_blank"
          rel="noreferrer"
          color="neutral"
          icon="i-lucide-external-link"
          label="Open manually"
        />
        <UButton
          v-if="status === 'error'"
          color="neutral"
          variant="outline"
          icon="i-lucide-rotate-ccw"
          label="Try again"
          @click="resolveLink"
        />
        <UButton
          color="neutral"
          variant="ghost"
          to="/"
          label="Back home"
        />
      </div>
    </UCard>
  </div>
</template>
