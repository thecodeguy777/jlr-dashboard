<template>
    <div class="min-h-screen text-white p-6 pb-32">
        <!-- View As Selector (Admin Only) -->
        <ViewAsSelector @viewChanged="fetchTransactions" />

        <!-- Top Balance Card -->
        <div class="bg-white/10 rounded-2xl p-6 mb-6">
            <div class="flex justify-between items-start">
                <div>
                    <h2 class="text-sm text-white/60">Petty Cash Balance</h2>
                    <p class="text-3xl font-bold mt-1">₱{{ pettyCashBalance.toLocaleString() }}</p>
                    <p class="text-xs text-white/40 mt-2">Topups - Operational expenses only</p>
                </div>
            </div>
        </div>

        <!-- View Toggle -->
        <div class="flex gap-2 mb-6">
            <button v-for="view in ['Daily', 'Monthly']" :key="view" @click="switchView(view.toLowerCase())" :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition',
                currentView === view.toLowerCase()
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
            ]">
                {{ view }}
            </button>
        </div>

        <!-- Date Navigation (Daily) -->
        <div v-if="currentView === 'daily'" class="flex items-center justify-between mb-6">
            <button @click="changeDate(-1)" class="p-2 hover:bg-white/10 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clip-rule="evenodd" />
                </svg>
            </button>
            <h2 class="text-lg font-semibold">{{ formatDate(selectedDate, 'full') }}</h2>
            <button @click="changeDate(1)" class="p-2 hover:bg-white/10 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clip-rule="evenodd" />
                </svg>
            </button>
        </div>

        <!-- Month Navigation (Monthly) -->
        <div v-if="currentView === 'monthly'" class="flex items-center justify-between mb-6">
            <button @click="changeMonth(-1)" class="p-2 hover:bg-white/10 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clip-rule="evenodd" />
                </svg>
            </button>
            <h2 class="text-lg font-semibold">{{ formatMonthYear(selectedMonth) }}</h2>
            <button @click="changeMonth(1)" class="p-2 hover:bg-white/10 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clip-rule="evenodd" />
                </svg>
            </button>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-white/10 rounded-xl p-4">
                <h3 class="text-sm text-white/60">Incoming</h3>
                <p class="text-xl font-bold text-green-400 mt-1">
                    ₱{{ (currentView === 'daily' ? dailyIncome : monthlyIncome).toLocaleString() }}
                </p>
                <p class="text-xs text-white/50 mt-1" v-if="currentView === 'daily'">
                    Carry-over: ₱{{ dailyCarryOver.toLocaleString() }}
                </p>
                <p class="text-xs text-white/50 mt-1" v-else>
                    Carry-over: ₱{{ carryOver.toLocaleString() }}
                </p>
            </div>
            <div class="bg-white/10 rounded-xl p-4">
                <h3 class="text-sm text-white/60">Total Expenses</h3>
                <p class="text-xl font-bold text-red-400 mt-1">
                    ₱{{ (currentView === 'daily' ? dailyExpenses : monthlyExpenses).toLocaleString() }}
                </p>
                <p class="text-xs text-white/50 mt-1">Operational + Raw Materials</p>
            </div>
        </div>

        <!-- Expense Breakdown: Operational vs Raw Materials -->
        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-white/10 rounded-xl p-4">
                <h3 class="text-sm text-white/60">Operational Expenses</h3>
                <p class="text-xl font-bold text-red-400 mt-1">
                    ₱{{ (currentView === 'daily' ? dailyOperationalExpenses : monthlyOperationalExpenses).toLocaleString() }}
                </p>
                <p class="text-xs text-white/50 mt-1">From petty cash fund</p>
            </div>
            <div class="bg-white/10 rounded-xl p-4 border-2 border-blue-500/30">
                <h3 class="text-sm text-blue-300">Raw Materials</h3>
                <p class="text-xl font-bold text-blue-400 mt-1">
                    ₱{{ (currentView === 'daily' ? dailyRawMaterialsExpenses : monthlyRawMaterialsExpenses).toLocaleString() }}
                </p>
                <p class="text-xs text-blue-300/60 mt-1">Tracked separately</p>
            </div>
        </div>

        <!-- Operational Expense Breakdown Section -->
        <div v-if="Object.keys(operationalByCategory).length > 0" class="bg-white/5 rounded-xl p-6 mb-6">
            <h3 class="text-lg font-semibold text-red-300 mb-4">💸 {{ currentView === 'daily' ? 'Daily' : 'Monthly' }} Operational Expense Breakdown</h3>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="[name, category] in Object.entries(operationalByCategory)" :key="name"
                    @click="toggleCategoryExpansion(name)"
                    class="bg-white/5 rounded-lg p-4 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-medium text-white/90 flex items-center gap-2">
                            {{ name }}
                            <svg v-if="category.items.length > 3" :class="['w-4 h-4 text-white/50 transition-transform',
                                expandedCategories.has(name) ? 'rotate-180' : '']" fill="none" stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </h4>
                        <span class="text-red-400 font-bold">₱{{ (category.total || 0).toLocaleString() }}</span>
                    </div>

                    <div class="text-xs text-white/60 mb-3">
                        {{ category.count }} transaction{{ category.count !== 1 ? 's' : '' }}
                    </div>

                    <!-- Individual transactions -->
                    <div class="space-y-1" :class="expandedCategories.has(name) ? 'max-h-none' : 'max-h-24 overflow-hidden'">
                        <div v-for="expense in (expandedCategories.has(name) ? category.items : category.items.slice(0, 3))"
                            :key="expense.id" class="flex justify-between items-start text-xs gap-2">
                            <div class="flex-1 min-w-0">
                                <div class="text-white/60 truncate">{{ expense.note || 'No description' }}</div>
                                <div class="text-white/40 text-xs mt-0.5">
                                    {{ formatExpenseDate(expense.date) }}
                                </div>
                            </div>
                            <span class="text-red-300 font-medium whitespace-nowrap">₱{{
                                parseFloat(expense.amount).toLocaleString() }}</span>
                        </div>
                        <div v-if="category.items.length > 3 && !expandedCategories.has(name)"
                            class="text-xs text-white/40 text-center hover:text-white/60 transition-colors">
                            +{{ category.items.length - 3 }} more... (click to expand)
                        </div>
                        <div v-if="category.items.length > 3 && expandedCategories.has(name)"
                            class="text-xs text-white/40 text-center hover:text-white/60 transition-colors">
                            Click to collapse
                        </div>
                    </div>
                </div>
            </div>

            <!-- Total Summary with Balance Remaining -->
            <div class="mt-6 pt-4 border-t border-white/10 space-y-3">
                <div class="flex justify-between items-center">
                    <span class="text-white/80 font-medium">Total Operational Expenses:</span>
                    <span class="text-2xl font-bold text-red-400">₱{{ (currentView === 'daily' ? dailyOperationalExpenses : monthlyOperationalExpenses).toLocaleString() }}</span>
                </div>
                <div class="flex justify-between items-center pt-3 border-t border-white/10">
                    <span class="text-white font-semibold">Balance Remaining:</span>
                    <span :class="[
                        'text-2xl font-bold',
                        balanceRemaining >= 0 ? 'text-green-400' : 'text-red-400'
                    ]">
                        {{ balanceRemaining >= 0 ? '+' : '' }}₱{{ balanceRemaining.toLocaleString() }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Raw Materials Breakdown Section -->
        <div v-if="Object.keys(rawMaterialsByCategory).length > 0" class="bg-white/5 rounded-xl p-6 mb-6">
            <h3 class="text-lg font-semibold text-blue-300 mb-4">🏗️ {{ currentView === 'daily' ? 'Daily' : 'Monthly' }} Raw Materials Breakdown</h3>
            <p class="text-xs text-white/50 mb-4">Grouped by supplier/material description</p>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="[description, group] in Object.entries(rawMaterialsByCategory)" :key="description"
                    @click="toggleCategoryExpansion(description)"
                    class="bg-white/5 rounded-lg p-4 border border-blue-500/20 cursor-pointer hover:bg-white/10 transition-colors">
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-medium text-white/90 flex items-center gap-2">
                            {{ description }}
                            <svg v-if="group.items.length > 1" :class="['w-4 h-4 text-white/50 transition-transform',
                                expandedCategories.has(description) ? 'rotate-180' : '']" fill="none" stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </h4>
                        <span class="text-blue-400 font-bold">₱{{ (group.total || 0).toLocaleString() }}</span>
                    </div>

                    <div class="text-xs text-white/60 mb-3">
                        {{ group.count }} purchase{{ group.count !== 1 ? 's' : '' }}
                    </div>

                    <!-- Individual purchases with dates -->
                    <div class="space-y-1" :class="expandedCategories.has(description) ? 'max-h-none' : 'max-h-24 overflow-hidden'">
                        <div v-for="expense in (expandedCategories.has(description) ? group.items : group.items.slice(0, 3))"
                            :key="expense.id" class="flex justify-between items-center text-xs gap-2 bg-white/5 rounded px-2 py-1">
                            <div class="flex-1">
                                <div class="text-white/40">{{ formatExpenseDate(expense.date) }}</div>
                            </div>
                            <span class="text-blue-300 font-medium whitespace-nowrap">₱{{
                                parseFloat(expense.amount).toLocaleString() }}</span>
                        </div>
                        <div v-if="group.items.length > 3 && !expandedCategories.has(description)"
                            class="text-xs text-white/40 text-center hover:text-white/60 transition-colors">
                            +{{ group.items.length - 3 }} more... (click to expand)
                        </div>
                        <div v-if="group.items.length > 3 && expandedCategories.has(description)"
                            class="text-xs text-white/40 text-center hover:text-white/60 transition-colors">
                            Click to collapse
                        </div>
                    </div>
                </div>
            </div>

            <!-- Total Summary -->
            <div class="mt-6 pt-4 border-t border-blue-500/20 space-y-3">
                <div class="flex justify-between items-center">
                    <span class="text-white/80 font-medium">Total Raw Materials:</span>
                    <span class="text-2xl font-bold text-blue-400">₱{{ (currentView === 'daily' ? dailyRawMaterialsExpenses : monthlyRawMaterialsExpenses).toLocaleString() }}</span>
                </div>
            </div>
        </div>

        <!-- Transactions List -->
        <div v-if="currentView === 'daily'" class="space-y-4 pb-6">
            <template v-if="filteredDailyEntries.length > 0">
                <div v-for="entry in filteredDailyEntries" :key="entry.id || entry.note + entry.date"
                    class="bg-white/10 rounded-xl px-5 py-4 flex items-center gap-4 justify-between">
                    <!-- Category Icon (optional) -->
                    <div :class="[
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        entry.type === 'topup' ? 'bg-green-500/20' : entry.category === 'Raw Materials' ? 'bg-blue-500/20' : 'bg-red-500/20'
                    ]">
                        <span class="text-xl">{{ getCategoryIcon(entry.category) }}</span>
                    </div>
                    <!-- Transaction Details -->
                    <div class="flex-1">
                        <h4 class="font-medium flex items-center gap-2">
                            {{ entry.category || 'Uncategorized' }}
                            <span v-if="entry.category === 'Raw Materials'"
                                  class="bg-blue-600 text-xs px-2 py-0.5 rounded-full">
                                🏗️
                            </span>
                        </h4>
                        <p class="text-xs text-white/60">{{ entry.note }}</p>
                        <div class="text-xs text-gray-500">{{ entry.user_profiles?.full_name || 'Unknown User' }}</div>
                    </div>
                    <!-- Amount & Edit -->
                    <div class="flex flex-col items-end gap-2">
                        <span :class="entry.type === 'topup' ? 'text-green-400' : 'text-red-400'" class="font-semibold">
                            {{ entry.type === 'topup' ? '+' : '-' }}₱{{ entry.amount.toLocaleString() }}
                        </span>
                        <button @click="openModal(entry)" class="text-xs text-white/50 hover:text-white">✏️</button>
                    </div>
                </div>
            </template>
            <template v-else>
                <div class="text-white/40 text-sm text-center mt-8">
                    No transactions recorded for this day.
                </div>
            </template>
        </div>

        <!-- Monthly Grouped Transactions -->
        <div v-else-if="currentView === 'monthly'" class="space-y-4">
            <div v-for="day in groupedMonthly" :key="day.date" class="bg-white/5 rounded-xl p-4 space-y-3">
                <div class="flex justify-between items-start">
                    <div class="text-sm text-white/60 leading-tight">
                        {{ formatDate(day.date, 'weekday') }}<br />
                        <span class="text-xl font-bold">{{ formatDate(day.date, 'day') }}</span>
                        <span class="ml-1 text-sm">{{ formatDate(day.date, 'monthYear') }}</span>
                    </div>
                    <div class="text-red-400 text-lg font-bold whitespace-nowrap">
                        -₱{{ totalForDay(day.entries).toLocaleString() }}
                    </div>
                </div>
                <div v-for="entry in day.entries" :key="entry.id || entry.note + entry.date"
                    class="flex justify-between items-center">
                    <div class="flex-1">
                        <div class="font-medium text-sm flex items-center gap-2">
                            {{ entry.category || 'Uncategorized' }}
                            <span v-if="entry.category === 'Raw Materials'"
                                  class="bg-blue-600 text-xs px-2 py-0.5 rounded-full">
                                🏗️ RM
                            </span>
                        </div>
                        <div class="text-xs text-white/50">{{ entry.note }}</div>
                        <div class="text-xs text-gray-500">{{ entry.user_profiles?.full_name || 'Unknown User' }}</div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span :class="[
                            'text-sm font-semibold whitespace-nowrap',
                            entry.type === 'topup' ? 'text-green-400' : entry.category === 'Raw Materials' ? 'text-blue-400' : 'text-red-400'
                        ]">
                            {{ entry.type === 'topup' ? '+' : '-' }}₱{{ entry.amount.toLocaleString() }}
                        </span>
                        <button @click="openModal(entry)">✏️</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add Transaction FAB -->
        <button @click="openModal()"
            class="fixed right-6 bottom-20 z-50 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-full shadow-lg transition duration-200 active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span class="text-sm sm:text-base">Add Transaction</span>
        </button>

        <!-- Slide-Up Modal -->
        <transition name="modal-fade">
            <TransactionActions v-model="showModal" :transaction="editingEntry" :expenseCategories="expenseCategories"
                :topupCategories="topupCategories" :currentDate="selectedDate" @save="saveTransaction" @delete="deleteTransaction" />
        </transition>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import TransactionActions from '@/components/TransactionActions.vue'
