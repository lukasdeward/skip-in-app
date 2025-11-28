import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { TeamRole } from '@prisma/client'
import prisma from '~~/server/utils/prisma'

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
  const linkId = getRouterParam(event, 'linkId')
  const customerId = typeof user?.id === 'string' ? user.id : user?.id?.toString()

  if (!user || !customerId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (!teamId || !linkId) {
    throw createError({ statusCode: 400, message: 'Team ID and link ID are required' })
  }

  if (!process.env.DATABASE_URL) {
    throw createError({ statusCode: 503, message: 'Database not configured' })
  }

  const body = await readBody<{
    targetUrl?: string
  }>(event)

  try {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_customerId: { teamId, customerId } }
    })

    if (!membership) {
      throw createError({ statusCode: 404, message: 'Team not found' })
    }

    if (membership.role === TeamRole.MEMBER) {
      throw createError({ statusCode: 403, message: 'Insufficient permissions' })
    }

    const existing = await prisma.link.findUnique({ where: { id: linkId } })

    if (!existing || existing.teamId !== teamId) {
      throw createError({ statusCode: 404, message: 'Link not found' })
    }

    const updates: Record<string, any> = {}

    if (body.targetUrl !== undefined) {
      const targetUrl = validateUrl((body.targetUrl || '').toString().trim())
      if (!targetUrl) {
        throw createError({ statusCode: 400, message: 'A valid target URL is required' })
      }
      updates.targetUrl = targetUrl
    }

    if (Object.keys(updates).length === 0) {
      throw createError({ statusCode: 400, message: 'No updates provided' })
    }

    const link = await prisma.link.update({
      where: { id: linkId },
      data: updates
    })

    return {
      id: link.id,
      targetUrl: link.targetUrl,
      clickCount: link.clickCount,
      createdAt: link.createdAt
    }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw createError({ statusCode: 409, message: 'Link already exists for this team' })
    }

    if (error?.statusCode) {
      throw error
    }

    console.error('[teams.links.patch] Failed to update link', error)
    throw createError({ statusCode: 500, message: 'Failed to update link' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
