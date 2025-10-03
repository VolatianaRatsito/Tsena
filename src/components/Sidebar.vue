<template>
  <nav class="sidebar">
    <ul>
      <li><router-link to="/dashboard">Dashboard</router-link></li>
      <li><router-link to="/data_management">Gestion de données</router-link></li>
      <li><router-link to="/mos">Ordre de fabrication</router-link></li>
      <li><router-link to="/mosbatch">Ordre de fabrication par paquet</router-link></li>
      <li><router-link to="/products">Produits</router-link></li>
      <li><router-link to="/stock">Mouvement de stock</router-link></li>
      <li><router-link to="/stock-management">Gestion des stocks</router-link></li>
      <li><router-link to="/statistics">Statistiques</router-link></li>
    </ul>
  </nav>
</template>

<script>
export default {
  name: 'Sidebar'
}
</script>

<style scoped>
.sidebar {
  background: var(--surface-2);
  color: var(--muted);
  padding: 1.5em 1.25em;
  border-radius: var(--radius);
  box-shadow: var(--shadow);

  /* Sidebar collée sous le header et étirée en hauteur */
  position: sticky;
  top: var(--header-height);
  align-self: stretch;
  height: calc(100vh - var(--header-height));
  overflow: auto;
}

.sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar li {
  margin-bottom: 0.6em;
}

.sidebar a {
  color: var(--muted);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  display: block;
  padding: 0.7em 0.85em;
  border-radius: 8px;
}

.sidebar a:hover {
  background: #1c2536;
  color: #fff;
}

.sidebar a.router-link-exact-active {
  color: var(--primary);
  background: rgba(33, 150, 243, 0.1);
}

@media (max-width: 900px) {
  .sidebar {
    position: static; /* le sticky n'est pas utile en mobile stacké */
    height: auto;
  }
}
</style>