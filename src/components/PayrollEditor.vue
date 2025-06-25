<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

const props = defineProps({
    worker: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['close', 'save'])

// Keep track of initial data for comparison
const initialData = {
    savings: Number(props.worker?.savings || 0),
    gross_income: Number(props.worker?.gross || 0),
    hours: {
        inhouse: Number(props.worker?.regular_hours || 0),
        assistant: Number(props.worker?.assistant_hours || 0)
    },
    rates: {
        inhouse: Number(props.worker?.regular_rate || 56.25),
        assistant: Number(props.worker?.assistant_rate || 75.00)
    },
    paid_by_hours: {
        regular: typeof props.worker?.paid_by_hours === 'number'
            ? Number(props.worker.paid_by_hours)
            : Number(props.worker?.paid_by_hours?.regular || 0),
        assistant: typeof props.worker?.paid_by_hours === 'number'
            ? 0
            : Number(props.worker?.paid_by_hours?.assistant || 0)
    },
    deductions: {
        contributions: props.worker?.deductions?.sss === 245 ? 245 : 0,
        loan: Number(props.worker?.deductions?.loan || 0),
        cash_advance: Number(props.worker?.deductions?.cash_advance || 0)
    },
    allowances: {
        general: Number(props.worker?.allowances?.general || 0),
        transport: Number(props.worker?.allowances?.transport || 0),
        meal: Number(props.worker?.allowances?.meal || 0)
    },
    commissions: {
        bonus: Number(props.worker?.commissions?.bonus || 0),
        overtime: Number(props.worker?.commissions?.overtime || 0),
        holiday: Number(props.worker?.commissions?.holiday || 0)
    }
}

// State management
const payrollData = ref({ ...initialData })

console.log('\n=== PayrollEditor Initialization ===')
console.log('Props received:', {
    name: props.worker?.name,
    regular_hours: props.worker?.regular_hours,
    assistant_hours: props.worker?.assistant_hours,
    regular_rate: props.worker?.regular_rate,
    assistant_rate: props.worker?.assistant_rate,
    paid_by_hours: props.worker?.paid_by_hours
})
console.log('Initial payrollData:', {
    hours: payrollData.value.hours,
    rates: payrollData.value.rates,
    paid_by_hours: payrollData.value.paid_by_hours
})

const activeSection = ref('hours') // ['hours', 'deductions', 'additions', 'history']
const showHistoryPanel = ref(false)
const hasUnsavedChanges = ref(false)
const isSaving = ref(false)

// Replace mock history data with real data
const payrollHistory = ref([])
const isLoadingHistory = ref(false)

// Add refs for suggested deductions
const suggestedDeductions = ref({
    sss: 0,
    loan: 0,
    savings: 0
})

// Replace both refs with a single one
const showBreakdown = ref(false)

// Initialize immediately when component mounts
onMounted(async () => {
    console.log('Component mounted, initializing with worker:', props.worker)
    if (props.worker) {
        await initializeDeductions()
    }
})

// Function to initialize deductions
async function initializeDeductions() {
    console.log('Initializing deductions for worker:', {
        id: props.worker.employee_id,
        loan_balance: props.worker.loan_balance,
        total_savings: props.worker.total_savings
    })

    try {
        // Get most recent payout for deductions
        const { data: lastPayout, error: payoutError } = await supabase
            .from('payouts')
            .select('deductions')
            .eq('employee_id', props.worker.employee_id)
            .order('week_start', { ascending: false })
            .limit(1)
            .single()

        console.log('Last payout found:', lastPayout)

        if (payoutError) {
            console.error('Error fetching last payout:', payoutError)
        }

        // Set deductions from last payout's JSONB
        if (lastPayout?.deductions) {
            // Set SSS
            if (lastPayout.deductions.sss) {
                suggestedDeductions.value.sss = lastPayout.deductions.sss
                payrollData.value.deductions.contributions = lastPayout.deductions.sss
                console.log('Set SSS to:', lastPayout.deductions.sss)
            }

            // Set previous loan deduction if it exists
            if (lastPayout.deductions.loan) {
                suggestedDeductions.value.loan = lastPayout.deductions.loan
                console.log('Found previous loan deduction:', lastPayout.deductions.loan)
            }
        }

        // If no previous loan deduction or there's a loan balance, calculate new suggestion
        if (props.worker.loan_balance > 0) {
            const { data: loanData, error: loanError } = await supabase
                .from('loans')
                .select('amount, balance')
                .eq('worker_id', props.worker.employee_id)
                .eq('status', 'active')
                .order('start_date', { ascending: false })
                .limit(1)
                .single()

            console.log('Found loan data:', loanData)

            if (loanError) {
                console.error('Error fetching loan data:', loanError)
            }

            if (loanData?.amount) {
                const suggestedLoan = Math.round(loanData.amount / 8)
                suggestedDeductions.value.loan = suggestedLoan
                // Automatically set the loan deduction
                payrollData.value.deductions.loan = suggestedLoan
                console.log('Set loan deduction to:', suggestedLoan)
            }
        }

        // Get most recent savings amount
        const { data: lastSavings, error: savingsError } = await supabase
            .from('savings')
            .select('amount')
            .eq('worker_id', props.worker.employee_id)
            .eq('type', 'auto')
            .order('week_start', { ascending: false })
            .limit(1)
            .single()

        console.log('Last savings found:', lastSavings)

        if (savingsError) {
            console.error('Error fetching savings:', savingsError)
        }

        // Set savings from savings table
        if (lastSavings?.amount) {
            suggestedDeductions.value.savings = lastSavings.amount
            payrollData.value.savings = lastSavings.amount
            console.log('Set savings to:', lastSavings.amount)
        }

        // Initialize cash advance to 0 since it's per-payout
        payrollData.value.deductions.cash_advance = 0

        console.log('Final suggested deductions:', suggestedDeductions.value)
        console.log('Final payroll data:', payrollData.value)
    } catch (error) {
        console.error('Error initializing deductions:', error)
    }
}

// Watch for worker changes
watch(() => props.worker?.employee_id, async (newId, oldId) => {
    console.log('Worker ID changed:', { newId, oldId })
    if (newId && newId !== oldId) {
        await initializeDeductions()
    }
})

// Watch for changes and compare with initial data
watch(payrollData, (newData) => {
    hasUnsavedChanges.value = JSON.stringify(newData) !== JSON.stringify(initialData)
}, { deep: true })

// Watch for hours changes to update paid_by_hours
watch(() => [payrollData.value.hours.inhouse, payrollData.value.hours.assistant], ([newInhouse, newAssistant]) => {
    const newPaidByHours = {
        regular: Number(newInhouse || 0) * Number(payrollData.value.rates.inhouse),
        assistant: Number(newAssistant || 0) * Number(payrollData.value.rates.assistant)
    }
    console.log('Hours changed, updating paid_by_hours:', {
        hours: { inhouse: newInhouse, assistant: newAssistant },
        rates: payrollData.value.rates,
        newPaidByHours
    })
    payrollData.value.paid_by_hours = newPaidByHours
}, { deep: true })

// Watch for worker changes to refetch data
watch(() => props.worker, async (newWorker, oldWorker) => {
    if (newWorker?.employee_id !== oldWorker?.employee_id) {
        console.log('Worker changed, refetching historical deductions')
        await fetchHistoricalDeductions()
    }
}, { immediate: true, deep: true })

// Computed properties for derived values
const totalHourlyPay = computed(() => {
    const total = Number(payrollData.value.paid_by_hours.regular || 0) +
        Number(payrollData.value.paid_by_hours.assistant || 0)
    console.log('Calculating totalHourlyPay:', {
        paid_by_hours: payrollData.value.paid_by_hours,
        total
    })
    return total
})

const totalDeductions = computed(() => {
    return Object.values(payrollData.value.deductions).reduce((sum, val) => sum + (Number(val) || 0), 0) +
        Number(payrollData.value.savings || 0)
})

const totalAdditions = computed(() => {
    return Object.values(payrollData.value.allowances).reduce((sum, val) => sum + (Number(val) || 0), 0) +
        Object.values(payrollData.value.commissions).reduce((sum, val) => sum + (Number(val) || 0), 0)
})

const netPay = computed(() => {
    return (Number(payrollData.value.gross_income) || 0) +
        totalHourlyPay.value +
        totalAdditions.value -
        totalDeductions.value
})

const hourlyTotals = computed(() => {
    const totals = {
        inhouse: {
            hours: Number(payrollData.value.hours.inhouse || 0),
            rate: Number(payrollData.value.rates.inhouse),
            amount: Number(payrollData.value.paid_by_hours.regular || 0)
        },
        assistant: {
            hours: Number(payrollData.value.hours.assistant || 0),
            rate: Number(payrollData.value.rates.assistant),
            amount: Number(payrollData.value.paid_by_hours.assistant || 0)
        }
    }
    console.log('Calculating hourlyTotals:', totals)
    return totals
})

const totalHours = computed(() => {
    const total = Number(payrollData.value.hours.inhouse || 0) +
        Number(payrollData.value.hours.assistant || 0)
    console.log('Calculating totalHours:', {
        inhouse: payrollData.value.hours.inhouse,
        assistant: payrollData.value.hours.assistant,
        total
    })
    return total
})

const payrollSummary = computed(() => ({
    grossIncome: grossPayCalculation.value.netMovement.value,  // Use stock movement as gross
    hourlyPay: totalHourlyPay.value,
    additions: totalAdditions.value,
    deductions: totalDeductions.value,
    netPay: grossPayCalculation.value.netMovement.value + // Gross from stock
        totalHourlyPay.value +                        // Hours pay
        totalAdditions.value -                        // Allowances & commissions
        totalDeductions.value,                        // Deductions & savings
    totalHours: totalHours.value,
    savingsToDate: props.worker?.total_savings || 0,
    loanBalance: props.worker?.loan_balance || 0,
}))

const deliverySummary = computed(() => {
    const summary = {
        previous: {
            total: 0,
            totalValue: 0,
            items: [],
            byCategory: {}
        },
        delivered: {
            total: 0,
            totalValue: 0,
            items: [],
            byCategory: {}
        },
        current: {
            total: 0,
            totalValue: 0,
            items: [],
            byCategory: {}
        }
    }

    // Process previous stock
    if (props.worker?.previous_stock) {
        Object.entries(props.worker.previous_stock).forEach(([category, products]) => {
            if (!summary.previous.byCategory[category]) {
                summary.previous.byCategory[category] = {
                    total: 0,
                    totalValue: 0,
                    items: []
                }
            }

            Object.entries(products).forEach(([name, data]) => {
                console.log('\n=== Price Debug for ' + name + ' ===')
                console.log('Raw data:', data)
                console.log('price_snapshot:', data.price_snapshot)
                console.log('data keys available:', Object.keys(data))

                // Price is stored directly in the stock record
                const price = Number(data.price_snapshot || 0)
                const quantity = Number(data.quantity || 0)
                const value = quantity * price

                console.log('Final calculated values:', {
                    price,
                    quantity,
                    value
                })

                const item = {
                    name,
                    quantity,
                    price,
                    value
                }

                summary.previous.items.push(item)
                summary.previous.byCategory[category].items.push(item)
                summary.previous.byCategory[category].total += quantity
                summary.previous.byCategory[category].totalValue += value
                summary.previous.total += quantity
                summary.previous.totalValue += value
            })
        })
    }

    // Process current stock
    if (props.worker?.current_stock) {
        Object.entries(props.worker.current_stock).forEach(([category, products]) => {
            if (!summary.current.byCategory[category]) {
                summary.current.byCategory[category] = {
                    total: 0,
                    totalValue: 0,
                    items: []
                }
            }

            Object.entries(products).forEach(([name, data]) => {
                const productData = data.products || {}
                const price = Number(data.price_snapshot || productData.price_per_unit || 0)
                const quantity = Number(data.quantity || 0)
                const value = quantity * price

                const item = {
                    name,
                    quantity,
                    price,
                    value
                }

                summary.current.items.push(item)
                summary.current.byCategory[category].items.push(item)
                summary.current.byCategory[category].total += quantity
                summary.current.byCategory[category].totalValue += value
                summary.current.total += quantity
                summary.current.totalValue += value
            })
        })
    }

    // Process actual deliveries
    if (props.worker?.deliveries) {
        Object.entries(props.worker.deliveries).forEach(([category, products]) => {
            if (!summary.delivered.byCategory[category]) {
                summary.delivered.byCategory[category] = {
                    total: 0,
                    totalValue: 0,
                    items: []
                }
            }

            Object.entries(products).forEach(([name, data]) => {
                const productData = data.products || {}
                const price = Number(data.price_snapshot || productData.price_per_unit || 0)
                const quantity = Number(data.quantity || 0)
                const value = quantity * price

                const item = {
                    name,
                    quantity,
                    price,
                    value,
                    trend: 'increase'  // Deliveries are always positive
                }

                summary.delivered.items.push(item)
                summary.delivered.byCategory[category].items.push(item)
                summary.delivered.byCategory[category].total += quantity
                summary.delivered.byCategory[category].totalValue += value
                summary.delivered.total += quantity
                summary.delivered.totalValue += value
            })
        })
    }

    return summary
})

// Add new computed property for gross calculations
const grossPayCalculation = computed(() => {
    const previousValue = deliverySummary.value.previous.totalValue
    const deliveriesValue = deliverySummary.value.delivered.totalValue
    const currentValue = deliverySummary.value.current.totalValue

    // Net movement is: Current Stock + Deliveries - Previous Stock
    const netMovement = currentValue + deliveriesValue - previousValue

    return {
        previousStock: {
            value: previousValue,
            pcs: deliverySummary.value.previous.total
        },
        deliveries: {
            value: deliveriesValue,
            pcs: deliverySummary.value.delivered.total
        },
        currentStock: {
            value: currentValue,
            pcs: deliverySummary.value.current.total
        },
        netMovement: {
            value: netMovement,
            pcs: deliverySummary.value.current.total + deliverySummary.value.delivered.total - deliverySummary.value.previous.total
        }
    }
})

// Helper for number input formatting
function formatNumber(value) {
    return value ? Number(value).toFixed(2) : '0.00'
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount)
}

