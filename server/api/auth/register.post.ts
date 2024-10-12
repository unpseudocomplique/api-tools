import { hash } from 'bcrypt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, firstName, email, password } = body

  const hashedPassword = await hash(password, 10)

  try {
    const user = await prisma.user.create({
      data: {
        name,
        firstName,
        email,
        password: hashedPassword,
      },
    })

    return { message: 'Utilisateur créé avec succès' }
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error)
    throw createError({
      statusCode: 400,
      statusMessage: `Erreur lors de la création de l'utilisateur`,
    })
  }
})