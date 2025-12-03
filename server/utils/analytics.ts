import type { H3Event } from 'h3'
import { getRequestHeader } from 'h3'
import { DeviceType } from '@prisma/client'
import prisma from './prisma'

const normalizeText = (value?: string | null, maxLength = 500): string | undefined => {
  if (!value) return undefined
  return value.length > maxLength ? value.slice(0, maxLength) : value
}

export const detectDeviceType = (userAgent?: string | null): DeviceType => {
  if (!userAgent) return DeviceType.DESKTOP
  const normalized = userAgent.toLowerCase()

  const botIndicators = [
    'facebookexternalhit',
    'googlebot',
    'adsbot-google',
    'google-inspectiontool',
    'bingbot',
    'baiduspider',
    'yandexbot',
    'duckduckbot',
    'applebot',
    'slackbot',
    'discordbot',
    'twitterbot',
    'linkedinbot',
    'pinterestbot',
    'petalbot',
    'semrushbot',
    'ahrefsbot'
  ]

  if (botIndicators.some(indicator => normalized.includes(indicator))) {
    return DeviceType.BOT
  }

  const isMobile = /(mobile|iphone|ipod|android|blackberry|iemobile|opera mini|phone)/i.test(normalized)
  return isMobile ? DeviceType.MOBILE : DeviceType.DESKTOP
}

export const recordLinkAnalytics = async (
  event: H3Event,
  { linkId, teamId }: { linkId: string, teamId: string }
) => {
  try {
    const userAgent = getRequestHeader(event, 'user-agent')
    const referrer = getRequestHeader(event, 'referer') || getRequestHeader(event, 'referrer')

    await prisma.linkAnalytics.create({
      data: {
        linkId,
        teamId,
        device: detectDeviceType(userAgent),
        userAgent: normalizeText(userAgent),
        referrer: normalizeText(referrer)
      }
    })
  } catch (error) {
    console.error('[analytics] Failed to record link analytics', { linkId, teamId, error })
  }
}
