<template>
  <div class="min-h-screen flex flex-col items-center justify-center text-gray-900 px-4">
    <!-- Logo -->
    <img src="/assets/renew-logo.png" alt="RenewCo Logo" class="w-24 h-24 mb-4" />

    <!-- Login Form -->
    <form @submit.prevent="handleLogin" class="flex flex-col space-y-4 w-full max-w-xs">
      <input v-model="email" type="email" placeholder="Email" autocomplete="username"
        class="px-4 py-2 border border-gray-300 rounded" />
      <input v-model="password" type="password" placeholder="Password" autocomplete="current-password"
        class="px-4 py-2 border border-gray-300 rounded" />

      <button type="submit" :disabled="loading"
        class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">
        {{ loading ? 'Logging in...' : 'Log In' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/useUserStore'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'

const email = ref('')
const password = ref('')
const loading = ref(false)

const userStore = useUserStore()
const router = useRouter()

async function handleLogin() {
  if (!email.value || !password.value) {
    return alert('Please enter both email and password.')
  }

  loading.value = true

  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })

  if (error) {
    alert('Login failed: ' + error.message)
    loading.value = false
    return
  }

  const success = await userStore.fetchUser()
  loading.value = false

  if (!success || !userStore.role) {
    alert('Login succeeded but user role could not be determined.')
    return router.push('/')
  }

  email.value = ''
  password.value = ''

  const roleRoutes = {
    admin: '/admin',
    executive: '/executive',
    employee_admin: '/input',
    employee: '/employee',
    driver: '/driver'
  }

  router.push(roleRoutes[userStore.role] || '/')
}
</script>