import ViewAsSelector from '@/components/ViewAsSelector.vue'
import { useUserStore } from '@/stores/useUserStore'
import { format, subDays, addDays, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

const selectedDate = ref(new Date().toISOString().split('T')[0])
const currentView = ref('daily')
const selectedMonth = ref(format(new Date(), 'yyyy-MM'))
const showModal = ref(false)
const editingEntry = ref(null)

const expenses = ref([])
const topups = ref([])
const expandedCategories = ref(new Set())

const expenseCategories = [
    'Remit Cash', 'Fuel', 'Cash Advance', 'Materials', 'Toll Fees', 'Repairs & Maintenance', 'Load / Mobile', 'Transportation', 'Utilities', 'Raw Materials', 'Others'
]
const topupCategories = [
    'Scrap', 'Fund Topup', 'Others'
]

const closingBalance = computed(() =>
    topups.value.reduce((acc, r) => acc + Number(r.amount || 0), 0) -
    expenses.value.reduce((acc, e) => acc + Number(e.amount || 0), 0)
)

const pettyCashBalance = computed(() => {
    const totalIncome = topups.value.reduce((acc, r) => acc + Number(r.amount || 0), 0)
    const operationalExpensesTotal = expenses.value
        .filter(e => e.category !== 'Raw Materials')
        .reduce((acc, e) => acc + Number(e.amount || 0), 0)
    return totalIncome - operationalExpensesTotal
})

const dailyCarryOver = computed(() => {
    const selectedDay = selectedDate.value // YYYY-MM-DD string
    const prevTopups = topups.value.filter(t => t.date && t.date.slice(0, 10) < selectedDay)
    const prevExpenses = expenses.value.filter(t => t.date && t.date.slice(0, 10) < selectedDay && t.category !== 'Raw Materials')
    const prevIncome = prevTopups.reduce((sum, t) => sum + Number(t.amount || 0), 0)
    const prevOut = prevExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0)
    return prevIncome - prevOut
})

