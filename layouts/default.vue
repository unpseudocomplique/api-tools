<template>
  <div>
    <UContainer>
      <UHeader>
        <template #left>
          <h1 class="font-bold text-2xl">API Tools</h1>
        </template>
        <template #right>
          <UButton to="/" label="Accueil" />
          <UButton to="/register" label="Inscription" />
          <UButton to="/login" label="Connexion" />
          <UButton to="/dashboard" label="Tableau de bord" />
        </template>
      </UHeader>
      <main>
        <slot />
      </main>
    </UContainer>
  </div>
</template>