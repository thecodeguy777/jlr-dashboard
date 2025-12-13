/* eslint-disable prettier/prettier */
// prettier-ignore
<script setup>
import { ref, computed, watch, onMounted, toRefs } from 'vue'
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
        inhouse: Number(props.worker?.regular_rate || props.worker?.inhouse_rate || props.worker?.hourly_rate || 56.25),
        assistant: Number(props.worker?.assistant_rate || 75.00)
    },
    paid_by_hours: props.worker?.paid_by_hours ? (
        typeof props.worker.paid_by_hours === 'number' ?
            { inhouse: props.worker.paid_by_hours, assistant: 0 } :
            {
                inhouse: Number(props.worker.paid_by_hours.inhouse || 0),
                assistant: Number(props.worker.paid_by_hours.assistant || 0)
            }
    ) : { inhouse: 0, assistant: 0 },
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

// Add returns data state
const returnsData = ref({
    as_repair_worker: [],
    as_worker: []
})

console.log('\n=== PayrollEditor Initialization ===')
console.log('Raw worker props:', {
    name: props.worker?.name,
    paid_by_hours: props.worker?.paid_by_hours,
    gross_income: props.worker?.gross,
    deductions: props.worker?.deductions,
    rates: {
        inhouse_rate: props.worker?.inhouse_rate,
        regular_rate: props.worker?.regular_rate,
        assistant_rate: props.worker?.assistant_rate,
        hourly_rate: props.worker?.hourly_rate
    },
    hours: {
        regular_hours: props.worker?.regular_hours,
        assistant_hours: props.worker?.assistant_hours
    }
})

console.log('Calculated initial rates:', {
    inhouse: Number(props.worker?.regular_rate || props.worker?.inhouse_rate || props.worker?.hourly_rate || 56.25),
    assistant: Number(props.worker?.assistant_rate || 75.00)
})

// Initialize hours from paid_by_hours if available
if (props.worker?.paid_by_hours) {
    console.log('Processing paid_by_hours:', {
        raw: props.worker.paid_by_hours,
        type: typeof props.worker.paid_by_hours
    })

    if (typeof props.worker.paid_by_hours === 'number') {
        // Legacy format: all hours are inhouse hours
        const inhouseRate = Number(props.worker?.regular_rate || props.worker?.inhouse_rate || 56.25)
        payrollData.value.hours.inhouse = Math.round(Number(props.worker.paid_by_hours) / inhouseRate)
        payrollData.value.hours.assistant = 0
        payrollData.value.paid_by_hours = {
            inhouse: Number(props.worker.paid_by_hours),
            assistant: 0
        }

        console.log('Processed legacy format:', {
            inhouseRate,
            paid_by_hours: payrollData.value.paid_by_hours,
            hours: payrollData.value.hours
        })
    } else {
        // New JSONB format
        const inhouseRate = Number(props.worker?.regular_rate || props.worker?.inhouse_rate || 56.25)
        const assistantRate = Number(props.worker?.assistant_rate || 75.00)

        payrollData.value.hours.inhouse = Math.round(Number(props.worker.paid_by_hours.inhouse || 0) / inhouseRate)
        payrollData.value.hours.assistant = Math.round(Number(props.worker.paid_by_hours.assistant || 0) / assistantRate)

        payrollData.value.paid_by_hours = {
            inhouse: Number(props.worker.paid_by_hours.inhouse || 0),
            assistant: Number(props.worker.paid_by_hours.assistant || 0)
        }

        console.log('Processed JSONB format:', {
            rates: { inhouseRate, assistantRate },
            paid_by_hours: payrollData.value.paid_by_hours,
            hours: payrollData.value.hours
        })
    }
} else if (props.worker?.regular_hours || props.worker?.assistant_hours) {
    // If we have explicit hours, use those
    console.log('Using explicit hours:', {
        regular_hours: props.worker.regular_hours,
        assistant_hours: props.worker.assistant_hours
    })

    const inhouseRate = Number(props.worker?.regular_rate || props.worker?.inhouse_rate || 56.25)
    const assistantRate = Number(props.worker?.assistant_rate || 75.00)

    payrollData.value.hours = {
        inhouse: Number(props.worker.regular_hours || 0),
        assistant: Number(props.worker.assistant_hours || 0)
    }

    payrollData.value.paid_by_hours = {
        inhouse: Math.round(Number(props.worker.regular_hours || 0) * inhouseRate),
        assistant: Math.round(Number(props.worker.assistant_hours || 0) * assistantRate)
    }

    console.log('Calculated paid_by_hours from explicit hours:', {
        rates: { inhouseRate, assistantRate },
        hours: payrollData.value.hours,
        paid_by_hours: payrollData.value.paid_by_hours
    })
}

// If no paid_by_hours but gross is available, calculate hours from gross
if (!props.worker?.paid_by_hours && props.worker?.gross) {
    console.log('No paid_by_hours, calculating from gross:', {
        gross: props.worker.gross,
        rate: props.worker?.regular_rate || props.worker?.inhouse_rate || 56.25
    })

    const inhouseRate = Number(props.worker?.regular_rate || props.worker?.inhouse_rate || 56.25)
    const grossAmount = Number(props.worker.gross)
    const calculatedHours = Math.round(grossAmount / inhouseRate)

    payrollData.value.hours.inhouse = calculatedHours
    payrollData.value.paid_by_hours.inhouse = grossAmount

    console.log('Calculated from gross:', {
        hours: payrollData.value.hours,
        paid_by_hours: payrollData.value.paid_by_hours
    })
}

console.log('Final payrollData:', {
    hours: payrollData.value.hours,
    rates: payrollData.value.rates,
    paid_by_hours: payrollData.value.paid_by_hours,
    gross_income: payrollData.value.gross_income
})

const activeSection = ref('hours') // ['hours', 'deductions', 'additions', 'history']
const showHistoryPanel = ref(false)
const hasUnsavedChanges = ref(false)
const isSaving = ref(false)
const showHoursBreakdown = ref(false)

// Replace mock history data with real data from props
const payrollHistory = ref([])
const isLoadingHistory = ref(false)

// Add refs for suggested deductions
const suggestedDeductions = ref({
    sss: 0,
    loan: 0,
    savings: 0
})

// Add flag to track SSS source
const sssSource = ref('') // 'historical', 'default', or 'current'

// Replace both refs with a single one
const showBreakdown = ref(false)

// Initialize immediately when component mounts
onMounted(async () => {
    console.log('Component mounted, initializing with worker:', props.worker)
    if (props.worker) {
        await Promise.all([
            initializeDeductions(),
            fetchPaymentHistory(),
            fetchReturnsData()  // Add returns data fetch
        ])
    }
})

