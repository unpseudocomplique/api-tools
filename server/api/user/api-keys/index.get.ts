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

    try {
        const apiKeys = await prisma.apiKey.findMany({
            where: { userId },
            select: {
                id: true,
                name: true,
                key: true,
                createdAt: true,
                lastUsed: true,
            },
        })

        return apiKeys
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Erreur lors de la récupération des clés API',
        })
    }
})