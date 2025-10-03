<template>
  <div class="app-wrapper">
    <AppHeader />
    <div class="dashboard-layout">
      <Sidebar />
      <main class="dashboard-container">
        <section class="card statistics-card">
          <h2 class="section-title">Statistiques de production</h2>

          <!-- Filtre de date -->
          <div class="date-filter-container">
            <div class="form-group">
              <label for="date-filter" class="form-label">Date de référence</label>
              <input
                id="date-filter"
                v-model="selectedDate"
                type="date"
                class="form-control"
                @change="loadStatistics"
              />
            </div>
            <button @click="loadStatistics" class="btn btn-primary" :disabled="loading">
              <span v-if="loading">Chargement...</span>
              <span v-else>Actualiser</span>
            </button>
          </div>

          <!-- Messages d'erreur et de succès -->
          <div v-if="errorMessage" class="alert alert-error">
            {{ errorMessage }}
          </div>

          <!-- Tableau des statistiques -->
          <div v-if="!loading && statistics.length > 0" class="statistics-table-container">
            <h3 class="table-title">Résumé du {{ formatDate(selectedDate) }}</h3>
            <table class="statistics-table">
              <thead>
                <tr>
                  <th>Nom produit</th>
                  <th>Nb Fabriqué</th>
                  <th>Nb Utilisé</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="stat in statistics" :key="stat.productId">
                  <td class="product-name">{{ stat.productName }}</td>
                  <td class="quantity-cell produced">
                    {{ stat.produced || 0 }}
                  </td>
                  <td class="quantity-cell consumed">
                    {{ stat.consumed || 0 }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td><strong>Total</strong></td>
                  <td class="quantity-cell total-produced">
                    <strong>{{ totalProduced }}</strong>
                  </td>
                  <td class="quantity-cell total-consumed">
                    <strong>{{ totalConsumed }}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Message si aucune donnée -->
          <div v-if="!loading && statistics.length === 0" class="no-data">
            <p>Aucune donnée de production trouvée pour cette date.</p>
          </div>

          <!-- Loading state -->
          <div v-if="loading" class="loading-container">
            <div class="loading-spinner"></div>
            <p>Chargement des statistiques...</p>
          </div>
        </section>
      </main>
    </div>
    <AppFooter />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AppHeader from '../AppHeader.vue'
import AppFooter from '../AppFooter.vue'
import Sidebar from '../Sidebar.vue'
import { useUserStore } from '../../stores/user'

// Store et variables réactives
const userStore = useUserStore()
const selectedDate = ref('')
const statistics = ref([])
const loading = ref(false)
const errorMessage = ref('')

// Computed properties
const totalProduced = computed(() => {
  return statistics.value.reduce((sum, stat) => sum + (stat.produced || 0), 0)
})

const totalConsumed = computed(() => {
  return statistics.value.reduce((sum, stat) => sum + (stat.consumed || 0), 0)
})

const totalNet = computed(() => {
  return totalProduced.value - totalConsumed.value
})

// Méthodes utilitaires
function formatDate(dateString) {
  if (!dateString) return 'Date non sélectionnée'
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatTimestamp(timestamp) {
  if (!timestamp) return null
  const date = new Date(timestamp * 1000)
  return date.toISOString().split('T')[0]
}

// Fonctions API
async function fetchApiData(endpoint, options = {}) {
  const { loadingRef = null } = options

  if (loadingRef) {
    loadingRef.value = true
  }

  try {
    const token = userStore.data?.success?.token
    const response = await fetch(`http://localhost/dolibarr/htdocs/api/index.php/${endpoint}`, {
      headers: {
        Accept: 'application/json',
        DOLAPIKEY: token,
      },
    })

    if (!response.ok) {
      let errorMessage = `Erreur lors de la récupération des données: ${endpoint}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error?.message || errorMessage
      } catch (e) {
        const errorText = await response.text()
        errorMessage = errorText || errorMessage
      }
      throw new Error(errorMessage)
    }

    return await response.json()
  } catch (error) {
    console.error('Erreur:', error)
    throw error
  } finally {
    if (loadingRef) {
      loadingRef.value = false
    }
  }
}

async function fetchStockMovements(date) {
  try {
    // Récupérer tous les mouvements de stock
    const movements = await fetchApiData(
      'stockmovements?sortfield=t.rowid&sortorder=ASC&limit=1000',
    )

    // Filtrer par date
    const targetDate = new Date(date)
    const startOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
    )
    const endOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate() + 1,
    )

    const startTimestamp = Math.floor(startOfDay.getTime() / 1000)
    const endTimestamp = Math.floor(endOfDay.getTime() / 1000)

    return movements.filter((movement) => {
      const movementDate = movement.datem
      return movementDate >= startTimestamp && movementDate < endTimestamp
    })
  } catch (error) {
    console.error('Erreur lors du chargement des mouvements:', error)
    throw error
  }
}

async function fetchProducts() {
  try {
    return await fetchApiData('products?sortfield=t.ref&sortorder=ASC&limit=1000')
  } catch (error) {
    console.error('Erreur lors du chargement des produits:', error)
    throw error
  }
}

// Fonction principale pour charger les statistiques
async function loadStatistics() {
  if (!selectedDate.value) {
    errorMessage.value = 'Veuillez sélectionner une date'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    // Récupérer les mouvements de stock et les produits
    const [movements, products] = await Promise.all([
      fetchStockMovements(selectedDate.value),
      fetchProducts(),
    ])

    // Créer un map des produits pour faciliter la recherche
    const productsMap = new Map()
    products.forEach((product) => {
      productsMap.set(product.id, {
        id: product.id,
        ref: product.ref,
        label: product.label || 'Sans libellé',
      })
    })

    // Calculer les statistiques par produit
    const statsMap = new Map()

    movements.forEach((movement) => {
      const productId = movement.product_id
      const quantity = parseFloat(movement.qty) || 0
      const movementType = parseInt(movement.type) || 0

      // Initialiser le produit s'il n'existe pas
      if (!statsMap.has(productId)) {
        const product = productsMap.get(productId)
        statsMap.set(productId, {
          productId: productId,
          productName: product ? `${product.ref} - ${product.label}` : `Produit #${productId}`,
          produced: 0,
          consumed: 0,
          net: 0,
        })
      }

      const stat = statsMap.get(productId)

      // Type 3 = Entrée (Production), Type 2 = Sortie (Production)
      if (movementType === 3 && quantity > 0) {
        // Production
        stat.produced += quantity
      } else if (movementType === 2 && quantity < 0) {
        // Consommation (quantité négative)
        stat.consumed += Math.abs(quantity)
      }
    })

    // Calculer le solde net pour chaque produit
    statsMap.forEach((stat) => {
      stat.net = stat.produced - stat.consumed
    })

    // Convertir en array et trier par nom de produit
    statistics.value = Array.from(statsMap.values()).sort((a, b) =>
      a.productName.localeCompare(b.productName),
    )
  } catch (error) {
    console.error('Erreur lors du chargement des statistiques:', error)
    errorMessage.value = `Erreur: ${error.message}`
  } finally {
    loading.value = false
  }
}

