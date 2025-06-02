<template>
    <div class="min-h-screen bg-gray-900 text-white p-6 pb-32">
        <!-- Top Total Balance -->
        <div class="mb-6">
            <h1 class="text-3xl font-bold">₱{{ closingBalance.toLocaleString() }}</h1>
            <p class="text-sm text-white/60">Total balance</p>
        </div>




        <!-- View Tabs -->

        <div class="mb-4 flex space-x-2">
            <button v-for="option in ['Daily', 'Monthly']" :key="option" @click="currentView = option.toLowerCase()"
                :class="[
                    'px-4 py-1 rounded-full text-sm font-medium transition',
                    currentView === option.toLowerCase()
                        ? 'bg-green-500 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                ]">
                {{ option }}
            </button>
        </div>
        <!-- Daily Date Selector with Controls -->
        <!-- Enhanced Daily Date Selector -->
        <div v-if="currentView === 'daily'"
            class="mb-6 flex items-center justify-center gap-3 bg-gray-900 p-4 rounded-lg shadow-md">
            <button @click="changeDate(-1)"
                class="flex items-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition">
                ⏪ Prev
            </button>


            <button @click="resetToToday"
                class="flex items-center px-3 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-md transition">
                📅 Today
            </button>

            <button @click="changeDate(1)"
                class="flex items-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition">
                Next ⏩
            </button>
        </div>
        <!-- Current Date Display -->
        <div v-if="currentView === 'daily'" class="text-center text-lg font-semibold text-white/80 mb-4">
            Viewing: {{ formatDate(selectedDate, 'full') }}
        </div>


        <!-- Report This Month Title -->
        <div class="mb-2">
            <h2 class="text-lg font-semibold">📊 Report for {{ currentView }}</h2>
        </div>

        <!-- Monthly Report -->


        <div v-if="currentView === 'monthly'" class="space-y-4">

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

                <div v-for="entry in day.entries" :key="entry.note + entry.date"
                    class="flex justify-between items-center">
                    <div>
                        <div class="font-medium text-sm">{{ entry.category || 'Uncategorized' }}</div>
                        <div class="text-xs text-white/50">{{ entry.note }}</div>
                        <div class="text-xs text-gray-500">
                            {{ entry.user_profiles?.full_name || 'Unknown User' }}
                        </div>
                    </div>

                    <div class="flex items-center space-x-2">
                        <span :class="[
                            'text-sm font-semibold whitespace-nowrap',
                            entry.type === 'topup' ? 'text-green-400' : 'text-red-400'
                        ]">
                            {{ entry.type === 'topup' ? '+' : '-' }}₱{{ entry.amount.toLocaleString() }}
                        </span>
                        <button @click="openModal(entry)">
                            ✏️
                        </button>

                    </div>
                </div>

            </div>
        </div>

        <!-- Daily Report -->
        <div v-else class="space-y-4 pb-6">
            <template v-if="filteredDailyEntries.length > 0">
                <div v-for="entry in filteredDailyEntries" :key="entry.note + entry.date"
                    class="bg-white/5 rounded-xl px-5 py-4 flex justify-between items-center">
                    <!-- Left: Category + Note -->
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-medium text-sm">
                                {{ entry.category || 'Uncategorized' }}
                            </span>
                            <span class="px-2 py-0.5 text-xs rounded-full bg-green-700 text-white font-medium">
                                {{ entry.user_profiles?.full_name || 'Unknown' }}
                            </span>
                        </div>
                        <div class="text-xs text-white/50">{{ entry.note }}</div>


                    </div>

                    <!-- Right: Amount + Actions -->
                    <div class="flex items-center gap-4 text-sm whitespace-nowrap">
                        <span :class="entry.type === 'topup' ? 'text-green-400' : 'text-red-400'" class="font-semibold">
                            {{ entry.type === 'topup' ? '+' : '-' }}₱{{ entry.amount.toLocaleString() }}
                        </span>
                        <button @click="openModal(entry)" class="text-xs text-white/50 hover:text-white">
                            ✏️
                        </button>

                    </div>
                </div>
            </template>

            <template v-else>
                <div class="text-white/40 text-sm text-center mt-8">
                    No transactions recorded for this day.
                </div>
            </template>
        </div>






        <!-- Modal Trigger -->
        <button @click="openModal()"
            class="fixed right-6 bottom-20 z-50 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-full shadow-lg transition duration-200 active:scale-95">
            <Plus class="w-5 h-5 text-white" />
            <span class="text-sm sm:text-base">Add Transaction</span>
        </button>


        <!-- Slide-Up Modal -->
        <transition name="modal-fade">
            <TransactionAction v-model="showModal" :transaction="editingEntry" :expenseCategories="expenseCategories"
                :topupCategories="topupCategories" @save="saveTransaction" @delete="deleteTransaction" />



        </transition>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { Plus } from 'lucide-vue-next'
