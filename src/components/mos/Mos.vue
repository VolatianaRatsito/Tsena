<template>
  <div class="app-wrapper">
    <AppHeader />
    <div class="dashboard-layout">
      <Sidebar />
      <main class="dashboard-container">
        <section class="card mos-card">
          <h2 class="section-title">Créer un ordre de fabrication</h2>

          <!-- Formulaire de création -->
          <div class="form-container">
            <!-- Sélection de la nomenclature (BOM) -->
            <div class="form-group">
              <label for="bom-select" class="form-label">
                Nomenclature (BOM) <span class="required">*</span>
              </label>
              <select
                id="bom-select"
                v-model="selectedBom"
                class="form-control"
                :disabled="loadingBoms"
              >
                <option value="">-- Sélectionner une nomenclature --</option>
                <option v-for="bom in boms" :key="bom.id" :value="bom.id">
                  {{ bom.ref }} - {{ bom.label || 'Sans libellé' }} (Produit:
                  {{ productRefs[bom.fk_product] || `#${bom.fk_product}` }})
                </option>
              </select>
              <p v-if="loadingBoms" class="loading-text">Chargement des nomenclatures...</p>
            </div>

            <!-- Quantité à produire -->
            <div class="form-group">
              <label for="qty-input" class="form-label">
                Quantité à produire <span class="required">*</span>
              </label>
              <input
                id="qty-input"
                v-model.number="quantity"
                type="number"
                min="1"
                step="1"
                class="form-control"
                placeholder="Entrez la quantité"
              />
            </div>

            <!-- Affichage des détails de la BOM sélectionnée -->
            <div v-if="selectedBomDetails" class="bom-details">
              <h3 class="details-title">Détails de la nomenclature</h3>
              <div class="details-content">
                <p><strong>Référence:</strong> {{ selectedBomDetails.ref }}</p>
                <p><strong>Libellé:</strong> {{ selectedBomDetails.label || 'Non défini' }}</p>
                <p>
                  <strong>Produit à fabriquer:</strong>
                  {{
                    productRefs[selectedBomDetails.fk_product] ||
                    `#${selectedBomDetails.fk_product}`
                  }}
                </p>
                <p><strong>Quantité par défaut:</strong> {{ selectedBomDetails.qty }}</p>
                <p>
                  <strong>Entrepot de fabrication:</strong>
                  {{
                    warehouseRefs[selectedBomDetails.fk_warehouse] ||
                    `#${selectedBomDetails.fk_warehouse}`
                  }}
                </p>
                <p>
                  <strong>Efficacité:</strong>
                  {{ (selectedBomDetails.efficiency * 100).toFixed(0) }}%
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

            <!-- Boutons d'action -->
            <div class="form-actions">
              <button @click="createMO" :disabled="!canSubmit || creating" class="btn btn-primary">
                <span v-if="creating">Création en cours...</span>
                <span v-else>Créer l'ordre de fabrication</span>
              </button>
              <button @click="resetForm" class="btn btn-secondary">Réinitialiser</button>
            </div>
          </div>

          <!-- Liste des ordres de fabrication récents -->
          <div class="recent-mos" v-if="recentMOs.length > 0">
            <h3 class="section-subtitle">Ordres de fabrication récents</h3>
            <table class="mos-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Produit</th>
                  <th>Quantité</th>
                  <th>Entrepot</th>
                  <th>Statut</th>
                  <th>Date de création</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="mo in recentMOs" :key="mo.id">
                  <td>{{ mo.ref }}</td>
                  <td>{{ productRefs[mo.fk_product] || `#${mo.fk_product}` }}</td>
                  <td>{{ mo.qty }}</td>
                  <td>{{ warehouseRefs[mo.fk_warehouse] || mo.fk_warehouse || 'N/A' }}</td>
                  <td>
                    <span :class="getStatusClass(mo.status)">
                      {{ getStatusLabel(mo.status) }}
                    </span>
                  </td>
                  <td>{{ formatDate(mo.date_creation) }}</td>
                  <td>
                    <div class="action-buttons">
                      <button
                        v-if="mo.status === 0"
                        @click="validateMO(mo)"
                        :disabled="validatingMOs.has(mo.id)"
                        class="btn btn-validate"
                      >
                        <span v-if="validatingMOs.has(mo.id)">Validation...</span>
                        <span v-else>Valider</span>
                      </button>
                      <button
                        v-if="mo.status === 1"
                        @click="consumeandproduceMO(mo.id)"
                        :disabled="producingMOs.has(mo.id)"
                        class="btn btn-produce"
                      >
                        <span v-if="producingMOs.has(mo.id)">Production...</span>
                        <span v-else>Consumer et produire</span>
                      </button>
                      <button
                        v-if="mo.status === 1"
                        @click="consumeandproduceallMO(mo)"
                        :disabled="producingMOs.has(mo.id)"
                        class="btn btn-produce"
                      >
                        <span v-if="producingMOs.has(mo.id)">Production...</span>
                        <span v-else>Consumer et produire tout</span>
                      </button>
                      <span v-if="mo.status !== 0 && mo.status !== 1" class="no-action">-</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
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
import { useRouter } from 'vue-router'

