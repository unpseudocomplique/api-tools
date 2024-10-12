import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  console.log(await getUserSession(event))
  const session = await requireUserSession(event)
  const userId = session.user.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Non autorisé',
    })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      firstName: true,
      email: true,
      tokens: true,
      autoRecharge: true,
      autoRechargeAmount: true,
    },
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Utilisateur non trouvé',
    })
  }

  return user
})