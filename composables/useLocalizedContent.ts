import { computed } from 'vue'

type Translations<T> = Record<string, T>

export function useLocalizedContent<T = Record<string, any>>(slug: string, fallbackLocale = 'en') {
  const locale = computed(() => {
    if (process.client) {
      return navigator.language?.split('-')[0] || fallbackLocale
    }

    const headers = useRequestHeaders(['accept-language'])
    const acceptLanguage = headers['accept-language']
    return acceptLanguage?.split(',')[0]?.split('-')[0] || fallbackLocale
  })

  const { data, pending, error } = useAsyncData(`${slug}-localized-content`, async () => {
    try {
      return await queryContent(slug).findOne()
    } catch (err) {
      console.error(`[content] Failed to load slug "${slug}"`, err)
      return null
    }
  })

  const content = computed<T | null>(() => {
    const raw = data.value as (T & { translations?: Translations<T> }) | null
    if (!raw) return null

    const translations = (raw as any).translations as Translations<T> | undefined
    if (!translations) return raw

    return translations[locale.value] || translations[locale.value.split('-')[0]] || translations[fallbackLocale] || raw
  })

  return {
    content,
    locale,
    pending,
    error
  }
}
