import { defineEventHandler, getRequestURL } from 'h3'
import prisma from '~~/server/utils/prisma'
import { buildTeamSlug } from '~~/server/utils/teamSlug'

const STATIC_PATHS = [
  '/',
  '/pricing',
  '/login',
  '/signup',
  '/imprint',
  '/data-protection',
  '/terms-of-service'
]

export default defineEventHandler(async (event) => {
  const requestUrl = getRequestURL(event)
  const origin = process.env.NUXT_PUBLIC_SITE_URL || requestUrl?.origin || ''
  const now = new Date().toISOString()

  const staticUrls = STATIC_PATHS.map(path => {
    const loc = origin ? `${origin}${path}` : path
    return `<url><loc>${loc}</loc><lastmod>${now}</lastmod></url>`
  })

  try {
    const links = await prisma.link.findMany({
      select: {
        id: true,
        shortId: true,
        updatedAt: true,
        team: {
          select: {
            slug: true,
            name: true
          }
        }
      }
    })

    const linkUrls = links.map((link) => {
      const teamSlug = link.team?.slug || buildTeamSlug(link.team?.name || 'team')
      const path = link.shortId
        ? `/open/${teamSlug}-${link.shortId}`
        : `/open/${link.id}`
      const loc = origin ? `${origin}${path}` : path
      const lastmod = link.updatedAt?.toISOString?.() || now
      return `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`
    })

    const xml = `<?xml version="1.0" encoding="UTF-8"?>` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
      [...staticUrls, ...linkUrls].join('') +
      `</urlset>`

    event.node.res.setHeader('Content-Type', 'application/xml')
    return xml
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