// Simplified price formatting - no need to pass unit since it's always per pc
function formatPriceWithUnit(price) {
    return `₱${Number(price).toFixed(2)}`
}

// Methods
function closeModal() {
    if (hasUnsavedChanges.value) {
        if (confirm('You have unsaved changes. Are you sure you want to close?')) {
            emit('close')
        }
    } else {
        emit('close')
    }
}

// Function to fetch historical deductions
async function fetchHistoricalDeductions() {
    console.log('Fetching historical deductions for worker:', props.worker)

    try {
        // Get most recent payout for SSS
        const { data: lastPayout, error: payoutError } = await supabase
            .from('payouts')
            .select('deductions')
            .eq('employee_id', props.worker.employee_id)
            .order('week_start', { ascending: false })
            .limit(1)
            .single()

        console.log('Last payout data:', lastPayout)

        if (payoutError) {
            console.error('Error fetching last payout:', payoutError)
        }

        if (lastPayout?.deductions?.sss) {
            console.log('Found previous SSS:', lastPayout.deductions.sss)
            suggestedDeductions.value.sss = lastPayout.deductions.sss
            payrollData.value.deductions.contributions = lastPayout.deductions.sss
        }

        // Calculate loan deduction if there's a balance
        if (props.worker.loan_balance > 0) {
            console.log('Worker has loan balance:', props.worker.loan_balance)
            const { data: loanData, error: loanError } = await supabase
                .from('loans')
                .select('amount, balance')
                .eq('worker_id', props.worker.employee_id)
                .eq('status', 'active')
                .order('start_date', { ascending: false })
                .limit(1)
                .single()

            if (loanError) {
                console.error('Error fetching loan data:', loanError)
            }

            console.log('Loan data:', loanData)

            if (loanData?.amount) {
                const suggestedLoan = Math.round(loanData.amount / 8)
                console.log('Calculated suggested loan payment:', suggestedLoan)
                suggestedDeductions.value.loan = suggestedLoan
            }
        }

        // Get savings amount
        if (lastPayout?.savings) {
            console.log('Found previous savings:', lastPayout.savings)
            suggestedDeductions.value.savings = lastPayout.savings
            payrollData.value.savings = lastPayout.savings
        }

        console.log('Final suggested deductions:', suggestedDeductions.value)
        console.log('Final payroll data:', payrollData.value)
    } catch (error) {
        console.error('Error in fetchHistoricalDeductions:', error)
    }
}

