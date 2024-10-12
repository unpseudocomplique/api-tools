// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', 'nuxt-auth-utils'],
  extends: ['@nuxt/ui-pro'],
  runtimeConfig: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    authSecret: process.env.AUTH_SECRET,
  },
})