<template>
  <section class="data-import card">
    <h2 class="section-title">Importation des données Dolibarr</h2>

    <form @submit.prevent="handleSubmit" enctype="multipart/form-data">
      <table class="dm-table">
        <thead>
          <tr>
            <th>Type de fichier</th>
            <th>Upload</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr class="oddeven">
            <td>Fichier 2 (données mixtes)</td>
            <td>
              <input type="file" accept=".csv" @change="onFileChange($event, 'file2')" />
            </td>
            <td><small>CSV mixte, voir documentation API</small></td>
          </tr>
          <tr class="oddeven">
            <td>Fichier 1 (données mixtes)</td>
            <td>
              <input type="file" accept=".csv" @change="onFileChange($event, 'file1')" />
            </td>
            <td><small>CSV mixte, voir documentation API</small></td>
          </tr>
        </tbody>
      </table>

      <div class="actions">
        <button class="btn btn-primary" :disabled="loading">
          <span v-if="loading">Importation...</span>
          <span v-else>Importer</span>
        </button>
      </div>
    </form>

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

const files = ref({
  file1: null,
  file2: null,
})

function onFileChange(event, type) {
  files.value[type] = event.target.files[0] || null
}

async function handleSubmit() {
  loading.value = true
  successMessage.value = ''
  errorMessage.value = ''
  if (!userStore.data) {
    userStore.restoreData()
  }
  const token = userStore.data?.success?.token
  console.log('Using token:', token)
  const importResults = []
  try {
    // Ordre d'appel : file2 puis file1
    const endpoints = [
      {
        type: 'file2',
        url: 'http://localhost/dolibarr/htdocs/api/index.php/dataimportapi/import_file2',
      },
      {
        type: 'file1',
        url: 'http://localhost/dolibarr/htdocs/api/index.php/dataimportapi/import_file1',
      },
    ]
    let anyFile = false
    for (const { type, url } of endpoints) {
      const file = files.value[type]
      if (!file) continue
      anyFile = true
      const fileContent = await readFileAsBase64(file)
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          DOLAPIKEY: token,
        },
        body: JSON.stringify({
          file_content: fileContent,
          filename: file.name,
        }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        importResults.push(`${type}: OK`)
      } else {
        importResults.push(`${type}: ${data.message || 'Erreur'}`)
      }
    }
    if (!anyFile) {
      throw new Error('Aucun fichier sélectionné')
    }
    const errors = importResults.filter((r) => !r.endsWith('OK'))
    if (errors.length) {
      errorMessage.value = 'Erreur(s) import : ' + errors.join(', ')
    } else {
      successMessage.value = 'Importation réussie !'
    }
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    loading.value = false
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function closePopup() {
  successMessage.value = ''
  errorMessage.value = ''
}
</script>

<style scoped>
.data-import {
  text-align: left;
}

.dm-table {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  margin-bottom: 1.25rem;
  overflow: hidden;
  border-radius: 10px;
  background: var(--surface-1);
  border: 1px solid var(--border);
}

.dm-table thead tr {
  background: #1c2536;
}

.dm-table th,
.dm-table td {
  text-align: left;
  padding: 0.9rem 1rem;
  vertical-align: middle;
}

.dm-table th {
  font-weight: 700;
  color: #d5e3ff;
  border-bottom: 1px solid var(--border);
}

.dm-table tbody tr {
  border-bottom: 1px solid var(--border);
}

.dm-table tbody tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.02);
}

.dm-table small {
  color: var(--muted);
}

.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
