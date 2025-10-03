<template>
  <div class="app-wrapper">
    <AppHeader />
    <div class="dashboard-layout">
      <Sidebar />
      <main class="dashboard-container">
        <section class="card mos-card">
          <h2 class="section-title">Créer des ordres de fabrications</h2>
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
              <button @click="addMO" :disabled="!canSubmit || adding" class="btn btn-primary">
                <span v-if="adding">Ajout en cours...</span>
                <span v-else>Ajouter dans la liste</span>
              </button>
              <button @click="resetForm" class="btn btn-secondary">Réinitialiser</button>
            </div>
          </div>

          <!-- Journal d'erreur des stocks -->
          <div v-if="stockErrors.length > 0" class="stock-errors">
            <h3 class="section-subtitle error-title">⚠️ Journal d'erreur - Défauts de stock</h3>
            <div class="error-summary">
              <p style="color: black">
                <strong>{{ stockErrors.length }}</strong> problème(s) de stock détecté(s)
              </p>
            </div>
            <table class="errors-table">
              <thead>
                <tr>
                  <th style="color: black">Nomenclature</th>
                  <th style="color: black">Quantité à produire</th>
                  <th style="color: black">Matière première manquante</th>
                  <th style="color: black">Quantité requise</th>
                  <th style="color: black">Stock disponible</th>
                  <th style="color: black">Manque</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="error in stockErrors" :key="`${error.bomRef}-${error.productId}`">
                  <td style="color: black">{{ error.bomRef }}</td>
                  <td style="color: black">{{ error.qtyToProduce }}</td>
                  <td style="color: black">{{ error.productRef }}</td>
                  <td style="color: black" class="qty-required">{{ error.qtyRequired }}</td>
                  <td style="color: black" class="qty-available">{{ error.qtyAvailable }}</td>
                  <td style="color: black" class="qty-missing">{{ error.qtyMissing }}</td>
                </tr>
              </tbody>
            </table>
            <div class="form-actions">
              <button @click="clearStockErrors" class="btn btn-secondary">
                Effacer le journal
              </button>
            </div>
          </div>

          <!-- Liste des ordres de fabrication en attente -->
          <div class="recent-mos" v-if="orderList.length > 0">
            <h3 class="section-subtitle">Ordres de fabrication en attente</h3>
            <table class="mos-table">
              <thead>
                <tr>
                  <th>Nomenclature (BOM)</th>
                  <th>Quantité à produire</th>
                  <th>Statut stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in orderList" :key="order.bomId">
                  <td>
                    {{ order.selectedBomDetails.ref }} -
                    {{
                      productRefs[order.selectedBomDetails.fk_product] ||
                      `#${order.selectedBomDetails.fk_product}`
                    }}
                  </td>
                  <td>{{ order.quantity }}</td>
                  <td>
                    <span v-if="order.stockValid" class="stock-valid">✅ Stock OK</span>
                    <span v-else class="stock-invalid">❌ Stock insuffisant</span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-danger" @click="deleteOrderRow(order.bomId)">
                      Supprimer
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="form-actions">
              <button
                @click="consumeandproduceall"
                :disabled="!hasValidOrders || producing"
                class="btn btn-primary"
              >
                <span v-if="producing">Production en cours...</span>
                <span v-else>Produire et consommer tout ({{ validOrdersCount }} commandes)</span>
              </button>
              <p v-if="!hasValidOrders && orderList.length > 0" class="warning-text">
                Aucune commande ne peut être traitée à cause de stocks insuffisants
              </p>
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

// Store et variables réactives
const userStore = useUserStore()
const boms = ref([])
const productRefs = ref({}) // Cache pour les références de produits
const warehouseRefs = ref({}) // Cache pour les références d'entrepots
const selectedBom = ref('')
const quantity = ref(1)
const loadingBoms = ref(true)
const adding = ref(false)
const producing = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const orderList = ref([])
const recentMOs = ref([])
const createdMOs = ref([])
const validatedMOs = ref([])
const stockErrors = ref([]) // Journal d'erreur des stocks
const productStocks = ref({}) // Cache des stocks produits

