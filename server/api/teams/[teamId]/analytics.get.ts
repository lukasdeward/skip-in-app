import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'
import { DeviceType } from '@prisma/client'
import prisma from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/auth'

const DEFAULT_WINDOW_DAYS = 14
const MAX_WINDOW_DAYS = 90

const normalizeDays = (value?: string | null): number => {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_WINDOW_DAYS
  return Math.min(parsed, MAX_WINDOW_DAYS)
}

const formatDateKey = (date: Date) => date.toISOString().slice(0, 10)

export default defineEventHandler(async (event) => {
  const { customerId } = await requireUser(event)
  const teamId = getRouterParam(event, 'teamId')

  if (!teamId) {
    throw createError({ statusCode: 400, message: 'Team ID is required' })
  }

  if (!process.env.DATABASE_URL) {
    throw createError({ statusCode: 503, message: 'Database not configured' })
  }

  const query = getQuery(event)
  const days = normalizeDays(Array.isArray(query?.days) ? query?.days[0] : query?.days?.toString() || null)

  try {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_customerId: { teamId, customerId } }
    })

    if (!membership) {
      throw createError({ statusCode: 404, message: 'Team not found' })
    }

    const endDate = new Date()
    endDate.setUTCHours(0, 0, 0, 0)

    const startDate = new Date(endDate)
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1))

    const analytics = await prisma.linkAnalytics.findMany({
      where: {
        teamId,
        createdAt: { gte: startDate }
      },
      select: {
        createdAt: true,
        device: true
      }
    })

    const orderedDates: string[] = []
    const buckets: Record<string, { desktop: number, mobile: number, bot: number }> = {}

    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(endDate)
      date.setUTCDate(endDate.getUTCDate() - i)
      const key = formatDateKey(date)
      orderedDates.push(key)
      buckets[key] = { desktop: 0, mobile: 0, bot: 0 }
    }

    for (const record of analytics) {
      const key = formatDateKey(record.createdAt)
      const bucket = buckets[key]
      if (!bucket) continue
      if (record.device === DeviceType.BOT) {
        bucket.bot += 1
      } else if (record.device === DeviceType.MOBILE) {
        bucket.mobile += 1
      } else {
        bucket.desktop += 1
      }
    }

    let desktopTotal = 0
    let mobileTotal = 0
    let botTotal = 0

    const series = orderedDates.map(date => {
      const bucket = buckets[date]
      desktopTotal += bucket.desktop
      mobileTotal += bucket.mobile
      botTotal += bucket.bot
      return {
        date,
        desktop: bucket.desktop,
        mobile: bucket.mobile,
        bot: bucket.bot
      }
    })

    return {
      days,
      totals: {
        desktop: desktopTotal,
        mobile: mobileTotal,
        bot: botTotal,
        total: desktopTotal + mobileTotal + botTotal
      },
      series
    }
  } catch (error: unknown) {
    const typedError = error as { statusCode?: number }
    if (typedError?.statusCode) {
      throw typedError
    }

    console.error('[teams.analytics.get] Failed to load analytics', error)
    throw createError({ statusCode: 500, message: 'Failed to load analytics' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
