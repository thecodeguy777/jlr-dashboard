<!-- prettier-ignore -->
<template>
    <div class="min-h-screen bg-gray-900 text-white p-6 space-y-6">
        <!-- Header Section -->
        <div class="bg-gray-800/50 rounded-xl p-6 shadow-lg border border-white/5">
            <div class="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
                <div class="space-y-2">
                    <h1 class="text-2xl font-bold flex items-center gap-2">
                        <span class="bg-green-500/10 text-green-400 p-2 rounded-lg">📤</span>
                        Generate Weekly Payouts
                    </h1>
                    <p class="text-white/60 text-sm">Generate and manage employee payouts for the selected week</p>
                </div>
                <div class="flex flex-wrap gap-4 items-center">
                    <div class="flex items-center gap-3 bg-gray-800 p-3 rounded-lg border border-white/10">
                        <span class="text-white/70 text-sm">📅 Select Week:</span>
                        <input type="date" v-model="selectedSaturday"
                            class="bg-transparent text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 rounded" />
                    </div>

                    <button @click="previewMode ? commitPayouts() : previewPayouts()" :disabled="loading" :class="[
                        'px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2',
                        previewMode
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                    ]">
                        <span v-if="loading" class="animate-spin">🔄</span>
                        <span v-else>{{ previewMode ? '✅' : '👁️' }}</span>
                        {{ previewMode ? 'Commit All' : 'Preview Payouts' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-12 space-y-4">
            <div class="animate-spin text-4xl">🔄</div>
            <p class="text-white/60">Processing payroll data...</p>
        </div>

        <!-- Summary Section (when previews are available) -->
        <div v-if="previewMode && previews.length"
            class="bg-gray-800/50 rounded-xl p-6 border border-white/5 space-y-4">
            <h2 class="text-lg font-semibold flex items-center gap-2">
                <span class="text-white/70">📊</span>
                Payroll Summary
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="bg-gray-800/50 p-4 rounded-lg border border-white/10">
                    <p class="text-white/60 text-sm">Total Employees</p>
                    <p class="text-2xl font-bold">{{ previews.length }}</p>
                </div>
                <div class="bg-gray-800/50 p-4 rounded-lg border border-white/10">
                    <p class="text-white/60 text-sm">Total Net Payouts</p>
                    <p class="text-2xl font-bold text-green-400">
                        ₱{{ totalNetPayouts.toLocaleString() }}
                    </p>
                </div>
                <div class="bg-gray-800/50 p-4 rounded-lg border border-white/10">
                    <p class="text-white/60 text-sm">Pending Payouts</p>
                    <p class="text-2xl font-bold text-blue-400">
                        {{ pendingPayouts }}
                    </p>
                </div>
                <div class="bg-gray-800/50 p-4 rounded-lg border border-white/10">
                    <p class="text-white/60 text-sm">Total Hours</p>
                    <p class="text-2xl font-bold text-purple-400">
                        {{ totalHours }}
                    </p>
                </div>
            </div>
        </div>

        <!-- Employee Cards Grid -->
        <div v-if="previewMode && previews.length" class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="p in previews" :key="p.employee_id" @click="loadPayout(p)"
                class="group bg-gray-800/50 p-6 rounded-xl shadow-lg space-y-4 cursor-pointer hover:bg-gray-800/70 transition-all duration-200 border border-white/10 hover:border-blue-400/50">
                <!-- Employee Header -->
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-xl font-bold">
                        {{ p.name.charAt(0) }}
                    </div>
                    <div class="flex-1">
                        <h2 class="text-lg font-bold group-hover:text-blue-400 transition-colors">{{ p.name }}</h2>
                        <p class="text-white/60 text-sm">RenewCo Employee</p>
                    </div>
                    <div class="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-sm">
                        {{ p.exists ? 'Processed' : 'Pending' }}
                    </div>
                </div>

                <!-- Payment Info -->
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-white/60 text-sm">Outstanding:</p>
                            <p class="text-red-400 text-xl font-bold">₱{{ p.deductions?.loan || 0 }}</p>
                        </div>
                        <div>
                            <p class="text-white/60 text-sm">Paid:</p>
                            <p class="text-green-400 text-xl font-bold">₱{{ computeNet(p) }}</p>
                        </div>
                    </div>

                    <!-- Payment Progress -->
                    <div class="space-y-2">
                        <p class="text-white/60 text-sm flex justify-between">
                            <span>Payment Progress</span>
                            <span>{{ Math.round((computeNet(p) / (computeNet(p) + (p.deductions?.loan || 0))) * 100)
                                }}%</span>
                        </p>
                        <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-green-500 to-blue-500"
                                :style="{ width: `${Math.round((computeNet(p) / (computeNet(p) + (p.deductions?.loan || 0))) * 100)}%` }">
                            </div>
                        </div>
                    </div>

                    <!-- Stock Information -->
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <!-- Previous Stock -->
                            <div class="bg-gray-900/50 rounded-lg p-3 space-y-2">
                                <p class="text-white/60 text-sm flex items-center gap-2">
                                    <span class="bg-red-500/10 text-red-400 p-1 rounded">📦</span>
                                    Previous Stock
                                </p>
                                <div class="space-y-1.5">
                                    <div v-for="([category, products]) in sortedCategories(p.previousBodegaByCategory)"
                                        :key="'prev-' + category" class="bg-gray-800/50 rounded p-2">
                                        <p class="text-sm text-white/80 mb-1">{{ category }}</p>
                                        <div class="space-y-1">
                                            <div v-for="([name, data]) in sortedProducts(products)" :key="name"
                                                class="flex justify-between text-xs">
                                                <span class="text-white/60">{{ name }}</span>
                                                <span class="text-red-400">{{ data.quantity }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="text-xs text-white/40 mt-2">
                                    Total Value: ₱{{ calculateStockValue(p.previousBodegaByCategory).toLocaleString() }}
                                </div>
                            </div>

                            <!-- Current Stock -->
                            <div class="bg-gray-900/50 rounded-lg p-3 space-y-2">
                                <p class="text-white/60 text-sm flex items-center gap-2">
                                    <span class="bg-green-500/10 text-green-400 p-1 rounded">📦</span>
                                    Current Stock
                                </p>
                                <div class="space-y-1.5">
                                    <div v-for="([category, products]) in sortedCategories(p.currentBodegaByCategory)"
                                        :key="'curr-' + category" class="bg-gray-800/50 rounded p-2">
                                        <p class="text-sm text-white/80 mb-1">{{ category }}</p>
                                        <div class="space-y-1">
                                            <div v-for="([name, data]) in sortedProducts(products)" :key="name"
                                                class="flex justify-between text-xs">
                                                <span class="text-white/60">{{ name }}</span>
                                                <span class="text-green-400">{{ data.quantity }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="text-xs text-white/40 mt-2">
                                    Total Value: ₱{{ calculateStockValue(p.currentBodegaByCategory).toLocaleString() }}
                                </div>
                            </div>
                        </div>

                        <!-- Stock Summary -->
                        <div class="bg-gray-900/50 rounded-lg p-3">
                            <div class="grid grid-cols-3 gap-4">
                                <div>
                                    <p class="text-white/60 text-xs mb-1">Gross Sales</p>
                                    <p class="text-lg font-semibold">₱{{ Math.round(p.gross_income).toLocaleString() }}
                                    </p>
                                </div>
                                <div>
                                    <p class="text-white/60 text-xs mb-1">Stock Adjustment</p>
                                    <p class="text-lg font-semibold" :class="getStockAdjustmentColor(p)">
                                        ₱{{ calculateStockAdjustment(p).toLocaleString() }}
                                    </p>
                                </div>
                                <div>
                                    <p class="text-white/60 text-xs mb-1">Final Gross</p>
                                    <p class="text-lg font-semibold text-green-400">
                                        ₱{{ calculateFinalGross(p).toLocaleString() }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Active Loans -->
                    <div v-if="p.deductions?.loan > 0" class="space-y-2">
                        <p class="text-white/60 text-sm">Active Loans:</p>
                        <div class="bg-gray-900/50 rounded-lg p-3 space-y-2">
                            <div class="flex justify-between items-center">
                                <div>
                                    <p class="text-sm">Personal Loan</p>
                                    <p class="text-white/60 text-xs">Due: {{ new Date(p.week_start).toLocaleDateString()
                                        }}</p>
                                </div>
                                <p class="text-lg font-bold">₱{{ p.deductions.loan }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <div class="border-t border-white/10 pt-4 flex justify-between items-center">
                    <button v-if="!p.exists" @click.stop="commitSinglePayout(p)"
                        class="text-sm bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
                        Process Payout
                    </button>
                    <button class="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        @click.stop="loadPayout(p)">
                        View Details →
                    </button>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-if="previewMode && !previews.length && !loading"
            class="bg-gray-800/50 rounded-xl p-12 text-center space-y-4 border border-white/10">
            <div class="text-4xl">📭</div>
            <h3 class="text-xl font-semibold">No Payouts to Process</h3>
            <p class="text-white/60">There are no payouts to process for the selected week. Try selecting a different
                week.</p>
        </div>

        <!-- Edit Modal -->
        <div v-if="selected"
            class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            @click.self="selected = null">
            <div class="bg-gray-800/90 rounded-2xl shadow-xl w-full max-w-3xl space-y-6 p-6 border border-white/10">
                <!-- Modal Header -->
                <div class="flex justify-between items-start">
                    <div class="flex items-center gap-4">
                        <div
                            class="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-xl font-bold">
                            {{ selected.name.charAt(0) }}
                        </div>
                        <div>
                            <h2 class="text-xl font-bold">{{ selected.name }}</h2>
                            <p class="text-white/60 text-sm">Week of {{ new
                                Date(selected.week_start).toLocaleDateString() }}</p>
                        </div>
                    </div>
                    <button @click="selected = null"
                        class="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors">
                        ✕
                    </button>
                </div>

                <!-- Summary Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="bg-gray-900/50 p-4 rounded-xl border border-white/5">
                        <p class="text-white/60 text-sm">Gross Income</p>
                        <p class="text-2xl font-bold">₱{{ Math.round(selected.gross_income).toLocaleString() }}</p>
                        <p class="text-white/40 text-xs mt-1">Base pay + deliveries</p>
                    </div>
                    <div class="bg-gray-900/50 p-4 rounded-xl border border-white/5">
                        <p class="text-white/60 text-sm">Hours Worked</p>
                        <p class="text-2xl font-bold text-blue-400">{{ selected.hours_worked || 0 }}</p>
                        <p class="text-white/40 text-xs mt-1">@ ₱{{ selected.hourly_rate }}/hr</p>
                    </div>
                    <div class="bg-gray-900/50 p-4 rounded-xl border border-white/5">
                        <p class="text-white/60 text-sm">Net Pay</p>
                        <p class="text-2xl font-bold text-green-400">₱{{ computeNet(selected).toLocaleString() }}</p>
                        <p class="text-white/40 text-xs mt-1">After deductions</p>
                    </div>
                </div>

                <!-- Main Form -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Left Column -->
                    <div class="space-y-6">
                        <!-- Deductions Section -->
                        <div class="bg-gray-900/30 rounded-xl p-4 space-y-4">
                            <h3 class="text-lg font-semibold text-white/80 flex items-center gap-2">
                                <span class="bg-red-500/10 text-red-400 p-1.5 rounded-lg text-sm">📉</span>
                                Deductions
                            </h3>
                            <div class="space-y-3">
                                <div v-for="(value, key) in selected.deductions" :key="'deduction-' + key"
                                    class="bg-gray-800/50 rounded-lg p-3 space-y-2">
                                    <label class="block text-white/60 text-sm flex justify-between">
                                        <span>{{ key === 'sss' ? 'SSS Contribution' : key.replace('_', '').toUpperCase()
                                        }}</span>
                                        <span v-if="key === 'loan'" class="text-blue-400 text-xs">
                                            Balance: ₱{{ selected.loanBalance?.toLocaleString() }}
                                        </span>
                                    </label>
                                    <div class="flex items-center gap-2">
                                        <span class="text-white/40">₱</span>
                                        <input type="number" v-model.number="selected.deductions[key]"
                                            class="w-full bg-transparent border-b border-white/10 focus:border-blue-500 px-2 py-1 text-lg" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Savings Section -->
                        <div class="bg-gray-900/30 rounded-xl p-4 space-y-4">
                            <h3 class="text-lg font-semibold text-white/80 flex items-center gap-2">
                                <span class="bg-blue-500/10 text-blue-400 p-1.5 rounded-lg text-sm">💰</span>
                                Savings
                            </h3>
                            <div class="space-y-3">
                                <div class="bg-gray-800/50 rounded-lg p-3 space-y-2">
                                    <label class="block text-white/60 text-sm flex justify-between">
                                        <span>Weekly Deduction</span>
                                        <span class="text-blue-400 text-xs">
                                            Total: ₱{{ (selected.totalSavingsBalance || 0).toLocaleString() }}
                                        </span>
                                    </label>
                                    <div class="flex items-center gap-2">
                                        <span class="text-white/40">₱</span>
                                        <input type="number" v-model.number="selected.savings"
                                            class="w-full bg-transparent border-b border-white/10 focus:border-blue-500 px-2 py-1 text-lg" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column -->
                    <div class="space-y-6">
                        <!-- Allowances Section -->
                        <div class="bg-gray-900/30 rounded-xl p-4 space-y-4">
                            <h3 class="text-lg font-semibold text-white/80 flex items-center gap-2">
                                <span class="bg-green-500/10 text-green-400 p-1.5 rounded-lg text-sm">⭐</span>
                                Allowances
                            </h3>
                            <div class="space-y-3">
                                <div v-for="(value, key) in selected.allowances" :key="'allowance-' + key"
                                    class="bg-gray-800/50 rounded-lg p-3 space-y-2">
                                    <label class="block text-white/60 text-sm">
                                        {{ key.replace('_', ' ').toUpperCase() }}
                                    </label>
                                    <div class="flex items-center gap-2">
                                        <span class="text-white/40">₱</span>
                                        <input type="number" v-model.number="selected.allowances[key]"
                                            class="w-full bg-transparent border-b border-white/10 focus:border-blue-500 px-2 py-1 text-lg" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Commissions Section -->
                        <div class="bg-gray-900/30 rounded-xl p-4 space-y-4">
                            <h3 class="text-lg font-semibold text-white/80 flex items-center gap-2">
                                <span class="bg-purple-500/10 text-purple-400 p-1.5 rounded-lg text-sm">🎉</span>
                                Commissions
                            </h3>
                            <div class="space-y-3">
                                <div v-for="(value, key) in selected.commissions" :key="'commission-' + key"
                                    class="bg-gray-800/50 rounded-lg p-3 space-y-2">
                                    <label class="block text-white/60 text-sm">
                                        {{ key.replace('_', ' ').toUpperCase() }}
                                    </label>
                                    <div class="flex items-center gap-2">
                                        <span class="text-white/40">₱</span>
                                        <input type="number" v-model.number="selected.commissions[key]"
                                            class="w-full bg-transparent border-b border-white/10 focus:border-blue-500 px-2 py-1 text-lg" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="flex justify-between items-center pt-6 border-t border-white/10">
                    <div class="space-y-1">
                        <div class="flex items-baseline gap-3">
                            <p class="text-white/60">Total Pay:</p>
                            <p class="text-3xl font-bold text-green-400">₱{{ computeNet(selected).toLocaleString() }}
                            </p>
                        </div>
                        <p class="text-white/40 text-sm">Including all deductions and additions</p>
                    </div>
                    <div class="space-x-3">
                        <button @click="selected = null"
                            class="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">
                            Cancel
                        </button>
                        <button @click="saveChanges"
                            class="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2">
                            <span>Save Changes</span>
                            <span class="text-white/80">→</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Notifications -->
        <div class="fixed bottom-4 right-4 z-50 space-y-2">
            <div v-if="error"
                class="bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
                <span class="text-lg">❌</span>
                <p>{{ error }}</p>
                <button @click="error = null" class="ml-2 hover:text-white/80">✕</button>
            </div>
            <div v-if="success"
                class="bg-green-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
                <span class="text-lg">✅</span>
                <p>{{ success }}</p>
                <button @click="success = null" class="ml-2 hover:text-white/80">✕</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>

<script setup>
import { ref, watch, onMounted, computed, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

// State
const loading = ref(false)
const previews = ref([])
const previewMode = ref(false)
const selected = ref(null)
const selectedSaturday = ref(new Date())
const error = ref(null)
const success = ref(null)

// Subscriptions
let payoutsSubscription = null
let savingsSubscription = null
let loansSubscription = null
let bodegaStockSubscription = null
let deliveriesSubscription = null
let timesheetsSubscription = null

// Computed properties
const totalNetPayouts = computed(() => {
    return previews.value.reduce((sum, p) => sum + computeNet(p), 0)
})

const totalHours = computed(() => {
    return previews.value.reduce((sum, p) => sum + (p.hours_worked || 0), 0)
})

const pendingPayouts = computed(() => {
    return previews.value.filter(p => !p.exists).length
})

// Helper functions
function showError(message) {
    error.value = message
    setTimeout(() => {
        error.value = null
    }, 5000)
}

function showSuccess(message) {
    success.value = message
    setTimeout(() => {
        success.value = null
    }, 5000)
}

function computeNet(p) {
    if (!p) return 0
    const d = Object.values(p.deductions || {}).reduce((a, b) => a + (b || 0), 0)
    const a = Object.values(p.allowances || {}).reduce((a, b) => a + (b || 0), 0)
    const c = Object.values(p.commissions || {}).reduce((a, b) => a + (b || 0), 0)
    const savings = p.savings ?? 0
    const hours = (p.hours_worked || 0) * (p.hourly_rate || 0)
    return Math.round((p.gross_income || 0) + hours + a + c - d - savings)
}

// Real-time subscription setup
async function setupSubscriptions() {
    const { weekStart, weekEnd } = getWeekWindow(selectedSaturday.value)
    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    // Payouts subscription
    payoutsSubscription = supabase
        .channel('payouts-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'payouts',
                filter: `week_start=eq.${weekStartStr}`
            },
            async (payload) => {
                console.log('Payouts update:', payload)
                await previewPayouts() // Refresh all data
            }
        )
        .subscribe()

    // Savings subscription
    savingsSubscription = supabase
        .channel('savings-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'savings',
                filter: `week_start=eq.${weekStartStr}`
            },
            async (payload) => {
                console.log('Savings update:', payload)
                await previewPayouts()
            }
        )
        .subscribe()

    // Loans subscription
    loansSubscription = supabase
        .channel('loans-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'loans'
            },
            async (payload) => {
                console.log('Loans update:', payload)
                await previewPayouts()
            }
        )
        .subscribe()

    // Bodega stock subscription
    bodegaStockSubscription = supabase
        .channel('bodega-stock-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'bodega_stock',
                filter: `week_start=eq.${weekStartStr}`
            },
            async (payload) => {
                console.log('Bodega stock update:', payload)
                await previewPayouts()
            }
        )
        .subscribe()

    // Deliveries subscription
    deliveriesSubscription = supabase
        .channel('deliveries-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'deliveries',
                filter: `delivery_date.gte.${weekStartStr},delivery_date.lte.${weekEndStr}`
            },
            async (payload) => {
                console.log('Deliveries update:', payload)
                await previewPayouts()
            }
        )
        .subscribe()

    // Timesheets subscription
    timesheetsSubscription = supabase
        .channel('timesheets-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'timesheets',
                filter: `date.gte.${weekStartStr},date.lte.${weekEndStr}`
            },
            async (payload) => {
                console.log('Timesheets update:', payload)
                await previewPayouts()
            }
        )
        .subscribe()
}

// Cleanup subscriptions
function cleanupSubscriptions() {
    if (payoutsSubscription) supabase.removeChannel(payoutsSubscription)
    if (savingsSubscription) supabase.removeChannel(savingsSubscription)
    if (loansSubscription) supabase.removeChannel(loansSubscription)
    if (bodegaStockSubscription) supabase.removeChannel(bodegaStockSubscription)
    if (deliveriesSubscription) supabase.removeChannel(deliveriesSubscription)
    if (timesheetsSubscription) supabase.removeChannel(timesheetsSubscription)
}

// Date helpers
function getWeekStart(date) {
    const d = new Date(date)
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    return d.toISOString().split('T')[0]
}

function getWeekWindow(selectedDate) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + (6 - d.getDay()))
    d.setHours(0, 0, 0, 0)
    const saturday = new Date(d)
    const sunday = new Date(saturday)
    sunday.setDate(saturday.getDate() - 6)
    return {
        weekStart: sunday,
        weekEnd: saturday
    }
}

