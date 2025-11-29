<template>
    <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white p-6">
        <!-- Header -->
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
            <div>
                <h1 class="text-3xl font-bold bg-gradient-to-r from-white via-green-100 to-emerald-200 bg-clip-text text-transparent">
                    📊 Employee Savings Table
                </h1>
                <p class="text-white/60 mt-2">View all employee savings at a glance</p>
            </div>
            <div class="flex flex-wrap gap-3">
                <div class="bg-green-600/20 rounded-lg px-4 py-2 border border-green-500/30">
                    <span class="text-white/60 text-sm">Total Savings:</span>
                    <span class="text-green-400 font-bold text-lg ml-2">₱{{ totalSavings.toLocaleString() }}</span>
                </div>
                <div class="bg-blue-600/20 rounded-lg px-4 py-2 border border-blue-500/30">
                    <span class="text-white/60 text-sm">Deposits:</span>
                    <span class="text-blue-400 font-bold text-lg ml-2">₱{{ totalDeposits.toLocaleString() }}</span>
                </div>
                <div class="bg-orange-600/20 rounded-lg px-4 py-2 border border-orange-500/30">
                    <span class="text-white/60 text-sm">Refunds:</span>
                    <span class="text-orange-400 font-bold text-lg ml-2">₱{{ Math.abs(totalRefunds).toLocaleString() }}</span>
                </div>
            </div>
        </div>

        <!-- Filter Controls -->
        <div class="bg-white/5 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/10">
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
                            'px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
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

        <!-- Desktop Table -->
        <div v-else class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hidden md:block">
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="text-xs uppercase bg-white/5 border-b border-white/10">
                        <tr>
                            <th scope="col" class="px-6 py-4 text-white/70 font-semibold cursor-pointer hover:text-white transition-colors"
                                @click="sortBy('name')">
                                <div class="flex items-center gap-2">
                                    Employee
                                    <SortIcon :active="sortColumn === 'name'" :direction="sortDirection" />
                                </div>
                            </th>
                            <th scope="col" class="px-6 py-4 text-white/70 font-semibold text-right cursor-pointer hover:text-white transition-colors"
                                @click="sortBy('totalSavings')">
                                <div class="flex items-center justify-end gap-2">
                                    Balance
                                    <SortIcon :active="sortColumn === 'totalSavings'" :direction="sortDirection" />
                                </div>
                            </th>
                            <th scope="col" class="px-6 py-4 text-blue-400 font-semibold text-right cursor-pointer hover:text-blue-300 transition-colors"
                                @click="sortBy('savingsTableTotal')">
                                <div class="flex items-center justify-end gap-2">
                                    Savings Table
                                    <SortIcon :active="sortColumn === 'savingsTableTotal'" :direction="sortDirection" />
                                </div>
                            </th>
                            <th scope="col" class="px-6 py-4 text-purple-400 font-semibold text-right cursor-pointer hover:text-purple-300 transition-colors"
                                @click="sortBy('payoutsTableTotal')">
                                <div class="flex items-center justify-end gap-2">
                                    Payouts Table
                                    <SortIcon :active="sortColumn === 'payoutsTableTotal'" :direction="sortDirection" />
                                </div>
                            </th>
                            <th scope="col" class="px-6 py-4 text-white/70 font-semibold text-right cursor-pointer hover:text-white transition-colors"
                                @click="sortBy('totalRefunds')">
                                <div class="flex items-center justify-end gap-2">
                                    Refunds
                                    <SortIcon :active="sortColumn === 'totalRefunds'" :direction="sortDirection" />
                                </div>
                            </th>
                            <th scope="col" class="px-6 py-4 text-white/70 font-semibold text-center">
                                Match
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="employee in sortedEmployees" :key="employee.id"
                            :class="[
                                'border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer',
                                employee.hasMismatch ? 'bg-red-500/5' : ''
                            ]"
                            @click="openEmployeeModal(employee)">
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {{ employee.name.charAt(0) }}
                                    </div>
                                    <div>
                                        <div class="font-medium text-white">{{ employee.name }}</div>
                                        <div class="text-white/50 text-xs">{{ employee.position }}</div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <span :class="employee.totalSavings > 0 ? 'text-green-400 font-semibold' : 'text-white/50'">
                                    ₱{{ employee.totalSavings.toLocaleString() }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <span class="text-blue-400">₱{{ employee.savingsTableTotal.toLocaleString() }}</span>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <span class="text-purple-400">₱{{ employee.payoutsTableTotal.toLocaleString() }}</span>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <span class="text-orange-400">₱{{ Math.abs(employee.totalRefunds).toLocaleString() }}</span>
                            </td>
                            <td class="px-6 py-4 text-center">
                                <span v-if="!employee.hasMismatch" class="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                                    ✓ Match
                                </span>
                                <span v-else class="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                                    ⚠ Diff: ₱{{ Math.abs(employee.savingsTableTotal - employee.payoutsTableTotal).toLocaleString() }}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                    <!-- Table Footer with Totals -->
                    <tfoot class="bg-white/5 border-t border-white/10">
                        <tr>
                            <td class="px-6 py-4 font-semibold text-white">
                                Total ({{ sortedEmployees.length }} employees)
                            </td>
                            <td class="px-6 py-4 text-right font-bold text-green-400">
                                ₱{{ totalSavings.toLocaleString() }}
                            </td>
                            <td class="px-6 py-4 text-right font-bold text-blue-400">
                                ₱{{ totalSavingsTable.toLocaleString() }}
                            </td>
                            <td class="px-6 py-4 text-right font-bold text-purple-400">
                                ₱{{ totalPayoutsTable.toLocaleString() }}
                            </td>
                            <td class="px-6 py-4 text-right font-bold text-orange-400">
                                ₱{{ Math.abs(totalRefunds).toLocaleString() }}
                            </td>
                            <td class="px-6 py-4 text-center">
                                <span v-if="mismatchCount === 0" class="text-green-400 text-xs">All matched</span>
                                <span v-else class="text-red-400 text-xs">{{ mismatchCount }} mismatches</span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <!-- Mobile Cards -->
        <div class="space-y-3 md:hidden">
            <div v-for="employee in sortedEmployees" :key="employee.id"
                @click="openEmployeeModal(employee)"
                :class="[
                    'bg-white/5 backdrop-blur-sm rounded-xl p-4 border transition-all cursor-pointer',
                    employee.hasMismatch ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 hover:border-green-500/50'
                ]">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                            {{ employee.name.charAt(0) }}
                        </div>
                        <div>
                            <div class="font-medium text-white">{{ employee.name }}</div>
                            <div class="text-white/50 text-xs">{{ employee.transactionCount }} transactions</div>
                        </div>
                    </div>
                    <span v-if="!employee.hasMismatch" class="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                        ✓ Match
                    </span>
                    <span v-else class="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300">
                        ⚠ Mismatch
                    </span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-center mb-2">
                    <div class="bg-blue-500/10 rounded-lg p-2">
                        <div class="text-white/60 text-xs">Savings Table</div>
                        <div class="text-blue-400 font-semibold text-sm">₱{{ employee.savingsTableTotal.toLocaleString() }}</div>
                    </div>
                    <div class="bg-purple-500/10 rounded-lg p-2">
                        <div class="text-white/60 text-xs">Payouts Table</div>
                        <div class="text-purple-400 font-semibold text-sm">₱{{ employee.payoutsTableTotal.toLocaleString() }}</div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2 text-center">
                    <div class="bg-green-500/10 rounded-lg p-2">
                        <div class="text-white/60 text-xs">Balance</div>
                        <div class="text-green-400 font-semibold text-sm">₱{{ employee.totalSavings.toLocaleString() }}</div>
                    </div>
                    <div class="bg-orange-500/10 rounded-lg p-2">
                        <div class="text-white/60 text-xs">Refunds</div>
                        <div class="text-orange-400 font-semibold text-sm">₱{{ Math.abs(employee.totalRefunds).toLocaleString() }}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && sortedEmployees.length === 0" class="text-center py-20">
            <div class="text-white/40 text-6xl mb-4">💰</div>
            <h3 class="text-white/60 text-lg font-medium mb-2">No employees found</h3>
            <p class="text-white/40 text-sm">Try adjusting your search or filter criteria</p>
        </div>

        <!-- Employee Detail Modal -->
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div class="bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-white/10">
                <!-- Modal Header -->
                <div class="flex justify-between items-center p-6 border-b border-white/10">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                            {{ selectedEmployee?.name.charAt(0) }}
                        </div>
                        <div>
                            <h2 class="text-xl font-bold text-white">{{ selectedEmployee?.name }}</h2>
                            <p class="text-white/60 text-sm">{{ selectedEmployee?.position }}</p>
                        </div>
                    </div>
                    <button @click="closeModal" class="text-white/60 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="p-6 space-y-4">
                    <!-- Balance Summary -->
                    <div class="bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-lg p-4 border border-green-500/30">
                        <div class="text-center">
                            <p class="text-green-300 text-sm font-medium mb-1">Current Balance</p>
                            <p class="text-white text-3xl font-bold">₱{{ selectedEmployee?.totalSavings.toLocaleString() }}</p>
                        </div>
                    </div>

                    <!-- Comparison Stats -->
                    <div class="grid grid-cols-2 gap-3 mb-3">
                        <div class="bg-blue-500/10 rounded-lg p-3 text-center border border-blue-500/20">
                            <div class="text-white/60 text-xs mb-1">Savings Table</div>
                            <div class="text-blue-400 font-bold">₱{{ selectedEmployee?.savingsTableTotal.toLocaleString() }}</div>
                        </div>
                        <div class="bg-purple-500/10 rounded-lg p-3 text-center border border-purple-500/20">
                            <div class="text-white/60 text-xs mb-1">Payouts Table</div>
                            <div class="text-purple-400 font-bold">₱{{ selectedEmployee?.payoutsTableTotal.toLocaleString() }}</div>
                        </div>
                    </div>

                    <!-- Mismatch Alert -->
                    <div v-if="selectedEmployee?.hasMismatch" class="bg-red-500/10 rounded-lg p-3 border border-red-500/30 mb-3">
                        <div class="flex items-center gap-2 text-red-400">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            <span class="font-medium">Data Mismatch Detected</span>
                        </div>
                        <p class="text-red-300/80 text-sm mt-1">
                            Difference: ₱{{ Math.abs((selectedEmployee?.savingsTableTotal || 0) - (selectedEmployee?.payoutsTableTotal || 0)).toLocaleString() }}
                        </p>
                    </div>

                    <!-- Other Stats Grid -->
                    <div class="grid grid-cols-3 gap-3">
                        <div class="bg-green-500/10 rounded-lg p-3 text-center border border-green-500/20">
                            <div class="text-white/60 text-xs mb-1">Deposits</div>
                            <div class="text-green-400 font-bold">₱{{ selectedEmployee?.totalDeposits.toLocaleString() }}</div>
                        </div>
                        <div class="bg-orange-500/10 rounded-lg p-3 text-center border border-orange-500/20">
                            <div class="text-white/60 text-xs mb-1">Refunds</div>
                            <div class="text-orange-400 font-bold">₱{{ Math.abs(selectedEmployee?.totalRefunds || 0).toLocaleString() }}</div>
                        </div>
                        <div class="bg-gray-500/10 rounded-lg p-3 text-center border border-gray-500/20">
                            <div class="text-white/60 text-xs mb-1">Transactions</div>
                            <div class="text-gray-400 font-bold">{{ selectedEmployee?.transactionCount }}</div>
                        </div>
                    </div>

                    <!-- Recent Transactions -->
                    <div v-if="selectedEmployee?.recentTransactions?.length > 0">
                        <h4 class="text-white/70 text-sm font-medium mb-3">Recent Transactions</h4>
                        <div class="space-y-2 max-h-48 overflow-y-auto">
                            <div v-for="transaction in selectedEmployee.recentTransactions" :key="transaction.id"
                                class="flex justify-between items-center bg-white/5 rounded-lg p-3">
                                <div class="flex items-center gap-3">
                                    <div :class="[
                                        'w-8 h-8 rounded-full flex items-center justify-center',
                                        transaction.amount > 0 ? 'bg-green-500/20' : 'bg-orange-500/20'
                                    ]">
                                        <svg v-if="transaction.amount > 0" class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                        </svg>
                                        <svg v-else class="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                                        </svg>
                                    </div>
                                    <div>
                                        <span :class="[
                                            'font-medium',
                                            transaction.amount > 0 ? 'text-green-400' : 'text-orange-400'
                                        ]">
                                            {{ transaction.amount > 0 ? '+' : '' }}₱{{ transaction.amount.toLocaleString() }}
                                        </span>
                                        <div class="text-white/40 text-xs">{{ getTransactionType(transaction) }}</div>
                                    </div>
                                </div>
                                <div class="text-white/50 text-xs">{{ formatDate(transaction.week_start) }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- No Transactions -->
                    <div v-else class="text-center py-6 text-white/40">
                        <p>No transactions yet</p>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="p-6 border-t border-white/10">
                    <button @click="closeModal"
                        class="w-full px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium">
                        Close
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

// Sort Icon Component
const SortIcon = {
    props: {
        active: Boolean,
        direction: String
    },
    template: `
        <svg class="w-4 h-4" :class="active ? 'text-green-400' : 'text-white/30'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="!active || direction === 'asc'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
    `
}

// State
const searchQuery = ref('')
const activeFilter = ref('all')
const sortColumn = ref('totalSavings')
const sortDirection = ref('desc')
const showModal = ref(false)
const selectedEmployee = ref(null)

// Data
const employees = ref([])
const loading = ref(true)

// Computed: Processed employees with savings calculations
const processedEmployees = computed(() => {
    return employees.value.map(employee => {
        const deposits = employee.savingsTransactions?.filter(t => t.amount > 0) || []
        const refunds = employee.savingsTransactions?.filter(t => t.amount < 0) || []

        const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0)
        const totalRefunds = refunds.reduce((sum, t) => sum + t.amount, 0)
        const totalSavings = totalDeposits + totalRefunds

        return {
            ...employee,
            totalSavings: Math.max(0, totalSavings),
            totalDeposits,
            totalRefunds,
            transactionCount: (employee.savingsTransactions || []).length,
            recentTransactions: (employee.savingsTransactions || [])
                .sort((a, b) => new Date(b.week_start) - new Date(a.week_start))
                .slice(0, 10),
            // Include comparison fields from fetch
            savingsTableTotal: employee.savingsTableTotal || 0,
            payoutsTableTotal: employee.payoutsTableTotal || 0,
            hasMismatch: employee.hasMismatch || false,
            payoutsSavings: employee.payoutsSavings || []
        }
    })
})