// Function to initialize deductions
async function initializeDeductions() {
    console.log('Initializing deductions for worker:', {
        id: props.worker.id,  // Change from employee_id to id
        loan_balance: props.worker.loan_balance,
        total_savings: props.worker.total_savings,
        current_deductions: props.worker.deductions  // Log current deductions
    })

    try {
        // Get most recent payout for deductions
        const { data: lastPayout, error: payoutError } = await supabase
            .from('payouts')
            .select('deductions')
            .eq('employee_id', props.worker.id)  // payouts table uses employee_id but the value is worker.id
            .order('week_start', { ascending: false })
            .limit(1)
            .single()

        console.log('Last payout found:', lastPayout)

        if (payoutError) {
            console.error('Error fetching last payout:', payoutError)
        }

        // If we have current deductions, use them
        if (props.worker.deductions) {
            if (props.worker.deductions.sss) {
                suggestedDeductions.value.sss = props.worker.deductions.sss
                payrollData.value.deductions.contributions = props.worker.deductions.sss
                sssSource.value = 'current'
                console.log('Set SSS from current payout:', props.worker.deductions.sss)
            }

            if (props.worker.deductions.loan) {
                suggestedDeductions.value.loan = props.worker.deductions.loan
                payrollData.value.deductions.loan = props.worker.deductions.loan
                console.log('Set loan from current payout:', props.worker.deductions.loan)
            }

            if (props.worker.deductions.cash_advance) {
                payrollData.value.deductions.cash_advance = Number(props.worker.deductions.cash_advance)
                console.log('Set cash advance from current payout:', props.worker.deductions.cash_advance)
            }
        }

        // Always check for historical SSS data if not already set
        if (!payrollData.value.deductions.contributions || payrollData.value.deductions.contributions === 0) {
            if (lastPayout?.deductions?.sss !== undefined) {
                // Use historical SSS value (even if it's 0)
                suggestedDeductions.value.sss = lastPayout.deductions.sss
                payrollData.value.deductions.contributions = lastPayout.deductions.sss
                sssSource.value = 'historical'
                console.log('Auto-populated SSS from last payout:', lastPayout.deductions.sss)
            } else {
                // If no historical data, suggest standard SSS amount (245)
                suggestedDeductions.value.sss = 245
                payrollData.value.deductions.contributions = 245
                sssSource.value = 'default'
                console.log('Applied default SSS contribution:', 245)
            }
        }

        // Handle other deductions from last payout if no current deductions
        if (!props.worker.deductions && lastPayout?.deductions) {
            // Set previous loan deduction if it exists
            if (lastPayout.deductions.loan) {
                suggestedDeductions.value.loan = lastPayout.deductions.loan
                console.log('Found previous loan deduction:', lastPayout.deductions.loan)
            }

            // Set previous cash advance if it exists
            if (lastPayout.deductions.cash_advance) {
                payrollData.value.deductions.cash_advance = Number(lastPayout.deductions.cash_advance)
                console.log('Found previous cash advance:', lastPayout.deductions.cash_advance)
            }
        }

        // Calculate loan deduction if there's a balance
        if (props.worker.loan_balance > 0) {
            console.log('Worker has loan balance:', props.worker.loan_balance)
            console.log('Fetching loan data for worker_id:', props.worker.id)

            // Fetch ALL active loans for the worker (both cash and asset loans)
            const { data: loansData, error: loanError } = await supabase
                .from('loans')
                .select('amount, balance, loan_category, weekly_deduction')
                .eq('worker_id', props.worker.id)
                .eq('status', 'active')
                .gt('balance', 0)

            if (loanError) {
                console.error('Error fetching loan data:', loanError)
            }

            console.log('Loans data retrieved:', loansData)

            if (loansData && loansData.length > 0) {
                let totalSuggestedLoan = 0

                loansData.forEach(loan => {
                    if (loan.loan_category === 'asset' && loan.weekly_deduction) {
                        // Asset loan: use fixed weekly deduction
                        totalSuggestedLoan += loan.weekly_deduction
                        console.log(`Asset loan weekly deduction: ${loan.weekly_deduction}`)
                    } else {
                        // Cash loan: calculate 1/8 of original amount, capped at remaining balance
                        const weeklyPayment = Math.round(loan.amount / 8)
                        const cappedPayment = Math.min(weeklyPayment, loan.balance)
                        totalSuggestedLoan += cappedPayment
                        console.log(`Cash loan payment: ${cappedPayment} (1/8 of ${loan.amount}, balance: ${loan.balance})`)
                    }
                })

                console.log('Total suggested loan payment:', totalSuggestedLoan)
                suggestedDeductions.value.loan = totalSuggestedLoan

                // Only set the actual deduction if there's no existing loan deduction
                if (!payrollData.value.deductions.loan || payrollData.value.deductions.loan === 0) {
                    payrollData.value.deductions.loan = totalSuggestedLoan
                    console.log('Applied suggested loan payment to payroll data:', totalSuggestedLoan)
                }
            } else {
                console.log('No active loans with balance found')
            }
        } else {
            console.log('Worker has no loan balance')
        }

        // Get most recent savings amount
        const { data: lastSavings, error: savingsError } = await supabase
            .from('savings')
            .select('amount')
            .eq('worker_id', props.worker.id)  // Change from employee_id to id
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

        console.log('Final suggested deductions:', suggestedDeductions.value)
        console.log('Final payroll data:', payrollData.value)
    } catch (error) {
        console.error('Error initializing deductions:', error)
    }
}

// Watch for worker changes
watch(() => props.worker?.id, async (newId, oldId) => {
    console.log('Worker ID changed:', { newId, oldId })
    if (newId && newId !== oldId) {
        await initializeDeductions()
    }
})

// Watch for changes and compare with initial data
watch(payrollData, (newData) => {
    // Normalize data for comparison to avoid false positives
    const normalizeData = (data) => {
        return JSON.stringify(data, (key, value) => {
            // Convert numbers to ensure consistent comparison
            if (typeof value === 'number') return Number(value)
            if (typeof value === 'string' && !isNaN(value) && value !== '') return Number(value)
            return value
        })
    }
    
    hasUnsavedChanges.value = normalizeData(newData) !== normalizeData(initialData)
}, { deep: true })