import TransactionAction from '@/components/TransactionActions.vue'
import { useUserStore } from '@/stores/useUserStore'

const userStore = useUserStore()

const selectedDate = ref(new Date().toISOString().split('T')[0])
const currentView = ref('daily')
const showModal = ref(false)
const editingEntry = ref(null)

const expenses = ref([])
const topups = ref([])

const expenseCategories = [
    'Remit Cash', 'Fuel', 'Cash Advance', 'Materials', 'Toll Fees', 'Repairs & Maintenance', 'Load / Mobile', 'Transportation', 'Utilities', 'Others'
]

const topupCategories = [
    'Scrap', 'Fund Topup', 'Others'
]




const closingBalance = computed(() =>
    topups.value.reduce((acc, r) => acc + Number(r.amount || 0), 0) -
    expenses.value.reduce((acc, e) => acc + Number(e.amount || 0), 0)
)

const groupedMonthly = computed(() => {
    const grouped = {}
    const allEntries = [...expenses.value, ...topups.value]
    allEntries.forEach(entry => {
        const date = entry.date || 'Unknown Date'
        if (!grouped[date]) grouped[date] = []
        grouped[date].push(entry)
    })
    return Object.entries(grouped).map(([date, entries]) => ({ date, entries }))
})

const filteredDailyEntries = computed(() =>
    [...expenses.value, ...topups.value].filter(e => e.date === selectedDate.value)
)
function resetToToday() {
    selectedDate.value = new Date().toISOString().split('T')[0]
}

function changeDate(offset) {
    const current = new Date(selectedDate.value)
    current.setDate(current.getDate() + offset)
    selectedDate.value = current.toISOString().split('T')[0]
}

function openModal(entry = null) {
    editingEntry.value = entry || { type: 'expense' } // fallback to expense if new
    showModal.value = true
}


async function fetchTransactions() {
    try {
        const isAdmin = userStore.role === 'admin'
        const userId = userStore.user?.id

        // Base query with join
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


        // Restrict to current user if not admin
        if (!isAdmin && userId) {
            query = query.eq('user_id', userId)
        }

        const { data, error } = await query

        if (error) {
            console.error('[fetchTransactions] Supabase error:', error)
            return
        }

        if (!data || !Array.isArray(data)) {
            console.warn('[fetchTransactions] No valid data returned')
            return
        }

        // Separate by type
        expenses.value = data.filter(entry => entry.type === 'expense')
        topups.value = data.filter(entry => entry.type === 'topup')

        console.log('[fetchTransactions] Loaded:', {
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

        console.log('[saveTransaction] Payload:', payload)

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


function totalForDay(entries) {
    return entries
        .filter(e => e.type === 'expense')
        .reduce((sum, e) => sum + Number(e.amount || 0), 0)
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

/* Modal slide-up only */
.modal-slide-enter-active,
.modal-slide-leave-active {
    transition: transform 0.3s ease;
}

.modal-slide-enter-from,
.modal-slide-leave-to {
    transform: translateY(100%);
}

.slide-up-enter-active,
.slide-up-leave-active {
    transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(100%);
    opacity: 0;
}
</style>