// Computed: Filter buttons
const savingsFilters = computed(() => [
    { key: 'all', label: 'All', count: processedEmployees.value.length },
    { key: 'with-savings', label: 'With Savings', count: processedEmployees.value.filter(e => e.totalSavings > 0).length },
    { key: 'mismatch', label: 'Mismatches', count: processedEmployees.value.filter(e => e.hasMismatch).length },
    { key: 'no-savings', label: 'No Savings', count: processedEmployees.value.filter(e => e.totalSavings === 0).length }
])

// Computed: Filtered employees
const filteredEmployees = computed(() => {
    let filtered = processedEmployees.value

    // Apply search filter
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(employee =>
            employee.name.toLowerCase().includes(query)
        )
    }

    // Apply savings status filter
    if (activeFilter.value === 'with-savings') {
        filtered = filtered.filter(employee => employee.totalSavings > 0)
    } else if (activeFilter.value === 'no-savings') {
        filtered = filtered.filter(employee => employee.totalSavings === 0)
    } else if (activeFilter.value === 'mismatch') {
        filtered = filtered.filter(employee => employee.hasMismatch)
    }

    return filtered
})

// Computed: Sorted employees
const sortedEmployees = computed(() => {
    const sorted = [...filteredEmployees.value]

    sorted.sort((a, b) => {
        let aVal = a[sortColumn.value]
        let bVal = b[sortColumn.value]

        // Handle string comparison for name
        if (sortColumn.value === 'name') {
            aVal = aVal.toLowerCase()
            bVal = bVal.toLowerCase()
        }

        // Handle refunds (make absolute for sorting)
        if (sortColumn.value === 'totalRefunds') {
            aVal = Math.abs(aVal)
            bVal = Math.abs(bVal)
        }

        if (sortDirection.value === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
        } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
        }
    })

    return sorted
})

