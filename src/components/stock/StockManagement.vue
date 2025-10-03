<template>
  <div class="app-wrapper">
    <AppHeader />
    <div class="dashboard-layout">
      <Sidebar />
      <main class="dashboard-container">
        <section class="card stock-management-card">
          <h2 class="section-title">Gestion des stocks</h2>

          <!-- Formulaire d'ajout de stock -->
          <div class="form-container">
            <h3 class="form-title">Ajouter du stock</h3>
            <form @submit.prevent="addStock" class="stock-form">
              <div class="form-group">
                <label for="product-select" class="form-label">
                  Produit <span class="required">*</span>
                </label>
                <select
                  id="product-select"
                  v-model="addForm.productId"
                  class="form-control"
                  :disabled="loadingProducts"
                  required
                >
                  <option value="">-- Sélectionner un produit --</option>
                  <option v-for="product in products" :key="product.id" :value="product.id">
                    {{ product.ref }} - {{ product.label || 'Sans libellé' }}
                  </option>
                </select>
                <p v-if="loadingProducts" class="loading-text">Chargement des produits...</p>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="quantity-add" class="form-label">
                    Quantité <span class="required">*</span>
                  </label>
                  <input
                    id="quantity-add"
                    v-model.number="addForm.quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    class="form-control"
                    placeholder="Quantité à ajouter"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="purchase-price" class="form-label">
                    Prix d'achat unitaire (€) <span class="required">*</span>
                  </label>
                  <input
                    id="purchase-price"
                    v-model.number="addForm.purchasePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    class="form-control"
                    placeholder="Prix d'achat par unité"
                    required
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="warehouse-add" class="form-label">
                  Entrepôt <span class="required">*</span>
                </label>
                <select
                  id="warehouse-add"
                  v-model="addForm.warehouseId"
                  class="form-control"
                  :disabled="loadingWarehouses"
                  required
                >
                  <option value="">-- Sélectionner un entrepôt --</option>
                  <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
                    {{ warehouse.ref }} - {{ warehouse.lieu || 'Entrepôt' }}
                  </option>
                </select>
                <p v-if="loadingWarehouses" class="loading-text">Chargement des entrepôts...</p>
              </div>

              <div class="form-group">
                <label for="label-add" class="form-label">Libellé du mouvement</label>
                <input
                  id="label-add"
                  v-model="addForm.label"
                  type="text"
                  class="form-control"
                  placeholder="Ex: Achat fournisseur, Inventaire, etc."
                />
              </div>

              <div class="form-actions">
                <button
                  type="submit"
                  :disabled="!canAddStock || addingStock"
                  class="btn btn-primary"
                >
                  <span v-if="addingStock">Ajout en cours...</span>
                  <span v-else>Ajouter au stock</span>
                </button>
                <button type="button" @click="resetAddForm" class="btn btn-secondary">
                  Réinitialiser
                </button>
              </div>
            </form>
          </div>

          <!-- Formulaire de suppression de stock -->
          <div class="form-container">
            <h3 class="form-title">Supprimer du stock</h3>
            <form @submit.prevent="removeStock" class="stock-form">
              <div class="form-group">
                <label for="product-remove-select" class="form-label">
                  Produit <span class="required">*</span>
                </label>
                <select
                  id="product-remove-select"
                  v-model="removeForm.productId"
                  class="form-control"
                  :disabled="loadingProducts"
                  required
                >
                  <option value="">-- Sélectionner un produit --</option>
                  <option v-for="product in products" :key="product.id" :value="product.id">
                    {{ product.ref }} - {{ product.label || 'Sans libellé' }} (Stock:
                    {{ getProductStock(product.id) }})
                  </option>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="quantity-remove" class="form-label">
                    Quantité <span class="required">*</span>
                  </label>
                  <input
                    id="quantity-remove"
                    v-model.number="removeForm.quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    :max="getProductStock(removeForm.productId)"
                    class="form-control"
                    placeholder="Quantité à supprimer"
                    required
                  />
                  <small v-if="removeForm.productId" class="form-help">
                    Stock disponible: {{ getProductStock(removeForm.productId) }}
                  </small>
                </div>

                <div class="form-group">
                  <label for="warehouse-remove" class="form-label">
                    Entrepôt <span class="required">*</span>
                  </label>
                  <select
                    id="warehouse-remove"
                    v-model="removeForm.warehouseId"
                    class="form-control"
                    :disabled="loadingWarehouses"
                    required
                  >
                    <option value="">-- Sélectionner un entrepôt --</option>
                    <option
                      v-for="warehouse in warehouses"
                      :key="warehouse.id"
                      :value="warehouse.id"
                    >
                      {{ warehouse.ref }} - {{ warehouse.lieu || 'Entrepôt' }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="label-remove" class="form-label">Libellé du mouvement</label>
                <input
                  id="label-remove"
                  v-model="removeForm.label"
                  type="text"
                  class="form-control"
                  placeholder="Ex: Vente, Perte, Inventaire, etc."
                />
              </div>

              <div class="form-actions">
                <button
                  type="submit"
                  :disabled="!canRemoveStock || removingStock"
                  class="btn btn-danger"
                >
                  <span v-if="removingStock">Suppression en cours...</span>
                  <span v-else>Supprimer du stock</span>
                </button>
                <button type="button" @click="resetRemoveForm" class="btn btn-secondary">
                  Réinitialiser
                </button>
              </div>
            </form>
          </div>

          <!-- Messages d'erreur et de succès -->
          <div v-if="errorMessage" class="alert alert-error">
            {{ errorMessage }}
          </div>
          <div v-if="successMessage" class="alert alert-success">
            {{ successMessage }}
          </div>

          <!-- Liste des mouvements récents -->
          <div class="recent-movements" v-if="recentMovements.length > 0">
            <h3 class="section-subtitle">Mouvements récents</h3>
            <table class="movements-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Produit</th>
                  <th>Type</th>
                  <th>Quantité</th>
                  <th>Prix unitaire</th>
                  <th>Entrepôt</th>
                  <th>Libellé</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="movement in recentMovements" :key="movement.id">
                  <td>{{ formatDate(movement.datem) }}</td>
                  <td>{{ getProductName(movement.product_id) }}</td>
                  <td>
                    <span
                      :class="['movement-type', movement.qty > 0 ? 'movement-in' : 'movement-out']"
                    >
                      {{ movement.qty > 0 ? 'Ajout' : 'Suppression' }}
                    </span>
                  </td>
                  <td class="quantity-cell">{{ Math.abs(movement.qty) }}</td>
                  <td class="price-cell">{{ movement.price || 'N/A' }}€</td>
                  <td>{{ getWarehouseName(movement.warehouse_id) }}</td>
                  <td>{{ movement.label || '-' }}</td>
                  <td>
                    <button
                      @click="showMovementDetails(movement)"
                      class="btn btn-sm btn-outline"
                      title="Voir les détails"
                    >
                      Détails
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Liste complète des stocks -->
          <div class="stock-list-container">
            <h3 class="section-subtitle">État des stocks</h3>
            
            <div class="table-controls">
              <div class="control-group">
                <label for="search-product" class="control-label">Rechercher un produit:</label>
                <input
                  id="search-product"
                  v-model="stockSearch"
                  type="text"
                  class="form-control search-input"
                  placeholder="Nom ou référence du produit..."
                />
              </div>
              <div class="control-group">
                <label for="warehouse-filter" class="control-label">Filtrer par entrepôt:</label>
                <select
                  id="warehouse-filter"
                  v-model="selectedWarehouseFilter"
                  class="form-control"
                >
                  <option value="">Tous les entrepôts</option>
                  <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
                    {{ warehouse.ref }}
                  </option>
                </select>
              </div>
            </div>

            <div class="table-responsive">
              <table class="stock-summary-table">
                <thead>
                  <tr>
                    <th @click="sortStocks('name')" class="sortable">
                      Produit
                      <span v-if="sortField === 'name'" class="sort-indicator">
                        {{ sortOrder === 'asc' ? '↑' : '↓' }}
                      </span>
                    </th>
                    <th @click="sortStocks('initial')" class="sortable numeric">
                      Stock initial
                      <span v-if="sortField === 'initial'" class="sort-indicator">
                        {{ sortOrder === 'asc' ? '↑' : '↓' }}
                      </span>
                    </th>
                    <th @click="sortStocks('entries')" class="sortable numeric">
                      Entrées
                      <span v-if="sortField === 'entries'" class="sort-indicator">
                        {{ sortOrder === 'asc' ? '↑' : '↓' }}
                      </span>
                    </th>
                    <th @click="sortStocks('exits')" class="sortable numeric">
                      Sorties
                      <span v-if="sortField === 'exits'" class="sort-indicator">
                        {{ sortOrder === 'asc' ? '↑' : '↓' }}
                      </span>
                    </th>
                    <th @click="sortStocks('final')" class="sortable numeric">
                      Stock final
                      <span v-if="sortField === 'final'" class="sort-indicator">
                        {{ sortOrder === 'asc' ? '↑' : '↓' }}
                      </span>
                    </th>
                    <th>BOM</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="product in filteredAndSortedStocks" :key="product.id" class="stock-row">
                    <td class="product-cell">
                      <strong>{{ product.ref }}</strong>
                      <div class="product-label">{{ product.label || 'Sans libellé' }}</div>
                    </td>
                    <td class="numeric-cell">{{ calculateInitialStock(product.id) }}</td>
                    <td 
                      class="numeric-cell positive clickable-cell"
                      @click="showMovementDetailsForProduct(product.id, 'in')"
                    >
                      {{ calculateTotalEntries(product.id) }}
                    </td>
                    <td 
                      class="numeric-cell negative clickable-cell"
                      @click="showMovementDetailsForProduct(product.id, 'out')"
                    >
                      {{ calculateTotalExits(product.id) }}
                    </td>
                    <td class="numeric-cell final-stock" :class="getStockLevelClass(product.id)">
                      {{ getProductStock(product.id) }}
                    </td>
                    <td>
                      <button 
                        @click="showBomDetails(product)"
                        class="btn btn-sm btn-outline"
                        :disabled="!hasBom(product)"
                      >
                        {{ hasBom(product) ? '📋 BOM' : 'Aucun BOM' }}
                      </button>
                    </td>
                    <td>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="filteredAndSortedStocks.length === 0" class="empty-state">
              <p>Aucun produit trouvé avec les critères de recherche actuels.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
    <AppFooter />

    <!-- Modal des détails de mouvement -->
    <div v-if="showMovementModal" class="modal-overlay" @click="closeMovementModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Détails du mouvement de stock</h3>
          <button @click="closeMovementModal" class="modal-close">&times;</button>
        </div>
        <div class="modal-body" v-if="selectedMovement">
          <div class="movement-details">
            <div class="detail-section">
              <h4>Informations générales</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <label>ID du mouvement:</label>
                  <span>{{ selectedMovement.id }}</span>
                </div>
                <div class="detail-item">
                  <label>Date du mouvement:</label>
                  <span>{{ formatDate(selectedMovement.datem) }}</span>
                </div>
                <div class="detail-item">
                  <label>Type de mouvement:</label>
                  <span
                    :class="[
                      'movement-type',
                      selectedMovement.qty > 0 ? 'movement-in' : 'movement-out',
                    ]"
                  >
                    {{ getMovementTypeLabel(selectedMovement.type) }}
                  </span>
                </div>
                <div class="detail-item">
                  <label>Quantité:</label>
                  <span class="quantity-value">{{ selectedMovement.qty }}</span>
                </div>
                <div class="detail-item">
                  <label>Prix unitaire:</label>
                  <span class="price-value">{{ selectedMovement.price || 'N/A' }}€</span>
                </div>
                <div class="detail-item">
                  <label>Libellé:</label>
                  <span>{{ selectedMovement.label || 'Aucun libellé' }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h4>Produit et entrepôt</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <label>Produit:</label>
                  <span>{{ getProductName(selectedMovement.product_id) }}</span>
                </div>
                <div class="detail-item">
                  <label>Entrepôt:</label>
                  <span>{{ getWarehouseName(selectedMovement.warehouse_id) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeMovementModal" class="btn btn-secondary">Fermer</button>
        </div>
      </div>
    </div>

    <!-- Modal pour les détails des mouvements par produit -->
    <div v-if="showMovementDetailsModal" class="modal-overlay" @click="closeMovementDetailsModal">
      <div class="modal-content large-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Détails des mouvements - {{ selectedProductDetails?.ref }}</h3>
          <button @click="closeMovementDetailsModal" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="movement-filters">
            <button 
              @click="setMovementFilter('in')" 
              :class="['filter-btn', movementFilter === 'in' ? 'active' : '']"
            >
              Entrées ({{ filteredInMovements.length }})
            </button>
            <button 
              @click="setMovementFilter('out')" 
              :class="['filter-btn', movementFilter === 'out' ? 'active' : '']"
            >
              Sorties ({{ filteredOutMovements.length }})
            </button>
            <button 
              @click="setMovementFilter('all')" 
              :class="['filter-btn', movementFilter === 'all' ? 'active' : '']"
            >
              Tous ({{ filteredMovements.length }})
            </button>
          </div>

          <div class="movement-total">
            Total {{ movementFilter === 'in' ? 'des entrées' : movementFilter === 'out' ? 'des sorties' : 'des mouvements' }}: 
            <strong>{{ calculateFilteredTotal() }}</strong>
          </div>

          <table class="movements-detail-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Quantité</th>
                <th>Prix unitaire</th>
                <th>Entrepôt</th>
                <th>Libellé</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="movement in filteredMovements" :key="movement.id">
                <td>{{ formatDate(movement.datem) }}</td>
                <td>
                  <span :class="['movement-type', movement.qty > 0 ? 'movement-in' : 'movement-out']">
                    {{ movement.qty > 0 ? 'Entrée' : 'Sortie' }}
                  </span>
                </td>
                <td class="numeric-cell">{{ Math.abs(movement.qty) }}</td>
                <td class="numeric-cell">{{ movement.price || 'N/A' }}€</td>
                <td>{{ getWarehouseName(movement.warehouse_id) }}</td>
                <td>{{ movement.label || '-' }}</td>
              </tr>
            </tbody>
          </table>
          
          <div v-if="filteredMovements.length === 0" class="empty-state">
            Aucun mouvement trouvé.
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeMovementDetailsModal" class="btn btn-secondary">Fermer</button>
        </div>
      </div>
    </div>

    <!-- Modal pour les détails de la BOM -->
    <div v-if="showBomModal" class="modal-overlay" @click="closeBomModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Nomenclature - {{ selectedBomProduct?.ref }}</h3>
          <button @click="closeBomModal" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="bom-description">
            <p>Liste des composants nécessaires pour fabriquer ce produit.:cite[2]</p>
          </div>
          
          <table class="bom-table">
            <thead>
              <tr>
                <th>Composant</th>
                <th>Référence</th>
                <th>Quantité Requise</th>
                <th>Stock Disponible</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="component in bomComponents" :key="component.id">
                <td>{{ component.name }}</td>
                <td>{{ component.ref }}</td>
                <td class="numeric-cell">{{ component.requiredQuantity }}</td>
                <td class="numeric-cell">{{ component.availableStock }}</td>
                <td>
                  <span :class="['stock-status', component.hasSufficientStock ? 'sufficient' : 'insufficient']">
                    {{ component.hasSufficientStock ? '✓ Suffisant' : '✗ Insuffisant' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div v-if="bomComponents.length === 0" class="empty-state">
            Aucune nomenclature définie pour ce produit.
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeBomModal" class="btn btn-secondary">Fermer</button>
        </div>
      </div>
    </div>
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
const products = ref([])
const warehouses = ref([])
const productStocks = ref({})
const recentMovements = ref([])
const loadingProducts = ref(true)
const loadingWarehouses = ref(true)
const addingStock = ref(false)
const removingStock = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const showMovementModal = ref(false)
const selectedMovement = ref(null)

// Registre pour stocker les valeurs de stock initial
const initialStockRegistry = ref({});

// Nouvelles variables réactives pour les fonctionnalités avancées
const showMovementDetailsModal = ref(false)
const showBomModal = ref(false)
const movementFilter = ref('all')
const selectedProductDetails = ref(null)
const selectedBomProduct = ref(null)
const bomComponents = ref([])

// Variables pour la liste de stocks
const stockSearch = ref('')
const selectedWarehouseFilter = ref('')
const sortField = ref('name')
const sortOrder = ref('asc')

// Formulaires
const addForm = ref({
  productId: '',
  quantity: null,
  purchasePrice: null,
  warehouseId: '',
  label: '',
})

const removeForm = ref({
  productId: '',
  quantity: null,
  warehouseId: '',
  label: '',
})

// Computed properties CORRIGÉES
const canAddStock = computed(() => {
  return (
    addForm.value.productId &&
    addForm.value.quantity > 0 &&
    addForm.value.purchasePrice >= 0 &&
    addForm.value.warehouseId
  )
})

const canRemoveStock = computed(() => {
  const productId = removeForm.value.productId
  const availableStock = getProductStock(productId)
  return (
    productId &&
    removeForm.value.quantity > 0 &&
    removeForm.value.quantity <= availableStock &&
    removeForm.value.warehouseId
  )
})

// Computed properties pour les mouvements filtrés
const filteredInMovements = computed(() => {
  if (!selectedProductDetails.value) return []
  return recentMovements.value.filter(m => 
    m.product_id === selectedProductDetails.value.id && m.qty > 0
  )
})

const filteredOutMovements = computed(() => {
  if (!selectedProductDetails.value) return []
  return recentMovements.value.filter(m => 
    m.product_id === selectedProductDetails.value.id && m.qty < 0
  )
})

const filteredMovements = computed(() => {
  if (!selectedProductDetails.value) return []
  
  switch (movementFilter.value) {
    case 'in': 
      return filteredInMovements.value
    case 'out': 
      return filteredOutMovements.value
    default: 
      return recentMovements.value.filter(m => 
        m.product_id === selectedProductDetails.value.id
      )
  }
})

// Computed property pour les stocks filtrés et triés
const filteredAndSortedStocks = computed(() => {
  let filtered = products.value.filter(product => {
    const matchesSearch = !stockSearch.value || 
      product.ref.toLowerCase().includes(stockSearch.value.toLowerCase()) ||
      (product.label && product.label.toLowerCase().includes(stockSearch.value.toLowerCase()))
    
    const matchesWarehouse = !selectedWarehouseFilter.value || 
      product.warehouse_id == selectedWarehouseFilter.value
    
    return matchesSearch && matchesWarehouse
  })

  // Trier les résultats
  return filtered.sort((a, b) => {
    let aValue, bValue
    
    switch (sortField.value) {
      case 'initial':
        aValue = calculateInitialStock(a.id)
        bValue = calculateInitialStock(b.id)
        break
      case 'entries':
        aValue = calculateTotalEntries(a.id)
        bValue = calculateTotalEntries(b.id)
        break
      case 'exits':
        aValue = calculateTotalExits(a.id)
        bValue = calculateTotalExits(b.id)
        break
      case 'final':
        aValue = getProductStock(a.id)
        bValue = getProductStock(b.id)
        break
      default:
        aValue = a.ref.toLowerCase()
        bValue = b.ref.toLowerCase()
    }

    if (typeof aValue === 'string') {
      if (sortOrder.value === 'asc') {
        return aValue.localeCompare(bValue)
      } else {
        return bValue.localeCompare(aValue)
      }
    } else {
      if (sortOrder.value === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    }
  })
})

// Méthodes utilitaires
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

function getProductName(productId) {
  const product = products.value.find((p) => p.id == productId)
  return product ? `${product.ref} - ${product.label}` : `Produit #${productId}`
}

function getWarehouseName(warehouseId) {
  const warehouse = warehouses.value.find((w) => w.id == warehouseId)
  return warehouse ? `${warehouse.ref} - ${warehouse.lieu}` : `Entrepôt #${warehouseId}`
}

// CORRECTION : Gestion robuste du stock - FORMULE CORRECTE
function getProductStock(productId) {
  if (!productId) return 0;
  
  // Utiliser le stock actuel de Dolibarr comme référence de vérité
  // Cette valeur est mise à jour après chaque mouvement de stock
  return productStocks.value[productId] || 0;
}


// CORRECTION : Calcul du stock initial simplifié
// CORRECTION : Formule correcte du stock initial
function calculateInitialStock(productId) {
  if (!productId) return 0;
  
  // Si nous avons déjà calculé le stock initial, l'utiliser
  if (initialStockRegistry.value[productId] !== undefined) {
    return initialStockRegistry.value[productId];
  }
  
  // FORMULE CORRECTE : Stock initial = Stock final - (Entrées - Sorties)
  const stockFinal = productStocks.value[productId] || 0;
  const totalEntrees = calculateTotalEntries(productId);
  const totalSorties = calculateTotalExits(productId);
  
  // Correction : Stock initial = Stock final - (Entrées - Sorties)
  const stockInitial = stockFinal - (totalEntrees - totalSorties);
  
  // Stocker le calcul
  initialStockRegistry.value[productId] = Math.max(0, stockInitial);
  
  return initialStockRegistry.value[productId];
}

function calculateTotalEntries(productId) {
  if (!recentMovements.value.length) return 0;
  
  return recentMovements.value
    .filter(m => m.product_id == productId && parseFloat(m.qty) > 0)
    .reduce((sum, m) => sum + Math.abs(parseFloat(m.qty)), 0);
}


function calculateTotalExits(productId) {
  if (!recentMovements.value.length) return 0;
  
  return recentMovements.value
    .filter(m => m.product_id == productId && parseFloat(m.qty) < 0)
    .reduce((sum, m) => sum + Math.abs(parseFloat(m.qty)), 0);
}

function getStockLevelClass(productId) {
  const stock = getProductStock(productId)
  if (stock === 0) return 'stock-out'
  if (stock < 10) return 'stock-low'
  return 'stock-ok'
}

// NOUVELLES MÉTHODES POUR LES FONCTIONNALITÉS AVANCÉES

// Gestion des modals de détails des mouvements
function showMovementDetailsForProduct(productId, type = 'all') {
  const product = products.value.find(p => p.id === productId)
  if (!product) return
  
  selectedProductDetails.value = product
  movementFilter.value = type
  showMovementDetailsModal.value = true
}

function closeMovementDetailsModal() {
  showMovementDetailsModal.value = false
  selectedProductDetails.value = null
  movementFilter.value = 'all'
}

function setMovementFilter(filter) {
  movementFilter.value = filter
}

function calculateFilteredTotal() {
  return filteredMovements.value.reduce((total, movement) => {
    return total + Math.abs(movement.qty)
  }, 0)
}

// Gestion de la BOM avec données réelles de Dolibarr - VERSION CORRIGÉE AVEC URLS COMPLÈTES
async function showBomDetails(product) {
  selectedBomProduct.value = product;
  bomComponents.value = [];
  showBomModal.value = true;
  errorMessage.value = '';

  try {
    // 1. Récupérer toutes les nomenclatures avec filtrage
    const boms = await fetchApiData('boms?sortfield=t.rowid&sortorder=ASC');
    
    if (!boms || boms.length === 0) {
      errorMessage.value = 'Aucune nomenclature trouvée dans le système.';
      return;
    }

    // 2. Trouver la nomenclature correspondant au produit sélectionné
    const bom = boms.find(b => b.product_id == product.id || b.fk_product == product.id);
    
    if (!bom) {
      errorMessage.value = `Aucune nomenclature trouvée pour le produit ${product.ref}.`;
      return;
    }

    // 3. Récupérer les lignes de la nomenclature spécifique
    const bomLines = await fetchApiData(`boms/${bom.id}/lines`);
    
    if (!bomLines || bomLines.length === 0) {
      errorMessage.value = 'Aucun composant trouvé dans la nomenclature.';
      return;
    }

    // 4. Récupérer les détails de chaque composant en parallèle
    const componentsWithDetails = await Promise.all(
      bomLines.map(async (line) => {
        try {
          // Utiliser l'ID du produit depuis la ligne BOM
          const componentProductId = line.fk_product || line.product_id;
          
          if (!componentProductId) {
            return {
              id: line.id,
              name: 'Composant sans produit associé',
              ref: 'N/A',
              requiredQuantity: parseFloat(line.qty) || 0,
              availableStock: 0,
              hasSufficientStock: false,
              warehouse: 'Non spécifié'
            };
          }

          // Récupérer les informations du produit composant - URL COMPLÈTE
          const componentProduct = await fetch(`http://localhost/dolibarr/htdocs/api/index.php/products/${componentProductId}`, {
            headers: {
              'Accept': 'application/json',
              'DOLAPIKEY': userStore.data?.success?.token
            }
          }).then(response => response.json());
          
          // Récupérer le stock actuel du composant - URL COMPLÈTE
          const stockData = await fetch(`http://localhost/dolibarr/htdocs/api/index.php/products/${componentProductId}/stock`, {
            headers: {
              'Accept': 'application/json',
              'DOLAPIKEY': userStore.data?.success?.token
            }
          }).then(response => response.json());
          
          const availableStock = stockData.stock_reel || stockData.value || 0;

          // Récupérer les informations d'entrepôt si disponibles - URL COMPLÈTE
          let warehouseInfo = 'Non spécifié';
          if (componentProduct.fk_default_warehouse) {
            try {
              const warehouse = await fetch(`http://localhost/dolibarr/htdocs/api/index.php/warehouses/${componentProduct.fk_default_warehouse}`, {
                headers: {
                  'Accept': 'application/json',
                  'DOLAPIKEY': userStore.data?.success?.token
                }
              }).then(response => response.json());
              warehouseInfo = warehouse.ref || warehouse.label || 'Entrepôt par défaut';
            } catch (warehouseError) {
              console.warn(`Impossible de récupérer l'entrepôt pour le composant ${componentProductId}:`, warehouseError);
            }
          }

          return {
            id: line.id,
            name: componentProduct.label || componentProduct.name || 'Sans libellé',
            ref: componentProduct.ref || `ID: ${componentProductId}`,
            requiredQuantity: parseFloat(line.qty) || 0,
            availableStock: availableStock,
            hasSufficientStock: availableStock >= (parseFloat(line.qty) || 0),
            warehouse: warehouseInfo,
            productId: componentProductId
          };
        } catch (error) {
          console.error(`Erreur chargement composant ${line.id}:`, error);
          return {
            id: line.id,
            name: 'Produit non trouvé',
            ref: `ID: ${line.fk_product || line.product_id || 'N/A'}`,
            requiredQuantity: parseFloat(line.qty) || 0,
            availableStock: 0,
            hasSufficientStock: false,
            warehouse: 'Erreur de chargement'
          };
        }
      })
    );

    bomComponents.value = componentsWithDetails;

  } catch (error) {
    console.error('Erreur lors du chargement de la BOM:', error);
    errorMessage.value = 'Erreur lors du chargement de la nomenclature: ' + (error.message || 'Erreur inconnue');
  }
}

function closeBomModal() {
  showBomModal.value = false
  selectedBomProduct.value = null
  bomComponents.value = []
}

function hasBom(product) {
  // Logique pour déterminer si le produit a un BOM
  // À adapter selon votre structure de données
  return product.bom || product.has_bom || Math.random() > 0.5 // Exemple aléatoire
}

// function showAllMovements(productId) {
//   const movements = recentMovements.value.filter(movement => movement.product_id == productId)
//   if (movements.length > 0) {
//     selectedMovement.value = {
//       ...movements[0],
//       relatedMovements: movements,
//       showAllMovements: true
//     }
//     showMovementModal.value = true
//   }
// }

function sortStocks(field) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
}

// Fonctions pour la modal des détails de mouvement
function showMovementDetails(movement) {
  selectedMovement.value = movement
  showMovementModal.value = true
}

function closeMovementModal() {
  showMovementModal.value = false
  selectedMovement.value = null
}

function getMovementTypeLabel(type) {
  const types = {
    0: 'Entrée',
    1: 'Sortie', 
    2: 'Sortie (Production)',
    3: 'Entrée (Production)',
    4: 'Transfert',
    5: 'Inventaire',
  }
  return types[type] || `Type ${type}`
}

// Fonctions API existantes (conservees mais non modifiées pour la brièveté)
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
      throw new Error(`Erreur API: ${endpoint}`)
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

async function fetchProducts() {
  try {
    const data = await fetchApiData('products', { loadingRef: loadingProducts })
    products.value = data
  } catch (error) {
    errorMessage.value = 'Impossible de charger les produits'
  }
}

async function fetchWarehouses() {
  try {
    const data = await fetchApiData('warehouses', { loadingRef: loadingWarehouses })
    warehouses.value = data
  } catch (error) {
    errorMessage.value = 'Impossible de charger les entrepôts'
  }
}

async function fetchProductStock(productId) {
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
    if (!response.ok) throw new Error('Erreur API stock')
    const data = await response.json()
    productStocks.value[productId] = data.stock_reel || 0
    return data.stock_reel || 0
  } catch (error) {
    console.error('Erreur fetchProductStock:', error)
    productStocks.value[productId] = 0
    return 0
  }
}

// NOUVELLE FONCTION : Récupérer TOUS les mouvements pour calculs précis
async function fetchAllMovements() {
  try {
    const token = userStore.data?.success?.token;
    
    // Récupérer tous les mouvements sans limite
    const response = await fetch(
      'http://localhost/dolibarr/htdocs/api/index.php/stockmovements?sortfield=t.rowid&sortorder=ASC&limit=10000',
      {
        headers: {
          Accept: 'application/json',
          DOLAPIKEY: token,
        },
      }
    );

    if (!response.ok) throw new Error('Erreur API mouvements');
    const data = await response.json();
    
    // Stocker tous les mouvements pour les calculs
    recentMovements.value = data;
    
    return data;
  } catch (error) {
    console.error('Erreur lors du chargement des mouvements:', error);
    return [];
  }
}

async function createStockMovement(movementData) {
  const token = userStore.data?.success?.token

  const response = await fetch('http://localhost/dolibarr/htdocs/api/index.php/stockmovements', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      DOLAPIKEY: token,
    },
    body: JSON.stringify(movementData),
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la création du mouvement')
  }

  return await response.json()
}

async function addStock() {
  if (!canAddStock.value) return

  addingStock.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const now = new Date()
    const datem = now.toISOString().split('T')[0]

    const movementData = {
      product_id: parseInt(addForm.value.productId),
      warehouse_id: parseInt(addForm.value.warehouseId),
      qty: parseFloat(addForm.value.quantity),
      price: parseFloat(addForm.value.purchasePrice),
      movementlabel: addForm.value.label || `Ajout de stock - ${now.toLocaleDateString()}`,
      movementcode: `ADD-${Date.now()}`,
      type: 0,
      datem: datem,
    }

    await createStockMovement(movementData)
    await fetchProductStock(addForm.value.productId)

    successMessage.value = `Stock ajouté avec succès: ${addForm.value.quantity} unités de ${getProductName(addForm.value.productId)}`
    await fetchRecentMovements()
    resetAddForm()

    setTimeout(() => {
      successMessage.value = ''
    }, 5000)
  } catch (error) {
    console.error("Erreur lors de l'ajout de stock:", error)
    errorMessage.value = `Erreur: ${error.message}`
    setTimeout(() => {
      errorMessage.value = ''
    }, 5000)
  } finally {
    addingStock.value = false
  }
}

async function removeStock() {
  if (!canRemoveStock.value) return

  removingStock.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const now = new Date()
    const datem = now.toISOString().split('T')[0]

    const movementData = {
      product_id: parseInt(removeForm.value.productId),
      warehouse_id: parseInt(removeForm.value.warehouseId),
      qty: -parseFloat(removeForm.value.quantity),
      movementlabel: removeForm.value.label || `Suppression de stock - ${now.toLocaleDateString()}`,
      movementcode: `REMOVE-${Date.now()}`,
      type: 1,
      datem: datem,
    }

    await createStockMovement(movementData)
    await fetchProductStock(removeForm.value.productId)

    successMessage.value = `Stock supprimé avec succès: ${removeForm.value.quantity} unités de ${getProductName(removeForm.value.productId)}`
    await fetchRecentMovements()
    resetRemoveForm()

    setTimeout(() => {
      successMessage.value = ''
    }, 5000)
  } catch (error) {
    console.error('Erreur lors de la suppression de stock:', error)
    errorMessage.value = `Erreur: ${error.message}`
    setTimeout(() => {
      errorMessage.value = ''
    }, 5000)
  } finally {
    removingStock.value = false
  }
}

// Fonctions de réinitialisation
function resetAddForm() {
  addForm.value = {
    productId: '',
    quantity: null,
    purchasePrice: null,
    warehouseId: '',
    label: '',
  }
}

function resetRemoveForm() {
  removeForm.value = {
    productId: '',
    quantity: null,
    warehouseId: '',
    label: '',
  }
}

// Au montage du composant
onMounted(async () => {
  if (!userStore.data) {
    userStore.restoreData();
  }

  if (!userStore.token) {
    errorMessage.value = 'Session expirée. Veuillez vous reconnecter.';
    return;
  }

  try {
    // Récupérer produits, entrepôts et TOUS les mouvements
    await Promise.all([
      fetchProducts(), 
      fetchWarehouses(), 
      fetchAllMovements() // Utiliser la nouvelle fonction
    ]);

    if (products.value.length > 0) {
      // Charger les stocks pour tous les produits
      const stockPromises = products.value.map((product) => 
        fetchProductStock(product.id)
      );
      await Promise.all(stockPromises);
      
      // Initialiser le registre des stocks initiaux avec les bonnes valeurs
      products.value.forEach(product => {
        if (!initialStockRegistry.value[product.id]) {
          // Calculer le stock initial correctement
          initialStockRegistry.value[product.id] = calculateInitialStock(product.id);
        }
      });
    }
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
    errorMessage.value = 'Erreur lors du chargement des données. Veuillez réessayer.';
  }
});
</script>

<style scoped>
.stock-management-card {
  text-align: left;
  max-width: 1200px;
  margin: 0 auto;
}

.form-container {
  background: var(--surface-2);
  padding: 2rem;
  border-radius: 8px;
  box-shadow: var(--shadow);
  margin-bottom: 2rem;
  border: 1px solid var(--border);
}

.form-title {
  color: var(--primary);
  margin-bottom: 1.5rem;
  font-size: 1.3rem;
  font-weight: 600;
}

.stock-form {
  display: grid;
  gap: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text);
}

