import { compare } from 'bcrypt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Email ou mot de passe incorrect',
    })
  }

  const isPasswordValid = await compare(password, user.password)

  if (!isPasswordValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Email ou mot de passe incorrect',
    })
  }


  await setUserSession(event, {
    user
})

  return { message: 'Connexion réussie' }
})