// Watch for hours changes to update paid_by_hours
watch(() => [payrollData.value.hours.inhouse, payrollData.value.hours.assistant], ([newInhouse, newAssistant]) => {
    const inhouseRate = Number(payrollData.value.rates.inhouse)
    const assistantRate = Number(payrollData.value.rates.assistant)

    payrollData.value.paid_by_hours = {
        inhouse: Math.round(Number(newInhouse || 0) * inhouseRate),
        assistant: Math.round(Number(newAssistant || 0) * assistantRate)
    }

    // Update gross income: Net Delivered (stock movement) + Hours Paid
    const stockMovement = grossPayCalculation.value.netMovement.value
    const hoursPaid = payrollData.value.paid_by_hours.inhouse + payrollData.value.paid_by_hours.assistant
    payrollData.value.gross_income = stockMovement + hoursPaid

    console.log('Hours changed:', {
        hours: { inhouse: newInhouse, assistant: newAssistant },
        rates: { inhouse: inhouseRate, assistant: assistantRate },
        paid_by_hours: payrollData.value.paid_by_hours,
        gross: payrollData.value.gross_income
    })
}, { deep: true })

// Watch for worker changes to refetch data
watch(() => props.worker, async (newWorker, oldWorker) => {
    if (newWorker?.id !== oldWorker?.id) {  // Change from employee_id to id
        console.log('Worker changed, refetching historical deductions')
        await fetchHistoricalDeductions()
    }
}, { immediate: true, deep: true })

// Watch for paid_by_hours changes
watch(() => props.worker?.paid_by_hours, (newPaidByHours) => {
    if (!newPaidByHours) return;

    if (typeof newPaidByHours === 'number') {
        payrollData.value.hours.inhouse = Math.round(Number(newPaidByHours) / Number(payrollData.value.rates.inhouse));
        payrollData.value.hours.assistant = 0;
        payrollData.value.paid_by_hours = {
            inhouse: Number(newPaidByHours),
            assistant: 0
        };
    } else {
        payrollData.value.hours.inhouse = Math.round(Number(newPaidByHours.inhouse || 0) / Number(payrollData.value.rates.inhouse));
        payrollData.value.hours.assistant = Math.round(Number(newPaidByHours.assistant || 0) / Number(payrollData.value.rates.assistant));
        payrollData.value.paid_by_hours = {
            inhouse: Number(newPaidByHours.inhouse || 0),
            assistant: Number(newPaidByHours.assistant || 0)
        };
    }
}, { immediate: true, deep: true })

// Computed properties for derived values
const totalHourlyPay = computed(() => {
    const total = Number(payrollData.value.paid_by_hours.inhouse || 0) +
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
    // Use the EXACT same calculation as the Net Pay card (payrollSummary.netPay)
    return payrollSummary.value.netPay
})

const hourlyTotals = computed(() => {
    const totals = {
        inhouse: {
            hours: Number(payrollData.value.hours.inhouse || 0),
            rate: Number(payrollData.value.rates.inhouse),
            amount: Number(payrollData.value.paid_by_hours.inhouse || 0)
        },
        assistant: {
            hours: Number(payrollData.value.hours.assistant || 0),
            rate: Number(payrollData.value.rates.assistant),
            amount: Number(payrollData.value.paid_by_hours.assistant || 0)
        }
    }
    console.log('Calculating hourlyTotals:', totals)
    console.log('Current payrollData.rates:', payrollData.value.rates)
    console.log('Props worker rates:', {
        regular_rate: props.worker?.regular_rate,
        inhouse_rate: props.worker?.inhouse_rate,
        assistant_rate: props.worker?.assistant_rate
    })
    return totals
})

const totalHours = computed(() => {
    const inhouse = Number(payrollData.value.hours.inhouse || 0)
    const assistant = Number(payrollData.value.hours.assistant || 0)
    const total = inhouse + assistant

    console.log('Calculating totalHours:', {
        inhouse,
        assistant,
        total,
        raw: {
            inhouse: payrollData.value.hours.inhouse,
            assistant: payrollData.value.hours.assistant
        }
    })

    return total
})

// Add returns summary computed property
const returnsSummary = computed(() => {
    const summary = {
        labor_earnings: 0,
        returned_quantity: 0,
        repaired_quantity: 0,
        transformed_quantity: 0
    }

    // Calculate earnings from repair/transform work
    returnsData.value.as_repair_worker.forEach(item => {
        summary.labor_earnings += Number(item.labor_cost || 0)
        if (item.type === 'repair') {
            summary.repaired_quantity += Number(item.quantity || 0)
        } else if (item.type === 'transform') {
            summary.transformed_quantity += Number(item.quantity || 0)
        }
    })

    // Calculate returns quantities
    returnsData.value.as_worker.forEach(item => {
        summary.returned_quantity += Number(item.quantity || 0)
    })

    return summary
})

