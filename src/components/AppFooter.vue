<template>
  <footer class="app-footer">&copy; {{ year }} Ratsitoarimalala Volatiana Anna</footer>
</template>

<script setup>
const year = new Date().getFullYear()
</script>

<style scoped>
.app-footer {
  text-align: center;
  padding: 1em 0;
  background: var(--surface-2);
  color: var(--muted);
  border-top: 1px solid var(--border);
  margin-top: auto;
  width: 100%;
}
</style>
