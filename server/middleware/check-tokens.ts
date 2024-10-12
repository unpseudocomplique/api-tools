import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  return
    const session = await requireUserSession(event)
  const userId = session.user.id

  if (!userId) return

  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (user.autoRecharge && user.tokens < 500) {
    const tokensToAdd = user.autoRechargeAmount || 5000
    const amountToPay = tokensToAdd === 500 ? 200 : tokensToAdd === 1000 ? 350 : 1500

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountToPay,
        currency: 'eur',
        customer: user.stripeCustomerId,
        automatic_payment_methods: {
          enabled: true,
        },
      })

      if (paymentIntent.status === 'succeeded') {
        await prisma.user.update({
          where: { id: userId },
          data: {
            tokens: {
              increment: tokensToAdd,
            },
          },
        })

        await prisma.transaction.create({
          data: {
            userId,
            type: 'auto-recharge',
            amount: tokensToAdd,
            status: 'success',
          },
        })
      }
    } catch (error) {
      console.error('Erreur lors de la recharge automatique:', error)
      await prisma.transaction.create({
        data: {
          userId,
          type: 'auto-recharge',
          amount: tokensToAdd,
          status: 'failed',
        },
      })
    }
  }
})