// Computed properties
const selectedBomDetails = computed(() => {
  if (!selectedBom.value) return null
  return boms.value.find((b) => b.id === selectedBom.value)
})

const canSubmit = computed(() => {
  return selectedBom.value && quantity.value > 0
})

const validOrders = computed(() => {
  return orderList.value.filter((order) => order.stockValid)
})

const hasValidOrders = computed(() => {
  return validOrders.value.length > 0
})

const validOrdersCount = computed(() => {
  return validOrders.value.length
})

// **NOUVELLES FONCTIONS POUR LA GESTION DES STOCKS**

// Récupérer les détails complets d'une BOM
async function getBomDetails(bomId) {
  try {
    const token = userStore.data?.success?.token
    const response = await fetch(`http://localhost/dolibarr/htdocs/api/index.php/boms/${bomId}`, {
      headers: {
        Accept: 'application/json',
        DOLAPIKEY: token,
      },
    })
    if (!response.ok) throw new Error('Erreur lors de la récupération des détails BOM')
    return await response.json()
  } catch (error) {
    console.error('Erreur getBomDetails:', error)
    throw error
  }
}

// Récupérer le stock d'un produit
async function getProductStock(productId) {
  // Vérifier le cache d'abord
  if (productStocks.value[productId]) {
    return productStocks.value[productId]
  }

  try {
    const token = userStore.data?.success?.token
    const response = await fetch(
      `http://localhost/dolibarr/htdocs/api/index.php/products/${productId}/stock`,
      {
        headers: {
          Accept: 'application/json',
          DOLAPIKEY: token,
        },
      },
    )
    if (!response.ok) throw new Error('Erreur lors de la récupération du stock')

    const stockData = await response.json()
    const stock = {
      real: parseFloat(stockData.stock_reel || 0),
      theoretical: parseFloat(stockData.stock_theorique || 0),
    }

    // Mettre en cache
    productStocks.value[productId] = stock
    return stock
  } catch (error) {
    console.error('Erreur getProductStock:', error)
    // Retourner un stock de 0 en cas d'erreur
    return { real: 0, theoretical: 0 }
  }
}

