import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set; Prisma cannot initialize.')
}

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient }

const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    datasources: {
      db: { url: databaseUrl }
    }
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma
}

export default prisma
