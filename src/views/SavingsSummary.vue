<template>
    <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white p-6 space-y-8">
        <!-- Enhanced Header -->
        <div class="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div class="space-y-2">
                <h1
                    class="text-4xl font-bold bg-gradient-to-r from-white via-green-100 to-emerald-200 bg-clip-text text-transparent">
                    💰 Savings Summary
                </h1>
                <p class="text-white/60 text-lg">Employee savings overview and refund management</p>
            </div>

            <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <!-- Employee Info Card -->
                <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div class="flex items-center gap-3">
                        <div
                            class="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                            {{ employeeName.charAt(0) }}
                        </div>
                        <div>
                            <p class="text-white font-semibold">{{ employeeName }}</p>
                            <p class="text-white/60 text-sm">Employee ID: {{ employeeId }}</p>
                        </div>
                    </div>
                </div>

                <!-- Total Savings Card -->
                <div
                    class="bg-gradient-to-r from-green-600/20 to-emerald-600/20 backdrop-blur-sm rounded-xl p-4 border border-green-500/30">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1">
                                </path>
                            </svg>
                        </div>
                        <div>
                            <p class="text-green-400 text-sm font-medium">Total Savings</p>
                            <p class="text-white font-bold text-lg">₱{{ totalSavings.toLocaleString() }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="space-y-6">
            <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                <div class="flex items-center justify-center space-x-4">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                    <div class="space-y-2">
                        <p class="text-white font-medium">Loading savings data...</p>
                        <p class="text-white/60 text-sm">Fetching transaction history and balance information</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div v-else class="space-y-8">
            <!-- Enhanced Hero Summary Card -->
            <div
                class="relative overflow-hidden bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 rounded-3xl shadow-2xl">
                <!-- Background Pattern -->
                <div class="absolute inset-0 opacity-10">
                    <div
                        class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]">
                    </div>
                    <div
                        class="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-white/10 to-transparent rounded-full -translate-y-48 translate-x-48">
                    </div>
                </div>

                <div class="relative p-8 space-y-6">
                    <div class="flex items-center justify-between">
                        <div class="space-y-2">
                            <div class="flex items-center gap-3">
                                <div
                                    class="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z">
                                        </path>
                                    </svg>
                                </div>
                                <div>
                                    <h2 class="text-2xl font-bold text-white">{{ employeeName }}</h2>
                                    <p class="text-green-100 font-medium">Savings Account Summary</p>
                                </div>
                            </div>
                        </div>

                        <div class="text-right">
                            <p class="text-green-100 text-sm font-medium mb-1">Total Balance</p>
                            <div class="text-5xl font-bold text-white tracking-tight">₱{{ totalSavings.toLocaleString()
                            }}
                            </div>
                            <p class="text-green-100/80 text-sm mt-2">Available for refund</p>
                        </div>
                    </div>

                    <!-- Quick Stats -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/20">
                        <div class="text-center">
                            <p class="text-green-100/80 text-xs font-medium">Total Deposits</p>
                            <p class="text-white font-bold text-lg">₱{{ totalDeposits.toLocaleString() }}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-green-100/80 text-xs font-medium">Total Refunds</p>
                            <p class="text-white font-bold text-lg">₱{{ totalRefunds.toLocaleString() }}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-green-100/80 text-xs font-medium">Transactions</p>
                            <p class="text-white font-bold text-lg">{{ savingsHistory.length }}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-green-100/80 text-xs font-medium">Last Activity</p>
                            <p class="text-white font-bold text-lg">{{ lastActivityDate }}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Refund Actions -->
            <div
                class="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-white">Process Refund</h3>
                        <p class="text-blue-300 text-sm">Refund savings to employee</p>
                    </div>
                </div>

                <div class="grid gap-6 md:grid-cols-2">
                    <!-- Refund Form -->
                    <div class="bg-white/5 rounded-xl p-6 border border-white/10">
                        <h4 class="text-blue-300 font-medium mb-4">Refund Amount</h4>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-white/80 mb-2">Amount to Refund</label>
                                <div class="relative">
                                    <span
                                        class="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">₱</span>
                                    <input v-model="refundAmount" type="number" step="0.01" :max="totalSavings"
                                        class="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0.00" />
                                </div>
                                <p class="text-xs text-white/60 mt-1">Maximum: ₱{{ totalSavings.toLocaleString() }}</p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-white/80 mb-2">Refund Reason</label>
                                <select v-model="refundReason"
                                    class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    <option value="">Select reason...</option>
                                    <option value="employee_request">Employee Request</option>
                                    <option value="contract_end">Contract End</option>
                                    <option value="emergency_withdrawal">Emergency Withdrawal</option>
                                    <option value="partial_withdrawal">Partial Withdrawal</option>
                                    <option value="administrative">Administrative</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-white/80 mb-2">Additional Notes</label>
                                <textarea v-model="refundNotes" rows="3"
                                    class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder="Optional notes about this refund..."></textarea>
                            </div>

                            <div class="flex gap-3">
                                <button @click="processRefund" :disabled="!canProcessRefund"
                                    class="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed">
                                    <span v-if="processingRefund" class="flex items-center justify-center gap-2">
                                        <div
                                            class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin">
                                        </div>
                                        Processing...
                                    </span>
                                    <span v-else>Process Refund</span>
                                </button>
                                <button @click="clearRefundForm"
                                    class="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-colors">
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Refund Preview -->
                    <div class="bg-white/5 rounded-xl p-6 border border-white/10">
                        <h4 class="text-blue-300 font-medium mb-4">Refund Preview</h4>
                        <div class="space-y-4">
                            <div class="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-blue-300 text-sm">Current Balance:</span>
                                    <span class="text-white font-bold">₱{{ totalSavings.toLocaleString() }}</span>
                                </div>
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-blue-300 text-sm">Refund Amount:</span>
                                    <span class="text-red-300 font-bold">-₱{{ (refundAmount || 0).toLocaleString()
                                    }}</span>
                                </div>
                                <div class="border-t border-blue-500/20 pt-2">
                                    <div class="flex justify-between items-center">
                                        <span class="text-blue-300 text-sm font-medium">Remaining Balance:</span>
                                        <span class="text-white font-bold text-lg">₱{{ Math.max(0, totalSavings -
                                            (refundAmount || 0)).toLocaleString() }}</span>
                                    </div>
                                </div>
                            </div>

                            <div v-if="refundReason" class="bg-white/5 rounded-lg p-3">
                                <p class="text-white/60 text-sm mb-1">Reason:</p>
                                <p class="text-white capitalize">{{ refundReason.replace(/_/g, ' ') }}</p>
                            </div>

                            <div v-if="refundNotes" class="bg-white/5 rounded-lg p-3">
                                <p class="text-white/60 text-sm mb-1">Notes:</p>
                                <p class="text-white text-sm">{{ refundNotes }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Savings History -->
            <div
                class="bg-gradient-to-br from-gray-900/40 to-slate-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-500/30">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-12 h-12 rounded-full bg-gray-500/20 flex items-center justify-center">
                        <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01">
                            </path>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-white">Transaction History</h3>
                        <p class="text-gray-300 text-sm">Complete savings and refund history</p>
                    </div>
                </div>

                <div v-if="savingsHistory.length > 0" class="space-y-3">
                    <div v-for="transaction in paginatedHistory" :key="transaction.id"
                        class="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full flex items-center justify-center"
                                    :class="transaction.type === 'deposit' ? 'bg-green-500/20' : 'bg-red-500/20'">
                                    <svg v-if="transaction.type === 'deposit'" class="w-5 h-5 text-green-400"
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                    </svg>
                                    <svg v-else class="w-5 h-5 text-red-400" fill="none" stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M20 12H4">
                                        </path>
                                    </svg>
                                </div>
                                <div>
                                    <p class="text-white font-medium capitalize">{{ transaction.type }}</p>
                                    <p class="text-white/60 text-sm">{{ transaction.date }}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="text-lg font-bold"
                                    :class="transaction.type === 'deposit' ? 'text-green-400' : 'text-red-400'">
                                    {{ transaction.type === 'deposit' ? '+' : '-' }}₱{{
                                        transaction.amount.toLocaleString()
                                    }}
                                </p>
                                <p v-if="transaction.reason" class="text-white/60 text-xs">{{ transaction.reason }}</p>
                            </div>
                        </div>
                        <div v-if="transaction.notes" class="mt-3 pt-3 border-t border-white/10">
                            <p class="text-white/60 text-sm">{{ transaction.notes }}</p>
                        </div>
                    </div>

                    <!-- Pagination -->
                    <div v-if="savingsHistory.length > itemsPerPage" class="flex justify-center mt-6">
                        <div class="flex gap-2">
                            <button @click="currentPage--" :disabled="currentPage === 1"
                                class="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-white rounded-lg border border-white/20 transition-colors disabled:cursor-not-allowed">
                                Previous
                            </button>
                            <span class="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30">
                                Page {{ currentPage }} of {{ totalPages }}
                            </span>
                            <button @click="currentPage++" :disabled="currentPage === totalPages"
                                class="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-white rounded-lg border border-white/20 transition-colors disabled:cursor-not-allowed">
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                <div v-else class="text-center py-8">
                    <div class="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2">
                            </path>
                        </svg>
                    </div>
                    <p class="text-white/60 font-medium">No transaction history</p>
                    <p class="text-white/40 text-sm mt-1">No savings transactions found for this employee</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

const route = useRoute()
const userStore = useUserStore()

// Route parameters and user info
const employeeId = route.params.id || userStore.user?.id || 'EMP001'
const isAdmin = userStore.role === 'admin'

// Data
const employeeName = ref('Loading...')
const totalSavings = ref(0)
const totalDeposits = ref(0)
const totalRefunds = ref(0)
const lastActivityDate = ref('—')
const loading = ref(true)

// Refund form data
const refundAmount = ref('')
const refundReason = ref('')
const refundNotes = ref('')
const processingRefund = ref(false)

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Real savings history data from database
const savingsHistory = ref([])

// Computed properties
const canProcessRefund = computed(() => {
    return refundAmount.value > 0 &&
        refundAmount.value <= totalSavings.value &&
        refundReason.value &&
        !processingRefund.value
})

const totalPages = computed(() => {
    return Math.ceil(savingsHistory.value.length / itemsPerPage.value)
})

const paginatedHistory = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return savingsHistory.value.slice(start, end)
})