// Vérifier la disponibilité des stocks pour une commande
async function checkStockAvailability(bomId, qtyToProduce) {
  try {
    // Récupérer les détails de la BOM
    const bomDetails = await getBomDetails(bomId)
    const stockIssues = []

    // Vérifier chaque ligne de la BOM
    if (bomDetails.lines && Array.isArray(bomDetails.lines)) {
      for (const line of bomDetails.lines) {
        const productId = line.fk_product
        const qtyRequiredPerUnit = parseFloat(line.qty || 0)
        const totalQtyRequired = qtyRequiredPerUnit * qtyToProduce

        // Récupérer le stock du produit
        const productStock = await getProductStock(productId)
        const availableStock = productStock.real

        // Vérifier si le stock est suffisant
        if (availableStock < totalQtyRequired) {
          const productRef = productRefs.value[productId] || `#${productId}`

          stockIssues.push({
            bomRef: bomDetails.ref,
            bomId: bomId,
            qtyToProduce: qtyToProduce,
            productId: productId,
            productRef: productRef,
            qtyRequired: totalQtyRequired,
            qtyAvailable: availableStock,
            qtyMissing: totalQtyRequired - availableStock,
          })
        }
      }
    }

    return {
      valid: stockIssues.length === 0,
      issues: stockIssues,
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des stocks:', error)
    return {
      valid: false,
      issues: [
        {
          bomRef: 'Erreur',
          bomId: bomId,
          qtyToProduce: qtyToProduce,
          productId: 'N/A',
          productRef: 'Erreur de vérification',
          qtyRequired: 0,
          qtyAvailable: 0,
          qtyMissing: 'Erreur',
        },
      ],
    }
  }
}

// Ajouter les erreurs au journal
function addStockErrors(issues) {
  stockErrors.value.push(...issues)
}

// Effacer le journal d'erreur
function clearStockErrors() {
  stockErrors.value = []
  errorMessage.value = ''
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

// Fonction fetchApiData corrigée
async function fetchApiData(endpoint, options = {}) {
  const { filters = {}, statusFilter = null, loadingRef = null } = options

  if (loadingRef) {
    loadingRef.value = true
  }

  try {
    const token = userStore.data?.success?.token

    // Construction de l'URL avec les paramètres
    let url = `http://localhost/dolibarr/htdocs/api/index.php/${endpoint}`
    const params = new URLSearchParams()

    // Ajouter tous les filtres dans les paramètres
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value)
      }
    })

    // Vérifier si on a des paramètres à ajouter
    if (params.toString()) {
      console.log('Params:', params.toString())
      url += (url.includes('?') ? '&' : '?') + params.toString()
    }

    console.log('URL finale:', url)

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
    if (statusFilter !== null && statusFilter !== undefined) {
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

// Fonction fetchBoms corrigée
async function fetchBoms() {
  try {
    const data = await fetchApiData('boms', {
      filters: {
        sortfield: 't.ref',
        sortorder: 'ASC',
      },
      statusFilter: 1, // Filtrer uniquement les BOMs validées
      loadingRef: loadingBoms,
    })

    boms.value = data
    await Promise.all([fetchProductRefsForBoms(), fetchWarehouseRefsForBoms()])
  } catch (error) {
    errorMessage.value = 'Impossible de charger les nomenclatures'
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

// Fonction fetchRecentMOs corrigée
async function fetchRecentMOs() {
  try {
    const data = await fetchApiData('mos', {
      filters: {
        sortfield: 't.rowid',
        sortorder: 'DESC',
        limit: 5,
      },
    })

    recentMOs.value = data
    await fetchProductRefsForMOs()
  } catch (error) {
    console.error('Erreur:', error)
  }
}

// Fonction fetchCreatedMOs corrigée
async function fetchCreatedMOs() {
  try {
    // Calcul du limit basé sur les commandes valides seulement
    const limit = validOrders.value.length > 0 ? validOrders.value.length : 1

    const data = await fetchApiData('mos', {
      filters: {
        sortfield: 't.rowid',
        sortorder: 'DESC',
        limit,
      },
      statusFilter: 0, // Statut brouillon
    })

    console.log('Created MOs length:', data.length)
    console.log('Valid orders length:', validOrders.value.length)

    // Si limit == 1, ne garder que la première ligne
    createdMOs.value = limit === 1 ? (data.length > 0 ? [data[0]] : []) : data
    await fetchProductRefsForMOs()
  } catch (error) {
    console.error('Erreur:', error)
  }
}

// Fonction fetchValidatedMOs corrigée
async function fetchValidatedMOs() {
  try {
    // Calcul du limit basé sur les commandes valides seulement
    const limit = validOrders.value.length > 0 ? validOrders.value.length : 1

    const data = await fetchApiData('mos', {
      filters: {
        sortfield: 't.rowid',
        sortorder: 'DESC',
        limit,
      },
      statusFilter: 1, // Statut validé
    })

    console.log('Validated MOs length:', data.length)
    console.log('Valid orders length:', validOrders.value.length)

    // Si limit == 1, ne garder que la première ligne
    validatedMOs.value = limit === 1 ? (data.length > 0 ? [data[0]] : []) : data
    await fetchProductRefsForMOs()
  } catch (error) {
    console.error('Erreur:', error)
  }
}

// Fonction addMO modifiée pour inclure la vérification des stocks
async function addMO() {
  if (!canSubmit.value) return

  adding.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    // Vérifier la disponibilité des stocks
    const stockCheck = await checkStockAvailability(selectedBom.value, quantity.value)

    // Ajouter l'ordre de fabrication avec le statut de stock
    const newMO = {
      bomId: selectedBom.value,
      quantity: quantity.value,
      selectedBomDetails: selectedBomDetails.value,
      stockValid: stockCheck.valid,
    }

    orderList.value.push(newMO)

    // Si il y a des problèmes de stock, les ajouter au journal
    if (!stockCheck.valid) {
      addStockErrors(stockCheck.issues)
      errorMessage.value = `⚠️ Ordre ajouté mais stocks insuffisants détectés. Consultez le journal d'erreur.`
    } else {
      successMessage.value = `✅ Ordre de fabrication ajouté avec stocks suffisants.`
    }

    console.log("Liste d'Ordre de fabrication à Créer:", orderList.value)
    resetForm()
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'ordre de fabrication:", error)
    errorMessage.value = 'Erreur lors de la vérification des stocks.'
  } finally {
    adding.value = false
  }
}

async function createMOs() {
  producing.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const token = userStore.data?.success?.token

    // Ne créer des MOs que pour les commandes avec stocks valides
    for (const order of validOrders.value) {
      const bomDetails = order.selectedBomDetails

      // Préparer les données pour l'API
      const moData = {
        ref: '', // Laisser vide pour génération automatique
        fk_bom: order.bomId,
        fk_product: bomDetails.fk_product,
        qty: order.quantity,
        fk_warehouse: bomDetails.fk_warehouse || null,
        mrptype: 0, // 0 = Manufacturing
        label: `Production de ${order.quantity} x ${productRefs.value[bomDetails.fk_product] || bomDetails.fk_product}`,
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
      successMessage.value += `Ordre de fabrication créé avec succès (Réf: ${result.ref || result})\n`
    }

    // Effacer le cache des stocks après création
    productStocks.value = {}

    await fetchRecentMOs()
  } catch (error) {
    console.error('Erreur:', error)
    errorMessage.value = `Erreur: ${error.message}`
  } finally {
    producing.value = false
  }
}

async function validateMOs() {
  await fetchCreatedMOs()
  for (const mo of createdMOs.value) {
    await validateMO(mo)
  }
}

async function validateMO(mo) {
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
  }
}

async function consumeandproduceallMOs() {
  await fetchValidatedMOs()
  for (const mo of validatedMOs.value) {
    await consumeandproduceallMO(mo)
  }
}

// Production d'un ordre de fabrication
async function consumeandproduceallMO(mo) {
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
  }
}