// Call this when component mounts
fetchHistoricalDeductions()

// Modify the save function to handle the deductions
async function saveChanges() {
    if (!hasUnsavedChanges.value) return

    isSaving.value = true
    const btn = document.querySelector('#saveBtn')
    btn.disabled = true
    btn.innerHTML = '<span class="loading">Saving</span>'

    try {
        const saveData = {
            employee_id: props.worker.employee_id,
            week_start: props.worker.week_start,
            amount: null,  // Will be set on commit
            status: 'pending',
            confirmed_at: null,  // Will be set on commit
            gross_income: grossPayCalculation.value.netMovement.value,
            cash_advance: payrollData.value.deductions.cash_advance || 0,
            paid_by_hours: payrollData.value.paid_by_hours.regular + payrollData.value.paid_by_hours.assistant,
            deductions: {
                sss: payrollData.value.deductions.contributions || 0,
                loan: payrollData.value.deductions.loan || 0,
                cash_advance: payrollData.value.deductions.cash_advance || 0
            },
            allowances: {
                transport: payrollData.value.allowances.transport || 0,
                meal: payrollData.value.allowances.meal || 0,
                general: payrollData.value.allowances.general || 0
            },
            commissions: {
                bonus: payrollData.value.commissions.bonus || 0,
                overtime: payrollData.value.commissions.overtime || 0,
                holiday: payrollData.value.commissions.holiday || 0
            },
            net_total: payrollSummary.value.netPay,
            rate_snapshots: {
                inhouse: Number(payrollData.value.rates.inhouse),
                assistant: Number(payrollData.value.rates.assistant)
            }
        }

        console.log('Saving payout:', saveData)
        emit('save', saveData)
        hasUnsavedChanges.value = false
        btn.innerHTML = '<span class="success">✓ Saved</span>'

        setTimeout(() => {
            btn.disabled = false
            btn.innerHTML = 'Save Changes'
        }, 1000)
    } catch (error) {
        console.error('Failed to save:', error)
        alert('Failed to save changes. Please try again.')
    } finally {
        isSaving.value = false
    }
}

