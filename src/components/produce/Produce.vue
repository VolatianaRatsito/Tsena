<template>
  <div class="app-wrapper">
    <AppHeader />
    <div class="dashboard-layout">
      <Sidebar />
      <main class="dashboard-container">
        <section class="card produce-card">
          <div class="produce-header">
            <h2 class="section-title">Production de l'ordre de fabrication</h2>
            <button @click="goBack" class="btn btn-secondary">
              ← Retour aux ordres de fabrication
            </button>
          </div>

          <!-- Informations de l'ordre de fabrication -->
          <div v-if="moDetails" class="mo-info">
            <h3 class="details-title">Détails de l'ordre</h3>
            <div class="details-content">
              <p><strong>Référence:</strong> {{ moDetails.ref }}</p>
              <p>
                <strong>Produit:</strong>
                {{ productRefs[moDetails.fk_product] || `#${moDetails.fk_product}` }}
              </p>
              <p><strong>Quantité:</strong> {{ moDetails.qty }}</p>
              <p><strong>Statut:</strong> {{ getStatusLabel(moDetails.status) }}</p>
              <p>
                <strong>Entrepôt:</strong>
                {{ warehouseRefs[moDetails.fk_warehouse] || `#${moDetails.fk_warehouse}` }}
              </p>
            </div>
          </div>

          <!-- Messages d'erreur et de succès -->
          <div v-if="errorMessage" class="alert alert-error">
            {{ errorMessage }}
          </div>
          <div v-if="successMessage" class="alert alert-success">
            {{ successMessage }}
          </div>

          <!-- Sections de consommation et production -->
          <div v-if="moDetails && moDetails.lines" class="production-sections">
            <!-- Section des matières à consommer -->
            <div class="consume-section">
              <h3 class="section-subtitle">Matières à consommer</h3>
              <div v-if="linesToConsume.length > 0" class="lines-container">
                <div v-for="line in linesToConsume" :key="line.id" class="production-line">
                  <div class="line-info">
                    <p>
                      <strong>Produit:</strong>
                      {{ productRefs[line.fk_product] || `#${line.fk_product}` }}
                    </p>
                    <p><strong>Quantité requise:</strong> {{ line.qty }}</p>
                    <p>
                      <strong>Entrepôt:</strong>
                      {{ warehouseRefs[line.fk_warehouse] || `#${line.fk_warehouse}` }}
                    </p>
                  </div>
                  <div class="line-actions">
                    <label class="form-label">Quantité à consommer:</label>
                    <input
                      v-model.number="line.qtyToConsume"
                      type="number"
                      :max="line.qty"
                      min="0"
                      step="0.01"
                      class="form-control qty-input"
                    />
                  </div>
                </div>
              </div>
              <p v-else class="no-items">Aucune matière à consommer</p>
            </div>

            <!-- Section des produits à fabriquer -->
            <div class="produce-section">
              <h3 class="section-subtitle">Produits à fabriquer</h3>
              <div v-if="linesToProduce.length > 0" class="lines-container">
                <div v-for="line in linesToProduce" :key="line.id" class="production-line">
                  <div class="line-info">
                    <p>
                      <strong>Produit:</strong>
                      {{ productRefs[line.fk_product] || `#${line.fk_product}` }}
                    </p>
                    <p><strong>Quantité à produire:</strong> {{ line.qty }}</p>
                    <p>
                      <strong>Entrepôt:</strong>
                      {{ warehouseRefs[line.fk_warehouse] || `#${line.fk_warehouse}` }}
                    </p>
                  </div>
                  <div class="line-actions">
                    <label class="form-label">Quantité à produire:</label>
                    <input
                      v-model.number="line.qtyToProduce"
                      type="number"
                      :max="line.qty"
                      min="0"
                      step="0.01"
                      class="form-control qty-input"
                    />
                  </div>
                </div>
              </div>
              <p v-else class="no-items">Aucun produit à fabriquer</p>
            </div>
          </div>

          <!-- Boutons d'action -->
          <div class="form-actions" v-if="moDetails">
            <button
              @click="executeProduction"
              :disabled="!canProduce || producing"
              class="btn btn-primary"
            >
              <span v-if="producing">Production en cours...</span>
              <span v-else>Exécuter la production</span>
            </button>
            <button @click="resetQuantities" class="btn btn-secondary">
              Réinitialiser les quantités
            </button>
          </div>

          <!-- Chargement -->
          <div v-if="loading" class="loading-container">
            <p class="loading-text">Chargement des détails de l'ordre de fabrication...</p>
          </div>
        </section>
      </main>
    </div>
    <AppFooter />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '../AppHeader.vue'
