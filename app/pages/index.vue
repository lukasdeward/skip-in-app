<script setup lang="ts">
const { data: page } = await useAsyncData('index', () => queryCollection('index').first())
const router = useRouter()
const userUrl = ref('')
const showSignup = ref(false)

const title = page.value?.seo?.title || page.value?.title
const description = page.value?.seo?.description || page.value?.description

useSeoMeta({
  titleTemplate: '',
  title,
  ogTitle: title,
  description,
  ogDescription: description
})

function onSubmitLink() {
  const query = userUrl.value ? { url: userUrl.value } : {}
  router.replace({ query })
  showSignup.value = true
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
    </UPageHero>

    <SignupModal v-model:open="showSignup" />

    <UPageSection
      v-for="(section, index) in page.sections"
      :key="index"
      :title="section.title"
      :description="section.description"
      :orientation="section.orientation"
      :reverse="section.reverse"
      :features="section.features"
    >
      <ImagePlaceholder />
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
            <UUser
              v-bind="testimonial.user"
              size="lg"
            />
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
