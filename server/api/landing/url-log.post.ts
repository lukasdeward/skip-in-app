import { createError, defineEventHandler, getHeader, readBody, type H3Event } from 'h3'
import prisma from '~~/server/utils/prisma'

const resolveIp = (event: H3Event) => {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || null
  }
  return event.node.req.socket?.remoteAddress || null
}

export default defineEventHandler(async (event) => {
  if (!process.env.DATABASE_URL) {
    throw createError({ statusCode: 503, message: 'Database not configured' })
  }

  const body = await readBody<{ url?: string }>(event)
  const url = body?.url?.toString().trim()

  if (!url) {
    throw createError({ statusCode: 400, message: 'URL is required' })
  }

  if (url.length > 2048) {
    throw createError({ statusCode: 400, message: 'URL is too long' })
  }

  const userAgent = getHeader(event, 'user-agent') || null
  const ipAddress = resolveIp(event)

  try {
    await prisma.landingUrlLog.create({
      data: {
        url,
        userAgent,
        ipAddress
      }
    })

    return { success: true }
  } catch (error: any) {
    console.error('[landing.url-log.post] Failed to record URL log', error)
    throw createError({ statusCode: 500, message: 'Failed to record URL' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
