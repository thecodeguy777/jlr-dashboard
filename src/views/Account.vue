
<template>
  <pre class="mt-4 bg-gray-200 p-2 text-sm text-black">
  {{ userStore }}
</pre>

  <div class="min-h-screen px-6 py-12 bg-gray-100 text-gray-900">
    <h1 class="text-2xl font-bold mb-4">👤 Account</h1>
    <p class="mb-2"><strong>User ID:</strong> {{ userStore.user?.id }}</p>
    <p class="mb-2"><strong>Email:</strong> {{ userStore.user?.email }}</p>
    <p class="mb-2"><strong>Role:</strong> {{ userStore.role }}</p>
    <button
      @click="logout"
      class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Log Out
    </button>
  </div>
</template>

<script setup>
import { useUserStore } from '@/stores/useUserStore'
const userStore = useUserStore()

function logout() {
  userStore.logout()
  window.location.href = '/login' // basic redirect after logout
}
</script>
