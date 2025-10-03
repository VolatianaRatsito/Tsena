<template>
  <div class="container">
    <h1>Dolibarr NewApp</h1>
    <p class="slogan">Connectez-vous simplement à votre gestion Dolibarr</p>
    <form @submit.prevent="handleLogin" class="login-form">
      <input type="text" v-model="username" placeholder="Nom d'utilisateur" />
      <input type="password" v-model="password" placeholder="Mot de passe" />
      <button>Se connecter</button>
    </form>

    <!-- Popup Success -->
    <div v-if="successMessage" class="popup success-popup">
      <span class="icon">&#10003;</span>
      <span>{{ successMessage }}</span>
      <button class="close-btn" @click="closePopup">×</button>
    </div>

    <!-- Popup Error -->
    <div v-if="loginError" class="popup error-popup">
      <span class="icon">&#9888;</span>
      <span>{{ loginError }}</span>
      <button class="close-btn" @click="closePopup">×</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const username = ref('')
const password = ref('')
const apiToken = ref('')
const loginError = ref('')
const successMessage = ref('')

const loginDolibarr = async (username, password) => {
  const url = `http://localhost/dolibarr/htdocs/api/index.php/login`
  const body = JSON.stringify({ login: username, password: password })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`)
    }
    const data = await response.json()
    if (data.success && data.success.token) {
      apiToken.value = data.success.token
      console.log('Token:', apiToken.value)
      successMessage.value = data.success.message || 'Connexion réussie.'
      loginError.value = ''
      userStore.setData({
        ...data,
        login: username,
      })
      router.push('/dashboard')
    } else {
      throw new Error('Réponse API inattendue')
    }
    return data
  } catch (err) {
    loginError.value = err.message
    apiToken.value = ''
    successMessage.value = ''
  }
}

const handleLogin = () => {
  loginDolibarr(username.value, password.value)
  username.value = ''
  password.value = ''
}

const closePopup = () => {
  loginError.value = ''
  successMessage.value = ''
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #0a0a0a;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
h1 {
  color: #2196f3;
  margin-bottom: 0.2em;
  font-size: 2.2em;
  letter-spacing: 1px;
}
.slogan {
  color: #b3c6e7;
  margin-bottom: 2em;
  font-size: 1.1em;
  font-style: italic;
}
.login-form {
  background: #111827;
  padding: 2em 2.5em;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(33, 150, 243, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1em;
  min-width: 300px;
}
.login-form input {
  padding: 0.7em 1em;
  border: none;
  border-radius: 6px;
  background: #222c3a;
  color: #fff;
  font-size: 1em;
  outline: none;
  transition: background 0.2s;
}
.login-form input:focus {
  background: #1e293b;
}
.login-form button {
  background: #2196f3;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.7em 1em;
  font-size: 1em;
  cursor: pointer;
  transition: background 0.2s;
}
.login-form button:hover {
  background: #1769aa;
}
.error {
  color: #ff5252;
  font-size: 0.95em;
}
.success {
  color: #4caf50;
  font-size: 0.95em;
}
.popup {
  position: fixed;
  top: 30px;
  right: 30px;
  min-width: 260px;
  max-width: 350px;
  padding: 1.2em 2.2em 1.2em 1.2em;
  border-radius: 10px;
  box-shadow: 0 6px 32px rgba(33, 150, 243, 0.15);
  display: flex;
  align-items: center;
  gap: 1em;
  z-index: 1000;
  font-size: 1.08em;
  animation: fadeIn 0.3s;
}
.success-popup {
  background: #e8f5e9;
  color: #388e3c;
  border-left: 6px solid #4caf50;
}
.error-popup {
  background: #ffebee;
  color: #d32f2f;
  border-left: 6px solid #ff5252;
}
.popup .icon {
  font-size: 1.6em;
  margin-right: 0.5em;
}
.popup .close-btn {
  background: none;
  border: none;
  color: inherit;
  font-size: 1.3em;
  cursor: pointer;
  margin-left: auto;
}
.popup .token {
  display: block;
  font-size: 0.92em;
  color: #666;
  margin-top: 0.3em;
  word-break: break-all;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