function resetForm() {
    if (confirm('Are you sure you want to reset all changes?')) {
        payrollData.value = {
            savings: props.worker?.savings || 0,
            gross_income: props.worker?.gross || 0,
            hours: { inhouse: props.worker?.regular_hours || 0, assistant: props.worker?.assistant_hours || 0 },
            rates: { inhouse: 56.25, assistant: 75.00 },
            deductions: { contributions: props.worker?.deductions?.sss || 245, loan: props.worker?.deductions?.loan || 0, cash_advance: props.worker?.deductions?.cash_advance || 0 },
            allowances: { general: props.worker?.allowances?.general || 0, transport: props.worker?.allowances?.transport || 0, meal: props.worker?.allowances?.meal || 0 },
            commissions: { bonus: props.worker?.commissions?.bonus || 0, overtime: props.worker?.commissions?.overtime || 0, holiday: props.worker?.commissions?.holiday || 0 }
        }
        hasUnsavedChanges.value = false
    }
}

// Add function to fetch payment history
async function fetchPaymentHistory() {
    isLoadingHistory.value = true
    try {
        const { data, error } = await supabase
            .from('payouts')
            .select(`
                id,
                week_start,
                gross_income,
                paid_by_hours,
                rate_snapshots,
                deductions,
                allowances,
                commissions,
                net_total,
                confirmed_at,
                status
            `)
            .eq('employee_id', props.worker.employee_id)
            .order('week_start', { ascending: false })
            .limit(10)

        if (error) throw error

        payrollHistory.value = data.map(payout => {
            // Get rates from rate_snapshots
            const rates = payout.rate_snapshots || {
                inhouse: 56.25,
                assistant: 75.00
            }

            // Calculate hours from paid_by_hours and rates
            const paid = payout.paid_by_hours || { regular: 0, assistant: 0 }
            const hours = {
                regular: rates.inhouse ? Math.round(Number(paid.regular || 0) / rates.inhouse) : 0,
                assistant: rates.assistant ? Math.round(Number(paid.assistant || 0) / rates.assistant) : 0
            }

            return {
                date: payout.week_start,
                amount: payout.net_total,
                type: 'Regular Payroll',
                details: {
                    gross: payout.gross_income || 0,
                    hours,
                    rates,
                    paid_by_hours: paid,
                    deductions: (
                        (payout.deductions?.sss || 0) +
                        (payout.deductions?.loan || 0) +
                        (payout.deductions?.cash_advance || 0)
                    ),
                    additions: (
                        Object.values(payout.allowances || {}).reduce((sum, val) => sum + (Number(val) || 0), 0) +
                        Object.values(payout.commissions || {}).reduce((sum, val) => sum + (Number(val) || 0), 0)
                    )
                }
            }
        })

        console.log('Processed payment history:', payrollHistory.value)
    } catch (err) {
        console.error('Failed to fetch payment history:', err)
        payrollHistory.value = []
    } finally {
        isLoadingHistory.value = false
    }
}

