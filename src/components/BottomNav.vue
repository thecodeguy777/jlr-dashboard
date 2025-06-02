<template>
    <nav
        class="fixed bottom-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-t border-white/10 shadow-xl flex justify-around items-center h-16">
        <!-- Home -->
        <button @click="goToHomeDashboard" class="flex flex-col items-center justify-center text-xs">
            <Home class="w-5 h-5" />
            <span class="mt-0.5">Home</span>
        </button>

        <!-- Summary (Admin + Executive) -->
        <router-link v-if="['admin', 'executive'].includes(userStore.role)" to="/summary" v-slot="{ isActive }">
            <div
                :class="['flex flex-col items-center justify-center text-xs', { 'text-green-400 font-semibold': isActive }]">
                <BarChart class="w-5 h-5" />
                <span class="mt-0.5">Summary</span>
            </div>
        </router-link>

        <!-- Floating Log Button (Admin + Employee Admin) -->
        <router-link v-if="['admin', 'employee_admin'].includes(userStore.role)" to="/deliveries" v-slot="{ isActive }">
            <div class="relative -top-6">
                <div
                    :class="['w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all', isActive ? 'bg-green-600' : 'bg-green-500 hover:bg-green-600']">
                    <Plus class="w-6 h-6 text-white" />
                </div>
            </div>
        </router-link>

        <!-- Alerts (Admin Only) -->
        <router-link v-if="userStore.role === 'admin'" to="/cashtracker" v-slot="{ isActive }">
            <div
                :class="['flex flex-col items-center justify-center text-xs', { 'text-green-400 font-semibold': isActive }]">
                <Bell class="w-5 h-5" />
                <span class="mt-0.5">Transactions</span>
            </div>
        </router-link>

        <!-- Log Out (Everyone) -->
        <button @click="$emit('logout')" class="flex flex-col items-center justify-center text-xs">
            <User class="w-5 h-5" />
            <span class="mt-0.5">Log Out</span>
        </button>
    </nav>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore'
import { Home, BarChart, Plus, Bell, User } from 'lucide-vue-next'

const router = useRouter()
const userStore = useUserStore()

function goToHomeDashboard() {
    const routes = {
        admin: '/admin',
        'employee_admin': '/input',
        executive: '/executive',
        employee: '/employee',
    }
    router.push(routes[userStore.role] || '/login')
}
</script>