async function consumeandproduceall() {
  if (orderList.value.length === 0) {
    errorMessage.value = 'Aucun ordre de fabrication à créer.'
    return
  }

  if (!hasValidOrders.value) {
    errorMessage.value = 'Aucune commande ne peut être traitée à cause de stocks insuffisants.'
    return
  }

  // Créer, valider et produire uniquement les ordres avec stocks valides
  await createMOs()
  await validateMOs()
  await consumeandproduceallMOs()
  deleteAllOrder()
}

function deleteAllOrder() {
  orderList.value = []
}

function deleteOrderRow(bomId) {
  errorMessage.value = ''
  successMessage.value = ''
  const deletedOrder = orderList.value.find((order) => order.bomId === bomId)
  orderList.value = orderList.value.filter((order) => order.bomId !== bomId)
  if (deletedOrder) {
    errorMessage.value = `Ordre de fabrication au nomenclature ${deletedOrder.selectedBomDetails.ref} et au quantité ${deletedOrder.quantity} supprimé de la liste.`
  }
}

// Réinitialisation du formulaire
function resetForm() {
  selectedBom.value = ''
  quantity.value = 1
  errorMessage.value = ''
  if (!adding.value) {
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

  await Promise.all([fetchBoms(), fetchRecentMOs()])
})
</script>

<style scoped>
.stock-errors {
  margin: 2rem 0;
  padding: 1.5rem;
  border: 2px solid #dc3545;
  border-radius: 8px;
  background-color: #f8f9fa;
}

.error-title {
  color: #dc3545;
  margin-bottom: 1rem;
}

.error-summary {
  background-color: #fff3cd;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  border-left: 4px solid #ffc107;
}

.errors-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

.errors-table th,
.errors-table td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid #dee2e6;
}

.errors-table th {
  background-color: #f8f9fa;
  font-weight: 600;
}

.qty-required {
  color: #6f42c1;
  font-weight: 600;
}

.qty-available {
  color: #198754;
  font-weight: 600;
}

.qty-missing {
  color: #dc3545;
  font-weight: 600;
}

.stock-valid {
  color: #198754;
  font-weight: 600;
}

.stock-invalid {
  color: #dc3545;
  font-weight: 600;
}

.warning-text {
  color: #856404;
  font-style: italic;
  margin-top: 0.5rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
