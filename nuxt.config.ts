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
    key: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
  },

  nitro: {
    prerender: {
      routes: [
        '/'
      ],
      crawlLinks: true
    },
    externals: {
      external: [
        '@prisma/client',
        '.prisma/client',
        'prisma',
        'better-sqlite3',
        // Custom Prisma output path used via alias imports
        '~/prisma/client',
        '~~/prisma/client',
        './prisma/client',
        '../prisma/client'
      ]
    },
    moduleSideEffects: [
      '@prisma/client',
      '.prisma/client',
      'prisma',
      'better-sqlite3',
      '~/prisma/client',
      '~~/prisma/client',
      './prisma/client',
      '../prisma/client'
    ]
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
