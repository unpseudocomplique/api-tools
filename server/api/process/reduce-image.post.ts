import sharp from 'sharp'
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
  const { imageData, fileName, quality } = body

  // Vérifier les tokens de l'utilisateur
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const requiredTokens = Math.ceil(imageData.length / (1024 * 1024)) // 1 token par Mo

  if (user.tokens < requiredTokens) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tokens insuffisants',
    })
  }

  try {
    // Réduction de l'image
    const reducedImageBuffer = await sharp(imageData)
      .jpeg({ quality: quality || 80 })
      .toBuffer()

    // Mise à jour des tokens et enregistrement de la transaction
    await prisma.user.update({
      where: { id: userId },
      data: { tokens: user.tokens - requiredTokens },
    })

    await prisma.transaction.create({
      data: {
        userId,
        type: 'reduce-image',
        amount: requiredTokens,
        status: 'success',
      },
    })

    return {
      reducedImage: reducedImageBuffer,
      fileName: `reduced_${fileName}`,
      tokensUsed: requiredTokens,
    }
  } catch (error) {
    await prisma.transaction.create({
      data: {
        userId,
        type: 'reduce-image',
        amount: requiredTokens,
        status: 'failed',
      },
    })

    throw createError({
      statusCode: 500,
      statusMessage: `Erreur lors de la réduction de l'image`,
    })
  }
})