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

    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        setTimeout(async () => {
            const userStore = useUserStore()

            if (!session?.user?.id) return

            // Attempt to hydrate user + role from user_profiles
            const { data, error } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', session.user.id)
                .single()

            if (error) {
                console.warn('[Auth] Could not fetch role from user_profiles:', error.message)
            }

            // Patch role manually if needed
            const patchedUser = {
                ...session.user,
                user_metadata: {
                    ...session.user.user_metadata,
                    role: data?.role || session.user.user_metadata?.role || null
                }
            }

            userStore.setUser(patchedUser)
            console.log('[Auth] User initialized with role:', patchedUser.user_metadata.role)
        }, 0)
    }

    if (event === 'SIGNED_OUT') {
        userStore.clearUser()
        console.log('[Auth] User cleared on sign-out')
    }
})

