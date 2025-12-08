<script setup lang="ts">
import appScreenshotUrl from '~/assets/images/usecase/app.png'

const { data: page } = await useAsyncData('index', () => queryCollection('index').first())
const router = useRouter()
const userUrl = ref('')
const showSignup = ref(false)

const browserFeatureRows = [
  { feature: 'Multiple tabs for product comparison', inApp: '❌', native: '✅' },
  { feature: 'Forms & payments autofill available', inApp: '❌', native: '✅' },
  { feature: 'Browsing history for "Buy Later"', inApp: '❌', native: '✅' },
  { feature: 'Cookie availability', inApp: '❌', native: '✅' },
  { feature: 'Push notifications availability', inApp: '❌', native: '✅' },
  { feature: 'Retargeting availability', inApp: '❌', native: '✅' },
  { feature: 'Exposure to Google from Social Media', inApp: '❌', native: '✅' }
]

const title = page.value?.seo?.title || page.value?.title
const description = page.value?.seo?.description || page.value?.description

useSeoMeta({
  titleTemplate: '',
  title,
  ogTitle: title,
  description,
  ogDescription: description
})

const logUrlSubmission = async (url: string) => {
  try {
    await $fetch('/api/landing/url-log', {
      method: 'POST',
      body: { url }
    })
  } catch (error) {
    console.warn('[landing] Failed to log url submission', error)
  }
}

async function onSubmitLink() {
  const trimmed = userUrl.value?.trim()
  const query = trimmed ? { url: trimmed } : {}
  router.replace({ query })
  showSignup.value = true

  if (import.meta.client && trimmed) {
    try {
      localStorage.setItem('landing:last-url', trimmed)
    } catch (error) {
      console.error('[landing] Failed to persist url', error)
    }

    logUrlSubmission(trimmed)
  }
}
</script>

<template>
  <div v-if="page">
    <UPageHero
      :title="page.title"
      :description="page.description"
      :links="page.hero.links"
      :style="{ '--ui-container': '68rem' }"
    >
      <template #top>
        <HeroBackground />
      </template>

      <template #title>
        <MDC
          :value="page.title"
          unwrap="p"
        />
      </template>

      <form
        class="w-full max-w-2xl mx-auto"
        @submit.prevent="onSubmitLink"
      >
        <div class="flex flex-col gap-3 md:flex-row md:items-center justify-center">
          <UInput
            v-model="userUrl"
            size="xl"
            class="w-full md:w-96 text-lg"
            placeholder="https://yourstore.com/product/book"
            autofocus
          />

          <UButton
            type="submit"
            size="lg"
            color="primary"
            label="Create Skip link"
            trailing-icon="i-lucide-arrow-right"
            class="w-full md:w-auto justify-center cursor-pointer"
          />
        </div>
      </form>

      <LandingFlowAnimation />
    </UPageHero>

    <SignupModal v-model:open="showSignup" />

    <UPageSection
      title="In-app browser vs. native browser"
      description="Most of these features only unlock when shoppers open the link in their native browser."
    >
      <div class="w-full overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/60 backdrop-blur">
        <table class="w-full min-w-[28rem] border-separate border-spacing-0 text-left">
          <thead class="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th class="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-200">Feature</th>
              <th class="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-200">In-app browser</th>
              <th class="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-200">Native browser</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in browserFeatureRows"
              :key="row.feature"
              class="border-t border-gray-200 dark:border-gray-800"
            >
              <td class="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                {{ row.feature }}
              </td>
              <td class="py-3 px-4 text-lg">
                {{ row.inApp }}
              </td>
              <td class="py-3 px-4 text-lg">
                {{ row.native }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UPageSection>

    <UPageSection
      v-for="(section, index) in page.sections"
      :key="index"
      :title="section.title"
      :description="section.description"
      :orientation="section.orientation"
      :reverse="section.reverse"
      :features="section.features"
    >
      <div v-if="index === 0" class="w-full justify-center flex items-center">
        <img
          :src="appScreenshotUrl"
          alt="Skip prompt asking visitors to open the link in Safari or Chrome"
          class="object-contain w-2/3 bg-white"
          loading="lazy"
        />
      </div>
      <div v-else-if="index === 1" class="w-full flex justify-center">
        <video
          src="/app-redirect.mp4"
          class="w-full max-w border-none"
          autoplay
          muted
          preload="metadata"
          playsinline
          loop
        >
          Your browser does not support the video tag.
        </video>
      </div>

    </UPageSection>

    <UPageSection
      v-if="page.features?.items?.length"
      :title="page.features.title"
      :description="page.features.description"
    >
      <UPageGrid>
        <UPageCard
          v-for="(item, index) in page.features.items"
          :key="index"
          v-bind="item"
          spotlight
        />
      </UPageGrid>
    </UPageSection>

    <UPageSection
      id="testimonials"
      :headline="page.testimonials.headline"
      :title="page.testimonials.title"
      :description="page.testimonials.description"
    >
      <UPageColumns class="xl:columns-4">
        <UPageCard
          v-for="(testimonial, index) in page.testimonials.items"
          :key="index"
          variant="subtle"
          :description="testimonial.quote"
          :ui="{ description: 'before:content-[open-quote] after:content-[close-quote]' }"
        >
          <template #footer>
            <div
              class="flex items-center gap-1 text-amber-400 dark:text-amber-300"
              :aria-label="`${testimonial.rating || 5}-star testimonial`"
            >
              <UIcon
                v-for="i in testimonial.rating || 5"
                :key="i"
                name="i-lucide-star"
                class="h-5 w-5"
              />
            </div>
          </template>
        </UPageCard>
      </UPageColumns>
    </UPageSection>

    <USeparator />

    <UPageCTA
      v-bind="page.cta"
      variant="naked"
      class="overflow-hidden"
    >
      <LazyStarsBg />
    </UPageCTA>
  </div>
</template>