const dailyIncome = computed(() =>
    dailyCarryOver.value +
    topups.value
        .filter(t => t.date && t.date.slice(0, 10) === selectedDate.value)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
)
const dailyExpenses = computed(() =>
    expenses.value
        .filter(t => t.date && t.date.slice(0, 10) === selectedDate.value)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
)

const carryOver = computed(() => {
    const [year, month] = selectedMonth.value.split('-').map(Number)
    // Create YYYY-MM-DD string for first day of month for string comparison
    const monthStartStr = `${year}-${String(month).padStart(2, '0')}-01`
    const prevTopups = topups.value.filter(t => t.date && t.date.slice(0, 10) < monthStartStr)
    const prevExpenses = expenses.value.filter(t => t.date && t.date.slice(0, 10) < monthStartStr && t.category !== 'Raw Materials')
    const prevIncome = prevTopups.reduce((sum, t) => sum + Number(t.amount || 0), 0)
    const prevOut = prevExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0)
    return prevIncome - prevOut
})

const monthlyIncome = computed(() => {
    const selectedYM = selectedMonth.value // 'YYYY-MM'
    const thisMonthTopups = topups.value.filter(t => {
        if (!t.date) return false
        return t.date.slice(0, 7) === selectedYM
    })
    const thisMonthIncome = thisMonthTopups.reduce((sum, t) => sum + Number(t.amount || 0), 0)
    return carryOver.value + thisMonthIncome
})
const monthlyExpenses = computed(() => {
    const selectedYM = selectedMonth.value // 'YYYY-MM'
    return expenses.value
        .filter(t => {
            if (!t.date) return false
            return t.date.slice(0, 7) === selectedYM
        })
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
})

