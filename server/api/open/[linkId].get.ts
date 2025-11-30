import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'
import prisma from '~~/server/utils/prisma'
import { buildTeamSlug } from '~~/server/utils/teamSlug'

export default defineEventHandler(async (event) => {
  const identifier = (getRouterParam(event, 'linkId') || '').toString().trim()
  const query = getQuery(event)
  const rawShortId = Array.isArray(query?.id) ? query.id[0] : query?.id
  const queryId = rawShortId?.toString().trim() || null
  const parsedQueryShortId = queryId ? Number.parseInt(queryId, 10) : null
  const queryShortId = parsedQueryShortId !== null && !Number.isNaN(parsedQueryShortId) && parsedQueryShortId > 0
    ? parsedQueryShortId
    : null

  let slugPart = identifier
  let pathShortId: number | null = null

  const lastDash = identifier.lastIndexOf('-')
  if (lastDash > 0 && lastDash < identifier.length - 1) {
    slugPart = identifier.slice(0, lastDash)
    const candidateId = identifier.slice(lastDash + 1)
    const parsed = Number.parseInt(candidateId, 10)
    pathShortId = !Number.isNaN(parsed) && parsed > 0 ? parsed : null
  }

  const shortId = pathShortId ?? queryShortId
  const normalizedSlug = slugPart.toLowerCase()

  if (!identifier) {
    throw createError({ statusCode: 400, message: 'Link identifier is required' })
  }

  if (!process.env.DATABASE_URL) {
    throw createError({ statusCode: 503, message: 'Database not configured' })
  }

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
    } else if (queryId) {
      link = await prisma.link.update({
        where: { id: queryId },
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

    console.error('[open.link.get] Failed to resolve link', error)
    throw createError({ statusCode: 500, message: 'Failed to resolve link' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