.required {
  color: var(--danger);
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

.form-control:disabled {
  background-color: #3a475c;
  cursor: not-allowed;
  opacity: 0.8;
}

.form-help {
  color: var(--muted);
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.loading-text {
  color: var(--muted);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
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

.btn-danger {
  background: var(--danger);
  color: #fff;
}

.btn-danger:hover:not(:disabled) {
  background: var(--danger-hover);
}

.btn-secondary {
  background: #6c757d;
  color: #fff;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
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

.alert-success {
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
  border-left: 4px solid #22c55e;
}

.recent-movements {
  margin-top: 3rem;
}

.section-subtitle {
  margin-bottom: 1.5rem;
  color: var(--primary);
  font-size: 1.2rem;
  font-weight: 600;
}

.movements-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: var(--surface-2);
  box-shadow: var(--shadow);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.movements-table th,
.movements-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.movements-table th {
  background: var(--surface-3);
  font-weight: 600;
  color: var(--text);
  border-bottom: 2px solid var(--border);
}

.movements-table tbody tr {
  transition: background 0.2s;
}

.movements-table tbody tr:hover {
  background: rgba(33, 150, 243, 0.05);
}

.movements-table tbody tr:last-child td {
  border-bottom: none;
}

.movement-type {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
}

.movement-in {
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
}

.movement-out {
  background: rgba(211, 47, 47, 0.12);
  color: #ef6666;
}

.quantity-cell,
.price-cell {
  text-align: right;
  font-family: 'Courier New', monospace;
  font-weight: 600;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--primary);
  color: var(--primary);
}

.btn-outline:hover {
  background: var(--primary);
  color: var(--primary-contrast);
}

/* Styles pour la modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--surface-1);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.large-modal {
  max-width: 900px;
  max-height: 80vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}

.modal-title {
  margin: 0;
  color: var(--primary);
  font-size: 1.5rem;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--muted);
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.modal-close:hover {
  background: var(--surface-3);
  color: var(--text);
}

.modal-body {
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 1.5rem 2rem;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.movement-details {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.detail-section {
  background: var(--surface-2);
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.detail-section h4 {
  margin: 0 0 1rem 0;
  color: var(--primary);
  font-size: 1.2rem;
  font-weight: 600;
  border-bottom: 2px solid var(--primary);
  padding-bottom: 0.5rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-item label {
  font-weight: 600;
  color: var(--muted);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-item span {
  color: var(--text);
  font-size: 1rem;
  word-break: break-word;
}

.quantity-value,
.price-value {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  font-size: 1.1rem;
}

.quantity-value {
  color: var(--primary);
}

.price-value {
  color: var(--success);
}

/* Styles pour les cellules cliquables */
.clickable-cell {
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.clickable-cell:hover {
  background-color: rgba(33, 150, 243, 0.1);
}

.clickable-cell::after {
  content: '🔍';
  margin-left: 5px;
  opacity: 0.7;
  font-size: 0.8em;
}

/* Styles pour les modals de détails */
.movement-filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border);
  background: var(--surface-2);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.filter-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.filter-btn:hover:not(.active) {
  background: var(--surface-3);
}

.movement-total {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: var(--surface-3);
  border-radius: 4px;
  font-weight: 600;
  text-align: center;
}

.movements-detail-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.movements-detail-table th,
.movements-detail-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
}

.movements-detail-table th {
  background: var(--surface-3);
  font-weight: 600;
}

/* Styles pour la BOM */
.bom-description {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--surface-2);
  border-radius: 6px;
  border-left: 4px solid var(--primary);
}

.bom-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.bom-table th,
.bom-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
}