// Group expenses by category for breakdown
const expensesByCategory = computed(() => {
    let filteredExpenses = []

    if (currentView.value === 'daily') {
        filteredExpenses = expenses.value.filter(e => e.date && e.date.slice(0, 10) === selectedDate.value)
    } else {
        const selectedYM = selectedMonth.value // 'YYYY-MM'
        filteredExpenses = expenses.value.filter(e => {
            if (!e.date) return false
            return e.date.slice(0, 7) === selectedYM
        })
    }

    const categoryMap = {}
    filteredExpenses.forEach(expense => {
        const category = expense.category || 'Uncategorized'
        if (!categoryMap[category]) {
            categoryMap[category] = { total: 0, count: 0, items: [] }
        }
        categoryMap[category].total += parseFloat(expense.amount) || 0
        categoryMap[category].count += 1
        categoryMap[category].items.push(expense)
    })

    return categoryMap
})

// Balance remaining (income - operational expenses only, raw materials tracked separately)
const balanceRemaining = computed(() => {
    if (currentView.value === 'daily') {
        return dailyIncome.value - dailyOperationalExpenses.value
    } else {
        return monthlyIncome.value - monthlyOperationalExpenses.value
    }
})

// Separate operational and raw materials expenses
const dailyOperationalExpenses = computed(() =>
    expenses.value
        .filter(t => t.date && t.date.slice(0, 10) === selectedDate.value && t.category !== 'Raw Materials')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
)