// Watch for history panel visibility
watch(showHistoryPanel, (newValue) => {
    if (newValue) {
        fetchPaymentHistory()
    }
})

// Update the template to show loading state
const historyPanelContent = computed(() => {
    if (isLoadingHistory.value) {
        return {
            title: 'Loading History...',
            content: []
        }
    }
    if (payrollHistory.value.length === 0) {
        return {
            title: 'No Payment History',
            content: []
        }
    }
    return {
        title: 'Payment History',
        content: payrollHistory.value
    }
})
</script>

<template>
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <div class="bg-gray-800 rounded-xl shadow-lg w-full max-w-[1000px] overflow-hidden max-h-[80vh] flex flex-col">
            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b border-gray-700">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-xl bg-gray-700/50 flex items-center justify-center text-lg font-semibold text-white">
                        {{ props.worker.avatar }}
                    </div>
                    <div>
                        <h2 class="text-lg font-semibold text-white">{{ props.worker.name }}</h2>
                        <p class="text-sm text-gray-400">Week of {{ props.worker.week_start }}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <button @click="showHistoryPanel = !showHistoryPanel"
                        class="text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-gray-700/50 transition-colors duration-200">
                        {{ showHistoryPanel ? 'Hide History' : 'Show History' }}
                    </button>
                    <button @click="closeModal" class="text-gray-400 hover:text-white text-2xl">
                        ×
                    </button>
                </div>
            </div>

            <div class="flex flex-1 overflow-hidden">
                <!-- Main Content -->
                <div class="flex-1 overflow-y-auto">
                    <!-- Quick Stats -->
                    <div class="p-4">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold text-white">Summary</h3>
                            <button @click="showBreakdown = !showBreakdown"
                                class="text-gray-400 hover:text-white flex items-center gap-2 text-sm">
                                {{ showBreakdown ? 'Hide' : 'Show' }} Breakdown
                                <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': showBreakdown }"
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div class="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                                <h3 class="text-gray-400 text-sm">Net Pay</h3>
                                <p class="text-xl font-bold text-green-400 mt-1">{{
                                    formatCurrency(payrollSummary.netPay) }}</p>
                                <div v-if="showBreakdown" class="mt-3 pt-3 border-t border-gray-600 space-y-2 text-sm">
                                    <div class="flex justify-between">
                                        <span class="text-gray-400">Gross (Stock)</span>
                                        <span class="text-green-400">{{ formatCurrency(payrollSummary.grossIncome)
                                            }}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-400">Hours Pay</span>
                                        <span class="text-blue-400">{{ formatCurrency(payrollSummary.hourlyPay)
                                            }}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-400">Additions</span>
                                        <span class="text-green-400">+{{ formatCurrency(payrollSummary.additions)
                                            }}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-400">Deductions</span>
                                        <span class="text-red-400">-{{ formatCurrency(payrollSummary.deductions)
                                            }}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                                <h3 class="text-gray-400 text-sm">Gross</h3>
                                <p class="text-xl font-bold mt-1" :class="[
                                    grossPayCalculation.netMovement.value > 0 ? 'text-green-400' : 'text-red-400'
                                ]">{{ formatCurrency(grossPayCalculation.netMovement.value) }}</p>
                                <p class="text-xs text-gray-500 mt-1">{{ grossPayCalculation.netMovement.pcs }} pcs</p>
                                <div v-if="showBreakdown" class="mt-3 pt-3 border-t border-gray-600 space-y-2 text-sm">
                                    <div class="flex justify-between">
                                        <span class="text-gray-400">Previous</span>
                                        <span class="text-yellow-400">{{
                                            formatCurrency(grossPayCalculation.previousStock.value) }}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-400">Deliveries</span>
                                        <span class="text-green-400">{{
                                            formatCurrency(grossPayCalculation.deliveries.value) }}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-400">Current</span>
                                        <span class="text-blue-400">{{
                                            formatCurrency(grossPayCalculation.currentStock.value) }}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                                <h3 class="text-gray-400 text-sm">Total Hours</h3>
                                <p class="text-xl font-bold text-blue-400 mt-1">{{ payrollSummary.totalHours }} hrs</p>
                            </div>
                            <div class="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                                <h3 class="text-gray-400 text-sm">Savings to Date</h3>
                                <p class="text-xl font-bold text-purple-400 mt-1">{{
                                    formatCurrency(payrollSummary.savingsToDate) }}</p>
                            </div>
                            <div class="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                                <h3 class="text-gray-400 text-sm">Loan Balance</h3>
                                <p class="text-xl font-bold text-yellow-400 mt-1">{{
                                    formatCurrency(payrollSummary.loanBalance) }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Tabs -->
                    <div class="px-4">
                        <div class="flex gap-1 mb-4 border-b border-gray-700">
                            <button v-for="section in ['hours', 'deductions', 'additions', 'deliveries']" :key="section"
                                @click="activeSection = section" :class="[
                                    'px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-[2px]',
                                    activeSection === section
                                        ? 'text-blue-400 border-blue-400'
                                        : 'text-gray-400 border-transparent hover:text-white'
                                ]">
                                {{ section.charAt(0).toUpperCase() + section.slice(1) }}
                            </button>
                        </div>
                    </div>

                    <!-- Content Sections -->
                    <div class="p-4 space-y-4">
                        <!-- Hours Section -->
                        <div v-show="activeSection === 'hours'" class="space-y-4">
                            <!-- Gross Income -->
                            <div>
                                <label class="text-gray-400 block mb-2">Gross Income</label>
                                <input type="number" v-model.number="payrollData.gross_income"
                                    class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                            </div>

                            <!-- Hours Summary Card -->
                            <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                                <h3 class="text-gray-400 text-sm mb-3">Hours Breakdown</h3>

                                <!-- In-house Hours -->
                                <div class="space-y-3">
                                    <div>
                                        <div class="flex justify-between mb-2">
                                            <label class="text-gray-400">In-house Hours</label>
                                            <span class="text-gray-400">₱{{ formatNumber(hourlyTotals.inhouse.rate)
                                                }}/hr</span>
                                        </div>
                                        <div class="flex gap-3">
                                            <input type="number" v-model.number="payrollData.hours.inhouse"
                                                class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                                            <div class="w-32 text-right">
                                                <div class="text-blue-400 font-medium">₱{{
                                                    formatNumber(hourlyTotals.inhouse.amount) }}</div>
                                                <div class="text-xs text-gray-500">{{ hourlyTotals.inhouse.hours }}
                                                    hrs
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Assistant Hours -->
                                    <div>
                                        <div class="flex justify-between mb-2">
                                            <label class="text-gray-400">Assistant Hours</label>
                                            <span class="text-gray-400">₱{{
                                                formatNumber(hourlyTotals.assistant.rate)
                                                }}/hr</span>
                                        </div>
                                        <div class="flex gap-3">
                                            <input type="number" v-model.number="payrollData.hours.assistant"
                                                class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                                            <div class="w-32 text-right">
                                                <div class="text-blue-400 font-medium">₱{{
                                                    formatNumber(hourlyTotals.assistant.amount) }}</div>
                                                <div class="text-xs text-gray-500">{{ hourlyTotals.assistant.hours
                                                    }}
                                                    hrs
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Total Hours Summary -->
                                    <div class="pt-3 mt-3 border-t border-gray-600">
                                        <div class="flex justify-between items-center">
                                            <div>
                                                <div class="text-gray-400">Total Hours Pay</div>
                                                <div class="text-xs text-gray-500">{{ totalHours }} total hours
                                                </div>
                                            </div>
                                            <div class="text-lg font-bold text-blue-400">₱{{
                                                formatNumber(totalHourlyPay) }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Deductions Section -->
                        <div v-show="activeSection === 'deductions'" class="space-y-4">
                            <!-- Savings -->
                            <div>
                                <div class="flex justify-between mb-2">
                                    <label class="text-gray-400">Savings</label>
                                    <span class="text-green-400 text-sm">₱{{ formatNumber(payrollSummary.savingsToDate)
                                        }} total savings</span>
                                </div>
                                <div class="relative">
                                    <input type="number" v-model.number="payrollData.savings" :class="[
                                        'w-full bg-gray-700 border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500',
                                        suggestedDeductions.savings > 0 ? 'border-blue-500/50' : 'border-gray-600'
                                    ]" />
                                    <div v-if="suggestedDeductions.savings > 0"
                                        class="text-xs text-blue-400 mt-1 flex items-center">
                                        <span class="mr-1">💡</span>
                                        Auto-populated from previous payroll
                                    </div>
                                </div>
                            </div>

                            <!-- SSS -->
                            <div>
                                <label class="text-gray-400 block mb-2">SSS Contribution</label>
                                <div class="relative">
                                    <input type="number" v-model.number="payrollData.deductions.contributions" :class="[
                                        'w-full bg-gray-700 border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500',
                                        suggestedDeductions.sss > 0 ? 'border-blue-500/50' : 'border-gray-600'
                                    ]" />
                                    <div v-if="suggestedDeductions.sss > 0"
                                        class="text-xs text-blue-400 mt-1 flex items-center">
                                        <span class="mr-1">💡</span>
                                        Auto-populated from previous payroll
                                    </div>
                                </div>
                            </div>

                            <!-- Loan -->
                            <div>
                                <div class="flex justify-between mb-2">
                                    <label class="text-gray-400">Loan Payment</label>
                                    <span class="text-yellow-500 text-sm">₱{{ formatNumber(payrollSummary.loanBalance)
                                        }} remaining</span>
                                </div>
                                <div class="relative">
                                    <input type="number" v-model.number="payrollData.deductions.loan" :class="[
                                        'w-full bg-gray-700 border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500',
                                        suggestedDeductions.loan > 0 ? 'border-blue-500/50' : 'border-gray-600'
                                    ]" />
                                    <div v-if="suggestedDeductions.loan > 0"
                                        class="text-xs text-blue-400 mt-1 flex items-center">
                                        <span class="mr-1">💡</span>
                                        Auto-populated (1/8 of loan amount)
                                    </div>
                                </div>
                            </div>

                            <!-- Cash Advance -->
                            <div>
                                <label class="text-gray-400 block mb-2">Cash Advance</label>
                                <input type="number" v-model.number="payrollData.deductions.cash_advance"
                                    class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                            </div>
                        </div>

                        <!-- Additions Section -->
                        <div v-show="activeSection === 'additions'" class="space-y-4">
                            <!-- Allowances -->
                            <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                                <h3 class="text-gray-400 text-sm mb-3">Allowances</h3>
                                <div class="space-y-3">
                                    <div v-for="(value, key) in payrollData.allowances" :key="key">
                                        <label class="text-gray-400 block mb-2">{{ key.charAt(0).toUpperCase() +
                                            key.slice(1) }}</label>
                                        <input type="number" v-model.number="payrollData.allowances[key]"
                                            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>

                            <!-- Commissions -->
                            <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                                <h3 class="text-gray-400 text-sm mb-3">Commissions & Bonuses</h3>
                                <div class="space-y-3">
                                    <div v-for="(value, key) in payrollData.commissions" :key="key">
                                        <label class="text-gray-400 block mb-2">{{ key.charAt(0).toUpperCase() +
                                            key.slice(1) }}</label>
                                        <input type="number" v-model.number="payrollData.commissions[key]"
                                            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Deliveries Section -->
                        <div v-show="activeSection === 'deliveries'" class="space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <!-- Previous Stock -->
                                <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                                    <h3 class="text-gray-400 text-sm mb-3">Previous Stock</h3>
                                    <div class="space-y-4">
                                        <template v-for="(data, category) in deliverySummary.previous.byCategory"
                                            :key="category">
                                            <div class="space-y-2">
                                                <div class="flex justify-between text-sm">
                                                    <span class="text-gray-300">{{ category }}</span>
                                                    <div class="text-right">
                                                        <div class="text-yellow-400 font-medium">{{ data.total }} pcs
                                                        </div>
                                                        <div class="text-xs text-yellow-400/70">{{
                                                            formatPriceWithUnit(data.totalValue) }}</div>
                                                    </div>
                                                </div>
                                                <div class="space-y-1 pl-3">
                                                    <div v-for="item in data.items" :key="item.name"
                                                        class="flex justify-between text-xs">
                                                        <div>
                                                            <span class="text-gray-400">{{ item.name }}</span>
                                                            <span class="text-gray-500 ml-1">({{
                                                                formatPriceWithUnit(item.price)
                                                                }})</span>
                                                        </div>
                                                        <div class="text-right">
                                                            <div class="text-yellow-400/80">{{ item.quantity }} pcs
                                                            </div>
                                                            <div class="text-yellow-400/60">{{
                                                                formatPriceWithUnit(item.value) }}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </template>
                                        <div class="pt-2 mt-2 border-t border-gray-600">
                                            <div class="flex justify-between">
                                                <span class="text-gray-400">Total</span>
                                                <div class="text-right">
                                                    <div class="text-yellow-400 font-bold">{{
                                                        deliverySummary.previous.total }} pcs</div>
                                                    <div class="text-sm text-yellow-400/70 font-medium">{{
                                                        formatPriceWithUnit(deliverySummary.previous.totalValue)
                                                        }}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Net Delivered -->
                                <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                                    <h3 class="text-gray-400 text-sm mb-3">Deliveries</h3>
                                    <div class="space-y-4">
                                        <template v-for="(data, category) in deliverySummary.delivered.byCategory"
                                            :key="category">
                                            <div class="space-y-2">
                                                <div class="flex justify-between text-sm">
                                                    <span class="text-gray-300">{{ category }}</span>
                                                    <div class="text-right">
                                                        <div class="text-green-400 font-medium">{{ data.total }} pcs
                                                        </div>
                                                        <div class="text-xs text-green-400/70">{{
                                                            formatPriceWithUnit(data.totalValue) }}</div>
                                                    </div>
                                                </div>
                                                <div class="space-y-1 pl-3">
                                                    <div v-for="item in data.items" :key="item.name"
                                                        class="flex justify-between text-xs">
                                                        <div>
                                                            <span class="text-gray-400">{{ item.name }}</span>
                                                            <span class="text-gray-500 ml-1">({{
                                                                formatPriceWithUnit(item.price)
                                                                }})</span>
                                                        </div>
                                                        <div class="text-right">
                                                            <div class="text-green-400/80">{{ item.quantity }} pcs</div>
                                                            <div class="text-green-400/60">{{
                                                                formatPriceWithUnit(item.value) }}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </template>
                                        <div class="pt-2 mt-2 border-t border-gray-600">
                                            <div class="flex justify-between">
                                                <span class="text-gray-400">Total</span>
                                                <div class="text-right">
                                                    <div class="text-green-400 font-bold">{{
                                                        deliverySummary.delivered.total }} pcs</div>
                                                    <div class="text-sm text-green-400/70 font-medium">{{
                                                        formatPriceWithUnit(deliverySummary.delivered.totalValue)
                                                        }}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Current Stock -->
                                <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                                    <h3 class="text-gray-400 text-sm mb-3">Current Stock</h3>
                                    <div class="space-y-4">
                                        <template v-for="(data, category) in deliverySummary.current.byCategory"
                                            :key="category">
                                            <div class="space-y-2">
                                                <div class="flex justify-between text-sm">
                                                    <span class="text-gray-300">{{ category }}</span>
                                                    <div class="text-right">
                                                        <div class="text-blue-400 font-medium">{{ data.total }} pcs
                                                        </div>
                                                        <div class="text-xs text-blue-400/70">{{
                                                            formatPriceWithUnit(data.totalValue) }}</div>
                                                    </div>
                                                </div>
                                                <div class="space-y-1 pl-3">
                                                    <div v-for="item in data.items" :key="item.name"
                                                        class="flex justify-between text-xs">
                                                        <div>
                                                            <span class="text-gray-400">{{ item.name }}</span>
                                                            <span class="text-gray-500 ml-1">({{
                                                                formatPriceWithUnit(item.price)
                                                                }})</span>
                                                        </div>
                                                        <div class="text-right">
                                                            <div class="text-blue-400/80">{{ item.quantity }} pcs</div>
                                                            <div class="text-blue-400/60">{{
                                                                formatPriceWithUnit(item.value) }}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </template>
                                        <div class="pt-2 mt-2 border-t border-gray-600">
                                            <div class="flex justify-between">
                                                <span class="text-gray-400">Total</span>
                                                <div class="text-right">
                                                    <div class="text-blue-400 font-bold">{{
                                                        deliverySummary.current.total }} pcs</div>
                                                    <div class="text-sm text-blue-400/70 font-medium">{{
                                                        formatPriceWithUnit(deliverySummary.current.totalValue)
                                                        }}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- History Panel -->
                <div v-show="showHistoryPanel" class="w-80 border-l border-gray-700 overflow-y-auto bg-gray-800/50">
                    <div class="p-4 space-y-4">
                        <h3 class="text-gray-400 text-sm font-medium flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {{ historyPanelContent.title }}
                        </h3>

                        <!-- Loading State -->
                        <div v-if="isLoadingHistory"
                            class="flex flex-col items-center justify-center py-8 text-gray-400">
                            <svg class="animate-spin h-8 w-8 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none"
                                viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                </path>
                            </svg>
                            <span class="text-sm">Loading history...</span>
                        </div>

                        <!-- Empty State -->
                        <div v-else-if="payrollHistory.length === 0"
                            class="flex flex-col items-center justify-center py-8 text-gray-400">
                            <svg class="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span class="text-sm">No payment history found</span>
                        </div>

                        <!-- History List -->
                        <div v-else class="space-y-3">
                            <div v-for="record in payrollHistory" :key="record.date"
                                class="bg-gray-700/30 rounded-lg p-3 space-y-2 border border-gray-600">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm text-white">{{ record.type }}</span>
                                    <span class="text-xs text-gray-400">{{ new Date(record.date).toLocaleDateString()
                                        }}</span>
                                </div>
                                <div class="text-lg text-green-400 font-bold">{{ formatCurrency(record.amount) }}</div>
                                <div class="pt-2 mt-2 border-t border-gray-600 text-xs space-y-1.5">
                                    <div class="flex justify-between">
                                        <span class="text-gray-400">Gross</span>
                                        <span class="text-white">{{ formatCurrency(record.details.gross) }}</span>
                                    </div>
                                    <!-- Hours and Rates -->
                                    <div class="border-t border-gray-600/50 pt-2 mt-2">
                                        <div class="text-gray-400 mb-1">Hours & Rates:</div>
                                        <div class="pl-2 space-y-1">
                                            <div class="flex justify-between">
                                                <span class="text-gray-400">In-house (₱{{
                                                    formatNumber(record.details.rates.inhouse) }}/hr)</span>
                                                <span class="text-blue-400">{{ record.details.hours.regular }}
                                                    hrs</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-gray-400">Assistant (₱{{
                                                    formatNumber(record.details.rates.assistant) }}/hr)</span>
                                                <span class="text-blue-400">{{ record.details.hours.assistant }}
                                                    hrs</span>
                                            </div>
                                            <div class="flex justify-between font-medium pt-1">
                                                <span class="text-gray-400">Total Pay</span>
                                                <span class="text-blue-400">₱{{
                                                    formatNumber(record.details.paid_by_hours.regular +
                                                        record.details.paid_by_hours.assistant) }}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-400">Deductions</span>
                                        <span class="text-red-400">-{{ formatCurrency(record.details.deductions)
                                            }}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-400">Additions</span>
                                        <span class="text-green-400">+{{ formatCurrency(record.details.additions)
                                            }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="p-4 bg-gray-700/30 border-t border-gray-700 flex items-center justify-between">
                <button @click="resetForm" class="text-gray-400 hover:text-white text-sm">
                    Reset Changes
                </button>
                <div class="flex items-center gap-3">
                    <button @click="closeModal" class="px-4 py-2 text-gray-400 hover:text-white text-sm">
                        Cancel
                    </button>
                    <button id="saveBtn" @click="saveChanges"
                        class="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.loading {
    position: relative;
}

.loading::after {
    content: '';
    animation: dots 1.4s infinite;
}

@keyframes dots {
    0% {
        content: '';
    }

    25% {
        content: '.';
    }

    50% {
        content: '..';
    }

    75% {
        content: '...';
    }

    100% {
        content: '';
    }
}

.success {
    display: inline-flex;
    align-items: center;
    animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

input[type="number"] {
    appearance: textfield;
}

input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}
</style>