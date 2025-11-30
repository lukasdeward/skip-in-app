import { createError, defineEventHandler, readBody } from 'h3'
import prisma from '~~/server/utils/prisma'
import { buildTeamSlug } from '~~/server/utils/teamSlug'

type OpenLinkResponse = {
  targetUrl: string
  logoUrl: string | null
  teamName: string | null
  backgroundColor: string | null
  textColor: string | null
  highlightColor: string | null
}

export default defineEventHandler(async (event): Promise<OpenLinkResponse> => {
  const body = await readBody<{ url?: string }>(event)
  const rawUrl = body?.url?.toString().trim()

  if (!rawUrl) {
    throw createError({ statusCode: 400, message: 'Request URL is required' })
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid request URL' })
  }

  const pathSegments = parsed.pathname.split('/').filter(Boolean)
  const identifier = decodeURIComponent(pathSegments[pathSegments.length - 1] || '').trim()
  const rawQueryId = parsed.searchParams.get('id')
  const parsedQueryId = rawQueryId ? Number.parseInt(rawQueryId, 10) : null
  const queryShortId = parsedQueryId && !Number.isNaN(parsedQueryId) && parsedQueryId > 0 ? parsedQueryId : null

  if (!identifier) {
    throw createError({ statusCode: 400, message: 'Link identifier is required' })
  }

  let slugPart = identifier
  let pathShortId: number | null = null

  const lastDash = identifier.lastIndexOf('-')
  if (lastDash > 0 && lastDash < identifier.length - 1) {
    slugPart = identifier.slice(0, lastDash)
    const candidateId = identifier.slice(lastDash + 1)
    const parsedShort = Number.parseInt(candidateId, 10)
    pathShortId = !Number.isNaN(parsedShort) && parsedShort > 0 ? parsedShort : null
  }

  const shortId = pathShortId ?? queryShortId
  const normalizedSlug = slugPart.toLowerCase()

  try {
    const teamSlug = slugPart
    let link: {
      targetUrl: string
      team: {
        logoUrl: string | null
        name: string | null
        backgroundColor: string | null
        textColor: string | null
        highlightColor: string | null
      }
    }

    if (shortId !== null && slugPart) {
      let team = await prisma.team.findFirst({
        where: { slug: normalizedSlug },
        select: { id: true, name: true, slug: true }
      })

      if (!team) {
        const fallbackTeam = await prisma.team.findMany({
          where: { slug: null },
          select: { id: true, name: true, slug: true }
        })

        const buildLegacySlug = (name: string) => name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          || 'team'

        team = fallbackTeam.find(item => {
          const computed = buildTeamSlug(item.name)
          const legacy = buildLegacySlug(item.name)
          return computed === normalizedSlug || legacy === normalizedSlug
        }) || null
      }

      if (!team) {
        throw createError({ statusCode: 404, message: 'Team not found' })
      }

      link = await prisma.link.update({
        where: { teamId_shortId: { teamId: team.id, shortId } },
        data: { clickCount: { increment: 1 } },
        select: {
          targetUrl: true,
          team: {
            select: {
              logoUrl: true,
              name: true,
              backgroundColor: true,
              textColor: true,
              highlightColor: true
            }
          }
        }
      })
    } else if (rawQueryId) {
      link = await prisma.link.update({
        where: { id: rawQueryId },
        data: { clickCount: { increment: 1 } },
        select: {
          targetUrl: true,
          team: {
            select: {
              logoUrl: true,
              name: true,
              backgroundColor: true,
              textColor: true,
              highlightColor: true
            }
          }
        }
      })
    } else {
      link = await prisma.link.update({
        where: { id: teamSlug },
        data: { clickCount: { increment: 1 } },
        select: {
          targetUrl: true,
          team: {
            select: {
              logoUrl: true,
              name: true,
              backgroundColor: true,
              textColor: true,
              highlightColor: true
            }
          }
        }
      })
    }

    return {
      targetUrl: link.targetUrl,
      logoUrl: link.team?.logoUrl ?? null,
      teamName: link.team?.name ?? null,
      backgroundColor: link.team?.backgroundColor ?? null,
      textColor: link.team?.textColor ?? null,
      highlightColor: link.team?.highlightColor ?? null
    }
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    if (error?.code === 'P2025') {
      throw createError({ statusCode: 404, message: 'Link not found' })
    }

    console.error('[open.resolve.post] Failed to resolve link', error)
    throw createError({ statusCode: 500, message: 'Failed to resolve link' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
