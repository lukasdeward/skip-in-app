import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'
import prisma from '~~/server/utils/prisma'
import { buildTeamSlug } from '~~/server/utils/teamSlug'
import { recordLinkAnalytics } from '~~/server/utils/analytics'

type TeamTheme = {
  logoUrl: string | null
  teamName: string | null
  teamSlug: string | null
  backgroundColor: string | null
  textColor: string | null
  highlightColor: string | null
}

type LinkOpenResponse =
  | (TeamTheme & {
    type: 'single'
    link: {
      id: string
      shortId: number | null
      title: string | null
      targetUrl: string
    }
  })
  | (TeamTheme & {
    type: 'list'
    links: Array<{
      id: string
      shortId: number | null
      title: string | null
      targetUrl: string
    }>
  })

type LinkOpenRecord = {
  id: string
  shortId: number | null
  teamId: string
  title: string | null
  targetUrl: string
  team: {
    id: string
    slug: string | null
    logoUrl: string | null
    name: string | null
    backgroundColor: string | null
    textColor: string | null
    highlightColor: string | null
  }
}

export default defineEventHandler(async (event): Promise<LinkOpenResponse> => {
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

  const buildLegacySlug = (name: string) => name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'team'

  const teamSelect = {
    id: true,
    slug: true,
    name: true,
    logoUrl: true,
    backgroundColor: true,
    textColor: true,
    highlightColor: true
  } as const

  const linkSelect = {
    id: true,
    shortId: true,
    teamId: true,
    title: true,
    targetUrl: true,
    team: {
      select: teamSelect
    }
  } as const

  type TeamSummary = {
    id: string
    slug: string | null
    name: string | null
    logoUrl: string | null
    backgroundColor: string | null
    textColor: string | null
    highlightColor: string | null
  }

  const formatTheme = (team?: TeamSummary | null): TeamTheme => ({
    logoUrl: team?.logoUrl ?? null,
    teamName: team?.name ?? null,
    teamSlug: team?.slug || (team?.name ? buildTeamSlug(team.name) : null),
    backgroundColor: team?.backgroundColor ?? null,
    textColor: team?.textColor ?? null,
    highlightColor: team?.highlightColor ?? null
  })

  const buildSingleResponse = (link: LinkOpenRecord): LinkOpenResponse => ({
    type: 'single',
    link: {
      id: link.id,
      shortId: link.shortId,
      title: link.title,
      targetUrl: link.targetUrl
    },
    ...formatTheme(link.team)
  })

  const findTeamForSlug = async (normalized: string): Promise<TeamSummary | null> => {
    let team = await prisma.team.findFirst({
      where: { slug: normalized },
      select: teamSelect
    })

    if (team) return team

    const fallbackTeams = await prisma.team.findMany({
      where: { slug: null },
      select: teamSelect
    })

    return fallbackTeams.find(item => {
      const computed = buildTeamSlug(item.name || 'team')
      const legacy = buildLegacySlug(item.name || 'team')
      return computed === normalized || legacy === normalized
    }) || null
  }

  try {
    if (shortId !== null && slugPart) {
      const team = await findTeamForSlug(normalizedSlug)

      if (!team) {
        throw createError({ statusCode: 404, message: 'Team not found' })
      }

      const link = await prisma.link.findUnique({
        where: { teamId_shortId: { teamId: team.id, shortId } },
        select: linkSelect
      })

      if (!link) {
        throw createError({ statusCode: 404, message: 'Link not found' })
      }

      await recordLinkAnalytics(event, { linkId: link.id, teamId: link.teamId })
      return buildSingleResponse(link)
    }

    if (queryId) {
      const link = await prisma.link.findUnique({
        where: { id: queryId },
        select: linkSelect
      })

      if (!link) {
        throw createError({ statusCode: 404, message: 'Link not found' })
      }

      await recordLinkAnalytics(event, { linkId: link.id, teamId: link.teamId })
      return buildSingleResponse(link)
    }

    if (slugPart) {
      const team = await findTeamForSlug(normalizedSlug)

      if (team) {
        const links = await prisma.link.findMany({
          where: { teamId: team.id },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            shortId: true,
            title: true,
            targetUrl: true
          }
        })

        if (links.length === 0) {
          throw createError({ statusCode: 404, message: 'No links found for this team' })
        }

        return {
          type: 'list',
          links,
          ...formatTheme(team)
        }
      }
    }

    const link = await prisma.link.findUnique({
      where: { id: identifier },
      select: linkSelect
    })

    if (!link) {
      throw createError({ statusCode: 404, message: 'Link not found' })
    }

    await recordLinkAnalytics(event, { linkId: link.id, teamId: link.teamId })
    return buildSingleResponse(link)
  } catch (error: unknown) {
    const typedError = error as { statusCode?: number, code?: string }
    if (typedError?.statusCode) {
      throw typedError
    }

    console.error('[open.link.get] Failed to resolve link', error)
    throw createError({ statusCode: 500, message: 'Failed to resolve link' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
