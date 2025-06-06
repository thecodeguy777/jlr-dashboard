<template>
    <div class="min-h-screen text-white p-6 pb-40">
        <!-- Top Payout Summary Card -->
        <div class="bg-white/10 rounded-2xl p-6 mb-6">
            <div class="flex justify-between items-start">
                <div>
                    <h2 class="text-sm text-white/60">Total Payout</h2>
                    <p class="text-3xl font-bold mt-1">₱{{ totalPayout.toLocaleString() }}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm text-white/60">Period</p>
                    <p class="text-lg font-semibold">{{ currentPeriod }}</p>
                </div>
            </div>
        </div>
        Payrol
        <!-- Employee Payout List -->
        <div class="space-y-4">
            <div v-for="employee in employees" :key="employee.id"
                class="bg-white/10 rounded-xl p-4 hover:bg-white/15 transition-colors cursor-pointer"
                @click="viewEmployeeDetails(employee)">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <!-- Employee Avatar -->
                        <div class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <span class="text-xl">👤</span>
                        </div>
                        <!-- Employee Info -->
                        <div>
                            <h3 class="font-medium">{{ employee.name }}</h3>
                            <p class="text-sm text-white/60">{{ employee.position }}</p>
                        </div>
                    </div>
                    <!-- Payout Amount -->
                    <div class="text-right">
                        <p class="text-lg font-bold text-green-400">₱{{ employee.payout.toLocaleString() }}</p>
                        <p class="text-sm text-white/60">{{ employee.status }}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="fixed bottom-28 right-6 flex gap-3">
            <button
                class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-full shadow-lg transition duration-200 active:scale-95">
                Generate Report
            </button>
            <button
                class="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-full shadow-lg transition duration-200 active:scale-95">
                Process Payouts
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Mock data - Replace with actual data fetching
const employees = ref([
    {
        id: 1,
        name: 'John Doe',
        position: 'Senior Developer',
        payout: 25000,
        status: 'Pending'
    },
    {
        id: 2,
        name: 'Jane Smith',
        position: 'Project Manager',
        payout: 35000,
        status: 'Processed'
    },
    {
        id: 3,
        name: 'Mike Johnson',
        position: 'UI Designer',
        payout: 20000,
        status: 'Pending'
    },
    {
        id: 4,
        name: 'Sarah Williams',
        position: 'QA Engineer',
        payout: 22000,
        status: 'Processed'
    }
])

const currentPeriod = ref('January 2024')

const totalPayout = computed(() => {
    return employees.value.reduce((sum, emp) => sum + emp.payout, 0)
})

function viewEmployeeDetails(employee) {
    // Implement employee details view
    console.log('View details for:', employee.name)
}
</script>

<style scoped>
/* Add any component-specific styles here */
</style>