.bom-table th {
  background: var(--surface-3);
  font-weight: 600;
}

.stock-status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.stock-status.sufficient {
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
}

.stock-status.insufficient {
  background: rgba(211, 47, 47, 0.12);
  color: #ef6666;
}

/* Styles pour la liste des stocks */
.stock-list-container {
  margin-top: 3rem;
  background: var(--surface-2);
  padding: 2rem;
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.table-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--surface-3);
  border-radius: 6px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-label {
  font-weight: 600;
  color: var(--text);
  font-size: 0.9rem;
}

.search-input {
  max-width: 100%;
}

.table-responsive {
  overflow-x: auto;
}

.stock-summary-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--surface-1);
  border-radius: 8px;
  overflow: hidden;
}

.stock-summary-table th,
.stock-summary-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.stock-summary-table th {
  background: var(--surface-3);
  font-weight: 600;
  color: var(--text);
  border-bottom: 2px solid var(--border);
}

.stock-summary-table th.sortable {
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
}

.stock-summary-table th.sortable:hover {
  background: var(--surface-4);
}

.sort-indicator {
  margin-left: 0.5rem;
  font-weight: bold;
}

.stock-row:hover {
  background: rgba(33, 150, 243, 0.05);
}

.product-cell {
  min-width: 200px;
}

