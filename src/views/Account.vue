<template>
  <Dialog :open="isOpen" @close="close" as="div" class="fixed inset-0 z-50 flex items-center justify-center">
    <DialogOverlay class="fixed inset-0 bg-black/70 transition-opacity" />
    <div class="relative w-full max-w-md mx-auto p-6 rounded-2xl shadow-lg bg-black/30 dark:bg-gray-800/80">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-bold tracking-tight">👤 Account Actions</h1>
        <div class="flex items-center gap-2">
          <button @click="toggleDarkMode" class="focus:outline-none text-lg px-2 py-1 rounded transition-colors"
            :class="darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-700'">
            <span v-if="darkMode">🌙</span>
            <span v-else>☀️</span>
          </button>
          <button @click="close" class="ml-2 text-white/60 hover:text-white text-2xl leading-none">&times;</button>
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <button @click="goTo('loan')"
          class="w-full text-left px-5 py-4 rounded-xl bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 shadow transition flex items-center gap-3">
          <span class="text-2xl">➕</span>
          <span class="font-semibold">Add New Loan</span>
        </button>
        <button @click="goTo('refund')"
          class="w-full text-left px-5 py-4 rounded-xl bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 shadow transition flex items-center gap-3">
          <span class="text-2xl">💸</span>
          <span class="font-semibold">Refund Savings</span>
        </button>
        <button @click="goTo('payroll')"
          class="w-full text-left px-5 py-4 rounded-xl bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 shadow transition flex items-center gap-3">
          <span class="text-2xl">📝</span>
          <span class="font-semibold">Generate Payroll</span>
        </button>
        <button @click="logout"
          class="w-full text-left px-5 py-4 rounded-xl bg-red-700 hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-900 shadow transition flex items-center gap-3 mt-2">
          <span class="text-2xl">🚪</span>
          <span class="font-semibold">Logout</span>
        </button>
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore'
import { Dialog, DialogOverlay } from '@headlessui/vue'

const props = defineProps({
  modelValue: Boolean
})
const emit = defineEmits(['update:modelValue'])

const isOpen = ref(props.modelValue)
const darkMode = ref(true)
const router = useRouter()
const userStore = useUserStore()

function toggleDarkMode() {
  darkMode.value = !darkMode.value
  if (darkMode.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

function goTo(action) {
  if (action === 'loan') router.push('/loans/new')
  if (action === 'refund') router.push('/savings/refund')
  if (action === 'payroll') router.push('/generate-payroll')
  close()
}

function logout() {
  userStore.logout()
  router.push('/login')
  close()
}

function close() {
  emit('update:modelValue', false)
  isOpen.value = false
}
</script>

<style>
html.dark {
  background: #111827;
}
</style>
