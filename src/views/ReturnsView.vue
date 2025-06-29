<script setup>
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import ReturnsForm from '../components/ReturnsForm.vue'

// State
const returns = ref([])
const isLoading = ref(true)
const showForm = ref(false)
const selectedDelivery = ref(null)
const selectedProduct = ref(null)
const selectedWorker = ref(null)

// Week selection
const selectedWeek = ref(new Date())

// Get start and end of week
const weekRange = computed(() => {
    const start = new Date(selectedWeek.value)
    start.setDate(start.getDate() - start.getDay()) // Start of week (Sunday)
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(end.getDate() + 6) // End of week (Saturday)
    end.setHours(23, 59, 59, 999)

    return { start, end }
})

// Format date for display
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

// Change week
function changeWeek(offset) {
    const newDate = new Date(selectedWeek.value)
    newDate.setDate(newDate.getDate() + (offset * 7))
    selectedWeek.value = newDate
    loadReturns()
}

// Load returns data
async function loadReturns() {
    try {
        isLoading.value = true
        const { data, error } = await supabase
            .from('returns')
            .select(`
                *,
                worker:worker_id (name),
                repair_worker:repair_worker_id (name),
                product:product_id (name, category),
                target_product:target_product_id (name),
                delivery:delivery_id (*)
            `)
            .gte('created_at', weekRange.value.start.toISOString())
            .lte('created_at', weekRange.value.end.toISOString())
            .order('created_at', { ascending: false })

        if (error) throw error
        returns.value = data
    } catch (error) {
        console.error('Error loading returns:', error)
    } finally {
        isLoading.value = false
    }
}

// Computed properties for filtering
const returnsByType = computed(() => {
    const grouped = {
        return: [],
        repair: [],
        transform: []
    }
    returns.value.forEach(r => {
        if (grouped[r.type]) {
            grouped[r.type].push(r)
        }
    })
    return grouped
})

// Computed totals
const weeklyTotals = computed(() => ({
    returns: returnsByType.value.return.reduce((sum, item) => sum + item.quantity, 0),
    repairs: returnsByType.value.repair.reduce((sum, item) => sum + item.quantity, 0),
    transforms: returnsByType.value.transform.reduce((sum, item) => sum + item.quantity, 0),
    laborCost: returnsByType.value.repair.reduce((sum, item) => sum + (item.labor_cost || 0), 0) +
        returnsByType.value.transform.reduce((sum, item) => sum + (item.labor_cost || 0), 0)
}))

// Handle form submission
function handleSaved() {
    loadReturns()
    showForm.value = false
}

// Handle opening form
function openForm(delivery = null, product = null, worker = null) {
    selectedDelivery.value = delivery
    selectedProduct.value = product
    selectedWorker.value = worker
    showForm.value = true
}

// Initial load
loadReturns()
</script>