.product-label {
  font-size: 0.85rem;
  color: var(--muted);
  margin-top: 0.25rem;
}

.numeric-cell {
  text-align: right;
  font-family: 'Courier New', monospace;
  font-weight: 600;
  min-width: 100px;
}

.numeric-cell.positive {
  color: #22c55e;
}

.numeric-cell.negative {
  color: #ef6666;
}

.final-stock.stock-out {
  color: #ef6666;
  font-weight: bold;
}

.final-stock.stock-low {
  color: #f59e0b;
  font-weight: bold;
}

.final-stock.stock-ok {
  color: #22c55e;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--muted);
  font-style: italic;
}

/* Responsive */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }

  .movements-table {
    font-size: 0.9rem;
  }

  .movements-table th,
  .movements-table td {
    padding: 8px 12px;
  }

  .table-controls {
    grid-template-columns: 1fr;
  }
  
  .stock-summary-table {
    font-size: 0.8rem;
  }
  
  .stock-summary-table th,
  .stock-summary-table td {
    padding: 8px 12px;
  }
  
  .product-cell {
    min-width: 150px;
  }
  
  .numeric-cell {
    min-width: 80px;
  }

  .modal-content {
    margin: 0.5rem;
    max-height: 95vh;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1rem;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .movement-details {
    gap: 1rem;
  }

  .detail-section {
    padding: 1rem;
  }

  .movement-filters {
    flex-direction: column;
  }
  
  .filter-btn {
    width: 100%;
    text-align: center;
  }
  
  .movements-detail-table {
    font-size: 0.8rem;
  }
  
  .movements-detail-table th,
  .movements-detail-table td {
    padding: 0.5rem;
  }
  
  .large-modal {
    margin: 1rem;
    max-height: 90vh;
  }
}
</style>