// Store et variables réactives
const userStore = useUserStore()
const boms = ref([])
const products = ref([])
const productRefs = ref({}) // Cache pour les références de produits
const warehouseRefs = ref({}) // Cache pour les références d'entrepots
const recentMOs = ref([])
const selectedBom = ref('')
const quantity = ref(1)
const loadingBoms = ref(true)
const loadingProducts = ref(true)
const creating = ref(false)
const validatingMOs = ref(new Set()) // Pour tracker les MO en cours de validation
const producingMOs = ref(new Set()) // Pour tracker les MO en cours de production
const errorMessage = ref('')
const successMessage = ref('')
const router = useRouter()

// Computed properties
const selectedBomDetails = computed(() => {
  if (!selectedBom.value) return null
  return boms.value.find((b) => b.id === selectedBom.value)
})

const canSubmit = computed(() => {
  return selectedBom.value && quantity.value > 0
})

// Méthodes utilitaires
function getProductLabel(productId) {
  const product = products.value.find((p) => p.id === productId)
  return product ? `${product.ref} - ${product.label}` : `Produit #${productId}`
}

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

function getStatusClass(status) {
  const classMap = {
    0: 'status-draft',
    1: 'status-validated',
    2: 'status-inprogress',
    3: 'status-produced',
    9: 'status-canceled',
  }
  return classMap[status] || 'status-unknown'
}

