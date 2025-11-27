import { createError, defineEventHandler } from 'h3'
import { PrismaClient } from '~~/prisma/client'

export default defineEventHandler(async (event) => {
  const prisma = new PrismaClient()

  try {
    return await prisma.team.findMany()
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to load teams' })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})
