import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { PrismaClient, TeamRole } from '~~/prisma/client'

const slugRegex = /^[a-zA-Z0-9-]{1,64}$/

const validateUrl = (value?: string | null) => {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.toString()
  } catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event).catch(() => null)
  const teamId = getRouterParam(event, 'teamId')

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (!teamId) {
    throw createError({ statusCode: 400, message: 'Team ID is required' })
  }

  if (!process.env.DATABASE_URL) {
    throw createError({ statusCode: 503, message: 'Database not configured' })
  }

  const body = await readBody<{
    slug?: string
    targetUrl?: string
    title?: string | null
    description?: string | null
  }>(event)

  const prisma = new PrismaClient()

  try {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_customerId: { teamId, customerId: user.id } }
    })

    if (!membership) {
      throw createError({ statusCode: 404, message: 'Team not found' })
    }

    if (membership.role === TeamRole.MEMBER) {
      throw createError({ statusCode: 403, message: 'Insufficient permissions' })
    }

    const slug = body.slug?.trim()
    const targetUrl = validateUrl(body.targetUrl?.trim())

    if (!slug || !slugRegex.test(slug)) {
      throw createError({ statusCode: 400, message: 'Slug must be alphanumeric and can include dashes' })
    }

    if (!targetUrl) {
      throw createError({ statusCode: 400, message: 'A valid target URL is required' })
    }

    const title = body.title?.trim() || null
    const description = body.description?.trim() || null

    const link = await prisma.link.create({
      data: {
        teamId,
        slug,
        targetUrl,
        title,
        description
      }
    })

    return {
      id: link.id,
      slug: link.slug,
      targetUrl: link.targetUrl,
      title: link.title,
      description: link.description,
      clickCount: link.clickCount,
      createdAt: link.createdAt
    }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw createError({ statusCode: 409, message: 'Slug already exists for this team' })
    }

    if (error?.statusCode) {
      throw error
    }

    console.error('[teams.links.post] Failed to create link', error)
    throw createError({ statusCode: 500, message: 'Failed to create link' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
