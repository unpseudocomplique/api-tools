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

  const body = await readBody(event)
  const { autoRecharge, autoRechargeAmount } = body

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        autoRecharge,
        autoRechargeAmount: autoRecharge ? autoRechargeAmount : null,
      },
    })

    return { message: 'Préférences de recharge automatique mises à jour' }
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Erreur lors de la mise à jour des préférences',
    })
  }
})