// Data fetching functions
async function fetchSavings(worker_id, week_start) {
    try {
        const { data, error } = await supabase
            .from('savings')
            .select('amount')
            .eq('worker_id', worker_id)
            .eq('week_start', week_start)
            .eq('type', 'auto')
            .maybeSingle()

        if (error) throw error
        return data?.amount || 0
    } catch (err) {
        console.error('Failed to fetch savings:', err)
        showError('Failed to fetch savings data')
        return 0
    }
}

async function fetchTotalSavings(worker_id) {
    try {
        const { data, error } = await supabase
            .from('savings')
            .select('amount')
            .eq('worker_id', worker_id)

        if (error) throw error
        return data.reduce((sum, s) => sum + (s.amount || 0), 0)
    } catch (err) {
        console.error('Failed to fetch total savings:', err)
        showError('Failed to fetch total savings data')
        return 0
    }
}

// Main functions
async function loadPayout(p) {
    try {
        loading.value = true
        selected.value = { ...p } // Set baseline from preview

        const { data: payoutData, error } = await supabase
            .from('payouts')
            .select('*')
            .eq('employee_id', p.employee_id)
            .eq('week_start', p.week_start)
            .maybeSingle()

        if (error) throw error

        if (payoutData) {
            const week_start = payoutData.week_start || p.week_start;
            selected.value = {
                ...selected.value,
                gross_income: payoutData.gross_income,
                hours_worked: payoutData.paid_by_hours / p.hourly_rate,
                deductions: payoutData.deductions || {},
                allowances: payoutData.allowances || {},
                commissions: payoutData.commissions || {},
                savings: (await fetchSavings(p.employee_id, week_start)) || 0,
                totalSavingsBalance: await fetchTotalSavings(p.employee_id)
            }
        }
    } catch (err) {
        console.error('Failed to load payout:', err)
        showError('Failed to load payout details')
    } finally {
        loading.value = false
    }
}

