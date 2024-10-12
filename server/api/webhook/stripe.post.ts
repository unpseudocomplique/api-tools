import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const stripe = new Stripe(useRuntimeConfig().stripeSecretKey, {
  apiVersion: '2023-10-16',
})

export default defineEventHandler(async (event) => {
  const body = await readRawBody(event)
  const sig = event.node.req.headers['stripe-signature']

  let stripeEvent

  try {
    stripeEvent = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    throw createError({
      statusCode: 400,
      statusMessage: `Webhook Error: ${err.message}`,
    })
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object

    const userId = session.client_reference_id
    const amountPaid = session.amount_total / 100 // Convert cents to euros

    let tokensToAdd

    if (amountPaid === 2) {
      tokensToAdd = 500
    } else if (amountPaid === 3.5) {
      tokensToAdd = 1000
    } else if (amountPaid === 15) {
      tokensToAdd = 5000
    } else {
      throw createError({
        statusCode: 400,
        statusMessage: 'Montant de paiement invalide',
      })
    }

    try {
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
          type: 'token-purchase',
          amount: tokensToAdd,
          status: 'success',
        },
      })
    } catch (error) {
      console.error('Erreur lors de la mise à jour des tokens:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de la mise à jour des tokens',
      })
    }
  }

  return { received: true }
})