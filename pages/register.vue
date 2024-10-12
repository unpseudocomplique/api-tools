<template>
  <div>
    <h1 class="text-3xl font-bold mb-4">Inscription</h1>
    <form @submit.prevent="register">
      <UForm :state="form" @submit="register">
        <UFormGroup label="Nom" name="name">
          <UInput v-model="form.name" />
        </UFormGroup>
        <UFormGroup label="Prénom" name="firstName">
          <UInput v-model="form.firstName" />
        </UFormGroup>
        <UFormGroup label="Email" name="email">
          <UInput v-model="form.email" type="email" />
        </UFormGroup>
        <UFormGroup label="Mot de passe" name="password">
          <UInput v-model="form.password" type="password" />
        </UFormGroup>
        <UButton type="submit" label="S'inscrire" />
      </UForm>
    </form>
  </div>
</template>

<script setup>
const form = ref({
  name: '',
  firstName: '',
  email: '',
  password: '',
})

async function register() {
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: form.value,
    })
    navigateTo('/login')
  } catch (error) {
    console.error(`Erreur lors de l'inscription:`, error)
  }
}
</script>