<template>
  <div>
    <h1 class="text-3xl font-bold mb-4">Connexion</h1>
    <form @submit.prevent="login">
      <UForm :state="form" @submit="login">
        <UFormGroup label="Email" name="email">
          <UInput v-model="form.email" type="email" />
        </UFormGroup>
        <UFormGroup label="Mot de passe" name="password">
          <UInput v-model="form.password" type="password" />
        </UFormGroup>
        <UButton type="submit" label="Se connecter" />
      </UForm>
    </form>
  </div>
</template>

<script setup>
const form = ref({
  email: '',
  password: '',
})

async function login() {
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: form.value,
    })
    navigateTo('/dashboard')
  } catch (error) {
    console.error('Erreur lors de la connexion:', error)
  }
}
</script>