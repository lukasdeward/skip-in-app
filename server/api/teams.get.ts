import { createError, defineEventHandler } from 'h3'
import { serverSupabaseUser } from '#supabase/server'

const getPrisma = async () => {
  const { PrismaClient } = await import('~~/prisma/client')
  return new PrismaClient({})
}

export default defineEventHandler(async (event) => {
  const prisma = await getPrisma()

  try {
    return await prisma.team.findMany()
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to load teams' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
