import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event)
  const userId = session.user.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Non autorisé',
    })
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  return transactions
})