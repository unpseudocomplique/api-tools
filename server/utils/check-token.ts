import type { H3Event, EventHandlerRequest } from 'h3'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export const checkToken = async (event: H3Event<EventHandlerRequest>) => {
    const authorization = getHeader(event, 'Authorization')

    const token = authorization?.split(' ')[1]

    if (!token) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Non autorisé',
        })
    }

    const token_user = await prisma.apiKey.findUnique({
        where: {
            key: token,
        },
        include: {
            user: true,
        }
    })

    if (!token_user?.user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Non autorisé',
        })
    }

    return token_user.user
}