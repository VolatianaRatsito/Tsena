<template>
  <div class="app-wrapper">
    <AppHeader />
    <div class="dashboard-layout">
      <Sidebar />
      <main class="dashboard-container">
        <section class="card products-card">
          <h2 class="section-title">Liste des produits</h2>
          <div v-if="loading">
            <p>Chargement des produits...</p>
          </div>
          <div v-else-if="error">
            <p class="error">Erreur : {{ error }}</p>
          </div>
          <div v-else>
            <table v-if="products.length" class="products-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Libellé</th>
                  <th>Prix HT</th>
                  <th>Entrepôt</th>
                  <th>TVA (%)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="prod in products" :key="prod.id">
                  <td>{{ prod.ref }}</td>
                  <td>{{ prod.label }}</td>
                  <td>{{ prod.price }}</td>
                  <td>{{ prod.warehouseRef}}</td>
                  <td>{{ prod.tva_tx }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else>Aucun produit trouvé.</p>
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

const products = ref([])
const loading = ref(true)
const error = ref(null)
const userStore = useUserStore()

// Fonction pour récupérer la référence du dépôt par son id
async function getWarehouseRefById(id) {
  const token = userStore.data?.success?.token
  const response = await fetch(`http://localhost/dolibarr/htdocs/api/index.php/warehouses/${id}`, {
    headers: {
      Accept: 'application/json',
      DOLAPIKEY: token,
    },
  })
  if (!response.ok) throw new Error('Erreur API dépôt')
  const data = await response.json()
  return data.ref
}

onMounted(async () => {
  try {
    const token = userStore.data?.success?.token
    const response = await fetch(
      'http://localhost/dolibarr/htdocs/api/index.php/products?sortfield=t.ref&sortorder=ASC&limit=100',
      {
        headers: {
          Accept: 'application/json',
          DOLAPIKEY: token,
        },
      },
    )
    if (!response.ok) throw new Error('Erreur API')
    const rawProducts = await response.json()

    // Ajout de la référence du dépôt à chaque produit
    const enrichedProducts = await Promise.all(
      rawProducts.map(async (prod) => {
        let warehouseRef = ''
        if (prod.fk_default_warehouse) {
          try {
            warehouseRef = await getWarehouseRefById(prod.fk_default_warehouse)
          } catch {
            warehouseRef = 'Erreur dépôt'
          }
        }
        return { ...prod, warehouseRef }
      }),
    )
    products.value = enrichedProducts
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.products-card {
  text-align: left;
}

.products-table {
  width: 100%;
  margin-top: 1em;
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

.products-table th,
.products-table td {
  padding: 12px 16px;
  text-align: left;
}

.products-table th {
  background: #f7f7fa;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #ececec;
}

.products-table tbody tr {
  transition: background 0.2s;
}

.products-table tbody tr:hover {
  background: #f0f4ff;
}

.products-table td {
  border-bottom: 1px solid #f0f0f0;
  color: #444;
}

.products-table tbody tr:last-child td {
  border-bottom: none;
}

.error {
  color: red;
}
</style>
