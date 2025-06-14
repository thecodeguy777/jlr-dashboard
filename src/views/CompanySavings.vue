<template>
    <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white p-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
                <h1
                    class="text-3xl font-bold bg-gradient-to-r from-white via-green-100 to-emerald-200 bg-clip-text text-transparent">
                    💰 Company Savings</h1>
                <p class="text-white/60 mt-2">Manage employee savings and refund processing</p>
            </div>
            <div class="flex gap-4">
                <div class="bg-green-600/20 rounded-lg px-4 py-2 border border-green-500/30">
                    <span class="text-white/60 text-sm">Total Savings:</span>
                    <span class="text-green-400 font-bold text-lg ml-2">₱{{ totalSavings.toLocaleString() }}</span>
                </div>
                <div class="bg-blue-600/20 rounded-lg px-4 py-2 border border-blue-500/30">
                    <span class="text-white/60 text-sm">Total Deposits:</span>
                    <span class="text-blue-400 font-bold text-lg ml-2">₱{{ totalDeposits.toLocaleString() }}</span>
                </div>
                <div class="bg-orange-600/20 rounded-lg px-4 py-2 border border-orange-500/30">
                    <span class="text-white/60 text-sm">Total Refunds:</span>
                    <span class="text-orange-400 font-bold text-lg ml-2">₱{{ Math.abs(totalRefunds).toLocaleString()
                        }}</span>
                </div>
            </div>
        </div>

        <!-- Filter Controls -->
        <div class="bg-white/5 backdrop-blur-sm rounded-xl p-4 mb-8 border border-white/10">
            <div class="flex flex-col sm:flex-row sm:items-center gap-4">
                <div class="relative flex-1">
                    <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" fill="none"
                        stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <input v-model="searchQuery" type="text" placeholder="Search employees..."
                        class="pl-10 pr-4 py-2 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all w-full" />
                </div>

                <div class="flex gap-2">
                    <button v-for="filter in savingsFilters" :key="filter.key" @click="activeFilter = filter.key"
                        :class="[
                            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                            activeFilter === filter.key
                                ? 'bg-green-600 text-white shadow-lg'
                                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                        ]">
                        {{ filter.label }}
                        <span class="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">{{ filter.count }}</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-20">
            <div class="text-white/60 text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                <p>Loading employees and savings data...</p>
            </div>
        </div>

        <!-- Employee Savings Cards -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div v-for="employee in filteredEmployees" :key="employee.id" @click="openRefundModal(employee)"
                class="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-green-500/50 transition-all cursor-pointer group hover:bg-white/15">

                <!-- Employee Info -->
                <div class="flex items-center gap-3 mb-4">
                    <div
                        class="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                        {{ employee.name.charAt(0) }}
                    </div>
                    <div class="flex-1">
                        <h3 class="font-semibold text-white group-hover:text-green-300 transition-colors">{{
                            employee.name }}</h3>
                        <p class="text-white/60 text-sm">{{ employee.position }}</p>
                    </div>
                    <div class="text-right">
                        <span :class="[
                            'text-xs px-2 py-1 rounded-full font-medium',
                            employee.totalSavings > 0
                                ? 'bg-green-500/20 text-green-300'
                                : 'bg-gray-500/20 text-gray-300'
                        ]">
                            {{ employee.totalSavings > 0 ? `₱${employee.totalSavings.toLocaleString()}` : 'No Savings'
                            }}
                        </span>
                    </div>
                </div>

                <!-- Savings Summary -->
                <div v-if="employee.totalSavings > 0" class="space-y-3">
                    <!-- Total Balance Hero -->
                    <div
                        class="bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-lg p-4 border border-green-500/30">
                        <div class="text-center">
                            <p class="text-green-300 text-sm font-medium mb-1">Current Balance</p>
                            <p class="text-white text-2xl font-bold">₱{{ employee.totalSavings.toLocaleString() }}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-white/60 block">Total Deposits:</span>
                            <span class="text-green-400 font-bold">₱{{ employee.totalDeposits.toLocaleString() }}</span>
                        </div>
                        <div>
                            <span class="text-white/60 block">Total Refunds:</span>
                            <span class="text-orange-400 font-bold">₱{{ Math.abs(employee.totalRefunds).toLocaleString()
                            }}</span>
                        </div>
                    </div>

                    <!-- Recent Transactions -->
                    <div class="space-y-2">
                        <h4 class="text-xs text-white/60 font-medium">Recent Transactions:</h4>
                        <div v-for="transaction in employee.recentTransactions.slice(0, 3)" :key="transaction.id"
                            class="flex justify-between items-center bg-white/5 rounded-lg p-2">
                            <div class="flex items-center gap-2">
                                <div :class="[
                                    'w-2 h-2 rounded-full',
                                    transaction.amount > 0 ? 'bg-green-400' : 'bg-orange-400'
                                ]"></div>
                                <span :class="[
                                    'text-sm font-medium',
                                    transaction.amount > 0 ? 'text-green-400' : 'text-orange-400'
                                ]">
                                    {{ transaction.amount > 0 ? '+' : '' }}₱{{ transaction.amount.toLocaleString() }}
                                </span>
                            </div>
                            <div class="text-right">
                                <span class="text-white/60 text-xs">{{ formatDate(getTransactionDate(transaction))
                                }}</span>
                                <div class="text-white/40 text-xs">{{ getTransactionType(transaction) }}</div>
                            </div>
                        </div>
                        <div v-if="employee.recentTransactions.length > 3" class="text-center">
                            <span class="text-white/40 text-xs">+{{ employee.recentTransactions.length - 3 }} more
                                transactions</span>
                        </div>
                    </div>
                </div>

                <!-- No Savings State -->
                <div v-else class="text-center py-4">
                    <div class="text-white/40 text-sm mb-2">No savings yet</div>
                    <div class="text-green-400 text-xs group-hover:text-green-300 transition-colors">
                        Savings will appear after payroll deductions
                    </div>
                </div>

                <!-- Action Hint -->
                <div class="mt-4 pt-3 border-t border-white/10">
                    <div
                        class="flex items-center justify-center text-white/60 group-hover:text-green-400 transition-colors text-sm">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1">
                            </path>
                        </svg>
                        {{ employee.totalSavings > 0 ? 'Manage savings' : 'Add savings' }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Savings Management Modal -->
        <div v-if="showRefundModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div
                class="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/10">
                <!-- Modal Header -->
                <div class="flex justify-between items-center p-6 border-b border-white/10">
                    <div>
                        <h2 class="text-xl font-bold text-white">Manage Savings</h2>
                        <p class="text-white/60 text-sm mt-1">{{ selectedEmployee?.name }}</p>
                        <p class="text-green-400 text-sm font-medium">Current Balance: ₱{{
                            selectedEmployee?.totalSavings.toLocaleString() }}</p>
                    </div>
                    <button @click="closeRefundModal" class="text-white/60 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Mode Toggle Tabs -->
                <div class="flex border-b border-white/10">
                    <button @click="modalMode = 'add'" :class="[
                        'flex-1 px-6 py-3 text-sm font-medium transition-all',
                        modalMode === 'add'
                            ? 'text-green-400 border-b-2 border-green-500 bg-green-500/10'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                    ]">
                        <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Add Savings
                    </button>
                    <button @click="modalMode = 'refund'" :class="[
                        'flex-1 px-6 py-3 text-sm font-medium transition-all',
                        modalMode === 'refund'
                            ? 'text-orange-400 border-b-2 border-orange-500 bg-orange-500/10'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                    ]" :disabled="selectedEmployee?.totalSavings <= 0">
                        <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                        </svg>
                        Process Refund
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="p-6 space-y-6">
                    <!-- ADD SAVINGS MODE -->
                    <div v-if="modalMode === 'add'">
                        <!-- Add Amount -->
                        <div>
                            <label class="block text-sm font-medium text-white/70 mb-2">Savings Amount</label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">₱</span>
                                <input v-model="refundForm.amount" type="number" step="50" min="50"
                                    class="pl-8 pr-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all w-full"
                                    placeholder="0.00" />
                            </div>
                            <p class="text-white/40 text-xs mt-2">Minimum: ₱50 • This will be added to their current
                                balance</p>
                        </div>

                        <!-- Add Reason -->
                        <div>
                            <label class="block text-sm font-medium text-white/70 mb-3">Reason for Addition</label>
                            <div class="grid grid-cols-2 gap-3">
                                <button v-for="reason in addReasons" :key="reason" @click="refundForm.reason = reason"
                                    :class="[
                                        'p-3 rounded-lg text-sm font-medium transition-all border',
                                        refundForm.reason === reason
                                            ? 'bg-green-600 text-white border-green-500'
                                            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:border-white/20'
                                    ]">
                                    {{ reason }}
                                </button>
                            </div>
                        </div>

                        <!-- Additional Notes -->
                        <div>
                            <label class="block text-sm font-medium text-white/70 mb-2">Additional Notes</label>
                            <textarea v-model="refundForm.notes" rows="3"
                                class="w-full px-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                                placeholder="Optional notes about this savings addition..."></textarea>
                        </div>

                        <!-- Add Preview -->
                        <div v-if="refundForm.amount && parseFloat(refundForm.amount) > 0"
                            class="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                            <h4 class="text-white font-medium mb-3">Addition Preview</h4>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-white/60">Current Balance:</span>
                                    <span class="text-green-400">₱{{ selectedEmployee?.totalSavings.toLocaleString()
                                        }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-white/60">Addition Amount:</span>
                                    <span class="text-green-400">+₱{{ parseFloat(refundForm.amount ||
                                        0).toLocaleString() }}</span>
                                </div>
                                <div class="flex justify-between border-t border-white/10 pt-2 font-medium">
                                    <span class="text-white/80">New Balance:</span>
                                    <span class="text-white">₱{{ (selectedEmployee?.totalSavings +
                                        parseFloat(refundForm.amount || 0)).toLocaleString() }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-white/60">Reason:</span>
                                    <span class="text-white">{{ refundForm.reason || 'Not specified' }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- REFUND MODE -->
                    <div v-else-if="modalMode === 'refund'">
                        <!-- Refund Amount -->
                        <div>
                            <label class="block text-sm font-medium text-white/70 mb-2">Refund Amount</label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">₱</span>
                                <input v-model="refundForm.amount" type="number" step="50" min="50"
                                    :max="selectedEmployee?.totalSavings"
                                    class="pl-8 pr-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all w-full"
                                    placeholder="0.00" />
                            </div>
                            <p class="text-white/40 text-xs mt-2">Maximum: ₱{{
                                selectedEmployee?.totalSavings.toLocaleString() || '0' }}</p>
                        </div>

                        <!-- Refund Reason -->
                        <div>
                            <label class="block text-sm font-medium text-white/70 mb-3">Refund Reason</label>
                            <div class="grid grid-cols-2 gap-3">
                                <button v-for="reason in refundReasons" :key="reason"
                                    @click="refundForm.reason = reason" :class="[
                                        'p-3 rounded-lg text-sm font-medium transition-all border',
                                        refundForm.reason === reason
                                            ? 'bg-orange-600 text-white border-orange-500'
                                            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:border-white/20'
                                    ]">
                                    {{ reason }}
                                </button>
                            </div>
                        </div>

                        <!-- Additional Notes -->
                        <div>
                            <label class="block text-sm font-medium text-white/70 mb-2">Additional Notes</label>
                            <textarea v-model="refundForm.notes" rows="3"
                                class="w-full px-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                                placeholder="Optional notes about this refund..."></textarea>
                        </div>

                        <!-- Refund Preview -->
                        <div v-if="refundForm.amount && parseFloat(refundForm.amount) > 0"
                            class="bg-orange-500/10 rounded-lg p-4 border border-orange-500/20">
                            <h4 class="text-white font-medium mb-3">Refund Preview</h4>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-white/60">Current Balance:</span>
                                    <span class="text-green-400">₱{{ selectedEmployee?.totalSavings.toLocaleString()
                                        }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-white/60">Refund Amount:</span>
                                    <span class="text-orange-400">-₱{{ parseFloat(refundForm.amount ||
                                        0).toLocaleString() }}</span>
                                </div>
                                <div class="flex justify-between border-t border-white/10 pt-2 font-medium">
                                    <span class="text-white/80">Remaining Balance:</span>
                                    <span class="text-white">₱{{ (selectedEmployee?.totalSavings -
                                        parseFloat(refundForm.amount || 0)).toLocaleString() }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-white/60">Reason:</span>
                                    <span class="text-white">{{ refundForm.reason || 'Not specified' }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Warning -->
                        <div v-if="parseFloat(refundForm.amount || 0) > (selectedEmployee?.totalSavings || 0)"
                            class="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <div class="flex items-center gap-2 text-red-400 text-sm">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z">
                                    </path>
                                </svg>
                                Refund amount exceeds available balance
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="flex gap-3 p-6 border-t border-white/10">
                    <button @click="closeRefundModal"
                        class="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium">
                        Cancel
                    </button>
                    <button v-if="modalMode === 'add'" @click="addSavings" :disabled="!canAddSavings" :class="[
                        'flex-1 px-4 py-3 rounded-lg font-medium transition-all',
                        canAddSavings
                            ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                            : 'bg-white/10 text-white/40 cursor-not-allowed'
                    ]">
                        Add Savings
                    </button>
                    <button v-else @click="processRefund" :disabled="!canProcessRefund" :class="[
                        'flex-1 px-4 py-3 rounded-lg font-medium transition-all',
                        canProcessRefund
                            ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg'
                            : 'bg-white/10 text-white/40 cursor-not-allowed'
                    ]">
                        Process Refund
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

// State
const searchQuery = ref('')
const activeFilter = ref('all')
const showRefundModal = ref(false)
const selectedEmployee = ref(null)
const modalMode = ref('add') // 'add' or 'refund'

// Refund form
const refundForm = ref({
    amount: '',
    reason: '',
    notes: ''
})

// Refund reasons
const refundReasons = ['Personal', 'Emergency', 'Medical', 'Family', 'Education', 'Other']

// Add savings reasons
const addReasons = ['Manual Adjustment', 'Missed Deduction', 'Bonus', 'Correction', 'Retroactive', 'Other']

// Real data from Supabase
const employees = ref([])
const loading = ref(true)

// Computed properties for employees with processed savings data
const processedEmployees = computed(() => {
    return employees.value.map(employee => {
        const deposits = employee.savingsTransactions?.filter(t => t.amount > 0) || []
        const refunds = employee.savingsTransactions?.filter(t => t.amount < 0) || []

        const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0)
        const totalRefunds = refunds.reduce((sum, t) => sum + t.amount, 0)
        const totalSavings = totalDeposits + totalRefunds // totalRefunds is already negative

        return {
            ...employee,
            totalSavings: Math.max(0, totalSavings), // Ensure non-negative
            totalDeposits: totalDeposits,
            totalRefunds: totalRefunds,
            recentTransactions: (employee.savingsTransactions || [])
                .sort((a, b) => new Date(b.week_start) - new Date(a.week_start))
                .slice(0, 5)
        }
    })
})

const savingsFilters = computed(() => [
    { key: 'all', label: 'All Employees', count: processedEmployees.value.length },
    { key: 'with-savings', label: 'With Savings', count: processedEmployees.value.filter(e => e.totalSavings > 0).length },
    { key: 'no-savings', label: 'No Savings', count: processedEmployees.value.filter(e => e.totalSavings === 0).length }
])

const filteredEmployees = computed(() => {
    let filtered = processedEmployees.value

    // Apply search filter
    if (searchQuery.value) {
        filtered = filtered.filter(employee =>
            employee.name.toLowerCase().includes(searchQuery.value.toLowerCase())
        )
    }

    // Apply savings status filter
    if (activeFilter.value === 'with-savings') {
        filtered = filtered.filter(employee => employee.totalSavings > 0)
    } else if (activeFilter.value === 'no-savings') {
        filtered = filtered.filter(employee => employee.totalSavings === 0)
    }

    return filtered
})

// Company-wide totals
const totalSavings = computed(() => {
    return processedEmployees.value.reduce((sum, employee) => sum + employee.totalSavings, 0)
})

const totalDeposits = computed(() => {
    return processedEmployees.value.reduce((sum, employee) => sum + employee.totalDeposits, 0)
})

const totalRefunds = computed(() => {
    return processedEmployees.value.reduce((sum, employee) => sum + employee.totalRefunds, 0)
})

const canProcessRefund = computed(() => {
    const amount = parseFloat(refundForm.value.amount || 0)
    return refundForm.value.reason &&
        amount > 0 &&
        amount <= (selectedEmployee.value?.totalSavings || 0)
})

const canAddSavings = computed(() => {
    const amount = parseFloat(refundForm.value.amount || 0)
    return refundForm.value.reason &&
        amount > 0 &&
        amount >= 50 // Minimum amount
})

// Methods
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00') // Add time to avoid timezone issues
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getTransactionDate(transaction) {
    // For auto transactions (payroll), use the confirmed_at date if available
    if (transaction.type === 'auto' && transaction.payouts?.confirmed_at) {
        return transaction.payouts.confirmed_at.split('T')[0] // Get just the date part
    }
    // For manual transactions and refunds, use week_start (which is the actual transaction date)
    return transaction.week_start
}

function getTransactionType(transaction) {
    if (transaction.amount > 0) {
        return transaction.type === 'auto' ? 'Payroll' :
            transaction.type === 'manual' ? 'Manual Add' : 'Deposit'
    } else {
        return transaction.type === 'refund' ? 'Refund' : 'Withdrawal'
    }
}

function openRefundModal(employee) {
    selectedEmployee.value = employee
    showRefundModal.value = true
    // Set default mode - add if no savings, refund if has savings
    modalMode.value = employee.totalSavings > 0 ? 'refund' : 'add'
    // Reset form
    refundForm.value = {
        amount: '',
        reason: '',
        notes: ''
    }
}

function closeRefundModal() {
    showRefundModal.value = false
    selectedEmployee.value = null
}

async function addSavings() {
    if (!canAddSavings.value) return

    try {
        const addAmount = parseFloat(refundForm.value.amount)
        const todayDate = new Date().toISOString().split('T')[0]

        console.log('🔍 Adding savings with date:', todayDate)

        // Insert positive amount for savings addition
        const { data, error } = await supabase
            .from('savings')
            .insert({
                worker_id: selectedEmployee.value.id,
                amount: addAmount, // Positive for addition
                type: 'manual',
                remarks: `${refundForm.value.reason}${refundForm.value.notes ? ` - ${refundForm.value.notes}` : ''}`,
                week_start: todayDate
            })
            .select()

        if (error) {
            console.error('Error adding savings:', error)
            alert('Error adding savings. Please try again.')
            return
        }

        console.log('✅ Savings added successfully:', data[0])

        alert(`₱${addAmount.toLocaleString()} added to savings successfully!`)
        closeRefundModal()

        // Refresh data to get updated totals (this will fetch from DB)
        await fetchEmployeesAndSavings()

    } catch (error) {
        console.error('Error adding savings:', error)
        alert('Error adding savings. Please try again.')
    }
}

async function processRefund() {
    if (!canProcessRefund.value) return

    try {
        const refundAmount = parseFloat(refundForm.value.amount)
        const todayDate = new Date().toISOString().split('T')[0]

        console.log('🔍 Processing refund with date:', todayDate)

        // Insert negative amount for refund
        const { data, error } = await supabase
            .from('savings')
            .insert({
                worker_id: selectedEmployee.value.id,
                amount: -refundAmount, // Negative for refund
                type: 'refund',
                remarks: `${refundForm.value.reason}${refundForm.value.notes ? ` - ${refundForm.value.notes}` : ''}`,
                week_start: todayDate
            })
            .select()

        if (error) {
            console.error('Error processing refund:', error)
            alert('Error processing refund. Please try again.')
            return
        }

        console.log('✅ Refund processed successfully:', data[0])

        alert(`Refund of ₱${refundAmount.toLocaleString()} processed successfully!`)
        closeRefundModal()

        // Refresh data to get updated totals (this will fetch from DB)
        await fetchEmployeesAndSavings()

    } catch (error) {
        console.error('Error processing refund:', error)
        alert('Error processing refund. Please try again.')
    }
}

// Data fetching functions
async function fetchEmployeesAndSavings() {
    try {
        loading.value = true

        // Fetch all workers
        const { data: workers, error: workersError } = await supabase
            .from('workers')
            .select('id, name')
            .order('name')

        if (workersError) {
            console.error('Error fetching workers:', workersError)
            return
        }

        // Fetch all savings transactions
        const { data: savings, error: savingsError } = await supabase
            .from('savings')
            .select('*')
            .order('week_start', { ascending: false })

        if (savingsError) {
            console.error('Error fetching savings:', savingsError)
            return
        }

        // Fetch payout data to get confirmed_at dates for auto transactions
        const { data: payouts, error: payoutsError } = await supabase
            .from('payouts')
            .select('employee_id, week_start, confirmed_at')

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
        const enhancedSavings = savings?.map(saving => ({
            ...saving,
            payouts: payoutMap[`${saving.worker_id}_${saving.week_start}`] || null
        }))

        console.log('📊 Enhanced savings data:', enhancedSavings?.slice(0, 5)) // Log first 5 for debugging

        // Group enhanced savings by worker
        const savingsByWorker = {}
        enhancedSavings?.forEach(saving => {
            if (!savingsByWorker[saving.worker_id]) {
                savingsByWorker[saving.worker_id] = []
            }
            savingsByWorker[saving.worker_id].push(saving)
        })

        // Combine workers with their savings
        employees.value = workers?.map(worker => ({
            ...worker,
            position: 'RenewCo Employee', // Hardcoded position
            savingsTransactions: savingsByWorker[worker.id] || []
        })) || []

    } catch (error) {
        console.error('Error fetching data:', error)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    console.log('Company Savings page loaded')
    fetchEmployeesAndSavings()
})
</script>

<style scoped>
/* Custom Scrollbar Styling */
:deep(*) {
    /* Webkit browsers (Chrome, Safari, Edge) */
    scrollbar-width: thin;
    scrollbar-color: rgba(34, 197, 94, 0.5) rgba(255, 255, 255, 0.1);
}

:deep(*::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
}

:deep(*::-webkit-scrollbar-track) {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
}

:deep(*::-webkit-scrollbar-thumb) {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.6), rgba(5, 150, 105, 0.6));
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(*::-webkit-scrollbar-thumb:hover) {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(5, 150, 105, 0.8));
    border: 1px solid rgba(255, 255, 255, 0.2);
}

:deep(*::-webkit-scrollbar-corner) {
    background: rgba(255, 255, 255, 0.05);
}

/* Modal specific scrollbar for better contrast */
.fixed .overflow-y-auto::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.6), rgba(59, 130, 246, 0.6));
}

.fixed .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(59, 130, 246, 0.8));
}
</style>