// Au montage du composant
onMounted(() => {
  // Restaurer les données du store si nécessaire
  if (!userStore.data) {
    userStore.restoreData()
  }

  // Vérifier si on a un token valide
  if (!userStore.token) {
    console.error("Aucun token d'authentification trouvé")
    errorMessage.value = 'Session expirée. Veuillez vous reconnecter.'
    return
  }

  // Initialiser la date à aujourd'hui
  const today = new Date()
  selectedDate.value = today.toISOString().split('T')[0]

  // Charger les statistiques pour aujourd'hui
  loadStatistics()
})
</script>

<style scoped>
.statistics-card {
  text-align: left;
  max-width: 1200px;
  margin: 0 auto;
}

.date-filter-container {
  display: flex;
  align-items: end;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--surface-2);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.form-group {
  display: flex;
  flex-direction: column;
  min-width: 200px;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text);
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface-1);
  color: var(--text);
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: none;
  border-radius: 8px;
  padding: 0.9em 1.4em;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.08);
  user-select: none;
}

.btn:active {
  transform: translateY(1px);
}

.btn-primary {
  background: var(--primary);
  color: var(--primary-contrast);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn:disabled {
  background: #3a475c;
  color: #9aa8bf;
  cursor: not-allowed;
  opacity: 0.8;
}

.alert {
  padding: 1rem;
  border-radius: 6px;
  margin: 1rem 0;
  font-weight: 500;
}

.alert-error {
  background: rgba(211, 47, 47, 0.12);
  color: #ef6666;
  border-left: 4px solid #ef6666;
}

.statistics-table-container {
  margin-top: 2rem;
}

.table-title {
  color: var(--primary);
  margin-bottom: 1.5rem;
  font-size: 1.3rem;
  font-weight: 600;
}

.statistics-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: var(--surface-2);
  box-shadow: var(--shadow);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.statistics-table th,
.statistics-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.statistics-table th {
  background: var(--surface-3);
  font-weight: 600;
  color: var(--text);
  border-bottom: 2px solid var(--border);
}

.statistics-table tbody tr {
  transition: background 0.2s;
}

.statistics-table tbody tr:hover {
  background: rgba(33, 150, 243, 0.05);
}

.statistics-table tbody tr:last-child td {
  border-bottom: none;
}

.product-name {
  font-weight: 500;
  color: var(--text);
}

.quantity-cell {
  text-align: right;
  font-family: 'Courier New', monospace;
  font-weight: 600;
  font-size: 1.1rem;
}

.produced {
  color: var(--success);
}

.consumed {
  color: var(--danger);
}

.total-row {
  background: var(--surface-3);
  border-top: 2px solid var(--border);
}

.total-row td {
  font-weight: 600;
  padding: 16px;
}

.total-produced {
  color: var(--success);
}

.total-consumed {
  color: var(--danger);
}

.total-net.positive {
  color: var(--success);
}

.total-net.negative {
  color: var(--danger);
}

.no-data {
  text-align: center;
  padding: 3rem;
  color: var(--muted);
  font-style: italic;
}

.loading-container {
  text-align: center;
  padding: 3rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border);
  border-top: 4px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .date-filter-container {
    flex-direction: column;
    align-items: stretch;
  }

  .form-group {
    min-width: auto;
  }

  .statistics-table {
    font-size: 0.9rem;
  }

  .statistics-table th,
  .statistics-table td {
    padding: 8px 12px;
  }
}
</style>