function formatDate(timestamp) {
  if (!timestamp) return 'N/A'
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Fonction générique pour récupérer des données depuis l'API
async function fetchApiData(endpoint, options = {}) {
  const { filters = {}, statusFilter = null, loadingRef = null } = options

  if (loadingRef) {
    loadingRef.value = true
  }

  try {
    const token = userStore.data?.success?.token

    // Ajout des filtres supplémentaires au endpoint
    let url = `http://localhost/dolibarr/htdocs/api/index.php/${endpoint}`
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      params.append(key, value)
    })
    if ([...params].length > 0) {
      url += (endpoint.includes('?') ? '&' : '?') + params.toString()
    }

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        DOLAPIKEY: token,
      },
    })

    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des données: ${endpoint}`)
    }

    let data = await response.json()

    // Appliquer le filtre de statut si spécifié
    if (statusFilter !== null) {
      data = data.filter((item) => item.status === statusFilter)
    }

    return data
  } catch (error) {
    console.error('Erreur:', error)
    throw error
  } finally {
    if (loadingRef) {
      loadingRef.value = false
    }
  }
}

// Fonctions spécialisées simplifiées
async function fetchBoms() {
  try {
    const data = await fetchApiData('boms', {
      sortfield: 't.ref',
      sortorder: 'ASC',
      statusFilter: 1, // Filtrer uniquement les BOMs validées
      loadingRef: loadingBoms,
    })

    boms.value = data
    await Promise.all([fetchProductRefsForBoms(), fetchWarehouseRefsForBoms()])
  } catch (error) {
    errorMessage.value = 'Impossible de charger les nomenclatures'
  }
}

async function fetchProducts() {
  try {
    const data = await fetchApiData('products', {
      loadingRef: loadingProducts,
    })

    products.value = data
  } catch (error) {
    console.error('Erreur:', error)
  }
}

async function fetchRecentMOs() {
  try {
    const data = await fetchApiData('mos', {
      sortfield: 't.rowid',
      sortorder: 'DESC',
      limit: 5,
    })

    recentMOs.value = data
    await fetchProductRefsForMOs()
  } catch (error) {
    console.error('Erreur:', error)
  }
}

async function getRefById(id, cache, endpoint) {
  if (cache.value[id]) {
    return cache.value[id]
  }
  try {
    const token = userStore.data?.success?.token
    const response = await fetch(
      `http://localhost/dolibarr/htdocs/api/index.php/${endpoint}/${id}`,
      {
        headers: {
          Accept: 'application/json',
          DOLAPIKEY: token,
        },
      },
    )
    if (!response.ok) throw new Error('Erreur API')
    const data = await response.json()
    cache.value[id] = data.ref
    return data.ref
  } catch (error) {
    console.error(`Erreur lors de la récupération de ${endpoint} ${id}:`, error)
    return `#${id}`
  }
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

async function fetchRefsForIds(ids, cache, endpoint) {
  const uniqueIds = [...new Set(ids)]
  const promises = uniqueIds.map(async (id) => {
    if (!cache.value[id]) {
      await getRefById(id, cache, endpoint)
    }
  })
  await Promise.all(promises)
}

async function fetchWarehouseRefsForBoms() {
  await fetchRefsForIds(
    boms.value.map((bom) => bom.fk_warehouse),
    warehouseRefs,
    'warehouses',
  )
}

async function fetchProductRefsForBoms() {
  await fetchRefsForIds(
    boms.value.map((bom) => bom.fk_product),
    productRefs,
    'products',
  )
}

async function fetchProductRefsForMOs() {
  await fetchRefsForIds(
    recentMOs.value.map((mo) => mo.fk_product),
    productRefs,
    'products',
  )
}

function consumeandproduceMO(moId) {
  // Utiliser Vue Router pour naviguer vers le composant Produce avec l'ID du MO
  router.push({ path: '/produce', query: { mo_id: moId } })
}

// Création d'un nouvel ordre de fabrication
async function createMO() {
  if (!canSubmit.value) return

  creating.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const token = userStore.data?.success?.token
    const bomDetails = selectedBomDetails.value

    // Préparer les données pour l'API
    const moData = {
      ref: '', // Laisser vide pour génération automatique ou utiliser un format comme `MO-${Date.now()}`
      fk_bom: selectedBom.value,
      fk_product: bomDetails.fk_product,
      qty: quantity.value,
      fk_warehouse: bomDetails.fk_warehouse || null,
      mrptype: 0, // 0 = Manufacturing
      label: `Production de ${quantity.value} x ${productRefs.value[bomDetails.fk_product] || bomDetails.fk_product}`,
      status: 0, // 0 = Brouillon
    }

    const response = await fetch('http://localhost/dolibarr/htdocs/api/index.php/mos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        DOLAPIKEY: token,
      },
      body: JSON.stringify(moData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Erreur lors de la création')
    }

    const result = await response.json()
    successMessage.value = `Ordre de fabrication créé avec succès (Réf: ${result.ref || result})`

    // Réinitialiser le formulaire et rafraîchir la liste
    resetForm()
    await fetchRecentMOs()
  } catch (error) {
    console.error('Erreur:', error)
    errorMessage.value = `Erreur: ${error.message}`
  } finally {
    creating.value = false
  }
}