const dailyRawMaterialsExpenses = computed(() =>
    expenses.value
        .filter(t => t.date && t.date.slice(0, 10) === selectedDate.value && t.category === 'Raw Materials')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
)

const monthlyOperationalExpenses = computed(() => {
    const selectedYM = selectedMonth.value // 'YYYY-MM'
    return expenses.value
        .filter(t => {
            if (!t.date || t.category === 'Raw Materials') return false
            return t.date.slice(0, 7) === selectedYM
        })
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
})

const monthlyRawMaterialsExpenses = computed(() => {
    const selectedYM = selectedMonth.value // 'YYYY-MM'
    return expenses.value
        .filter(t => {
            if (!t.date || t.category !== 'Raw Materials') return false
            return t.date.slice(0, 7) === selectedYM
        })
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
})

// Breakdown by category for operational and raw materials separately
const operationalByCategory = computed(() => {
    let filteredExpenses = []

    if (currentView.value === 'daily') {
        filteredExpenses = expenses.value.filter(e => e.date && e.date.slice(0, 10) === selectedDate.value && e.category !== 'Raw Materials')
    } else {
        const selectedYM = selectedMonth.value // 'YYYY-MM'
        filteredExpenses = expenses.value.filter(e => {
            if (!e.date || e.category === 'Raw Materials') return false
            return e.date.slice(0, 7) === selectedYM
        })
    }

    const categoryMap = {}
    filteredExpenses.forEach(expense => {
        const category = expense.category || 'Uncategorized'
        if (!categoryMap[category]) {
            categoryMap[category] = { total: 0, count: 0, items: [] }
        }
        categoryMap[category].total += parseFloat(expense.amount) || 0
        categoryMap[category].count += 1
        categoryMap[category].items.push(expense)
    })

    return categoryMap
})

