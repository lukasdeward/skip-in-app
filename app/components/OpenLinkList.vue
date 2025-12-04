<script setup lang="ts">
type LinkEntry = {
  id: string
  shortId: number | null
  title: string | null
  targetUrl: string
  href: string
}

const props = defineProps<{
  links: LinkEntry[]
  logoUrl?: string | null
  teamName?: string | null
  textColor?: string | null
  highlightColor?: string | null
  browserName?: string | null
  shouldShowWebViewWarning?: boolean
  formatTargetUrl?: (url: string) => string
}>()

const accentColor = computed(() => props.highlightColor?.trim() || '#f97316')
const resolvedTextColor = computed(() => props.textColor?.trim() || undefined)
const heading = computed(() => props.teamName?.trim() || 'Links')
const warningBrowserName = computed(() => props.browserName?.trim() || 'your browser')

const onLinkClick = async (href: string) => {
  await navigateTo(href)
}

const linksWithDisplay = computed(() => props.links.map(link => ({
  ...link,
  displayTitle: formatLinkTitle(link),
  displayUrl: formatDisplayUrl(link.targetUrl)
})))

const formatDisplayUrl = (rawUrl?: string | null) => {
  const formatted = props.formatTargetUrl ? props.formatTargetUrl(rawUrl || '') : rawUrl
  const trimmed = formatted?.toString().trim()
  if (!trimmed) return ''
  return trimmed
}

const formatLinkTitle = (link: LinkEntry) => {
  const explicit = link.title?.trim()
  if (explicit) return explicit

  const domain = extractDomain(link.targetUrl)
  if (domain) return capitalize(domain)

  if (link.shortId !== null && link.shortId !== undefined) return `Link ${link.shortId}`
  return 'Link'
}

const extractDomain = (rawUrl?: string | null) => {
  const trimmed = rawUrl?.trim()
  if (!trimmed) return ''

  try {
    const parsed = new URL(trimmed)
    return parsed.hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    const fallback = trimmed.match(/^(?:https?:\/\/)?([^/]+)/i)
    return fallback?.[1]?.replace(/^www\./i, '').toLowerCase() || ''
  }
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
</script>

<template>
  <div
    class="relative space-y-4"
    :style="{ color: resolvedTextColor || undefined }"
  >
    <UIcon
      name="i-typcn-arrow-back"
      v-if="shouldShowWebViewWarning"
      class="absolute -top-2 right-2 h-20 w-20 -rotate-270"
      :style="{ color: accentColor }"
      aria-hidden="true"
    />

    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-center gap-3">
        <img
          v-if="logoUrl"
          :src="logoUrl"
          class="h-12"
          alt=""
        >
      </div>
      <h2 class="mt-5 text-center text-2xl font-bold">
        {{ heading }}
      </h2>
    </div>

    <div
      v-if="shouldShowWebViewWarning"
      class="rounded-lg border px-4 py-3 text-sm"
      :style="{
        borderColor: accentColor,
        backgroundColor: `${accentColor}10`
      }"
    >
      You are in an in-app browser. Open in {{ warningBrowserName }} for the smoothest experience, then pick a link below.
    </div>

    <div class="grid gap-3">
      <a
        v-for="link in linksWithDisplay"
        :key="link.id"
        :href="link.href"
        @click.prevent="onLinkClick(link.href)"
        class="group block rounded-xl border border-dashed p-4 transition hover:-translate-y-0.5 hover:border-neutral-400 hover:bg-white/70 dark:hover:border-neutral-600 dark:hover:bg-neutral-900/50"
        :style="{ borderColor: resolvedTextColor || undefined }"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <p class="font-semibold leading-tight">
              {{ link.displayTitle }}
            </p>
            <p class="break-all text-sm opacity-80">
              {{ link.displayUrl }}
            </p>
          </div>
          <UIcon
            name="i-lucide-arrow-up-right"
            class="text-muted transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </div>
      </a>
    </div>
  </div>
</template>
