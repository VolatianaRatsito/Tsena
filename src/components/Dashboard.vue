<template>
  <div class="app-wrapper">
    <AppHeader />

    <div class="dashboard-layout">
      <Sidebar />

      <main class="dashboard-container">
        <section class="card welcome-card">
          <h2 class="section-title">Bienvenue sur votre tableau de bord !</h2>

          <div v-if="userData">
            <p>
              Bonjour
              <strong>{{ userData.login ? userData.login : 'Utilisateur' }}</strong>
              👋
            </p>
          </div>
          <div v-else>
            <p>Chargement des données utilisateur...</p>
          </div>
        </section>
      </main>
    </div>

    <AppFooter />
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useUserStore } from '../stores/user'
import AppHeader from './AppHeader.vue'
import AppFooter from './AppFooter.vue'
import Sidebar from './Sidebar.vue'

const userStore = useUserStore()
const { data: userData } = storeToRefs(userStore)
</script>

<style scoped>
/* Carte d’accueil (facultatif, pour structurer le contenu) */
.welcome-card {
  text-align: left;
}
</style>
