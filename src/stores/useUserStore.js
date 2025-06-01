import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    role: null
  }),
  actions: {
    setUser(user) {
      this.user = user
      this.role = user?.user_metadata?.role || null
    },

    async fetchUser() {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        this.user = session.user

        const { data, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        this.role = !error && data ? data.role : 'guest'
        return true
      } else {
        this.user = null
        this.role = null
        return false
      }
    },

    clearUser() {
      console.log('[Auth] clearUser() called')
      this.user = null
      this.role = null
      localStorage.removeItem('user')
      localStorage.removeItem('role')
    },

    logout() {
      console.log('[Auth] logout() called')
      supabase.auth.signOut()
      this.clearUser()
    },

    mockLogin(email, role) {
      this.user = { id: 'mock-user', email }
      this.role = role
      localStorage.setItem('user', JSON.stringify(this.user))
      localStorage.setItem('role', role)
    }
  }
})
