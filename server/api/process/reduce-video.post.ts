import ffmpeg from 'fluent-ffmpeg'
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
  const { videoData, fileName } = body

  // Vérifier les tokens de l'utilisateur
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const requiredTokens = Math.ceil(videoData.length / (1024 * 1024 * 10)) // 1 token par 10 Mo

  if (user.tokens < requiredTokens) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tokens insuffisants',
    })
  }

  try {
    // Réduction de la vidéo
    const reducedVideoBuffer = await new Promise((resolve, reject) => {
      ffmpeg(videoData)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size('50%')
        .on('end', resolve)
        .on('error', reject)
        .toBuffer()
    })

    // Mise à jour des tokens et enregistrement de la transaction
    await prisma.user.update({
      where: { id: userId },
      data: { tokens: user.tokens - requiredTokens },
    })

    await prisma.transaction.create({
      data: {
        userId,
        type: 'reduce-video',
        amount: requiredTokens,
        status: 'success',
      },
    })

    return {
      reducedVideo: reducedVideoBuffer,
      fileName: `reduced_${fileName}`,
      tokensUsed: requiredTokens,
    }
  } catch (error) {
    await prisma.transaction.create({
      data: {
        userId,
        type: 'reduce-video',
        amount: requiredTokens,
        status: 'failed',
      },
    })

    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la réduction de la vidéo',
    })
  }
})