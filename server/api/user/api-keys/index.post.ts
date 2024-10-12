import { PrismaClient } from '@prisma/client'
import { generateApiKey } from 'generate-api-key'

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
    const { name } = body

    if (!name) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Le nom de la clé API est requis',
        })
    }

    const apiKey = generateApiKey({ prefix: 'api-tools-', batch: 1 })[0]

    console.log(apiKey)
    try {
        const newApiKey = await prisma.apiKey.create({
            data: {
                userId,
                key: apiKey,
                name,
            },
        })

        return {
            id: newApiKey.id,
            name: newApiKey.name,
            key: apiKey,
            createdAt: newApiKey.createdAt,
        }
    } catch (error) {
        console.error('Erreur lors de la création de la clé API:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Erreur lors de la création de la clé API',
        })
    }
})