<template>
    <div class="min-h-screen bg-gray-900 p-3 sm:p-6">
        <ReturnsForm v-if="showForm" :worker_id="selectedWorker?.id" :product_id="selectedProduct?.id"
            :delivery_id="selectedDelivery?.id" @close="showForm = false" @saved="handleSaved" />

        <!-- Header -->
        <div class="bg-gray-800 rounded-xl p-4 sm:p-6 shadow-lg mb-4 sm:mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                        <svg class="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" fill="none" stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                        </svg>
                    </div>
                    <div>
                        <h1 class="text-xl sm:text-2xl font-bold text-white">Returns & Repairs</h1>
                        <p class="text-sm text-gray-400">Manage product returns, repairs and transformations</p>
                    </div>
                </div>
                <button @click="openForm()"
                    class="w-full sm:w-auto px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>New Return</span>
                </button>
            </div>

            <!-- Week Selection -->
            <div
                class="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-700">
                <div class="flex items-center gap-3">
                    <button @click="changeWeek(-1)"
                        class="p-2 hover:bg-gray-700 rounded-lg transition-colors duration-200">
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div class="text-white text-sm sm:text-base">
                        {{ formatDate(weekRange.start) }} - {{ formatDate(weekRange.end) }}
                    </div>
                    <button @click="changeWeek(1)"
                        class="p-2 hover:bg-gray-700 rounded-lg transition-colors duration-200">
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <div class="flex gap-4 text-sm">
                    <div class="px-3 py-1.5 bg-gray-700/50 rounded-lg">
                        <span class="text-gray-400">Total Returns:</span>
                        <span class="text-red-400 font-medium ml-1">{{ weeklyTotals.returns }} pcs</span>
                    </div>
                    <div class="px-3 py-1.5 bg-gray-700/50 rounded-lg">
                        <span class="text-gray-400">Total Repairs:</span>
                        <span class="text-blue-400 font-medium ml-1">{{ weeklyTotals.repairs }} pcs</span>
                    </div>
                    <div class="px-3 py-1.5 bg-gray-700/50 rounded-lg">
                        <span class="text-gray-400">Labor Cost:</span>
                        <span class="text-green-400 font-medium ml-1">₱{{ weeklyTotals.laborCost.toLocaleString()
                            }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center py-12">
            <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
            <p class="mt-4 text-gray-400">Loading returns data...</p>
        </div>

        <!-- Content -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <!-- Returns Section -->
            <div class="bg-gray-800/80 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700/50 shadow-xl">
                <div class="p-4 border-b border-gray-700/50 flex items-center justify-between">
                    <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                        <span class="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </span>
                        Returns
                    </h2>
                    <span class="text-sm font-medium text-red-400">{{ returnsByType.return.length }} items</span>
                </div>
                <div class="p-4">
                    <div v-if="returnsByType.return.length === 0" class="text-center py-8 text-gray-500">
                        No returns recorded
                    </div>
                    <div v-else class="space-y-3">
                        <div v-for="item in returnsByType.return" :key="item.id"
                            class="group bg-gray-700/30 hover:bg-gray-700/50 rounded-lg p-4 border border-gray-600/50 transition-all duration-200 hover:shadow-lg">
                            <div class="flex items-start justify-between gap-4">
                                <div>
                                    <div class="text-white font-medium group-hover:text-purple-400 transition-colors">{{
                                        item.product?.name }}</div>
                                    <div class="text-sm text-gray-400">{{ item.worker?.name }}</div>
                                </div>
                                <div class="text-right">
                                    <div class="text-lg font-bold text-white">{{ item.quantity }} pcs</div>
                                    <div class="text-sm text-gray-400">{{ new Date(item.created_at).toLocaleDateString()
                                    }}</div>
                                </div>
                            </div>
                            <div class="mt-3 text-sm text-gray-300 bg-gray-700/30 rounded-lg p-2">{{ item.reason }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Repairs Section -->
            <div class="bg-gray-800/80 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700/50 shadow-xl">
                <div class="p-4 border-b border-gray-700/50 flex items-center justify-between">
                    <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                        <span class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                        </span>
                        Repairs
                    </h2>
                    <span class="text-sm font-medium text-blue-400">{{ returnsByType.repair.length }} items</span>
                </div>
                <div class="p-4">
                    <div v-if="returnsByType.repair.length === 0" class="text-center py-8 text-gray-500">
                        No repairs recorded
                    </div>
                    <div v-else class="space-y-3">
                        <div v-for="item in returnsByType.repair" :key="item.id"
                            class="group bg-gray-700/30 hover:bg-gray-700/50 rounded-lg p-4 border border-gray-600/50 transition-all duration-200 hover:shadow-lg">
                            <div class="flex items-start justify-between gap-4">
                                <div>
                                    <div class="text-white font-medium group-hover:text-blue-400 transition-colors">{{
                                        item.product?.name }}</div>
                                    <div class="text-sm text-gray-400">
                                        From: {{ item.worker?.name }}<br>
                                        Repair by: {{ item.repair_worker?.name }}
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-lg font-bold text-white">{{ item.quantity }} pcs</div>
                                    <div class="text-blue-400 font-medium">₱{{ item.labor_cost }}</div>
                                    <div class="text-sm text-gray-400">{{ new Date(item.created_at).toLocaleDateString()
                                    }}</div>
                                </div>
                            </div>
                            <div class="mt-3 text-sm text-gray-300 bg-gray-700/30 rounded-lg p-2">{{ item.reason }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Transformations Section -->
            <div class="bg-gray-800/80 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700/50 shadow-xl">
                <div class="p-4 border-b border-gray-700/50 flex items-center justify-between">
                    <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                        <span class="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                        </span>
                        Transformations
                    </h2>
                    <span class="text-sm font-medium text-purple-400">{{ returnsByType.transform.length }} items</span>
                </div>
                <div class="p-4">
                    <div v-if="returnsByType.transform.length === 0" class="text-center py-8 text-gray-500">
                        No transformations recorded
                    </div>
                    <div v-else class="space-y-3">
                        <div v-for="item in returnsByType.transform" :key="item.id"
                            class="group bg-gray-700/30 hover:bg-gray-700/50 rounded-lg p-4 border border-gray-600/50 transition-all duration-200 hover:shadow-lg">
                            <div class="flex items-start justify-between gap-4">
                                <div>
                                    <div
                                        class="text-white font-medium group-hover:text-purple-400 transition-colors flex items-center gap-2">
                                        <span>{{ item.product?.name }}</span>
                                        <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor"
                                            viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                        </svg>
                                        <span>{{ item.target_product?.name }}</span>
                                    </div>
                                    <div class="text-sm text-gray-400">
                                        Worker: {{ item.worker?.name }}<br>
                                        Transformed by: {{ item.repair_worker?.name }}
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-lg font-bold text-white">{{ item.quantity }} pcs</div>
                                    <div class="text-purple-400 font-medium">₱{{ item.labor_cost }}</div>
                                    <div class="text-sm text-gray-400">{{ new Date(item.created_at).toLocaleDateString()
                                    }}</div>
                                </div>
                            </div>
                            <div class="mt-3 text-sm text-gray-300 bg-gray-700/30 rounded-lg p-2">{{ item.reason }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Smooth transitions */
.group {
    transition: all 0.2s ease-in-out;
}

.group:hover {
    transform: translateY(-1px);
}
</style>