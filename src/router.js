import { createRouter, createWebHistory } from 'vue-router'
import Login from './components/Login.vue'
import Dashboard from './components/Dashboard.vue'
import DataManagement from './components/DataManagement.vue'
import Products from './components/products/Products.vue'
import Mos from './components/mos/Mos.vue'
import Stock from './components/stock/Stock.vue'
import StockManagement from './components/stock/StockManagement.vue'
import Produce from './components/produce/Produce.vue'
import MosBatch from './components/mos/MosBatch.vue'
import Statistics from './components/statistics/Statistics.vue'

const routes = [
  { path: '/', component: Login },
  { path: '/dashboard', component: Dashboard },
  { path: '/data_management', component: DataManagement },
  { path: '/products', component: Products },
  { path: '/mos', component: Mos },
  { path: '/stock', component: Stock },
  { path: '/stock-management', component: StockManagement },
  { path: '/produce', component: Produce },
  { path: '/mosbatch', component: MosBatch },
  { path: '/statistics', component: Statistics },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
