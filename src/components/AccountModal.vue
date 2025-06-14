<template>
    <Dialog :open="userStore.isAccountModalOpen" @close="userStore.closeAccountModal" as="div"
        class="fixed inset-0 z-50 flex items-center justify-center">
        <DialogOverlay class="fixed inset-0 bg-black/70 transition-opacity" />
        <div class="relative w-full max-w-md mx-auto p-6 rounded-2xl shadow-lg bg-gray-900 text-white">
            <div class="flex items-center justify-between mb-6">
                <h1 class="text-xl font-bold tracking-tight">👤 Account Actions</h1>
                <div class="flex items-center gap-2">
                    <button @click="userStore.closeAccountModal"
                        class="ml-2 text-white/60 hover:text-white text-2xl leading-none">&times;</button>
                </div>
            </div>
            <div class="flex flex-col gap-4">
                <!-- Admin only options -->
                <template v-if="userStore.role === 'admin'">
                    <button @click="goTo('loan')"
                        class="w-full text-left px-5 py-4 rounded-xl bg-white/10 hover:bg-white/20 dark:bg-white/10 dark:hover:bg-white/20 shadow-lg transition flex items-center gap-3 border border-white/10 backdrop-blur-md">
                        <span class="text-2xl">➕</span>
                        <span class="font-semibold">Add New Loan</span>
                    </button>
                    <button @click="goTo('refund')"
                        class="w-full text-left px-5 py-4 rounded-xl bg-white/10 hover:bg-white/20 dark:bg-white/10 dark:hover:bg-white/20 shadow-lg transition flex items-center gap-3 border border-white/10 backdrop-blur-md">
                        <span class="text-2xl">💸</span>
                        <span class="font-semibold">Refund Savings</span>
                    </button>
                    <button @click="goTo('payroll')"
                        class="w-full text-left px-5 py-4 rounded-xl bg-white/10 hover:bg-white/20 dark:bg-white/10 dark:hover:bg-white/20 shadow-lg transition flex items-center gap-3 border border-white/10 backdrop-blur-md">
                        <span class="text-2xl">📝</span>
                        <span class="font-semibold">Generate Payroll</span>
                    </button>
                </template>

                <!-- Logout button for all roles -->
                <button @click="logout"
                    class="w-full text-left px-5 py-4 rounded-xl bg-red-700/80 hover:bg-red-800/90 dark:bg-red-800/80 dark:hover:bg-red-900/90 shadow-lg transition flex items-center gap-3 mt-2 border border-red-400/20 backdrop-blur-md">
                    <span class="text-2xl">🚪</span>
                    <span class="font-semibold">Logout</span>
                </button>
            </div>
        </div>
    </Dialog>
</template>

<script setup>
import { Dialog, DialogOverlay } from '@headlessui/vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore'
import { ref } from 'vue'

const userStore = useUserStore()
const darkMode = ref(true)
const router = useRouter()

function goTo(action) {
    if (action === 'loan') router.push('/loan')
    if (action === 'refund') router.push('/company-savings')
    if (action === 'payroll') router.push('/payroll')
    userStore.closeAccountModal()
}

function logout() {
    userStore.logout()
    router.push('/login')
    userStore.closeAccountModal()
}
</script>