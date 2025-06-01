import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './index.css'

import { createPinia } from 'pinia'
import { supabase } from './lib/supabase'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

import { useUserStore } from '@/stores/useUserStore'

console.log('[Main] Getting Supabase session...')

// Wait until pinia is applied, then use store
app.mount('#app')

const userStore = useUserStore()

// 1. Initial session hydration
supabase.auth.getSession().then(async ({ data: { session }, error }) => {
    if (error) {
        console.error('[Main] Error getting session:', error)
    }

    if (session?.user) {
        const ok = await userStore.fetchUser()
        console.log('[Main] fetchUser result:', ok, userStore.user)
    }
})

// 2. Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
    console.log('[Auth State Change]', event, session)
    if (session?.user) {
        userStore.setUser(session.user)
    } else {
        userStore.clearUser()
    }
})