// Computed: Totals
const totalSavings = computed(() => {
    return filteredEmployees.value.reduce((sum, e) => sum + e.totalSavings, 0)
})

const totalDeposits = computed(() => {
    return filteredEmployees.value.reduce((sum, e) => sum + e.totalDeposits, 0)
})

const totalRefunds = computed(() => {
    return filteredEmployees.value.reduce((sum, e) => sum + e.totalRefunds, 0)
})

const totalTransactions = computed(() => {
    return filteredEmployees.value.reduce((sum, e) => sum + e.transactionCount, 0)
})

const totalSavingsTable = computed(() => {
    return filteredEmployees.value.reduce((sum, e) => sum + (e.savingsTableTotal || 0), 0)
})

const totalPayoutsTable = computed(() => {
    return filteredEmployees.value.reduce((sum, e) => sum + (e.payoutsTableTotal || 0), 0)
})

const mismatchCount = computed(() => {
    return filteredEmployees.value.filter(e => e.hasMismatch).length
})

// Methods
function sortBy(column) {
    if (sortColumn.value === column) {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
        sortColumn.value = column
        sortDirection.value = column === 'name' ? 'asc' : 'desc'
    }
}

function openEmployeeModal(employee) {
    selectedEmployee.value = employee
    showModal.value = true
}