async function saveChanges() {
    if (!selected.value) return;

    try {
        loading.value = true
        const p = selected.value;

        // Prepare the update data with proper type checking
        const updateData = {
            gross_income: Number(p.gross_income) || 0,
            paid_by_hours: Number(p.hours_worked) * Number(p.hourly_rate) || 0,
            deductions: p.deductions || {},
            allowances: p.allowances || {},
            commissions: p.commissions || {},
            net_total: computeNet(p)
        };

        // Update the payout entry
        const { error: payoutError } = await supabase
            .from('payouts')
            .update(updateData)
            .eq('employee_id', p.employee_id)
            .eq('week_start', p.week_start);

        if (payoutError) throw payoutError

        // Update savings if needed
        if (p.savings > 0) {
            const { error: savingsError } = await supabase
                .from('savings')
                .upsert({
                    worker_id: p.employee_id,
                    week_start: p.week_start,
                    amount: Number(p.savings) || 0,
                    type: 'auto',
                    remarks: 'Weekly deduction',
                }, { onConflict: ['worker_id', 'week_start'] });

            if (savingsError) throw savingsError
        }

        showSuccess('Changes saved successfully')
        selected.value = null
    } catch (err) {
        console.error('Error in saveChanges:', err)
        showError('Failed to save changes')
    } finally {
        loading.value = false
    }
}

