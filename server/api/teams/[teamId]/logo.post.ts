import { createError, defineEventHandler, getRouterParam, readMultipartFormData } from 'h3'
import { randomUUID } from 'crypto'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { TeamRole } from '@prisma/client'
import prisma from '~~/server/utils/prisma'

const allowedLogoTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/jpg',
  'image/gif',
  'image/webp'
])

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event).catch(() => null)
  const teamId = getRouterParam(event, 'teamId')

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (!process.env.SUPABASE_URL) {
    throw createError({ statusCode: 503, message: 'Storage not configured' })
  }

  if (!teamId) {
    throw createError({ statusCode: 400, message: 'Team ID is required' })
  }

  if (!process.env.DATABASE_URL) {
    throw createError({ statusCode: 503, message: 'Database not configured' })
  }

  const formData = await readMultipartFormData(event)
  const logoFile = formData?.find(part => part.name === 'logo')

  if (!logoFile || !logoFile.filename || !logoFile.type || !logoFile.data?.length) {
    throw createError({ statusCode: 400, message: 'Logo file is required' })
  }

  if (!allowedLogoTypes.has(logoFile.type)) {
    throw createError({ statusCode: 400, message: 'Unsupported file type' })
  }

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

    const cleanName = logoFile.filename.toLowerCase().replace(/\s+/g, '-')
    const unique = randomUUID()
    const path = `${teamId}/${Date.now()}-${unique}-${cleanName}`

    const supabase = serverSupabaseServiceRole(event)

    const { error: uploadError } = await supabase.storage.from('logos').upload(path, logoFile.data, {
      cacheControl: '3600',
      upsert: true,
      contentType: logoFile.type
    })

    if (uploadError) {
      throw createError({ statusCode: 500, message: uploadError.message || 'Failed to upload logo' })
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    const logoUrl = data?.publicUrl

    if (!logoUrl) {
      throw createError({ statusCode: 500, message: 'Logo URL could not be generated' })
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: { logoUrl }
    })

    return { logoUrl: team.logoUrl }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    console.error('[teams.logo.post] Failed to upload logo', error)
    throw createError({ statusCode: 500, message: 'Failed to upload logo' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