function closeModal() {
    showModal.value = false
    selectedEmployee.value = null
}

function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getTransactionType(transaction) {
    if (transaction.amount > 0) {
        return transaction.type === 'auto' ? 'Payroll Deduction' :
            transaction.type === 'manual' ? 'Manual Addition' : 'Deposit'
    } else {
        return transaction.type === 'refund' ? 'Refund' : 'Withdrawal'
    }
}

// Data fetching
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

        // Fetch all savings transactions from savings table
        const { data: savings, error: savingsError } = await supabase
            .from('savings')
            .select('*')
            .order('week_start', { ascending: false })

        if (savingsError) {
            console.error('Error fetching savings:', savingsError)
            return
        }

        // Fetch all payouts to compare savings amounts from deductions JSON
        const { data: payouts, error: payoutsError } = await supabase
            .from('payouts')
            .select('employee_id, week_start, deductions, confirmed_at')
            .order('week_start', { ascending: false })

        if (payoutsError) {
            console.error('Error fetching payouts:', payoutsError)
        }

        // Group savings by worker
        const savingsByWorker = {}
        savings?.forEach(saving => {
            if (!savingsByWorker[saving.worker_id]) {
                savingsByWorker[saving.worker_id] = []
            }
            savingsByWorker[saving.worker_id].push(saving)
        })

        // Group payouts savings by worker (extract from deductions JSON)
        const payoutSavingsByWorker = {}
        payouts?.forEach(payout => {
            if (!payoutSavingsByWorker[payout.employee_id]) {
                payoutSavingsByWorker[payout.employee_id] = []
            }

            // Parse deductions JSON and extract savings
            let savingsAmount = 0
            try {
                const deductions = typeof payout.deductions === 'string'
                    ? JSON.parse(payout.deductions)
                    : payout.deductions
                savingsAmount = parseFloat(deductions?.savings) || 0
            } catch (e) {
                console.warn('Failed to parse deductions for payout:', payout)
            }

            if (savingsAmount > 0) {
                payoutSavingsByWorker[payout.employee_id].push({
                    amount: savingsAmount,
                    week_start: payout.week_start,
                    confirmed_at: payout.confirmed_at,
                    source: 'payouts'
                })
            }
        })

        // Combine workers with their savings from both sources
        employees.value = workers?.map(worker => {
            const savingsTableData = savingsByWorker[worker.id] || []
            const payoutsTableData = payoutSavingsByWorker[worker.id] || []

            // Calculate totals from savings table
            const savingsTableTotal = savingsTableData
                .filter(t => t.amount > 0)
                .reduce((sum, t) => sum + t.amount, 0)

            // Calculate totals from payouts table
            const payoutsTableTotal = payoutsTableData
                .reduce((sum, t) => sum + t.amount, 0)

            return {
                ...worker,
                position: 'Employee',
                savingsTransactions: savingsTableData,
                payoutsSavings: payoutsTableData,
                savingsTableTotal,
                payoutsTableTotal,
                hasMismatch: Math.abs(savingsTableTotal - payoutsTableTotal) > 0.01
            }
        }) || []

    } catch (error) {
        console.error('Error fetching data:', error)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchEmployeesAndSavings()
})
</script>

<style scoped>
/* Custom scrollbar */
:deep(*) {
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
}

:deep(*::-webkit-scrollbar-thumb:hover) {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(5, 150, 105, 0.8));
}
</style>