// Stock calculation helpers
function calculateStockValue(stockByCategory) {
    if (!stockByCategory) return 0

    let totalValue = 0
    for (const [category, products] of Object.entries(stockByCategory)) {
        for (const [productName, data] of Object.entries(products)) {
            totalValue += (data.quantity || 0) * (data.price || 0)
        }
    }
    return Math.round(totalValue)
}

function calculateStockAdjustment(p) {
    const currentStockValue = calculateStockValue(p.currentBodegaByCategory)
    const previousStockValue = calculateStockValue(p.previousBodegaByCategory)
    return currentStockValue - previousStockValue
}

function calculateFinalGross(p) {
    const stockAdjustment = calculateStockAdjustment(p)
    const baseGross = Math.round(p.gross_income || 0)
    return baseGross + stockAdjustment
}

function getStockAdjustmentColor(p) {
    const adjustment = calculateStockAdjustment(p)
    return {
        'text-green-400': adjustment > 0,
        'text-red-400': adjustment < 0,
        'text-white/60': adjustment === 0
    }
}

// Add these refs at the top of the script section
const previousStockData = ref([])
const currentStockData = ref([])

// Add this function to fetch stock data
async function fetchStockData(weekStartStr, weekEndStr) {
    try {
        // Calculate previous Saturday
        const weekStart = new Date(weekStartStr)
        const prevSaturday = new Date(weekStart)
        prevSaturday.setDate(prevSaturday.getDate() - 1) // Get previous Saturday
        const prevWeekStr = format(prevSaturday, 'yyyy-MM-dd')

        // Fetch previous stock
        const { data: prevStock, error: prevError } = await supabase
            .from('bodega_stock')
            .select('quantity, product_id, worker_id, products(name, category, price_per_unit)')
            .eq('week_start', prevWeekStr)

        // If no exact match, get most recent stock
        if (!prevStock || prevStock.length === 0) {
            const { data: recentStock } = await supabase
                .from('bodega_stock')
                .select('quantity, product_id, worker_id, week_start, products(name, category, price_per_unit)')
                .lt('week_start', weekStartStr)
                .order('week_start', { ascending: false })
                .limit(50)

            previousStockData.value = recentStock || []
        } else {
            previousStockData.value = prevStock
        }

        // Fetch current stock
        const { data: currStock, error: currError } = await supabase
            .from('bodega_stock')
            .select('quantity, product_id, worker_id, products(name, category, price_per_unit)')
            .eq('week_start', weekStartStr)

        if (prevError) console.error('Error fetching previous stock:', prevError)
        if (currError) console.error('Error fetching current stock:', currError)

        currentStockData.value = currStock || []
    } catch (error) {
        console.error('Error fetching stock data:', error)
        previousStockData.value = []
        currentStockData.value = []
    }
}