// Helper function to get the correct date for display
const getTransactionDate = (transaction) => {
    // For auto transactions (payroll), use the confirmed_at date if available
    if (transaction.type === 'auto' && transaction.payouts?.confirmed_at) {
        return transaction.payouts.confirmed_at.split('T')[0] // Get just the date part
    }
    // For manual transactions and refunds, use week_start (which is the actual transaction date)
    return transaction.week_start
}

// Methods
const fetchSavingsData = async () => {
    loading.value = true

    try {
        // Fetch worker name
        const { data: worker } = await supabase
            .from('workers')
            .select('name')
            .eq('id', employeeId)
            .single()

        employeeName.value = worker?.name || 'Unknown Worker'

        // Fetch all savings records for this worker
        const { data: savingsData, error: savingsError } = await supabase
            .from('savings')
            .select('*')
            .eq('worker_id', employeeId)
            .order('week_start', { ascending: false })

        if (savingsError) {
            console.error('Error fetching savings:', savingsError)
            return
        }

        // Fetch payout data to get confirmed_at dates for auto transactions
        const { data: payouts, error: payoutsError } = await supabase
            .from('payouts')
            .select('employee_id, week_start, confirmed_at')
            .eq('employee_id', employeeId)

        if (payoutsError) {
            console.error('Error fetching payouts:', payoutsError)
            // Continue without payout data
        }

        // Create a map of payouts for quick lookup
        const payoutMap = {}
        payouts?.forEach(payout => {
            const key = `${payout.employee_id}_${payout.week_start}`
            payoutMap[key] = payout
        })

        // Enhance savings data with payout information
        const enhancedSavingsData = savingsData?.map(saving => ({
            ...saving,
            payouts: payoutMap[`${saving.worker_id}_${saving.week_start}`] || null
        }))

        if (enhancedSavingsData) {
            const deposits = enhancedSavingsData.filter(s => parseFloat(s.amount) > 0)
            const refunds = enhancedSavingsData.filter(s => parseFloat(s.amount) < 0)

            totalDeposits.value = deposits.reduce((sum, s) => sum + parseFloat(s.amount), 0)
            totalRefunds.value = Math.abs(refunds.reduce((sum, s) => sum + parseFloat(s.amount), 0))
            totalSavings.value = totalDeposits.value - totalRefunds.value

            // Transform data for display
            savingsHistory.value = enhancedSavingsData.map(s => ({
                id: s.id,
                type: parseFloat(s.amount) > 0 ? 'deposit' : 'refund',
                amount: Math.abs(parseFloat(s.amount)),
                date: format(new Date(getTransactionDate(s)), 'MMM dd, yyyy'),
                reason: s.type === 'auto' ? 'Weekly savings deduction' : (s.type === 'refund' ? 'Refund' : 'Manual entry'),
                notes: s.remarks || ''
            }))

            // Get last activity date
            if (enhancedSavingsData.length > 0) {
                lastActivityDate.value = format(new Date(getTransactionDate(enhancedSavingsData[0])), 'MMM dd')
            }
        }

    } catch (error) {
        console.error('Error fetching savings data:', error)
    } finally {
        loading.value = false
    }
}

