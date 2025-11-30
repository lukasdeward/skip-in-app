import type { PrismaClient } from '@prisma/client'

const sanitizeSlug = (value: string) => {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()

  return cleaned || 'team'
}

export const buildTeamSlug = (name: string) => {
  return sanitizeSlug(name.trim())
}

export const generateUniqueTeamSlug = async (name: string, prisma: PrismaClient, excludeTeamId?: string) => {
  const baseSlug = buildTeamSlug(name)
  let candidate = baseSlug
  let suffix = 2

  // Ensure slug uniqueness by appending an incrementing suffix when needed.
  while (true) {
    const existing = await prisma.team.findFirst({
      where: {
        slug: candidate,
        ...(excludeTeamId ? { id: { not: excludeTeamId } } : {})
      },
      select: { id: true }
    })

    if (!existing) {
      return candidate
    }

    candidate = `${baseSlug}${suffix}`
    suffix += 1
  }
}
