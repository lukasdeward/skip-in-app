// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/ui',
    '@nuxt/content',
    '@vueuse/nuxt',
    'nuxt-og-image',
    '@nuxtjs/supabase'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2024-07-11',

  nitro: {
    prerender: {
      routes: [
        '/'
      ],
      crawlLinks: true
    },
    rollupConfig: {
      external: [
        '@supabase/supabase-js',
        '@supabase/ssr',
        '@supabase/auth-js',
        '@supabase/functions-js',
        '@supabase/postgrest-js',
        '@supabase/realtime-js',
        '@supabase/storage-js'
      ]
    },
    externals: {
      trace: true,
      inline: [
        'unstorage',
        'lru-cache',
        '@unocss/core',
        '@unocss/reset',
        '@unocss/nuxt',
        '@unocss/preset-mini',
        '@unocss/preset-uno',
        '@unocss/preset-wind',
        '@unocss/preset-icons',
        '@unocss/preset-attributify',
        '@unocss/transformer-directives',
        '@unocss/extractor-arbitrary-variants',
        '@unocss/rule-utils'
      ],
      external: [
        '@prisma/client',
        '.prisma/client',
        'prisma',
        '@supabase/supabase-js',
        '@supabase/ssr',
        '@supabase/auth-js',
        '@supabase/functions-js',
        '@supabase/postgrest-js',
        '@supabase/realtime-js',
        '@supabase/storage-js'
      ]
    },
    moduleSideEffects: ['@prisma/client', 'prisma']
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  supabase: {
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      include: ['/dashboard*'],
      exclude: ['/imprint*', '/data-protection*', '/terms-of-service*'],
      saveRedirectToCookie: true
    },
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  }
})
