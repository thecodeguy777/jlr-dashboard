<template>
    <div class="min-h-screen text-white p-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
                <h1 class="text-3xl font-bold text-white">🏦 Company Loans</h1>
                <p class="text-white/60 mt-2">Manage employee loans and payment tracking</p>
            </div>
            <div class="flex gap-4">
                <div class="bg-white/10 rounded-lg px-4 py-2">
                    <span class="text-white/60 text-sm">Total Outstanding:</span>
                    <span class="text-red-400 font-bold text-lg ml-2">₱{{ totalOutstanding.toLocaleString() }}</span>
                </div>
                <div class="bg-white/10 rounded-lg px-4 py-2">
                    <span class="text-white/60 text-sm">Total Paid:</span>
                    <span class="text-green-400 font-bold text-lg ml-2">₱{{ totalPaid.toLocaleString() }}</span>
                </div>
            </div>
        </div>

        <!-- Filter Controls -->
        <div class="bg-white/5 rounded-xl p-4 mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center gap-4">
                <div class="relative flex-1">
                    <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" fill="none"
                        stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <input v-model="searchQuery" type="text" placeholder="Search employees..."
                        class="pl-10 pr-4 py-2 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-full" />
                </div>

                <div class="flex gap-2">
                    <button v-for="filter in loanFilters" :key="filter.key" @click="activeFilter = filter.key" :class="[
                        'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        activeFilter === filter.key
                            ? 'bg-blue-600 text-white shadow-lg'
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
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p>Loading employees and loan data...</p>
            </div>
        </div>

        <!-- Employee Loan Cards -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div v-for="employee in filteredEmployees" :key="employee.id" @click="openLoanModal(employee)"
                class="bg-white/10 rounded-xl p-6 border border-white/10 hover:border-blue-500/50 transition-all cursor-pointer group hover:bg-white/15">

                <!-- Employee Info -->
                <div class="flex items-center gap-3 mb-4">
                    <div
                        class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {{ employee.name.charAt(0) }}
                    </div>
                    <div class="flex-1">
                        <h3 class="font-semibold text-white group-hover:text-blue-300 transition-colors">{{
                            employee.name }}</h3>
                        <p class="text-white/60 text-sm">{{ employee.position }}</p>
                    </div>
                    <div class="text-right">
                        <span :class="[
                            'text-xs px-2 py-1 rounded-full font-medium',
                            employee.activeLoans.length > 0
                                ? 'bg-orange-500/20 text-orange-300'
                                : 'bg-green-500/20 text-green-300'
                        ]">
                            {{ employee.activeLoans.length > 0 ? `${employee.activeLoans.length} Active` : 'No Loans' }}
                        </span>
                    </div>
                </div>

                <!-- Loan Summary -->
                <div v-if="employee.activeLoans.length > 0" class="space-y-3">
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-white/60 block">Outstanding:</span>
                            <span class="text-red-400 font-bold">₱{{ employee.totalOutstanding.toLocaleString()
                                }}</span>
                        </div>
                        <div>
                            <span class="text-white/60 block">Paid:</span>
                            <span class="text-green-400 font-bold">₱{{ employee.totalPaid.toLocaleString() }}</span>
                        </div>
                    </div>

                    <!-- Progress Bar -->
                    <div class="space-y-2">
                        <div class="flex justify-between text-xs text-white/60">
                            <span>Payment Progress</span>
                            <span>{{ Math.round(Math.max(0, employee.paymentProgress)) }}%</span>
                        </div>
                        <div class="w-full bg-white/10 rounded-full h-2">
                            <div class="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                                :style="{ width: `${Math.max(0, employee.paymentProgress)}%` }"></div>
                        </div>
                    </div>

                    <!-- Active Loans List -->
                    <div class="space-y-2">
                        <h4 class="text-xs text-white/60 font-medium">Active Loans:</h4>
                        <div v-for="loan in employee.activeLoans" :key="loan.id"
                            class="flex justify-between items-center bg-white/5 rounded-lg p-2">
                            <div>
                                <span class="text-white text-sm font-medium">₱{{ loan.amount.toLocaleString() }}</span>
                                <span class="text-white/60 text-xs ml-2">{{ loan.remarks || 'Loan' }}</span>
                            </div>
                            <span class="text-white/60 text-xs">{{ formatDate(loan.start_date) }}</span>
                        </div>
                    </div>
                </div>

                <!-- No Loans State -->
                <div v-else class="text-center py-4">
                    <div class="text-white/40 text-sm mb-2">No active loans</div>
                    <div class="text-blue-400 text-xs group-hover:text-blue-300 transition-colors">
                        Click to apply for a loan
                    </div>
                </div>

                <!-- Action Hint -->
                <div class="mt-4 pt-3 border-t border-white/10">
                    <div
                        class="flex items-center justify-center text-white/60 group-hover:text-blue-400 transition-colors text-sm">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        {{ employee.activeLoans.length > 0 ? 'Apply for new loan' : 'Apply for loan' }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Loan Application Modal -->
        <div v-if="showLoanModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div class="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <!-- Modal Header -->
                <div class="flex justify-between items-center p-6 border-b border-white/10">
                    <div>
                        <h2 class="text-xl font-bold text-white">New Loan Application</h2>
                        <p class="text-white/60 text-sm mt-1">{{ selectedEmployee?.name }}</p>
                    </div>
                    <button @click="closeLoanModal" class="text-white/60 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="p-6 space-y-6">
                    <!-- Loan Type -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-3">Loan Type</label>
                        <div class="grid grid-cols-2 gap-3">
                            <button v-for="type in loanTypes" :key="type" @click="loanForm.type = type" :class="[
                                'p-3 rounded-lg text-sm font-medium transition-all border',
                                loanForm.type === type
                                    ? 'bg-blue-600 text-white border-blue-500'
                                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:border-white/20'
                            ]">
                                {{ type }}
                            </button>
                        </div>
                    </div>

                    <!-- Loan Amount -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-2">Loan Amount</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">₱</span>
                            <input v-model="loanForm.amount" type="number" step="100" min="1000" max="100000"
                                class="pl-8 pr-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-full"
                                placeholder="0.00" />
                        </div>
                        <p class="text-white/40 text-xs mt-2">Minimum: ₱1,000 | Maximum: ₱100,000</p>
                    </div>

                    <!-- Payment Terms (Fixed) -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-2">Payment Terms</label>
                        <div class="w-full px-4 py-3 bg-white/5 text-white rounded-lg border border-white/10">
                            <span class="text-white/90">8 weeks (Fixed)</span>
                            <span class="text-white/60 text-sm ml-2">• 1% interest per week</span>
                        </div>
                        <p class="text-white/40 text-xs mt-2">All company loans have standardized 8-week payment terms
                            at 1% interest per week (8% total)</p>
                    </div>

                    <!-- Purpose -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-2">Purpose</label>
                        <textarea v-model="loanForm.purpose" rows="3"
                            class="w-full px-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                            placeholder="Briefly describe the purpose of this loan..."></textarea>
                    </div>

                    <!-- Loan Summary -->
                    <div v-if="loanForm.amount" class="bg-white/5 rounded-lg p-4 border border-white/10">
                        <h4 class="text-white font-medium mb-3">Loan Summary</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-white/60">Principal Amount:</span>
                                <span class="text-white">₱{{ parseFloat(loanForm.amount || 0).toLocaleString() }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-white/60">Interest Rate:</span>
                                <span class="text-white">1% per week (8% total)</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-white/60">Payment Period:</span>
                                <span class="text-white">8 weeks</span>
                            </div>
                            <div class="flex justify-between border-t border-white/10 pt-2 font-medium">
                                <span class="text-white/80">Weekly Payment:</span>
                                <span class="text-green-400">₱{{ calculateWeeklyPayment().toLocaleString() }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-white/80">Total Amount:</span>
                                <span class="text-white">₱{{ calculateTotalAmount().toLocaleString() }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="flex gap-3 p-6 border-t border-white/10">
                    <button @click="closeLoanModal"
                        class="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium">
                        Cancel
                    </button>
                    <button @click="submitLoanApplication" :disabled="!canSubmitLoan" :class="[
                        'flex-1 px-4 py-3 rounded-lg font-medium transition-all',
                        canSubmitLoan
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                            : 'bg-white/10 text-white/40 cursor-not-allowed'
                    ]">
                        Submit Application
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
const showLoanModal = ref(false)
const selectedEmployee = ref(null)

// Loan form
const loanForm = ref({
    type: 'Personal',
    amount: '',
    purpose: ''
})

// Loan types
const loanTypes = ['Personal', 'Emergency', 'Educational', 'Medical']

// Real data from Supabase
const employees = ref([])
const loading = ref(true)

// Computed properties
const processedEmployees = computed(() => {
    return employees.value.map(employee => {
        const totalOutstanding = employee.activeLoans.reduce((sum, loan) => sum + (loan.balance || 0), 0)
        const totalPaid = employee.activeLoans.reduce((sum, loan) => sum + (loan.amount - loan.balance), 0)
        const totalLoanAmount = employee.activeLoans.reduce((sum, loan) => sum + (loan.amount || 0), 0)
        const paymentProgress = totalLoanAmount > 0 ? (totalPaid / totalLoanAmount) * 100 : 0

        return {
            ...employee,
            totalOutstanding,
            totalPaid,
            paymentProgress
        }
    })
})

const loanFilters = computed(() => [
    { key: 'all', label: 'All Employees', count: processedEmployees.value.length },
    { key: 'active', label: 'Active Loans', count: processedEmployees.value.filter(e => e.activeLoans.length > 0).length },
    { key: 'no-loans', label: 'No Loans', count: processedEmployees.value.filter(e => e.activeLoans.length === 0).length }
])

const filteredEmployees = computed(() => {
    let filtered = processedEmployees.value

    // Apply search filter
    if (searchQuery.value) {
        filtered = filtered.filter(employee =>
            employee.name.toLowerCase().includes(searchQuery.value.toLowerCase())
        )
    }

    // Apply loan status filter
    if (activeFilter.value === 'active') {
        filtered = filtered.filter(employee => employee.activeLoans.length > 0)
    } else if (activeFilter.value === 'no-loans') {
        filtered = filtered.filter(employee => employee.activeLoans.length === 0)
    }

    return filtered
})

const totalOutstanding = computed(() => {
    return processedEmployees.value.reduce((sum, employee) => sum + employee.totalOutstanding, 0)
})

const totalPaid = computed(() => {
    return processedEmployees.value.reduce((sum, employee) => sum + employee.totalPaid, 0)
})

const canSubmitLoan = computed(() => {
    return loanForm.value.type &&
        loanForm.value.amount &&
        loanForm.value.purpose &&
        parseFloat(loanForm.value.amount) >= 1000 &&
        parseFloat(loanForm.value.amount) <= 100000
})

// Methods
function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function openLoanModal(employee) {
    selectedEmployee.value = employee
    showLoanModal.value = true
    // Reset form
    loanForm.value = {
        type: 'Personal',
        amount: '',
        purpose: ''
    }
}

function closeLoanModal() {
    showLoanModal.value = false
    selectedEmployee.value = null
}

function calculateWeeklyPayment() {
    if (!loanForm.value.amount) return 0

    const principal = parseFloat(loanForm.value.amount)
    const totalInterest = principal * 0.08 // 1% per week × 8 weeks = 8% total
    const totalAmount = principal + totalInterest

    return Math.round(totalAmount / 8) // 8 weeks
}

function calculateTotalAmount() {
    if (!loanForm.value.amount) return 0

    const principal = parseFloat(loanForm.value.amount)
    const totalInterest = principal * 0.08 // 1% per week × 8 weeks = 8% total

    return Math.round(principal + totalInterest)
}

async function submitLoanApplication() {
    if (!canSubmitLoan.value) return

    try {
        const loanAmount = parseFloat(loanForm.value.amount)

        // Calculate total amount including interest
        const totalWithInterest = calculateTotalAmount()

        // Insert new loan into database
        const { data, error } = await supabase
            .from('loans')
            .insert({
                worker_id: selectedEmployee.value.id,
                amount: totalWithInterest, // Total amount to be repaid (including interest)
                balance: totalWithInterest, // Current remaining balance
                status: 'active',
                start_date: new Date().toISOString().split('T')[0],
                remarks: `${loanForm.value.type} - ${loanForm.value.purpose} (Principal: ₱${loanAmount.toLocaleString()})`
            })
            .select()

        if (error) {
            console.error('Error submitting loan:', error)
            alert('Error submitting loan application. Please try again.')
            return
        }

        // Add to local state immediately for UI update
        const newLoan = {
            id: data[0].id,
            worker_id: selectedEmployee.value.id,
            amount: totalWithInterest,
            balance: totalWithInterest,
            start_date: new Date().toISOString().split('T')[0],
            status: 'active',
            remarks: `${loanForm.value.type} - ${loanForm.value.purpose} (Principal: ₱${loanAmount.toLocaleString()})`
        }

        selectedEmployee.value.activeLoans.push(newLoan)

        alert('Loan application submitted successfully!')
        closeLoanModal()

        // Refresh data to get updated totals
        await fetchEmployeesAndLoans()

    } catch (error) {
        console.error('Error submitting loan application:', error)
        alert('Error submitting loan application. Please try again.')
    }
}

// Data fetching functions
async function fetchEmployeesAndLoans() {
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

        // Fetch all active loans
        const { data: loans, error: loansError } = await supabase
            .from('loans')
            .select('*')
            .eq('status', 'active')
            .order('start_date', { ascending: false })

        if (loansError) {
            console.error('Error fetching loans:', loansError)
            return
        }

        // Group loans by worker
        const loansByWorker = {}
        loans?.forEach(loan => {
            if (!loansByWorker[loan.worker_id]) {
                loansByWorker[loan.worker_id] = []
            }
            loansByWorker[loan.worker_id].push(loan)
        })

        // Combine workers with their loans
        employees.value = workers?.map(worker => ({
            ...worker,
            position: 'RenewCo Employee', // Hardcoded position
            activeLoans: loansByWorker[worker.id] || []
        })) || []

    } catch (error) {
        console.error('Error fetching data:', error)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    console.log('Company Loans page loaded')
    fetchEmployeesAndLoans()
})
</script>

<style scoped>
/* Custom Scrollbar Styling */
:deep(*) {
    /* Webkit browsers (Chrome, Safari, Edge) */
    scrollbar-width: thin;
    scrollbar-color: rgba(59, 130, 246, 0.5) rgba(255, 255, 255, 0.1);
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
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.6), rgba(147, 51, 234, 0.6));
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(*::-webkit-scrollbar-thumb:hover) {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(147, 51, 234, 0.8));
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