// Add to payrollSummary computed
const payrollSummary = computed(() => ({
    grossIncome: grossPayCalculation.value.netMovement.value,  // Use stock movement as gross
    hourlyPay: totalHourlyPay.value,
    additions: totalAdditions.value,
    laborEarnings: returnsSummary.value.labor_earnings, // Add labor earnings
    deductions: totalDeductions.value,
    netPay: grossPayCalculation.value.netMovement.value + // Gross from stock
        totalHourlyPay.value +                        // Hours pay
        totalAdditions.value +                        // Allowances & commissions
        returnsSummary.value.labor_earnings -         // Labor earnings from returns
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
    try {
        const { data: lastPayout, error } = await supabase
            .from('payouts')
            .select('deductions')
            .eq('employee_id', props.worker.id)  // Change from employee_id to id
            .order('week_start', { ascending: false })
            .limit(1)
            .single()

        if (error) {
            console.error('Error fetching historical deductions:', error)
            return
        }

        // Calculate loan deduction if there's a balance
        if (props.worker.loan_balance > 0) {
            console.log('Worker has loan balance:', props.worker.loan_balance)
            console.log('Fetching loan data for worker_id:', props.worker.id)

            // Fetch ALL active loans for the worker (both cash and asset loans)
            const { data: loansData, error: loanError } = await supabase
                .from('loans')
                .select('amount, balance, loan_category, weekly_deduction')
                .eq('worker_id', props.worker.id)
                .eq('status', 'active')
                .gt('balance', 0)

            if (loanError) {
                console.error('Error fetching loan data:', loanError)
            }

            console.log('Loans data retrieved:', loansData)

            if (loansData && loansData.length > 0) {
                let totalSuggestedLoan = 0

                loansData.forEach(loan => {
                    if (loan.loan_category === 'asset' && loan.weekly_deduction) {
                        // Asset loan: use fixed weekly deduction
                        totalSuggestedLoan += loan.weekly_deduction
                        console.log(`Asset loan weekly deduction: ${loan.weekly_deduction}`)
                    } else {
                        // Cash loan: calculate 1/8 of original amount, capped at remaining balance
                        const weeklyPayment = Math.round(loan.amount / 8)
                        const cappedPayment = Math.min(weeklyPayment, loan.balance)
                        totalSuggestedLoan += cappedPayment
                        console.log(`Cash loan payment: ${cappedPayment} (1/8 of ${loan.amount}, balance: ${loan.balance})`)
                    }
                })

                console.log('Total suggested loan payment:', totalSuggestedLoan)
                suggestedDeductions.value.loan = totalSuggestedLoan

                // Only set the actual deduction if there's no existing loan deduction
                if (!payrollData.value.deductions.loan || payrollData.value.deductions.loan === 0) {
                    payrollData.value.deductions.loan = totalSuggestedLoan
                    console.log('Applied suggested loan payment to payroll data:', totalSuggestedLoan)
                }
            } else {
                console.log('No active loans with balance found')
            }
        } else {
            console.log('Worker has no loan balance')
        }
    } catch (error) {
        console.error('Error in fetchHistoricalDeductions:', error)
    }
}

// Modify the save function to handle the deductions
async function saveChanges() {
    if (isSaving.value) return

    isSaving.value = true

    try {
        // Prepare the data for saving (savings are handled separately)
        const payoutData = {
            employee_id: props.worker.id,  // Change from employee_id to id
            week_start: props.worker.week_start,
            gross_income: Number(payrollData.value.gross_income) || 0,
            paid_by_hours: payrollData.value.paid_by_hours,
            rate_snapshots: payrollData.value.rates,
            deductions: {
                sss: payrollData.value.deductions.contributions || 0,
                loan: payrollData.value.deductions.loan || 0,
                cash_advance: payrollData.value.deductions.cash_advance || 0
            },
            allowances: payrollData.value.allowances,
            commissions: payrollData.value.commissions,
            net_total: netPay.value,
            returns_summary: {
                as_repair_worker: returnsData.value.as_repair_worker,
                as_worker: returnsData.value.as_worker,
                totals: returnsSummary.value
            }
        }

        console.log('Emitting save data to parent:', payoutData)

        // Reset unsaved changes flag before emitting
        hasUnsavedChanges.value = false

        // Emit save event to parent
        emit('save', {
            employee_id: props.worker.id,
            week_start: props.worker.week_start,
            gross_income: Number(payrollData.value.gross_income) || 0,
            paid_by_hours: payrollData.value.paid_by_hours,
            rate_snapshots: payrollData.value.rates,
            deductions: {
                sss: payrollData.value.deductions.contributions || 0,
                loan: payrollData.value.deductions.loan || 0,
                cash_advance: payrollData.value.deductions.cash_advance || 0,
                savings: payrollData.value.savings || 0
            },
            allowances: payrollData.value.allowances,
            commissions: payrollData.value.commissions,
            net_total: netPay.value,
            returns_summary: {
                as_repair_worker: returnsData.value.as_repair_worker,
                as_worker: returnsData.value.as_worker,
                totals: returnsSummary.value
            }
        })

        // Close the modal
        closeModal()

    } catch (error) {
        console.error('Error saving payroll data:', error)
        alert('Failed to save payroll data. Please try again.')
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
            rates: { 
                inhouse: Number(props.worker?.regular_rate || props.worker?.inhouse_rate || 56.25), 
                assistant: Number(props.worker?.assistant_rate || 75.00) 
            },
            deductions: { contributions: props.worker?.deductions?.sss || 245, loan: props.worker?.deductions?.loan || 0, cash_advance: props.worker?.deductions?.cash_advance || 0 },
            allowances: { general: props.worker?.allowances?.general || 0, transport: props.worker?.allowances?.transport || 0, meal: props.worker?.allowances?.meal || 0 },
            commissions: { bonus: props.worker?.commissions?.bonus || 0, overtime: props.worker?.commissions?.overtime || 0, holiday: props.worker?.commissions?.holiday || 0 }
        }
        hasUnsavedChanges.value = false
    }
}

// Add function to fetch payment history
async function fetchPaymentHistory() {
    console.log('\n=== Fetching Payment History ===')
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
            .eq('employee_id', props.worker.id)  // Fixed: use worker.id instead of worker.employee_id
            .not('confirmed_at', 'is', null)  // Only get confirmed payouts
            .order('week_start', { ascending: false })
            .limit(10)

        if (error) throw error

        console.log('Raw confirmed payouts:', data)

        payrollHistory.value = data.map(payout => {
            // Get rates from rate_snapshots
            const rates = payout.rate_snapshots || {
                inhouse: Number(props.worker?.regular_rate || props.worker?.inhouse_rate || 56.25),
                assistant: Number(props.worker?.assistant_rate || 75.00)
            }

            // Calculate hours from paid_by_hours and rates
            let paid;
            if (typeof payout.paid_by_hours === 'number') {
                // Legacy format: convert number to object format
                paid = {
                    inhouse: payout.paid_by_hours,
                    assistant: 0
                };
                console.log('Legacy paid_by_hours format:', {
                    original: payout.paid_by_hours,
                    converted: paid
                })
            } else {
                // New JSONB format
                paid = payout.paid_by_hours || { inhouse: 0, assistant: 0 };
                console.log('JSONB paid_by_hours format:', paid)
            }

            const hours = {
                inhouse: rates.inhouse ? Math.round(Number(paid.inhouse || 0) / rates.inhouse) : 0,
                assistant: rates.assistant ? Math.round(Number(paid.assistant || 0) / rates.assistant) : 0
            }

            console.log('Calculated hours:', {
                paid_by_hours: paid,
                rates,
                calculated_hours: hours
            })

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

        console.log('Final processed history:', payrollHistory.value)
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

// Update the helper function to use payout instead of payment
function hasAdditions(payout) {
    const allowancesSum = Object.values(payout.allowances || {}).reduce((sum, val) => sum + (Number(val) || 0), 0)
    const commissionsSum = Object.values(payout.commissions || {}).reduce((sum, val) => sum + (Number(val) || 0), 0)
    return allowancesSum > 0 || commissionsSum > 0
}

// Add function to fetch returns data
async function fetchReturnsData() {
    if (!props.worker?.week_start) {
        console.log('No week start date available for returns fetch')
        return
    }

    try {
        console.log('Fetching returns data for worker:', props.worker.id)

        // Calculate week end date (week_start + 6 days)
        const weekStart = props.worker.week_start
        const weekEndDate = new Date(weekStart)
        weekEndDate.setDate(weekEndDate.getDate() + 6)
        const weekEnd = weekEndDate.toISOString().split('T')[0] // Format as YYYY-MM-DD

        console.log('Week range for returns:', { weekStart, weekEnd })

        // Get returns where worker is the repair worker (earning labor costs)
        const { data: asRepairWorker, error: repairError } = await supabase
            .from('returns')
            .select(`
                id,
                created_at,
                worker_id,
                product_id,
                quantity,
                type,
                labor_cost,
                product:product_id (name),
                worker:worker_id (name)
            `)
            .eq('repair_worker_id', props.worker.id)
            .gte('created_at', weekStart)
            .lte('created_at', weekEnd)

        if (repairError) {
            console.error('Error fetching repair worker returns:', repairError)
        }

        // Get returns where worker has returns (items being returned)
        const { data: asWorker, error: workerError } = await supabase
            .from('returns')
            .select(`
                id,
                created_at,
                product_id,
                quantity,
                type,
                product:product_id (name)
            `)
            .eq('worker_id', props.worker.id)
            .gte('created_at', weekStart)
            .lte('created_at', weekEnd)

        if (workerError) {
            console.error('Error fetching worker returns:', workerError)
        }

        returnsData.value = {
            as_repair_worker: asRepairWorker || [],
            as_worker: asWorker || []
        }

        console.log('Returns data loaded:', returnsData.value)
    } catch (error) {
        console.error('Error in fetchReturnsData:', error)
    }
}
</script>

<template>
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <div class="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl w-full max-w-[1200px] overflow-hidden max-h-[90vh] flex flex-col border border-gray-700/50">
            <!-- Enhanced Header -->
            <div class="relative bg-gradient-to-r from-orange-600/20 to-orange-500/10 border-b border-orange-500/20">
                <div class="flex items-center justify-between p-6">
                    <div class="flex items-center gap-4">
                        <div class="relative">
                            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-lg font-bold text-white shadow-lg">
                                {{ props.worker.avatar }}
                            </div>
                            <div class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold text-white">{{ props.worker.name }}</h2>
                            <p class="text-sm text-orange-300/80 flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                                Week of {{ props.worker.week_start }}
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <button @click="showHistoryPanel = !showHistoryPanel"
                            class="group flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-all duration-200 border border-gray-600/50 hover:border-gray-500">
                            <svg class="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span class="text-sm font-medium">{{ showHistoryPanel ? 'Hide History' : 'Show History' }}</span>
                        </button>
                        <button @click="closeModal" class="group p-2 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all duration-200">
                            <svg class="w-6 h-6 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <!-- Decorative gradient line -->
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
            </div>

            <div class="flex flex-1 overflow-hidden">
                <!-- Enhanced Main Content -->
                <div class="flex-1 overflow-y-auto bg-gray-900/50">
                    <!-- Enhanced Summary Cards -->
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-xl font-bold text-white flex items-center gap-2">
                                <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
                                Payroll Summary
                            </h3>
                            <button @click="showBreakdown = !showBreakdown"
                                class="group flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-all duration-200">
                                <span class="text-sm">{{ showBreakdown ? 'Hide' : 'Show' }} Breakdown</span>
                                <svg class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': showBreakdown }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </button>
                        </div>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <!-- Net Pay Card -->
                            <div class="relative bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-2xl p-4 border border-green-500/20 overflow-hidden">
                                <div class="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -translate-y-10 translate-x-10"></div>
                                <div class="relative">
                                    <div class="flex items-center gap-2 mb-2">
                                        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <h3 class="text-gray-400 text-sm font-medium">Net Pay</h3>
                                    </div>
                                    <p class="text-2xl font-bold text-green-400 mb-1">{{ formatCurrency(payrollSummary.netPay) }}</p>
                                    <div v-if="showBreakdown" class="mt-4 pt-4 border-t border-green-500/20 space-y-3 text-sm">
                                        <div class="flex justify-between items-center">
                                            <span class="text-gray-400">Gross (Stock)</span>
                                            <span class="text-green-400 font-medium">{{ formatCurrency(payrollSummary.grossIncome) }}</span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="text-gray-400">Hours Pay</span>
                                            <span class="text-blue-400 font-medium">{{ formatCurrency(payrollSummary.hourlyPay) }}</span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="text-gray-400">Additions</span>
                                            <span class="text-green-400 font-medium">+{{ formatCurrency(payrollSummary.additions) }}</span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="text-gray-400">Deductions</span>
                                            <span class="text-red-400 font-medium">-{{ formatCurrency(payrollSummary.deductions) }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Gross Card -->
                            <div class="relative bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-2xl p-4 border border-orange-500/20 overflow-hidden">
                                <div class="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -translate-y-10 translate-x-10"></div>
                                <div class="relative">
                                    <div class="flex items-center gap-2 mb-2">
                                        <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
                                        <h3 class="text-gray-400 text-sm font-medium">Gross</h3>
                                    </div>
                                    <p class="text-2xl font-bold mb-1" :class="[
                                        grossPayCalculation.netMovement.value > 0 ? 'text-orange-400' : 'text-red-400'
                                    ]">{{ formatCurrency(grossPayCalculation.netMovement.value) }}</p>
                                    <p class="text-xs text-gray-500">{{ grossPayCalculation.netMovement.pcs }} pcs</p>
                                    <div v-if="showBreakdown" class="mt-4 pt-4 border-t border-orange-500/20 space-y-3 text-sm">
                                        <div class="flex justify-between items-center">
                                            <span class="text-gray-400">Previous</span>
                                            <span class="text-yellow-400 font-medium">{{ formatCurrency(grossPayCalculation.previousStock.value) }}</span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="text-gray-400">Deliveries</span>
                                            <span class="text-green-400 font-medium">{{ formatCurrency(grossPayCalculation.deliveries.value) }}</span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="text-gray-400">Current</span>
                                            <span class="text-blue-400 font-medium">{{ formatCurrency(grossPayCalculation.currentStock.value) }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Hours Card -->
                            <div class="relative bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-2xl p-4 border border-blue-500/20 overflow-hidden">
                                <div class="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-10 translate-x-10"></div>
                                <div class="relative">
                                    <div class="flex items-center gap-2 mb-2">
                                        <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        <h3 class="text-gray-400 text-sm font-medium">Total Hours</h3>
                                    </div>
                                    <p class="text-2xl font-bold text-blue-400 mb-1">{{ totalHours }} hrs</p>
                                    <div class="mt-3 space-y-2 text-sm">
                                        <div class="flex justify-between text-gray-400">
                                            <span>{{ hourlyTotals.inhouse.hours }} hrs × ₱{{ formatNumber(hourlyTotals.inhouse.rate) }}</span>
                                            <span class="text-blue-300">₱{{ formatNumber(hourlyTotals.inhouse.amount) }}</span>
                                        </div>
                                        <div class="flex justify-between text-gray-400">
                                            <span>{{ hourlyTotals.assistant.hours }} hrs × ₱{{ formatNumber(hourlyTotals.assistant.rate) }}</span>
                                            <span class="text-blue-300">₱{{ formatNumber(hourlyTotals.assistant.amount) }}</span>
                                        </div>
                                        <div class="flex justify-between pt-2 mt-2 border-t border-blue-500/20 text-blue-400 font-bold">
                                            <span>Total</span>
                                            <span>₱{{ formatNumber(totalHourlyPay) }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Savings Card 
                            <div class="relative bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-2xl p-4 border border-purple-500/20 overflow-hidden">
                                <div class="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -translate-y-10 translate-x-10"></div>
                                <div class="relative">
                                    <div class="flex items-center gap-2 mb-2">
                                        <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
                                        <h3 class="text-gray-400 text-sm font-medium">Savings to Date</h3>
                                    </div>
                                    <p class="text-2xl font-bold text-purple-400">{{ formatCurrency(payrollSummary.savingsToDate) }}</p>
                                </div>
                            </div>-->

                            <!-- Loan Card -->
                            <div class="relative bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-2xl p-4 border border-yellow-500/20 overflow-hidden">
                                <div class="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-full -translate-y-10 translate-x-10"></div>
                                <div class="relative">
                                    <div class="flex items-center gap-2 mb-2">
                                        <div class="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                        <h3 class="text-gray-400 text-sm font-medium">Loan Balance</h3>
                                    </div>
                                    <p class="text-2xl font-bold text-yellow-400">{{ formatCurrency(payrollSummary.loanBalance) }}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Enhanced Tabs -->
                    <div class="px-6">
                        <div class="flex gap-2 mb-6 p-1 bg-gray-800/50 rounded-2xl border border-gray-700/50">
                            <button v-for="section in ['hours', 'deductions', 'additions', 'deliveries']" :key="section"
                                @click="activeSection = section" :class="[
                                    'flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl',
                                    activeSection === section
                                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                ]">
                                <span class="flex items-center justify-center gap-2">
                                    <svg v-if="section === 'hours'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <svg v-else-if="section === 'deductions'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                                    </svg>
                                    <svg v-else-if="section === 'additions'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                    </svg>
                                    <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                                    </svg>
                                    {{ section.charAt(0).toUpperCase() + section.slice(1) }}
                                </span>
                            </button>
                        </div>
                    </div>

                    <!-- Enhanced Content Sections -->
                    <div class="px-6 pb-6 space-y-6">
                        <!-- Hours Section -->
                        <div v-show="activeSection === 'hours'" class="space-y-6">
                            <!-- Gross Income -->
                            <div class="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50">
                                <label class="flex items-center gap-2 text-gray-300 font-medium mb-3">
                                    <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    Gross Income
                                </label>
                                <div class="relative">
                                    <input type="number" v-model.number="payrollData.gross_income"
                                        class="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200" 
                                        placeholder="Enter gross income amount"/>
                                    <div class="absolute right-3 top-3 text-gray-400 text-sm">₱</div>
                                </div>
                            </div>

                            <!-- Enhanced Hours Summary Card -->
                            <div class="bg-gradient-to-br from-blue-500/5 to-blue-600/5 rounded-2xl p-6 border border-blue-500/20">
                                <div class="flex justify-between items-center mb-4">
                                    <h3 class="text-blue-300 font-semibold flex items-center gap-2">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                        Hours Breakdown
                                    </h3>
                                    <button @click="showHoursBreakdown = !showHoursBreakdown"
                                        class="group flex items-center gap-2 px-3 py-1.5 text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all duration-200">
                                        <span class="text-sm">{{ showHoursBreakdown ? 'Hide' : 'Show' }} Details</span>
                                        <svg class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': showHoursBreakdown }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                        </svg>
                                    </button>
                                </div>

                                <!-- In-house Hours -->
                                <div class="space-y-4">
                                    <div class="bg-gray-800/30 rounded-xl p-4">
                                        <div class="flex justify-between items-center mb-3">
                                            <label class="text-gray-300 font-medium">In-house Hours</label>
                                            <span class="text-blue-400 text-sm font-medium bg-blue-500/10 px-2 py-1 rounded-lg">₱{{ formatNumber(hourlyTotals.inhouse.rate) }}/hr</span>
                                        </div>
                                        <div class="flex gap-4">
                                            <input type="number" v-model.number="payrollData.hours.inhouse"
                                                class="flex-1 bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" 
                                                placeholder="0"/>
                                            <div class="w-36 text-right bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
                                                <div class="text-blue-400 font-bold text-lg">₱{{ formatNumber(hourlyTotals.inhouse.amount) }}</div>
                                                <div class="text-xs text-blue-300/70">{{ hourlyTotals.inhouse.hours }} hours</div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Assistant Hours -->
                                    <div class="bg-gray-800/30 rounded-xl p-4">
                                        <div class="flex justify-between items-center mb-3">
                                            <label class="text-gray-300 font-medium">Assistant Hours</label>
                                            <span class="text-purple-400 text-sm font-medium bg-purple-500/10 px-2 py-1 rounded-lg">₱{{ formatNumber(hourlyTotals.assistant.rate) }}/hr</span>
                                        </div>
                                        <div class="flex gap-4">
                                            <input type="number" v-model.number="payrollData.hours.assistant"
                                                class="flex-1 bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200" 
                                                placeholder="0"/>
                                            <div class="w-36 text-right bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
                                                <div class="text-purple-400 font-bold text-lg">₱{{ formatNumber(hourlyTotals.assistant.amount) }}</div>
                                                <div class="text-xs text-purple-300/70">{{ hourlyTotals.assistant.hours }} hours</div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Total Hours Summary -->
                                    <div class="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/30">
                                        <div class="flex justify-between items-center">
                                            <div>
                                                <div class="text-white font-semibold">Total Hours Pay</div>
                                                <div class="text-sm text-gray-400">{{ totalHours }} total hours worked</div>
                                            </div>
                                            <div class="text-2xl font-bold text-blue-400">₱{{ formatNumber(totalHourlyPay) }}</div>
                                        </div>
                                    </div>

                                    <!-- Enhanced Hours Breakdown Panel -->
                                    <div v-if="showHoursBreakdown" class="mt-6 pt-6 border-t border-blue-500/20">
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <!-- In-house Hours Breakdown -->
                                            <div class="bg-blue-500/5 rounded-xl p-4 border border-blue-500/20">
                                                <div class="flex justify-between items-center">
                                                    <div>
                                                        <div class="text-blue-300 font-medium">In-house Work</div>
                                                        <div class="text-xs text-gray-400">{{ hourlyTotals.inhouse.hours }} hrs × ₱{{ formatNumber(hourlyTotals.inhouse.rate) }}</div>
                                                    </div>
                                                    <div class="text-blue-400 font-bold">₱{{ formatNumber(hourlyTotals.inhouse.amount) }}</div>
                                                </div>
                                            </div>

                                            <!-- Assistant Hours Breakdown -->
                                            <div class="bg-purple-500/5 rounded-xl p-4 border border-purple-500/20">
                                                <div class="flex justify-between items-center">
                                                    <div>
                                                        <div class="text-purple-300 font-medium">Assistant Work</div>
                                                        <div class="text-xs text-gray-400">{{ hourlyTotals.assistant.hours }} hrs × ₱{{ formatNumber(hourlyTotals.assistant.rate) }}</div>
                                                    </div>
                                                    <div class="text-purple-400 font-bold">₱{{ formatNumber(hourlyTotals.assistant.amount) }}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Enhanced Deductions Section -->
                        <div v-show="activeSection === 'deductions'" class="space-y-6">
                            <!-- Savings -->
                            <div class="bg-gradient-to-br from-purple-500/5 to-purple-600/5 rounded-2xl p-5 border border-purple-500/20">
                                <div class="flex justify-between items-center mb-3">
                                    <label class="text-purple-300 font-medium flex items-center gap-2">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                                        </svg>
                                        Savings
                                    </label>
                                    <span class="text-purple-400 text-sm font-medium bg-purple-500/10 px-3 py-1 rounded-lg">₱{{ formatNumber(payrollSummary.savingsToDate) }} total</span>
                                </div>
                                <div class="relative">
                                    <input type="number" v-model.number="payrollData.savings" :class="[
                                        'w-full bg-gray-700/50 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 transition-all duration-200',
                                        suggestedDeductions.savings > 0 
                                            ? 'border-purple-500/50 focus:border-purple-500 focus:ring-purple-500/20' 
                                            : 'border-gray-600/50 focus:border-purple-500 focus:ring-purple-500/20'
                                    ]" placeholder="Enter savings amount"/>
                                    <div v-if="suggestedDeductions.savings > 0"
                                        class="flex items-center gap-2 mt-2 text-xs text-purple-400 bg-purple-500/10 rounded-lg px-3 py-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                        Auto-populated from previous payroll
                                    </div>
                                </div>
                            </div>

                            <!-- SSS -->
                            <div class="bg-gradient-to-br from-blue-500/5 to-blue-600/5 rounded-2xl p-5 border border-blue-500/20">
                                <label class="text-blue-300 font-medium flex items-center gap-2 mb-3">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                                    </svg>
                                    SSS Contribution
                                </label>
                                <div class="relative">
                                    <input type="number" v-model.number="payrollData.deductions.contributions" :class="[
                                        'w-full bg-gray-700/50 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 transition-all duration-200',
                                        suggestedDeductions.sss > 0 
                                            ? 'border-blue-500/50 focus:border-blue-500 focus:ring-blue-500/20' 
                                            : 'border-gray-600/50 focus:border-blue-500 focus:ring-blue-500/20'
                                    ]" placeholder="Enter SSS contribution"/>
                                    <div v-if="suggestedDeductions.sss > 0"
                                        class="flex items-center gap-2 mt-2 text-xs text-blue-400 bg-blue-500/10 rounded-lg px-3 py-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                        <span v-if="sssSource === 'default'">
                                            Standard SSS contribution amount
                                        </span>
                                        <span v-else-if="sssSource === 'historical'">
                                            Auto-populated from previous payroll (₱{{ suggestedDeductions.sss }})
                                        </span>
                                        <span v-else-if="sssSource === 'current'">
                                            From current payout record
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Loan -->
                            <div class="bg-gradient-to-br from-yellow-500/5 to-yellow-600/5 rounded-2xl p-5 border border-yellow-500/20">
                                <div class="flex justify-between items-center mb-3">
                                    <label class="text-yellow-300 font-medium flex items-center gap-2">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                                        </svg>
                                        Loan Payment
                                    </label>
                                    <span class="text-yellow-400 text-sm font-medium bg-yellow-500/10 px-3 py-1 rounded-lg">₱{{ formatNumber(payrollSummary.loanBalance) }} remaining</span>
                                </div>
                                <div class="relative">
                                    <input type="number" v-model.number="payrollData.deductions.loan" :class="[
                                        'w-full bg-gray-700/50 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 transition-all duration-200',
                                        suggestedDeductions.loan > 0 
                                            ? 'border-yellow-500/50 focus:border-yellow-500 focus:ring-yellow-500/20' 
                                            : 'border-gray-600/50 focus:border-yellow-500 focus:ring-yellow-500/20'
                                    ]" placeholder="Enter loan payment"/>
                                    <div v-if="suggestedDeductions.loan > 0"
                                        class="flex items-center gap-2 mt-2 text-xs text-yellow-400 bg-yellow-500/10 rounded-lg px-3 py-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                        Auto-calculated weekly payment (cash: 1/8, asset: fixed deduction)
                                    </div>
                                </div>
                            </div>

                            <!-- Cash Advance -->
                            <div class="bg-gradient-to-br from-red-500/5 to-red-600/5 rounded-2xl p-5 border border-red-500/20">
                                <label class="text-red-300 font-medium flex items-center gap-2 mb-3">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                                    </svg>
                                    Cash Advance
                                </label>
                                <input type="number" v-model.number="payrollData.deductions.cash_advance"
                                    class="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200" 
                                    placeholder="Enter cash advance amount"/>
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

                        <!-- Enhanced Deliveries Section -->
                        <div v-show="activeSection === 'deliveries'" class="space-y-6">
                            <!-- Stock Movement Grid -->
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                        <!-- History Section -->
                        <div v-show="activeSection === 'history'" class="space-y-4">
                            <div v-if="isLoadingHistory" class="text-center py-8">
                                <div
                                    class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto">
                                </div>
                                <div class="text-gray-400 mt-2">Loading payment history...</div>
                            </div>

                            <div v-else-if="!props.worker.payoutHistory?.length" class="text-center py-8 text-gray-400">
                                No payment history available
                            </div>

                            <div v-else class="space-y-4">
                                <div v-for="payout in props.worker.payoutHistory" :key="payout.week_start"
                                    class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                                    <div class="flex justify-between items-start mb-3">
                                        <div>
                                            <div class="text-gray-300">{{ new
                                                Date(payout.week_start).toLocaleDateString() }}</div>
                                            <div class="text-sm text-gray-400">Regular Payroll</div>
                                        </div>
                                        <div class="text-right">
                                            <div class="text-blue-400 font-bold text-lg">₱{{
                                                formatNumber(payout.net_total) }}</div>
                                        </div>
                                    </div>

                                    <!-- Payment Details -->
                                    <div class="space-y-3 mt-4 pt-3 border-t border-gray-600">
                                        <!-- Hours Breakdown -->
                                        <div class="grid grid-cols-2 gap-4">
                                            <!-- Only show in-house if it exists -->
                                            <div v-if="payout.paid_by_hours?.inhouse">
                                                <div class="text-sm text-gray-400 mb-1">In-house Hours</div>
                                                <div class="flex justify-between items-center">
                                                    <span class="text-gray-300">{{
                                                        Math.round(payout.paid_by_hours.inhouse / 56.25) }}
                                                        hrs</span>
                                                    <span class="text-blue-400">₱{{
                                                        formatNumber(payout.paid_by_hours.inhouse) }}</span>
                                                </div>
                                            </div>
                                            <!-- Only show assistant if it exists -->
                                            <div v-if="payout.paid_by_hours?.assistant">
                                                <div class="text-sm text-gray-400 mb-1">Assistant Hours</div>
                                                <div class="flex justify-between items-center">
                                                    <span class="text-gray-300">{{
                                                        Math.round(payout.paid_by_hours.assistant / 75) }} hrs</span>
                                                    <span class="text-blue-400">₱{{
                                                        formatNumber(payout.paid_by_hours.assistant) }}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Gross and Adjustments -->
                                        <div class="grid grid-cols-2 gap-4">
                                            <div>
                                                <div class="text-sm text-gray-400 mb-1">Gross Income</div>
                                                <div class="text-blue-400">₱{{ formatNumber(payout.gross_income || 0) }}
                                                </div>
                                            </div>
                                            <div>
                                                <div class="text-sm text-gray-400 mb-1">Deductions</div>
                                                <div class="text-red-400">-₱{{ formatNumber(
                                                    (payout.deductions?.sss || 0) +
                                                    (payout.deductions?.loan || 0) +
                                                    (payout.deductions?.cash_advance || 0)
                                                ) }}</div>
                                                <!-- Show breakdown if exists -->
                                                <div v-if="payout.deductions" class="text-xs text-gray-500 mt-1">
                                                    <div v-if="payout.deductions.sss">SSS: ₱{{
                                                        formatNumber(payout.deductions.sss) }}</div>
                                                    <div v-if="payout.deductions.loan">Loan: ₱{{
                                                        formatNumber(payout.deductions.loan) }}</div>
                                                    <div v-if="payout.deductions.cash_advance">Cash Advance: ₱{{
                                                        formatNumber(payout.deductions.cash_advance) }}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Additions if they exist -->
                                        <div v-if="hasAdditions(payout)">
                                            <div class="text-sm text-gray-400 mb-1">Additional Pay</div>
                                            <div class="text-green-400">+₱{{formatNumber(
                                                Object.values(payout.allowances || {}).reduce((sum, val) => sum +
                                                    (Number(val) || 0), 0) +
                                                Object.values(payout.commissions || {}).reduce((sum, val) => sum +
                                                    (Number(val) || 0), 0)
                                            )}}</div>
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
                                                <span class="text-blue-400">{{ record.details.hours.inhouse }}
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
                                                    formatNumber(record.details.paid_by_hours.inhouse +
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

            <!-- Returns Section -->
            <div class="bg-gray-700/50 rounded-lg p-4 mt-4">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="text-sm font-medium text-gray-400">Returns & Labor</h4>
                    <span class="text-green-400 font-bold">+₱{{ returnsSummary.labor_earnings.toLocaleString() }}</span>
                </div>

                <!-- Labor Earnings -->
                <div v-if="returnsData.as_repair_worker?.length > 0" class="space-y-3">
                    <div class="text-sm text-gray-400 mb-2">Labor Earnings</div>
                    <div v-for="item in returnsData.as_repair_worker" :key="item.id"
                        class="flex justify-between text-sm">
                        <div class="text-gray-300">
                            {{ item.type === 'repair' ? 'Repair' : 'Transform' }} - {{ item.product?.name || `Product
                            ${item.product_id}` }}
                            <div class="text-xs text-gray-500">{{ item.quantity || 0 }} pcs for {{ item.worker?.name }}
                            </div>
                        </div>
                        <span class="text-green-400">₱{{ (item.labor_cost || 0).toLocaleString() }}</span>
                    </div>
                </div>

                <!-- Returns Info -->
                <div v-if="returnsData.as_worker?.length > 0" class="mt-4">
                    <div class="text-sm text-gray-400 mb-2">Returns</div>
                    <div v-for="item in returnsData.as_worker" :key="item.id" class="flex justify-between text-sm">
                        <div class="text-gray-300">
                            {{ item.type === 'repair' ? 'For Repair' : item.type === 'transform' ? 'For Transform' :
                                'Return' }} -
                            {{ item.product?.name || `Product ${item.product_id}` }}
                            <div class="text-xs text-gray-500">{{ item.quantity || 0 }} pcs</div>
                        </div>
                    </div>
                </div>

                <!-- Summary Stats -->
                <div class="grid grid-cols-3 gap-3 mt-4 text-center">
                    <div v-if="returnsSummary.repaired_quantity > 0" class="bg-gray-700/30 rounded-lg p-2">
                        <div class="text-xs text-gray-400">Repaired</div>
                        <div class="text-sm font-medium text-blue-400">{{ returnsSummary.repaired_quantity }} pcs</div>
                    </div>
                    <div v-if="returnsSummary.transformed_quantity > 0" class="bg-gray-700/30 rounded-lg p-2">
                        <div class="text-xs text-gray-400">Transformed</div>
                        <div class="text-sm font-medium text-purple-400">{{ returnsSummary.transformed_quantity }} pcs
                        </div>
                    </div>
                    <div v-if="returnsSummary.returned_quantity > 0" class="bg-gray-700/30 rounded-lg p-2">
                        <div class="text-xs text-gray-400">Returned</div>
                        <div class="text-sm font-medium text-red-400">{{ returnsSummary.returned_quantity }} pcs</div>
                    </div>
                </div>
            </div>

            <!-- Enhanced Footer Actions -->
            <div class="bg-gray-800/30 backdrop-blur-sm border-t border-gray-700/50 p-6">
                <div class="flex justify-between items-center">
                    <button @click="resetForm" 
                        class="group flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all duration-200 border border-gray-600/50 hover:border-gray-500">
                        <svg class="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        <span class="text-sm font-medium">Reset Changes</span>
                    </button>
                    <div class="flex items-center gap-3">
                        <button @click="closeModal" 
                            class="px-6 py-2.5 text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all duration-200 border border-gray-600/50 hover:border-gray-500">
                            <span class="font-medium">Cancel</span>
                        </button>
                        <button id="saveBtn" @click="saveChanges" :disabled="isSaving"
                            class="group relative px-8 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden">
                            <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                            <span class="relative flex items-center gap-2">
                                <svg v-if="!isSaving" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                </svg>
                                <svg v-else class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                </svg>
                                {{ isSaving ? 'Saving...' : 'Save Changes' }}
                            </span>
                        </button>
                    </div>
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