<template>
  <div class="app-wrapper">
    <AppHeader />
    <div class="dashboard-layout">
      <Sidebar />
      <main class="dashboard-container">
        <section class="card stock-card">
          <h2 class="section-title">Gestion des stocks</h2>

          <div v-if="loading">
            <p>Chargement des données de stock...</p>
          </div>
          <div v-else-if="error">
            <p class="error">Erreur : {{ error }}</p>
          </div>
          <div v-else>
            <table v-if="stockData.length" class="stock-table">
              <thead>
                <tr>
                  <th>Nom du produit</th>
                  <th>Référence</th>
                  <th>Stock initial</th>
                  <th>Mouvements</th>
                  <th>Stock final</th>
                  <th>Entrepôt</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in stockData" :key="item.productId">
                  <td>{{ item.productName }}</td>
                  <td>{{ item.productRef }}</td>
                  <td class="stock-number">{{ item.initialStock }}</td>
                  <td>
                    <button
                      class="toggle-movements-btn"
                      @click="toggleMovements(item.productId)"
                    >
                      {{ openMovements[item.productId] ? 'Masquer' : 'Voir mouvements' }}
                    </button>

                    <div
                      v-if="openMovements[item.productId]"
                      class="movements"
                    >
                      <div
                        v-for="movement in item.movements"
                        :key="movement.id"
                        :class="['movement', movement.qty > 0 ? 'movement-in' : 'movement-out']"
                      >
                        <span class="movement-qty">
                          {{ movement.qty > 0 ? '+' : '' }}{{ movement.qty }}
                        </span>
                        <span class="movement-label">{{ movement.label }}</span>
                        <span class="movement-date">{{ formatDate(movement.datem) }}</span>
                      </div>
                      <div v-if="!item.movements.length" class="no-movements">Aucun mouvement</div>
                    </div>
                  </td>
                  <td class="stock-number final-stock">{{ item.finalStock }}</td>
                  <td>{{ item.warehouseName }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else>Aucune donnée de stock trouvée.</p>
          </div>
        </section>
      </main>
    </div>
    <AppFooter />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppHeader from '../AppHeader.vue'
import AppFooter from '../AppFooter.vue'
import Sidebar from '../Sidebar.vue'
import { useUserStore } from '../../stores/user'

const stockData = ref([])
const loading = ref(true)
const error = ref(null)
const openMovements = ref({})
const userStore = useUserStore()

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

function toggleMovements(productId) {
  openMovements.value[productId] = !openMovements.value[productId]
}

async function getProductInfo(productId) {
  const token = userStore.data?.success?.token
  const response = await fetch(
    `http://localhost/dolibarr/htdocs/api/index.php/products/${productId}`,
    {
      headers: {
        Accept: 'application/json',
        DOLAPIKEY: token,
      },
    },
  )
  if (!response.ok) throw new Error(`Erreur API produit ${productId}`)
  return await response.json()
}

async function getWarehouseInfo(warehouseId) {
  const token = userStore.data?.success?.token
  const response = await fetch(
    `http://localhost/dolibarr/htdocs/api/index.php/warehouses/${warehouseId}`,
    {
      headers: {
        Accept: 'application/json',
        DOLAPIKEY: token,
      },
    },
  )
  if (!response.ok) throw new Error(`Erreur API entrepôt ${warehouseId}`)
  return await response.json()
}

async function getProductStock(productId) {
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
  if (!response.ok) throw new Error(`Erreur API stock ${productId}`)
  return await response.json()
}

async function getStockMovements() {
  const token = userStore.data?.success?.token
  const response = await fetch(
    'http://localhost/dolibarr/htdocs/api/index.php/stockmovements?sortfield=t.rowid&sortorder=ASC&limit=100',
    {
      headers: {
        Accept: 'application/json',
        DOLAPIKEY: token,
      },
    },
  )
  if (!response.ok) throw new Error('Erreur API mouvements')
  return await response.json()
}

onMounted(async () => {
  if (!userStore.data) {
    userStore.restoreData()
  }

  try {
    const movements = await getStockMovements()

    const movementsByProduct = movements.reduce((acc, movement) => {
      const productId = movement.product_id
      if (!acc[productId]) acc[productId] = []
      acc[productId].push({
        id: movement.id,
        qty: parseFloat(movement.qty),
        label: movement.label,
        datem: movement.datem,
        warehouseId: movement.warehouse_id,
      })
      return acc
    }, {})

    const stockPromises = Object.keys(movementsByProduct).map(async (productId) => {
      try {
        const [productInfo, stockInfo] = await Promise.all([
          getProductInfo(productId),
          getProductStock(productId),
        ])
        const productMovements = movementsByProduct[productId]

        const totalMovements = productMovements.reduce((sum, mov) => sum + mov.qty, 0)
        const finalStock = stockInfo.stock_reel || 0
        const initialStock = finalStock - totalMovements

        let warehouseName = 'N/A'
        if (Object.keys(stockInfo.stock_warehouses).length > 0) {
          const firstWarehouseId = Object.keys(stockInfo.stock_warehouses)[0]
          try {
            const warehouseInfo = await getWarehouseInfo(firstWarehouseId)
            warehouseName = warehouseInfo.ref || warehouseInfo.lieu || 'Entrepôt'
          } catch (e) {
            warehouseName = `Entrepôt ${firstWarehouseId}`
          }
        }

        return {
          productId,
          productName: productInfo.label || 'Produit sans nom',
          productRef: productInfo.ref || 'N/A',
          initialStock,
          movements: productMovements.sort((a, b) => a.datem - b.datem),
          finalStock,
          warehouseName,
        }
      } catch (e) {
        console.error(`Erreur pour le produit ${productId}:`, e)
        return null
      }
    })

    const results = await Promise.all(stockPromises)
    stockData.value = results.filter((item) => item !== null)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.stock-card {
  text-align: left;
}

.stock-table {
  width: 100%;
  margin-top: 1em;
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

.stock-table th,
.stock-table td {
  padding: 12px 16px;
  text-align: left;
  vertical-align: top;
}

.stock-table th {
  background: #f7f7fa;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #ececec;
}

.stock-table tbody tr {
  transition: background 0.2s;
}

.stock-table tbody tr:hover {
  background: #f0f4ff;
}

.stock-table td {
  border-bottom: 1px solid #f0f0f0;
  color: #444;
}

.stock-table tbody tr:last-child td {
  border-bottom: none;
}

.stock-number {
  text-align: center;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.final-stock {
  background: #f0f8f0;
  color: #2d6e2d;
}

.movements {
  max-width: 300px;
  margin-top: 4px;
}

.movement {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  margin: 2px 0;
  border-radius: 4px;
  font-size: 12px;
  gap: 8px;
}

.movement-in {
  background: #e8f5e8;
  border-left: 3px solid #4caf50;
}

.movement-out {
  background: #ffeaea;
  border-left: 3px solid #f44336;
}

.movement-qty {
  font-weight: 600;
  min-width: 40px;
}

.movement-label {
  flex: 1;
  font-size: 11px;
  color: #666;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.movement-date {
  font-size: 10px;
  color: #999;
  min-width: 80px;
}

.no-movements {
  color: #999;
  font-style: italic;
  text-align: center;
  padding: 8px;
}

.toggle-movements-btn {
  background: #1976d2;
  color: #fff;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  margin-bottom: 4px;
}

.toggle-movements-btn:hover {
  background: #125ea4;
}

.error {
  color: red;
  background: #ffeaea;
  padding: 12px;
  border-radius: 4px;
  border-left: 4px solid #f44336;
}

@media (max-width: 768px) {
  .stock-table {
    font-size: 14px;
  }

  .stock-table th,
  .stock-table td {
    padding: 8px 12px;
  }

  .movements {
    max-width: 200px;
  }

  .movement-label {
    display: none;
  }
}
</style>