// Add this helper function
function getPreviousStockQuantity(workerId, productId) {
    const stockItems = previousStockData.value.filter(
        item => item.worker_id === workerId && item.product_id === productId
    )
    return stockItems.reduce((sum, item) => sum + (item.quantity || 0), 0)
}

// Update the previewPayouts function to use the stock data
async function previewPayouts() {
    try {
        loading.value = true
        previews.value = []
        previewMode.value = true

        // Calculate week window dates first
        const { weekStart, weekEnd } = getWeekWindow(selectedSaturday.value)
        const weekStartStr = weekStart.toISOString().split('T')[0]
        const weekEndStr = weekEnd.toISOString().split('T')[0]

        // First fetch stock data with the calculated dates
        await fetchStockData(weekStartStr, weekEndStr)

        // Then fetch workers and products
        const [workersResult, productsResult] = await Promise.all([
            supabase.from('workers').select('*'),
            supabase.from('products').select('id, name, price_per_unit, category')
        ])

        if (workersResult.error) throw workersResult.error
        if (productsResult.error) throw productsResult.error

        const workers = workersResult.data
        const products = productsResult.data

        // Process each worker
        const payoutPromises = workers.map(async (worker) => {
            try {
                // Fetch all worker-specific data in parallel
                const [
                    deliveriesResult,
                    timesheetsResult,
                    existingPayoutResult,
                    loanInfoResult,
                    currentStockResult
                ] = await Promise.all([
                    supabase.from('deliveries')
                        .select('product_id, quantity, delivery_date')
                        .eq('worker_id', worker.id)
                        .gte('delivery_date', weekStartStr)
                        .lte('delivery_date', weekEndStr),
                    supabase.from('timesheets')
                        .select('hours_worked')
                        .eq('worker_id', worker.id)
                        .gte('date', weekStartStr)
                        .lte('date', weekEndStr),
                    supabase.from('payouts')
                        .select('*')
                        .eq('employee_id', worker.id)
                        .eq('week_start', weekStartStr)
                        .not('confirmed_at', 'is', null)
                        .maybeSingle(),
                    supabase.from('loans')
                        .select('balance')
                        .eq('worker_id', worker.id)
                        .eq('status', 'active')
                        .order('start_date', { ascending: false })
                        .limit(1)
                        .maybeSingle(),
                    supabase.from('bodega_stock')
                        .select(`
                            *,
                            product:products (
                                id,
                                name,
                                category,
                                price_per_unit
                            )
                        `)
                        .eq('week_start', weekEndStr)
                        .eq('worker_id', worker.id)
                ]);

                // Calculate gross from deliveries
                let gross = 0
                const breakdownByCategory = {}
                deliveriesResult.data?.forEach(d => {
                    const price = priceMap[d.product_id] || 0
                    gross += (d.quantity || 0) * price
                    const product = products.find(p => p.id === d.product_id)
                    if (!product) return
                    const category = product.category || 'Uncategorized'
                    const name = product.name || 'Unknown'
                    if (!breakdownByCategory[category]) breakdownByCategory[category] = {}
                    breakdownByCategory[category][name] = (breakdownByCategory[category][name] || 0) + d.quantity
                })

                // Adjust gross based on stock changes
                const adjustedGross = gross + stockAdjustment

                // Rest of the worker processing remains the same...
                const totalHours = timesheetsResult.data.reduce((sum, t) => sum + (t.hours_worked || 0), 0)

                // Set default values
                const deductions = existingPayoutResult.data?.deductions ?? {
                    sss: 245,
                    loan: 0,
                    cash_advance: 0
                }

                const allowances = existingPayoutResult.data?.allowances ?? {
                    transport: 0
                }

                const commissions = existingPayoutResult.data?.commissions ?? {
                    bonus: 0
                }

                // When building the stock data for a worker:
                const workerPrevStock = previousStockData.value.filter(s => s.worker_id === worker.id)
                const workerCurrStock = currentStockData.value.filter(s => s.worker_id === worker.id)

                const prevCategoryMap = {}
                const currCategoryMap = {}

                // Process previous stock
                workerPrevStock.forEach(item => {
                    if (!item.products) return
                    const category = item.products.category || 'Uncategorized'
                    const name = item.products.name

                    if (!prevCategoryMap[category]) prevCategoryMap[category] = {}
                    if (!prevCategoryMap[category][name]) prevCategoryMap[category][name] = {
                        quantity: 0,
                        price: parseFloat(item.products.price_per_unit || 0)
                    }
                    prevCategoryMap[category][name].quantity += item.quantity || 0
                })

                // Process current stock
                workerCurrStock.forEach(item => {
                    if (!item.products) return
                    const category = item.products.category || 'Uncategorized'
                    const name = item.products.name

                    if (!currCategoryMap[category]) currCategoryMap[category] = {}
                    if (!currCategoryMap[category][name]) currCategoryMap[category][name] = {
                        quantity: 0,
                        price: parseFloat(item.products.price_per_unit || 0)
                    }
                    currCategoryMap[category][name].quantity += item.quantity || 0
                })

                // Calculate stock adjustment
                let stockAdjustment = 0
                for (const item of workerCurrStock) {
                    if (!item.products) continue
                    const prevQty = getPreviousStockQuantity(worker.id, item.product_id)
                    const currQty = item.quantity || 0
                    const price = parseFloat(item.products.price_per_unit || 0)
                    stockAdjustment += (currQty - prevQty) * price
                }

                // Construct the payout object
                const workerStockData = {
                    previousBodegaByCategory: prevCategoryMap,
                    currentBodegaByCategory: currCategoryMap,
                    stockAdjustment: Math.round(stockAdjustment)
                }

                const payout = {
                    employee_id: worker.id,
                    name: worker.name,
                    week_start: weekStartStr,
                    gross_income: existingPayoutResult.data?.gross_income ?? Math.round(adjustedGross),
                    hours_worked: existingPayoutResult.data?.paid_by_hours
                        ? existingPayoutResult.data.paid_by_hours / worker.hourly_rate
                        : totalHours,
                    hourly_rate: worker.hourly_rate,
                    deductions,
                    allowances,
                    commissions,
                    savings: await fetchSavings(worker.id, weekStartStr),
                    net_total: computeNet({
                        ...existingPayoutResult.data,
                        gross_income: existingPayoutResult.data?.gross_income ?? adjustedGross,
                        hourly_rate: worker.hourly_rate,
                        hours_worked: totalHours,
                        deductions,
                        allowances,
                        commissions,
                        savings: existingPayoutResult.data?.savings ?? 0
                    }),
                    productBreakdownByCategory: breakdownByCategory,
                    exists: !!existingPayoutResult.data,
                    loanBalance: loanInfoResult.data?.balance || 0
                }

                return {
                    ...payout,
                    ...workerStockData
                }
            } catch (err) {
                console.error(`Error processing worker ${worker.name}:`, err)
                return null
            }
        })

        const results = await Promise.all(payoutPromises)
        previews.value = results.filter(Boolean)

    } catch (err) {
        console.error('Failed to preview payouts:', err)
        showError('Failed to load payout previews')
        previews.value = []
    } finally {
        loading.value = false
    }
}