const rawMaterialsByCategory = computed(() => {
    let filteredExpenses = []

    if (currentView.value === 'daily') {
        filteredExpenses = expenses.value.filter(e => e.date && e.date.slice(0, 10) === selectedDate.value && e.category === 'Raw Materials')
    } else {
        const selectedYM = selectedMonth.value // 'YYYY-MM'
        filteredExpenses = expenses.value.filter(e => {
            if (!e.date || e.category !== 'Raw Materials') return false
            return e.date.slice(0, 7) === selectedYM
        })
    }

    // Group by description/note instead of category
    const descriptionMap = {}
    filteredExpenses.forEach(expense => {
        const description = expense.note || 'No description'
        if (!descriptionMap[description]) {
            descriptionMap[description] = { total: 0, count: 0, items: [] }
        }
        descriptionMap[description].total += parseFloat(expense.amount) || 0
        descriptionMap[description].count += 1
        descriptionMap[description].items.push(expense)
    })

    return descriptionMap
})

function switchView(view) {
    currentView.value = view
    if (view === 'monthly') {
        selectedMonth.value = format(new Date(), 'yyyy-MM')
    }
}

function changeMonth(offset) {
    const [year, month] = selectedMonth.value.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    const newDate = offset > 0 ? addMonths(date, 1) : subMonths(date, 1)
    selectedMonth.value = format(newDate, 'yyyy-MM')
}

const groupedMonthly = computed(() => {
    const selectedYM = selectedMonth.value // 'YYYY-MM'
    const allEntries = [...expenses.value, ...topups.value].filter(entry => {
        if (!entry.date) return false
        // Use string comparison: check if date starts with selected month
        return entry.date.slice(0, 7) === selectedYM
    })
    const grouped = {}
    allEntries.forEach(entry => {
        const date = entry.date.slice(0, 10)
        if (!grouped[date]) grouped[date] = []
        grouped[date].push(entry)
    })
    // Sort by date descending
    return Object.entries(grouped)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, entries]) => ({ date, entries }))
})

const filteredDailyEntries = computed(() =>
    [...expenses.value, ...topups.value].filter(e => e.date && e.date.slice(0, 10) === selectedDate.value)
)

function changeDate(offset) {
    const current = new Date(selectedDate.value)
    current.setDate(current.getDate() + offset)
    selectedDate.value = current.toISOString().split('T')[0]
}

function openModal(entry = null) {
    editingEntry.value = entry || { type: 'expense' }
    showModal.value = true
}

