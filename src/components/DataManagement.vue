<template>
  <div class="app-wrapper">
    <AppHeader />
    <div class="dashboard-layout">
      <Sidebar />
      <main class="dashboard-container">
        <DataReset />
        <DataImport />
        <!-- Ici vous pourrez ajouter d'autres composants -->
      </main>
    </div>
    <AppFooter />
  </div>
</template>

<script setup>
import AppHeader from './AppHeader.vue'
import AppFooter from './AppFooter.vue'
import Sidebar from './Sidebar.vue'
import DataReset from './reset/DataReset.vue'
import DataImport from './import/DataImport.vue'
</script>

<style scoped></style>
