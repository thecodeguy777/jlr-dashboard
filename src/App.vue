<template>
  <!-- Render layout only after session is resolved -->
  <div v-if="!isLoading">
    <!-- Main App Layout (when logged in) -->
    <div v-if="userStore.user"
      class="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white overflow-hidden">
      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto p-6 pb-20">
        <router-view />
      </main>

      <!-- Bottom Navigation -->
      <BottomNav @logout="showLogoutModal = true" />
    </div>

    <!-- Unauthenticated fallback -->
    <div v-else>
      <router-view />
    </div>
  </div>

  <!-- Logout Confirmation Modal -->
  <transition name="fade">
    <div v-if="showLogoutModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-sm text-center shadow-2xl border border-white/10">
        <h2 class="text-xl font-semibold text-white mb-2">Log Out</h2>
        <p class="text-sm text-gray-400 mb-6">Are you sure you want to log out of this account?</p>

        <div class="flex gap-3">
          <button @click="showLogoutModal = false"
            class="flex-1 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-sm transition text-white">
            Cancel
          </button>
          <button @click="logout"
            class="flex-1 py-2 rounded-md bg-red-500 hover:bg-red-600 text-sm transition text-white font-semibold">
            Log Out
          </button>
        </div>
      </div>
    </div>
  </transition>

  <AccountModal v-if="userStore.isAccountModalOpen" />

</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/useUserStore'
import BottomNav from '@/components/BottomNav.vue'
import AccountModal from '@/components/AccountModal.vue'

const userStore = useUserStore()
const router = useRouter()
const showLogoutModal = ref(false)
const isLoading = ref(true)

let authListener = null

const logout = async () => {
  showLogoutModal.value = false
  await supabase.auth.signOut()
  userStore.clearUser()
  router.push('/login')
  // redirection will be handled by auth listener / router guards
}

const goToHomeDashboard = () => {
  const routes = {
    admin: '/admin',
    'employee_admin': '/input',
    executive: '/executive',
    employee: '/employee',
  }
  router.push(routes[userStore.role] || '/login')
}

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.user) {
    userStore.setUser(session.user)
  } else {
    userStore.clearUser()
  }

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      userStore.setUser(session.user)
    } else {
      userStore.clearUser()
    }
  })

  authListener = listener
  isLoading.value = false
})

onUnmounted(() => {
  authListener?.subscription?.unsubscribe()
})
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