async function fetchTransactions() {
    try {
        const isAdmin = userStore.role === 'admin' || userStore.role === 'employee_admin'
        const effectiveUserId = userStore.effectiveUserId

        // Supabase has a server-side limit of 1000 rows per request
        // We need to paginate to get all transactions
        const PAGE_SIZE = 1000
        let allData = []
        let from = 0
        let hasMore = true

        while (hasMore) {
            let query = supabase
                .from('transactions')
                .select(`
                    *,
                    user_profiles:user_id (
                        full_name,
                        role
                    )
                `)
                .order('date', { ascending: false })
                .range(from, from + PAGE_SIZE - 1)

            // If viewing as a specific user OR not admin, filter by user
            if (userStore.isViewingAsOther) {
                query = query.eq('user_id', effectiveUserId)
            } else if (!isAdmin && effectiveUserId) {
                query = query.eq('user_id', effectiveUserId)
            }

            const { data, error } = await query

            if (error) {
                console.error('[fetchTransactions] Supabase error:', error)
                return
            }

            if (!data || !Array.isArray(data) || data.length === 0) {
                hasMore = false
            } else {
                allData = allData.concat(data)
                from += PAGE_SIZE
                // If we got less than PAGE_SIZE, we've reached the end
                if (data.length < PAGE_SIZE) {
                    hasMore = false
                }
            }
        }

        // Separate by type
        expenses.value = allData.filter(entry => entry.type === 'expense')
        topups.value = allData.filter(entry => entry.type === 'topup')

        console.log('[fetchTransactions] Loaded:', {
            total: allData.length,
            expenses: expenses.value.length,
            topups: topups.value.length,
        })
    } catch (err) {
        console.error('[fetchTransactions] Unexpected error:', err)
    }
}

async function saveTransaction(entry) {
    try {
        const userId = userStore.user?.id
        if (!userId) {
            console.error('[saveTransaction] No user ID found.')
            return
        }
        // Clean payload
        const payload = {
            ...entry,
            user_id: userId,
        }
        delete payload.user_profiles
        let result
        const isEditMode = editingEntry.value && editingEntry.value.id
        if (isEditMode) {
            result = await supabase
                .from('transactions')
                .update(payload)
                .eq('id', editingEntry.value.id)
        } else {
            result = await supabase
                .from('transactions')
                .insert(payload)
        }
        if (result.error) {
            console.error('[saveTransaction] Supabase error:', result.error.message)
            return
        }
        editingEntry.value = null
        showModal.value = false
        await fetchTransactions()
    } catch (err) {
        console.error('[saveTransaction] Unexpected error:', err)
    }
}

async function deleteTransaction(entry) {
    if (entry.id) {
        await supabase.from('transactions').delete().eq('id', entry.id)
        await fetchTransactions()
    }
    editingEntry.value = null
    showModal.value = false
}

function formatDate(dateStr, part = 'full') {
    const date = new Date(dateStr)
    const opts = {
        weekday: { weekday: 'long' },
        day: { day: '2-digit' },
        monthYear: { month: 'long', year: 'numeric' },
        full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    }
    return date.toLocaleDateString('en-US', opts[part] || {})
}

function formatMonthYear(ym) {
    const [year, month] = ym.split('-').map(Number)
    return format(new Date(year, month - 1, 1), 'MMMM yyyy')
}

function getCategoryIcon(category) {
    // You can expand this mapping as needed
    const icons = {
        'Food & Drinks': '🍔',
        'Salary': '💰',
        'Transportation': '🚗',
        'Remit Cash': '💸',
        'Fuel': '⛽',
        'Cash Advance': '💳',
        'Materials': '📦',
        'Toll Fees': '🛣️',
        'Repairs & Maintenance': '🛠️',
        'Load / Mobile': '📱',
        'Utilities': '💡',
        'Scrap': '♻️',
        'Fund Topup': '🏦',
        'Raw Materials': '🏗️',
        'Others': '📝',
        'Uncategorized': '❓'
    }
    return icons[category] || '💵'
}

function totalForDay(entries) {
    return entries
        .filter(e => e.type === 'expense')
        .reduce((sum, e) => sum + Number(e.amount || 0), 0)
}

function toggleCategoryExpansion(categoryName) {
    const expanded = expandedCategories.value
    if (expanded.has(categoryName)) {
        expanded.delete(categoryName)
    } else {
        expanded.add(categoryName)
    }
    expandedCategories.value = new Set(expanded)
}

function formatExpenseDate(dateStr) {
    if (!dateStr) return 'Unknown date'

    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
        return 'Today'
    }

    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday'
    }

    // Check if it's within this week (Sunday to Saturday)
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())

    if (date >= startOfWeek && date < today) {
        return date.toLocaleDateString('en-US', { weekday: 'long' })
    }

    // For older dates, show month and day
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

onMounted(() => {
    fetchTransactions()
})
</script>

<style>
/* Background opacity fade */
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}
</style>