// Validation d'un ordre de fabrication
async function validateMO(mo) {
  // Ajouter l'ID du MO à la liste des validations en cours
  validatingMOs.value.add(mo.id)

  try {
    const token = userStore.data?.success?.token

    // Préparer les données pour la validation
    const updateData = {
      ref: 'auto',
      status: 1, // Passer de brouillon (0) à validé (1)
    }

    const response = await fetch(`http://localhost/dolibarr/htdocs/api/index.php/mos/${mo.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        DOLAPIKEY: token,
      },
      body: JSON.stringify(updateData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Erreur lors de la validation')
    }

    // Mettre à jour le statut localement
    const moIndex = recentMOs.value.findIndex((m) => m.id === mo.id)
    if (moIndex !== -1) {
      recentMOs.value[moIndex].status = 1
    }

    successMessage.value = `Ordre de fabrication ${mo.ref} validé avec succès`

    // Effacer le message après 3 secondes
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error) {
    console.error('Erreur lors de la validation:', error)
    errorMessage.value = `Erreur lors de la validation de ${mo.ref}: ${error.message}`

    // Effacer le message d'erreur après 5 secondes
    setTimeout(() => {
      errorMessage.value = ''
    }, 5000)
  } finally {
    // Retirer l'ID de la liste des validations en cours
    validatingMOs.value.delete(mo.id)
  }
}

// Production d'un ordre de fabrication
async function consumeandproduceallMO(mo) {
  producingMOs.value.add(mo.id)

  try {
    const token = userStore.data?.success?.token

    // Générer un code d'inventaire unique basé sur la date actuelle
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')

    const inventoryCode = `PRODUCEAPI-${year}-${month}-${day}-${hours}${minutes}`

    // Construction manuelle des arrays à consommer et à produire
    const arraytoconsume = []
    const arraytoproduce = []

    if (mo.lines && Array.isArray(mo.lines)) {
      for (const line of mo.lines) {
        let warehouseId = await getWarehouseByProductId(line.fk_product)
        console.log('warehouseId:', warehouseId, 'pour le produit:', line.fk_product)
        if (line.role === 'toproduce') {
          arraytoproduce.push({
            objectid: line.id,
            qty: line.qty,
            fk_warehouse: warehouseId || mo.fk_warehouse,
          })
        }
        if (line.role === 'toconsume') {
          arraytoconsume.push({
            objectid: line.id,
            qty: line.qty,
            fk_warehouse: warehouseId,
          })
        }
      }
    }

    // Préparer les données pour la production
    const produceData = {
      inventorylabel: `Production de ${mo.ref}`,
      inventorycode: inventoryCode,
      autoclose: 1,
      arraytoconsume,
      arraytoproduce,
    }

    console.log('produceData:', produceData)

    const response = await fetch(
      `http://localhost/dolibarr/htdocs/api/index.php/mos/${mo.id}/produceandconsume`,
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

    // Mettre à jour le statut localement
    const moIndex = recentMOs.value.findIndex((m) => m.id === mo.id)
    if (moIndex !== -1) {
      recentMOs.value[moIndex].status = 3 // Statut "Produit"
    }

    successMessage.value = `Ordre de fabrication ${mo.ref} produit avec succès`

    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error) {
    console.error('Erreur lors de la production:', error)
    errorMessage.value = `Erreur lors de la production de ${mo.ref}: ${error.message}`

    setTimeout(() => {
      errorMessage.value = ''
    }, 5000)
  } finally {
    producingMOs.value.delete(mo.id)
  }
}

// Réinitialisation du formulaire
function resetForm() {
  selectedBom.value = ''
  quantity.value = 1
  errorMessage.value = ''
  if (!creating.value) {
    successMessage.value = ''
  }
}

// Au montage du composant
onMounted(async () => {
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

  await Promise.all([fetchProducts(), fetchBoms(), fetchRecentMOs()])
})
</script>

<style scoped></style>
