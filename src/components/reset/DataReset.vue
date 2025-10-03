<template>
  <section class="data-reset card">
    <h2 class="section-title">Réinitialisation des données Dolibarr</h2>
    <button class="btn btn-danger" :disabled="loading" @click="handleReset">
      <span v-if="loading">Réinitialisation...</span>
      <span v-else>Réinitialiser</span>
    </button>

    <div v-if="successMessage" class="popup success-popup" role="alert" aria-live="polite">
      <span class="icon">&#10003;</span>
      <span>{{ successMessage }}</span>
      <button class="close-btn" @click="closePopup" aria-label="Fermer">×</button>
    </div>

    <div v-if="errorMessage" class="popup error-popup" role="alert" aria-live="assertive">
      <span class="icon">&#9888;</span>
      <span>{{ errorMessage }}</span>
      <button class="close-btn" @click="closePopup" aria-label="Fermer">×</button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const loading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const handleReset = async () => {
  loading.value = true
  successMessage.value = ''
  errorMessage.value = ''
  try {
    if (!userStore.data) {
      userStore.restoreData()
    }
    const token = userStore.data?.success?.token
    console.log('Using token:', token)
    const response = await fetch(
      'http://localhost/dolibarr/htdocs/api/index.php/dataresetapi/reset_all',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          DOLAPIKEY: token,
        },
      },
    )
    const data = await response.json()
    if (response.ok && data.success) {
      successMessage.value = data.message || 'Réinitialisation réussie.'
    } else {
      throw new Error(data.message || 'Erreur lors de la réinitialisation')
    }
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    loading.value = false
  }
}

const closePopup = () => {
  successMessage.value = ''
  errorMessage.value = ''
}
</script>

<style scoped>
.data-reset {
  text-align: left;
}
</style>
