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
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('[UserStore] Session fetch error:', sessionError)
          this.user = null
          this.role = null
          return false
        }

        const user = session?.user
        if (!user) {
          console.warn('[UserStore] No user in session')
          this.user = null
          this.role = null
          return false
        }

        this.user = user

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.warn('[UserStore] user_profiles fetch error:', profileError.message)
          this.role = 'guest'
        } else {
          this.role = profile?.role || 'guest'
          console.log('[UserStore] Logged in as:', this.user.email)
          console.log('[UserStore] Role set to:', this.role)

        }

        return true
      } catch (err) {
        console.error('[UserStore] Unexpected error in fetchUser:', err)
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