const processRefund = async () => {
    if (!canProcessRefund.value) return

    processingRefund.value = true

    try {
        // Insert negative amount for refund in savings table
        const { error } = await supabase
            .from('savings')
            .insert({
                worker_id: employeeId,
                amount: -parseFloat(refundAmount.value), // Negative for refund
                type: 'refund',
                remarks: refundNotes.value || `${refundReason.value.replace(/_/g, ' ')} refund`,
                week_start: format(new Date(), 'yyyy-MM-dd') // Current week
            })

        if (error) {
            throw error
        }

        // Add refund transaction to history (for immediate UI update)
        const newRefund = {
            id: `REF${Date.now()}`,
            type: 'refund',
            amount: parseFloat(refundAmount.value),
            date: format(new Date(), 'MMM dd, yyyy'),
            reason: refundReason.value.replace(/_/g, ' '),
            notes: refundNotes.value || `Refund processed for ${refundReason.value.replace(/_/g, ' ')}`
        }

        savingsHistory.value.unshift(newRefund)

        // Update totals
        totalSavings.value -= parseFloat(refundAmount.value)
        totalRefunds.value += parseFloat(refundAmount.value)

        // Clear form
        clearRefundForm()

        // Show success message
        alert(`Refund of ₱${parseFloat(refundAmount.value).toLocaleString()} processed successfully!`)

    } catch (error) {
        console.error('Error processing refund:', error)
        alert(`Error processing refund: ${error.message}`)
    } finally {
        processingRefund.value = false
    }
}

const clearRefundForm = () => {
    refundAmount.value = ''
    refundReason.value = ''
    refundNotes.value = ''
}

onMounted(() => {
    fetchSavingsData()
})
</script>