async function commitSinglePayout(p) {
    try {
        loading.value = true

        // Insert payout
        const { error: payoutError } = await supabase.from('payouts').insert({
            employee_id: p.employee_id,
            week_start: p.week_start,
            gross_income: p.gross_income,
            paid_by_hours: (p.hours_worked || 0) * (p.hourly_rate || 0),
            deductions: p.deductions,
            allowances: p.allowances,
            commissions: p.commissions,
            net_total: computeNet(p),
            status: 'pending',
            confirmed_at: format(new Date(), 'yyyy-MM-dd')
        })

        if (payoutError) throw payoutError

        // Handle savings
        if (p.savings > 0) {
            const { error: savingsError } = await supabase.from('savings').insert({
                worker_id: p.employee_id,
                week_start: p.week_start,
                amount: p.savings,
                type: 'auto',
                remarks: 'Weekly deduction'
            })

            if (savingsError) throw savingsError
        }

        // Handle loan update
        if (p.deductions?.loan && p.deductions.loan > 0) {
            const { data: activeLoan } = await supabase
                .from('loans')
                .select('*')
                .eq('worker_id', p.employee_id)
                .eq('status', 'active')
                .order('start_date', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (activeLoan) {
                const newBalance = Math.max(0, activeLoan.balance - p.deductions.loan)
                const { error: loanError } = await supabase
                    .from('loans')
                    .update({
                        balance: newBalance,
                        status: newBalance === 0 ? 'paid' : 'active'
                    })
                    .eq('id', activeLoan.id)

                if (loanError) throw loanError
            }
        }

        // Update UI
        p.exists = true
        showSuccess('Payout processed successfully')
    } catch (err) {
        console.error('Failed to commit payout:', err)
        showError('Failed to process payout')
    } finally {
        loading.value = false
    }
}

async function commitPayouts() {
    try {
        loading.value = true
        const payoutsToCommit = previews.value.filter(p => !p.exists)

        if (payoutsToCommit.length === 0) {
            showError('No payouts to commit')
            return
        }

        await Promise.all(
            payoutsToCommit.map(p => commitSinglePayout(p))
        )

        showSuccess('All payouts processed successfully')
        previewMode.value = false
        previews.value = []
    } catch (err) {
        console.error('Failed to commit payouts:', err)
        showError('Failed to process payouts')
    } finally {
        loading.value = false
    }
}

// Sorting helpers
function sortedCategories(obj) {
    if (!obj) return [];
    return Object.entries(obj).sort(([a], [b]) => a.localeCompare(b));
}

function sortedProducts(obj) {
    if (!obj) return [];
    return Object.entries(obj).sort(([a], [b]) => a.localeCompare(b));
}

// Lifecycle hooks
onMounted(() => {
    previewMode.value = true
    previewPayouts()
    setupSubscriptions()
})

onUnmounted(() => {
    cleanupSubscriptions()
})

watch(selectedSaturday, () => {
    if (previewMode.value) {
        previewPayouts()
    }
})
</script>
