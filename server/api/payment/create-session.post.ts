import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const stripe = new Stripe(useRuntimeConfig().stripeSecretKey, {
  apiVersion: '2023-10-16',
})

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
  const { planId } = body

  const plans = {
    500: { price: 200, name: '500 tokens' },
    1000: { price: 350, name: '1000 tokens' },
    5000: { price: 1500, name: '5000 tokens' },
  }

  const plan = plans[planId]

  if (!plan) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Plan invalide',
    })
  }

  const stripeSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: plan.name,
          },
          unit_amount: plan.price,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${event.node.req.headers.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${event.node.req.headers.origin}/dashboard`,
    client_reference_id: userId,
  })

  return { url: stripeSession.url }
})