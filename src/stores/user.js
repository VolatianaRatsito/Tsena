import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    data: null,
  }),
  actions: {
    setData(payload) {
      this.data = payload
      // Sauvegarder dans localStorage
      if (payload) {
        localStorage.setItem('userStore', JSON.stringify(payload))
      }
    },
    clearData() {
      this.data = null
      localStorage.removeItem('userStore')
    },
    // Nouvelle action pour restaurer les données
    restoreData() {
      const saved = localStorage.getItem('userStore')
      if (saved) {
        try {
          this.data = JSON.parse(saved)
        } catch (error) {
          console.error('Erreur lors de la restauration des données:', error)
          localStorage.removeItem('userStore')
        }
      }
    },
  },
  getters: {
    isAuthenticated: (state) => {
      return state.data?.success?.token ? true : false
    },
    token: (state) => {
      return state.data?.success?.token || null
    },
  },
})
