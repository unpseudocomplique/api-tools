<template>
  <div>
    <h1 class="text-3xl font-bold mb-4">Tableau de bord</h1>
    <p>Bienvenue, {{ user.firstName }} {{ user.name }}</p>
    <p>Tokens disponibles : {{ user.tokens }}</p>

    <h2 class="text-2xl font-bold mt-6 mb-4">Récapitulatif des consommations</h2>
    <UTable :columns="columns" :rows="transactions" />

    <h2 class="text-2xl font-bold mt-6 mb-4">Recharger votre compte</h2>
    <div class="flex space-x-4">
      <UCard v-for="plan in plans" :key="plan.tokens">
        <template #header>
          <h3 class="text-lg font-bold">{{ plan.tokens }} tokens</h3>
        </template>
        <p>{{ plan.price }} €</p>
        <template #footer>
          <UButton @click="buyTokens(plan)" label="Acheter" />
        </template>
      </UCard>
    </div>

    <h2 class="text-2xl font-bold mt-6 mb-4">Recharge automatique</h2>
    <UForm :state="autoRechargeForm" @submit="updateAutoRecharge">
      <UFormGroup label="Activer la recharge automatique" name="autoRecharge">
        <UCheckbox v-model="autoRechargeForm.autoRecharge" />
      </UFormGroup>
      <UFormGroup v-if="autoRechargeForm.autoRecharge" label="Montant de recharge" name="autoRechargeAmount">
        <USelect v-model="autoRechargeForm.autoRechargeAmount"
          :options="plans.map(p => ({ label: `${p.tokens} tokens`, value: p.tokens }))" />
      </UFormGroup>
      <UButton type="submit" label="Mettre à jour" />
    </UForm>

    <h2 class="text-2xl font-bold mt-6 mb-4">Clés API</h2>
    <UButton @click="showCreateApiKeyModal = true" label="Créer une nouvelle clé API" />
    <UTable :columns="apiKeyColumns" :rows="apiKeys">
      <template #actions-data="{ row }">
        <UButton @click="deleteApiKey(row.id)" color="red" label="Supprimer" />
      </template>
    </UTable>

    <UModal v-model="showCreateApiKeyModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-bold">Créer une nouvelle clé API</h3>
        </template>
        <UForm :state="apiKeyForm">
          <UFormGroup label="Nom de la clé" name="name">
            <UInput v-model="apiKeyForm.name" />
          </UFormGroup>
          <UButton type="submit" label="Créer" @click="createApiKey" />
        </UForm>
      </UCard>
    </UModal>
  </div>
</template>

<script setup>
const user = ref({})
const transactions = ref([])
const columns = [
  { key: 'type', label: 'Type' },
  { key: 'amount', label: 'Tokens' },
  { key: 'status', label: 'Statut' },
  { key: 'createdAt', label: 'Date' },
]
const plans = [
  { tokens: 500, price: 2 },
  { tokens: 1000, price: 3.5 },
  { tokens: 5000, price: 15 },
]
const autoRechargeForm = ref({
  autoRecharge: false,
  autoRechargeAmount: null,
})

const apiKeys = ref([])
const apiKeyColumns = [
  { key: 'name', label: 'Nom' },
  { key: 'createdAt', label: 'Date de création' },
  { key: 'key', label: 'Key' },
  { key: 'lastUsed', label: 'Dernière utilisation' },
  { key: 'actions', label: 'Actions' },
]
const showCreateApiKeyModal = ref(false)
const apiKeyForm = ref({ name: '' })

onMounted(async () => {
  try {
    user.value = await $fetch('/api/user')
    transactions.value = await $fetch('/api/transactions')
    autoRechargeForm.value = {
      autoRecharge: user.value.autoRecharge,
      autoRechargeAmount: user.value.autoRechargeAmount,
    }
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error)
  }


  try {
    user.value = await $fetch('/api/user')
    apiKeys.value = await $fetch('/api/user/api-keys')
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error)
  }
})

async function buyTokens(plan) {
  try {
    const session = await $fetch('/api/payment/create-session', {
      method: 'POST',
      body: { planId: plan.tokens },
    })
    window.location.href = session.url
  } catch (error) {
    console.error(`Erreur lors de l'achat de tokens:`, error)
  }
}

async function updateAutoRecharge() {
  try {
    await $fetch('/api/user/auto-recharge', {
      method: 'POST',
      body: autoRechargeForm.value,
    })
    user.value = await $fetch('/api/user')
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la recharge automatique:', error)
  }
}

async function createApiKey() {
  try {
    const newApiKey = await $fetch('/api/user/api-keys', {
      method: 'POST',
      body: apiKeyForm.value,
    })
    apiKeys.value.push(newApiKey)
    showCreateApiKeyModal.value = false
    apiKeyForm.value.name = ''
  } catch (error) {
    console.error('Erreur lors de la création de la clé API:', error)
  }
}

async function deleteApiKey(id) {
  try {
    await $fetch(`/api/user/api-keys/${id}`, {
      method: 'DELETE',
    })
    apiKeys.value = apiKeys.value.filter(key => key.id !== id)
  } catch (error) {
    console.error('Erreur lors de la suppression de la clé API:', error)
  }
}
</script>