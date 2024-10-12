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

    const id = event.context.params.id

    try {
        await prisma.apiKey.deleteMany({
            where: {
                id,
                userId,
            },
        })

        return { message: 'Clé API supprimée avec succès' }
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Erreur lors de la suppression de la clé API',
        })
    }
})