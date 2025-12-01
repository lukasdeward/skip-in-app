import { randomUUID } from 'crypto'
import { createError, defineEventHandler, getRequestURL, getRouterParam, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { TeamRole } from '@prisma/client'
import prisma from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const { customerId } = await requireUser(event)
  const teamId = getRouterParam(event, 'teamId')

  if (!teamId) {
    throw createError({ statusCode: 400, message: 'Team ID is required' })
  }

  if (!process.env.DATABASE_URL) {
    throw createError({ statusCode: 503, message: 'Database not configured' })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY) {
    throw createError({ statusCode: 503, message: 'Supabase service key not configured' })
  }

  const body = await readBody<{
    email?: string
    customerId?: string
    role?: TeamRole
  }>(event)

  try {
    const supabase = serverSupabaseServiceRole(event)

    const findSupabaseUserByEmail = async (email: string) => {
      const normalized = email.trim().toLowerCase()
      let page = 1
      const perPage = 200

      while (true) {
        const { data, error: listError } = await supabase.auth.admin.listUsers({ page, perPage })
        if (listError) {
          throw createError({ statusCode: listError.status || 500, message: listError.message || 'Failed to lookup user' })
        }

        const found = data?.users?.find(user => (user.email || '').toLowerCase() === normalized)
        if (found) return found

        if (!data?.nextPage) break
        page = data.nextPage
      }

      return null
    }
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_customerId: { teamId, customerId } }
    })

    if (!membership) {
      throw createError({ statusCode: 404, message: 'Team not found' })
    }

    if (![TeamRole.OWNER, TeamRole.ADMIN].includes(membership.role)) {
      throw createError({ statusCode: 403, message: 'Insufficient permissions' })
    }

    const rawEmail = body.email?.trim().toLowerCase()
    const providedCustomerId = body.customerId?.trim()
    const requestedRole = body.role && Object.values(TeamRole).includes(body.role) ? body.role : TeamRole.MEMBER

    if (requestedRole === TeamRole.OWNER && membership.role !== TeamRole.OWNER) {
      throw createError({ statusCode: 403, message: 'Only an owner can assign the owner role' })
    }

    let targetEmail = rawEmail || ''
    let existingCustomer = null

    if (!targetEmail && providedCustomerId) {
      existingCustomer = await prisma.customer.findUnique({ where: { id: providedCustomerId } })
      if (!existingCustomer) {
        throw createError({ statusCode: 404, message: 'User not found' })
      }
      targetEmail = existingCustomer.email.trim().toLowerCase()
    }

    if (!targetEmail) {
      throw createError({ statusCode: 400, message: 'Email is required to invite a member' })
    }

    if (!existingCustomer) {
      existingCustomer = await prisma.customer.findUnique({ where: { email: targetEmail } })
    }

    if (existingCustomer) {
      const alreadyMember = await prisma.teamMember.findUnique({
        where: { teamId_customerId: { teamId, customerId: existingCustomer.id } }
      })

      if (alreadyMember) {
        throw createError({ statusCode: 409, message: 'User is already a member of this team' })
      }
    }

    const requestUrl = getRequestURL(event)
    const redirectOrigin = requestUrl?.origin || ''
    const redirectTo = redirectOrigin ? `${redirectOrigin}/dashboard` : undefined

    let targetUserId = existingCustomer?.id || null

    if (!targetUserId) {
      const found = await findSupabaseUserByEmail(targetEmail)
      targetUserId = found?.id || null
    }

    if (!targetUserId) {
      const { data: created, error: createUserError } = await supabase.auth.admin.createUser({ email: targetEmail })
      if (createUserError) {
        throw createError({ statusCode: createUserError.status || 500, message: createUserError.message || 'Failed to create user' })
      }
      targetUserId = created?.user?.id || created?.id || null
    }

    if (!targetUserId) {
      throw createError({ statusCode: 500, message: 'Failed to resolve user for invite' })
    }

    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: false
      }
    })

    if (magicLinkError) {
      throw createError({ statusCode: 500, message: magicLinkError.message || 'Failed to send login link' })
    }

    if (existingCustomer && existingCustomer.id !== targetUserId) {
      throw createError({ statusCode: 409, message: 'A different account already uses this email' })
    }

    const customer = await prisma.customer.upsert({
      where: { id: targetUserId },
      update: { email: targetEmail },
      create: {
        id: targetUserId,
        email: targetEmail,
        stripeCustomerId: `temp_${randomUUID()}`
      }
    })

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        customerId: customer.id,
        role: requestedRole
      },
      include: { customer: true }
    })

    return {
      id: member.id,
      customerId: member.customerId,
      role: member.role,
      joinedAt: member.createdAt,
      email: member.customer.email,
      name: member.customer.name
    }
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    console.error('[teams.members.post] Failed to add member', error)
    throw createError({ statusCode: 500, message: 'Failed to add member' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