import AppFooter from '../AppFooter.vue'
import Sidebar from '../Sidebar.vue'
import { useUserStore } from '../../stores/user'

// Store et router
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

// Variables réactives
const moDetails = ref(null)
const productRefs = ref({})
const warehouseRefs = ref({})
const loading = ref(true)
const producing = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Computed properties
const moId = computed(() => route.query.mo_id)

const linesToConsume = computed(() => {
  if (!moDetails.value?.lines) return []
  return moDetails.value.lines
    .filter((line) => line.role === 'toconsume')
    .map((line) => ({
      ...line,
      qtyToConsume: line.qtyToConsume || line.qty,
    }))
})

const linesToProduce = computed(() => {
  if (!moDetails.value?.lines) return []
  return moDetails.value.lines
    .filter((line) => line.role === 'toproduce')
    .map((line) => ({
      ...line,
      qtyToProduce: line.qtyToProduce || line.qty,
    }))
})

const canProduce = computed(() => {
  return (
    moDetails.value &&
    moDetails.value.status === 1 &&
    (linesToConsume.value.length > 0 || linesToProduce.value.length > 0)
  )
})

// Méthodes utilitaires
function getStatusLabel(status) {
  const statusMap = {
    0: 'Brouillon',
    1: 'Validé',
    2: 'En cours',
    3: 'Fabriqué',
    9: 'Annulé',
  }
  return statusMap[status] || 'Inconnu'
}

function goBack() {
  router.push('/mos')
}

// Récupération des détails de l'ordre de fabrication
async function fetchMODetails() {
  if (!moId.value) {
    errorMessage.value = "Aucun ID d'ordre de fabrication fourni"
    loading.value = false
    return
  }

  try {
    const token = userStore.data?.success?.token
    const response = await fetch(
      `http://localhost/dolibarr/htdocs/api/index.php/mos/${moId.value}`,
      {
        headers: {
          Accept: 'application/json',
          DOLAPIKEY: token,
        },
      },
    )

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des détails')
    }

    const data = await response.json()
    moDetails.value = data

    // Récupérer les références des produits et entrepôts
    await fetchProductAndWarehouseRefs()
  } catch (error) {
    console.error('Erreur:', error)
    errorMessage.value = `Erreur: ${error.message}`
  } finally {
    loading.value = false
  }
}

// Récupération des références produits et entrepôts
async function fetchProductAndWarehouseRefs() {
  const productIds = new Set()
  const warehouseIds = new Set()

  // Collecter les IDs depuis l'ordre de fabrication
  if (moDetails.value.fk_product) productIds.add(moDetails.value.fk_product)
  if (moDetails.value.fk_warehouse) warehouseIds.add(moDetails.value.fk_warehouse)

  // Collecter les IDs depuis les lignes
  if (moDetails.value.lines) {
    moDetails.value.lines.forEach((line) => {
      if (line.fk_product) productIds.add(line.fk_product)
      if (line.fk_warehouse) warehouseIds.add(line.fk_warehouse)
    })
  }

  // Récupérer les références
  await Promise.all([
    fetchRefsForIds([...productIds], productRefs, 'products'),
    fetchRefsForIds([...warehouseIds], warehouseRefs, 'warehouses'),
  ])
}

