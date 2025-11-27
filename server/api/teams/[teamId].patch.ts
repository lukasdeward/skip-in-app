import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { PrismaClient, TeamRole } from '@prisma/client'

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
    name?: string
    primaryColor?: string | null
    logoUrl?: string | null
    font?: string | null
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

    const updates: Record<string, any> = {}

    if (body.name !== undefined) {
      const name = body.name?.toString().trim()
      if (!name) {
        throw createError({ statusCode: 400, message: 'Team name cannot be empty' })
      }
      updates.name = name
    }

    if (body.primaryColor !== undefined) {
      const color = body.primaryColor?.toString().trim()
      updates.primaryColor = color || null
    }

    if (body.logoUrl !== undefined) {
      const url = body.logoUrl?.toString().trim()
      updates.logoUrl = url || null
    }

    if (body.font !== undefined) {
      const font = body.font?.toString().trim()
      updates.font = font || null
    }

    if (Object.keys(updates).length === 0) {
      throw createError({ statusCode: 400, message: 'No updates provided' })
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: updates
    })

    return {
      id: team.id,
      name: team.name,
      logoUrl: team.logoUrl,
      primaryColor: team.primaryColor,
      font: team.font,
      role: membership.role
    }
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    console.error('[teams.id.patch] Failed to update team', error)
    throw createError({ statusCode: 500, message: 'Failed to update team' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
