import { createError, defineEventHandler, getRouterParam } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { PrismaClient } from '~~/prisma/client'

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

  const prisma = new PrismaClient()

  try {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_customerId: { teamId, customerId: user.id } }
    })

    if (!membership) {
      throw createError({ statusCode: 404, message: 'Team not found' })
    }

    const links = await prisma.link.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' }
    })

    return links.map(link => ({
      id: link.id,
      slug: link.slug,
      targetUrl: link.targetUrl,
      title: link.title,
      description: link.description,
      clickCount: link.clickCount,
      createdAt: link.createdAt
    }))
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    console.error('[teams.links.get] Failed to load links', error)
    throw createError({ statusCode: 500, message: 'Failed to load links' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
