<template>
  <header class="app-header">
    <div class="logo">LOGO</div>
    <div class="profile">
      <span>Profil utilisateur</span>
      <button class="btn btn-primary" @click="handleLogout">Déconnexion</button>
    </div>
  </header>
</template>

<script setup>
import { useUserStore } from '../stores/user'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

function handleLogout() {
  userStore.setData(null)
  router.push('/')
}
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--surface-2);
  color: var(--text);
  padding: 0 2em;
  border-bottom: 1px solid var(--border);
  min-height: var(--header-height);
  position: sticky;
  top: 0;
  z-index: 10;
}
.logo {
  font-weight: 800;
  letter-spacing: 0.5px;
}
.profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
</style>