async function fetchRefsForIds(ids, cache, endpoint) {
  const token = userStore.data?.success?.token

  const promises = ids.map(async (id) => {
    if (!cache.value[id]) {
      try {
        const response = await fetch(
          `http://localhost/dolibarr/htdocs/api/index.php/${endpoint}/${id}`,
          {
            headers: {
              Accept: 'application/json',
              DOLAPIKEY: token,
            },
          },
        )
        if (response.ok) {
          const data = await response.json()
          cache.value[id] = data.ref
        }
      } catch (error) {
        console.error(`Erreur lors de la récupération de ${endpoint} ${id}:`, error)
        cache.value[id] = `#${id}`
      }
    }
  })

  await Promise.all(promises)
}

async function getWarehouseByProductId(productId) {
  try {
    const token = userStore.data?.success?.token
    const url = `http://localhost/dolibarr/htdocs/api/index.php/products/${productId}/stock`
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        DOLAPIKEY: token,
      },
    })
    if (!response.ok) throw new Error('Erreur API stock')
    const data = await response.json()
    // On récupère la première clé de stock_warehouses (l'id du warehouse)
    const warehouseIds = Object.keys(data.stock_warehouses || {})
    return warehouseIds.length > 0 ? warehouseIds[0] : null
  } catch (error) {
    console.error('Erreur getWarehouseByProductId:', error)
    return null
  }
}

async function executeProduction() {
  producing.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const token = userStore.data?.success?.token

    // Générer un code d'inventaire unique
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    const inventoryCode = `PRODUCE-${year}-${month}-${day}-${hours}${minutes}`

    // Préparer les données avec fk_warehouse dynamique
    const arraytoconsume = []
    for (const line of linesToConsume.value.filter((l) => l.qtyToConsume > 0)) {
      let warehouseId = line.fk_warehouse
      if (!warehouseId && line.fk_product) {
        warehouseId = await getWarehouseByProductId(line.fk_product)
      }
      arraytoconsume.push({
        objectid: line.id,
        qty: line.qtyToConsume,
        fk_warehouse: warehouseId,
      })
    }

    const arraytoproduce = []
    for (const line of linesToProduce.value.filter((l) => l.qtyToProduce > 0)) {
      let warehouseId = line.fk_warehouse
      if (!warehouseId && line.fk_product) {
        warehouseId = await getWarehouseByProductId(line.fk_product)
      }
      arraytoproduce.push({
        objectid: line.id,
        qty: line.qtyToProduce,
        fk_warehouse: warehouseId || moDetails.value.fk_warehouse || null,
      })
    }

    const produceData = {
      inventorylabel: `Production partielle de ${moDetails.value.ref}`,
      inventorycode: inventoryCode,
      autoclose: 1, // Ne pas fermer automatiquement pour production partielle
      arraytoconsume,
      arraytoproduce,
    }

    const response = await fetch(
      `http://localhost/dolibarr/htdocs/api/index.php/mos/${moId.value}/produceandconsume`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          DOLAPIKEY: token,
        },
        body: JSON.stringify(produceData),
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Erreur lors de la production')
    }

    successMessage.value = `Production exécutée avec succès pour ${moDetails.value.ref}`

    // Recharger les détails pour voir les changements
    await fetchMODetails()

    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error) {
    console.error('Erreur lors de la production:', error)
    errorMessage.value = `Erreur lors de la production: ${error.message}`

    setTimeout(() => {
      errorMessage.value = ''
    }, 5000)
  } finally {
    producing.value = false
  }
}

// Réinitialiser les quantités
function resetQuantities() {
  linesToConsume.value.forEach((line) => {
    line.qtyToConsume = line.qty
  })
  linesToProduce.value.forEach((line) => {
    line.qtyToProduce = line.qty
  })
}

// Au montage du composant
onMounted(async () => {
  if (!userStore.data) {
    userStore.restoreData()
  }

  if (!userStore.token) {
    errorMessage.value = 'Session expirée. Veuillez vous reconnecter.'
    router.push('/')
    return
  }

  await fetchMODetails()
})
</script>

<style scoped></style>
