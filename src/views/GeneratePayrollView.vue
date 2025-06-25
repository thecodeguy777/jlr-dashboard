<script setup>
import { ref, computed, watch } from 'vue'
import PayrollEditor from '../components/PayrollEditor.vue'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

const workers = ref([])
const selectedWeek = ref(new Date().toISOString().split('T')[0])
const showPayrollEditor = ref(false)
const selectedWorker = ref(null)
const isProcessing = ref(false)
const isLoading = ref(false)
const error = ref(null)

// Calculate week range based on selected date
const weekRange = computed(() => {
    const date = new Date(selectedWeek.value)
    // Move to Saturday of that week
    date.setDate(date.getDate() + (6 - date.getDay()))
    date.setHours(0, 0, 0, 0)
    const saturday = new Date(date)
    const sunday = new Date(saturday)
    sunday.setDate(saturday.getDate() - 6)
    return {
        start: sunday.toISOString().split('T')[0],
        end: saturday.toISOString().split('T')[0]
    }
})

// Computed properties
const readyToCommit = computed(() => {
    return workers.value.some(w => !w.confirmed_at)
})

// Methods
function openPayrollEditor(worker) {
    console.log('\n=== Opening PayrollEditor ===')
    console.log('Raw worker data:', worker)
    console.log('Previous stock:', worker.previous_stock)
    console.log('Current stock:', worker.current_stock)
    console.log('Deliveries:', worker.deliveries)

    selectedWorker.value = {
        ...worker,
        week: worker.week_start,
        position: 'Worker',
        employee_id: worker.id,
        regular_rate: worker.regular_rate,
        assistant_rate: worker.assistant_rate,
        regular_hours: worker.regular_hours,
        assistant_hours: worker.assistant_hours,
        paid_by_hours: worker.paid_by_hours,
        gross: worker.gross,
        deductions: worker.deductions,
        allowances: worker.allowances,
        commissions: worker.commissions,
        savings: worker.savings,
        total_savings: worker.total_savings,
        loan_balance: worker.loan_balance,
        previous_stock: worker.previous_stock,
        current_stock: worker.current_stock,
        deliveries: worker.deliveries
    }
    console.log('Processed worker data:', selectedWorker.value)
    showPayrollEditor.value = true
}

async function handlePayrollSave(data) {
    try {
        const { error } = await supabase
            .from('payouts')
            .upsert({
                ...data,
                status: 'pending',
                confirmed_at: null  // Keep it null until committed
            })

        if (error) throw error

        showPayrollEditor.value = false
        await loadData() // Reload data after save
    } catch (err) {
        console.error('Failed to save payout:', err)
        alert('Failed to save payout. Please try again.')
    }
}

async function commitAll() {
    isProcessing.value = true
    try {
        const now = new Date().toISOString()
        const pendingWorkers = workers.value.filter(w => !w.confirmed_at)

        for (const worker of pendingWorkers) {
            // Use the same transaction for each worker
            const { data, error: txError } = await supabase.rpc('commit_payout', {
                p_worker_id: worker.id,
                p_week_start: worker.week_start,
                p_confirmed_at: now,
                p_amount: worker.net,
                p_loan_deduction: worker.deductions.loan || 0,
                p_savings_amount: worker.savings || 0
            })

            if (txError) {
                console.error(`Failed to commit payout for ${worker.name}:`, txError)
                throw new Error(`Failed to commit payout for ${worker.name}`)
            }
        }

        // Reload data after committing all
        await loadData()
    } catch (error) {
        console.error('Failed to commit payouts:', error)
        alert('Failed to commit payouts. Please try again.')
    } finally {
        isProcessing.value = false
    }
}

function getDeliveryDiff(current, previous) {
    return current - previous
}

// Helper functions
async function fetchSavings(worker_id, week_start) {
    const { data, error } = await supabase
        .from('savings')
        .select('amount')
        .eq('worker_id', worker_id)
        .eq('week_start', week_start)
        .eq('type', 'auto')
        .maybeSingle()

    if (error) {
        console.error('Failed to fetch savings:', error)
        return 0
    }

    return data?.amount || 0
}

async function fetchTotalSavings(worker_id) {
    const { data, error } = await supabase
        .from('savings')
        .select('amount')
        .eq('worker_id', worker_id)

    if (error) {
        console.error('Failed to fetch total savings:', error)
        return 0
    }

    return data.reduce((sum, s) => sum + (s.amount || 0), 0)
}

// Load workers and their payroll data
async function loadData() {
    isLoading.value = true
    error.value = null

    try {
        // Calculate week dates first to ensure they're available throughout the function
        const weekStartStr = weekRange.value.start
        const weekEndStr = weekRange.value.end

        // Calculate next week's date (for current stock) and previous week's date (for previous stock)
        const nextWeekDate = new Date(weekStartStr)
        nextWeekDate.setDate(nextWeekDate.getDate() + 7)
        const nextWeekStr = format(nextWeekDate, 'yyyy-MM-dd')

        // Previous week is the week_start date itself
        const prevWeekStr = weekStartStr

        // 1. Get all active workers
        const { data: workersData, error: workersError } = await supabase
            .from('workers')
            .select('*')
            .eq('is_active', true)

        if (workersError) throw workersError

        // 2. Get existing payouts for this week
        const { data: payoutsData, error: payoutsError } = await supabase
            .from('payouts')
            .select(`
                *,
                id,
                employee_id,
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
            .eq('week_start', weekStartStr)
            .is('confirmed_at', null)  // Get payouts that are NOT confirmed yet

        if (payoutsError) throw payoutsError

        // Log the payout data to check what we're getting
        console.log('Payout data:', payoutsData)

        // 3. Get products info
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, name, price_per_unit, category')

        if (productsError) throw productsError

        // Create a price map for quick lookup
        const priceMap = products.reduce((acc, p) => {
            acc[p.id] = p.price_per_unit
            return acc
        }, {})

        // 4. Get previous stock (at week_start)
        const { data: prevStock, error: prevError } = await supabase
            .from('bodega_stock')
            .select('*, products(name, category, price_per_unit), workers(name)')
            .eq('week_start', prevWeekStr)

        // If no exact match for previous week, try to find the most recent stock before week_start
        let previousStock = prevStock
        if (!prevStock || prevStock.length === 0) {
            const { data: recentStock } = await supabase
                .from('bodega_stock')
                .select('*, products(name, category, price_per_unit), workers(name)')
                .lt('week_start', weekStartStr)
                .order('week_start', { ascending: false })
                .limit(50)

            previousStock = recentStock || []
        }

        // 5. Get current stock (at next week)
        const { data: currentStock, error: currentStockError } = await supabase
            .from('bodega_stock')
            .select('*, products(name, category, price_per_unit), workers(name)')
            .eq('week_start', nextWeekStr)

        if (prevError) console.error('Error fetching previous stock:', prevError)
        if (currentStockError) throw currentStockError

        // 6. Get deliveries for the week
        const { data: deliveries, error: deliveriesError } = await supabase
            .from('deliveries')
            .select(`
                id,
                worker_id,
                product_id,
                quantity,
                delivery_date,
                price_snapshot,
                products:product_id (
                    name,
                    category,
                    price_per_unit
                )
            `)
            .gte('delivery_date', weekStartStr)
            .lte('delivery_date', weekEndStr)

        if (deliveriesError) throw deliveriesError

        // Helper function to get previous stock quantity
        function getPreviousStockQuantity(workerId, productId) {
            const stockItems = (previousStock || []).filter(
                item => item.worker_id === workerId && item.product_id === productId
            )
            return stockItems.reduce((sum, item) => sum + (item.quantity || 0), 0)
        }

        // Process workers data
        workers.value = await Promise.all(workersData.map(async (worker) => {
            const existingPayout = payoutsData?.find(p => p.employee_id === worker.id)
            console.log('\n=== Processing Worker Data ===')
            console.log('Worker:', worker.name)
            console.log('Existing payout:', existingPayout)

            // Initialize variables
            let regularHours = 0
            let assistantHours = 0
            let regularRate = 56.25
            let assistantRate = 75.00
            let paidByHours = { regular: 0, assistant: 0 }
            let deductions = {
                sss: 0,  // Default to 0 instead of 245
                loan: 0,
                cash_advance: 0
            }
            let allowances = {
                transport: 0,
                meal: 0,
                general: 0
            }
            let commissions = {
                bonus: 0,
                overtime: 0,
                holiday: 0
            }

            if (existingPayout) {
                // Handle rate snapshots (default to standard rates if not present)
                regularRate = existingPayout.rate_snapshots?.regular || 56.25
                assistantRate = existingPayout.rate_snapshots?.assistant || 75.00

                // Handle paid_by_hours (could be a number or an object)
                if (existingPayout.paid_by_hours) {
                    if (typeof existingPayout.paid_by_hours === 'number') {
                        // If it's a single number, assume it's regular hours
                        paidByHours = {
                            regular: existingPayout.paid_by_hours,
                            assistant: 0
                        }
                        regularHours = Number(paidByHours.regular) / Number(regularRate)
                        assistantHours = 0
                    } else if (typeof existingPayout.paid_by_hours === 'object') {
                        paidByHours = {
                            regular: Number(existingPayout.paid_by_hours.regular || 0),
                            assistant: Number(existingPayout.paid_by_hours.assistant || 0)
                        }
                        regularHours = paidByHours.regular / regularRate
                        assistantHours = paidByHours.assistant / assistantRate
                    }
                }

                // Clean up deductions (handle empty strings and respect past SSS value)
                deductions = {
                    // For SSS: if it was 245 before, keep it 245, otherwise use 0
                    sss: existingPayout.deductions?.sss === 245 ? 245 : 0,
                    loan: Number(existingPayout.deductions?.loan || 0),
                    cash_advance: Number(existingPayout.deductions?.cash_advance || 0)
                }

                // Clean up allowances
                allowances = {
                    transport: Number(existingPayout.allowances?.transport || 0),
                    meal: Number(existingPayout.allowances?.meal || 0),
                    general: Number(existingPayout.allowances?.general || 0)
                }

                // Clean up commissions
                commissions = {
                    bonus: Number(existingPayout.commissions?.bonus || 0),
                    overtime: Number(existingPayout.commissions?.overtime || 0),
                    holiday: Number(existingPayout.commissions?.holiday || 0)
                }

                console.log('Processed payout data:', {
                    hours: { regularHours, assistantHours },
                    rates: { regularRate, assistantRate },
                    paidByHours,
                    deductions,
                    allowances,
                    commissions
                })
            } else {
                // For new payouts, use worker's hourly rate
                regularRate = worker.regular_rate || 56.25
                assistantRate = worker.assistant_rate || 75.00
                regularHours = worker.regular_hours || 0
                assistantHours = worker.assistant_hours || 0

                // Calculate paid_by_hours
                paidByHours = {
                    regular: regularHours * regularRate,
                    assistant: assistantHours * assistantRate
                }

                console.log('Calculated from worker rates:', {
                    regularHours,
                    assistantHours,
                    regularRate,
                    assistantRate,
                    paidByHours
                })
            }

            // Calculate total hours pay
            const hoursPay = (regularHours * regularRate) + (assistantHours * assistantRate)
            console.log('Final hours calculation:', {
                regularHours,
                assistantHours,
                regularRate,
                assistantRate,
                paidByHours,
                hoursPay
            })

            // Group current stock by category
            const workerCurrStock = (currentStock || []).filter(s => s.worker_id === worker.id)
            const workerPrevStock = (previousStock || []).filter(s => s.worker_id === worker.id)

            console.log('Stock data:', {
                current: workerCurrStock,
                previous: workerPrevStock
            })

            // Group previous stock by category
            const prevCategoryMap = {}
            workerPrevStock.forEach(item => {
                const category = item.products?.category || 'Uncategorized'
                if (!prevCategoryMap[category]) prevCategoryMap[category] = {}
                const name = item.products?.name || `Product ${item.product_id}`
                if (!prevCategoryMap[category][name]) {
                    prevCategoryMap[category][name] = {
                        quantity: 0,
                        value: 0,
                        price_snapshot: item.price_snapshot
                    }
                }
                prevCategoryMap[category][name].quantity += (item.quantity || 0)
                prevCategoryMap[category][name].value += (item.quantity || 0) * (item.price_snapshot || item.products?.price_per_unit || 0)
            })

            // Group current stock by category
            const currCategoryMap = {}
            workerCurrStock.forEach(item => {
                const category = item.products?.category || 'Uncategorized'
                if (!currCategoryMap[category]) currCategoryMap[category] = {}
                const name = item.products?.name || `Product ${item.product_id}`
                if (!currCategoryMap[category][name]) {
                    currCategoryMap[category][name] = {
                        quantity: 0,
                        value: 0,
                        price_snapshot: item.price_snapshot
                    }
                }
                currCategoryMap[category][name].quantity += (item.quantity || 0)
                currCategoryMap[category][name].value += (item.quantity || 0) * (item.price_snapshot || item.products?.price_per_unit || 0)
            })

            console.log('Processed stock maps:', {
                previous: prevCategoryMap,
                current: currCategoryMap
            })

            // Calculate stock differences and gross from stock
            let grossFromStock = 0
            const stockDifferences = {}

            // Process all product categories
            const allCategories = new Set([
                ...Object.keys(currCategoryMap),
                ...Object.keys(prevCategoryMap)
            ])

            allCategories.forEach(category => {
                if (!stockDifferences[category]) stockDifferences[category] = {}

                // Get all products in this category
                const allProducts = new Set([
                    ...Object.keys(currCategoryMap[category] || {}),
                    ...Object.keys(prevCategoryMap[category] || {})
                ])

                allProducts.forEach(product => {
                    const current = currCategoryMap[category]?.[product]?.quantity || 0
                    const previous = prevCategoryMap[category]?.[product]?.quantity || 0
                    const diff = current - previous

                    if (diff !== 0) {
                        stockDifferences[category][product] = {
                            quantity: diff,
                            trend: diff > 0 ? 'increase' : 'decrease'
                        }
                    }

                    // Add to gross if there's a positive difference
                    if (diff > 0) {
                        const productObj = products.find(p => p.name === product)
                        const price = productObj ? productObj.price_per_unit : 0
                        grossFromStock += diff * price
                    }
                })
            })

            // Get savings information
            const savings = await fetchSavings(worker.id, weekStartStr)
            const totalSavings = await fetchTotalSavings(worker.id)

            // Get loan information
            const { data: loanInfo } = await supabase
                .from('loans')
                .select('balance')
                .eq('worker_id', worker.id)
                .eq('status', 'active')
                .order('start_date', { ascending: false })
                .limit(1)
                .maybeSingle()

            const loanBalance = loanInfo?.balance || 0

            // Calculate totals
            const totalDeductions = Object.values(deductions).reduce((a, b) => a + (b || 0), 0)
            const totalAllowances = Object.values(allowances).reduce((a, b) => a + (b || 0), 0)
            const totalCommissions = Object.values(commissions).reduce((a, b) => a + (b || 0), 0)

            const workerData = {
                id: worker.id,
                name: worker.name,
                avatar: worker.name.substring(0, 2).toUpperCase(),
                week_start: weekStartStr,
                week_end: weekEndStr,
                gross: existingPayout?.gross_income || grossFromStock,
                regular_hours: regularHours,
                assistant_hours: assistantHours,
                regular_rate: regularRate,
                assistant_rate: assistantRate,
                paid_by_hours: paidByHours,
                rate_snapshots: existingPayout?.rate_snapshots || {
                    regular: regularRate,
                    assistant: assistantRate
                },
                total_hours: regularHours + assistantHours,
                hours_pay: hoursPay,
                deductions,
                allowances,
                commissions,
                savings,
                total_savings: totalSavings,
                loan_balance: loanBalance,
                total_deductions: totalDeductions + savings,
                total_additions: totalAllowances + totalCommissions,
                net: existingPayout?.net_total || (grossFromStock + hoursPay + totalAllowances + totalCommissions - totalDeductions - savings),
                status: existingPayout ? 'exists' : 'pending',
                payout_id: existingPayout?.id,
                previous_stock: prevCategoryMap,
                current_stock: currCategoryMap,
                stock_differences: stockDifferences,
                deliveries: deliveries.filter(d => d.worker_id === worker.id).reduce((acc, d) => {
                    const category = d.products?.category || 'Uncategorized'
                    if (!acc[category]) acc[category] = {}
                    const name = d.products?.name || `Product ${d.product_id}`
                    if (!acc[category][name]) {
                        acc[category][name] = {
                            quantity: 0,
                            value: 0,
                            price_snapshot: d.price_snapshot
                        }
                    }
                    acc[category][name].quantity += (d.quantity || 0)
                    acc[category][name].value += (d.quantity || 0) * (d.price_snapshot || d.products?.price_per_unit || 0)
                    return acc
                }, {})
            }

            console.log('Final worker data:', {
                name: workerData.name,
                hours: {
                    regular: workerData.regular_hours,
                    assistant: workerData.assistant_hours,
                    total: workerData.total_hours
                },
                rates: {
                    regular: workerData.regular_rate,
                    assistant: workerData.assistant_rate
                },
                paid_by_hours: workerData.paid_by_hours,
                hours_pay: workerData.hours_pay
            })

            return workerData
        }))

        console.log('Loaded workers:', workers.value)
    } catch (err) {
        console.error('Error loading data:', err)
        error.value = err.message
    } finally {
        isLoading.value = false
    }
}

// Watch for week changes
watch(selectedWeek, () => {
    loadData()
})

// Initial load
await loadData()

// Update individual commit function
async function commitWorker(worker) {
    try {
        const now = new Date().toISOString()

        // Start a Supabase transaction
        const { data, error: txError } = await supabase.rpc('commit_payout', {
            p_worker_id: worker.id,
            p_week_start: worker.week_start,
            p_confirmed_at: now,
            p_amount: worker.net,
            p_loan_deduction: worker.deductions.loan || 0,
            p_savings_amount: worker.savings || 0
        })

        if (txError) throw txError

        // Reload data after committing
        await loadData()
    } catch (error) {
        console.error(`Failed to commit payout for ${worker.name}:`, error)
        alert(`Failed to commit payout for ${worker.name}. Please try again.`)
    }
}
</script>

<template>
    <div>
        <PayrollEditor v-if="showPayrollEditor" :worker="selectedWorker" @close="showPayrollEditor = false"
            @save="handlePayrollSave" />

        <div class="min-h-screen bg-gray-900 p-6 space-y-8">
            <!-- Header Section -->
            <header class="bg-gray-800 rounded-xl p-6 shadow-lg">
                <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <!-- Title and Description -->
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                            <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div>
                            <h1 class="text-2xl font-bold text-white">Generate Weekly Payouts</h1>
                            <p class="text-gray-400">Week of {{ weekRange.start }} to {{ weekRange.end }}</p>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        <div class="relative">
                            <input type="date" v-model="selectedWeek"
                                class="w-full sm:w-auto bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <button @click="commitAll" :disabled="!readyToCommit || isProcessing"
                            class="flex items-center justify-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200">
                            <svg v-if="isProcessing" class="animate-spin h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4">
                                </circle>
                                <path class="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                </path>
                            </svg>
                            <span>{{ isProcessing ? 'Processing...' : 'Commit All Payouts' }}</span>
                        </button>
                    </div>
                </div>
            </header>

            <!-- Loading State -->
            <div v-if="isLoading" class="flex flex-col items-center justify-center py-12">
                <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                <p class="mt-4 text-gray-400">Loading payroll data...</p>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="bg-red-900/50 border border-red-500/50 rounded-xl p-6 text-center">
                <svg class="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 class="text-lg font-medium text-red-500 mb-2">Error Loading Data</h3>
                <p class="text-red-400 mb-4">{{ error }}</p>
                <button @click="loadData"
                    class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg transition-colors duration-200">
                    Try Again
                </button>
            </div>

            <!-- Empty State -->
            <div v-else-if="workers.length === 0" class="text-center py-12">
                <svg class="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 class="text-lg font-medium text-gray-400 mb-2">No Active Workers</h3>
                <p class="text-gray-500">There are no active workers for this period.</p>
            </div>

            <!-- Workers Grid -->
            <div v-else class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                <div v-for="worker in workers" :key="worker.id"
                    class="group bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-500/50 transition-all duration-200">
                    <!-- Worker Header -->
                    <div class="p-6 border-b border-gray-700">
                        <div class="flex items-start justify-between">
                            <div class="flex items-center gap-4">
                                <div class="relative">
                                    <div
                                        class="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-xl font-bold text-white">
                                        {{ worker.avatar }}
                                    </div>
                                    <div :class="[
                                        'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800',
                                        worker.confirmed_at ? 'bg-green-500' : 'bg-yellow-500'
                                    ]"></div>
                                </div>
                                <div>
                                    <h3 class="text-lg font-semibold text-white">{{ worker.name }}</h3>
                                    <p class="text-sm text-gray-400">Week of {{ new
                                        Date(worker.week_start).toLocaleDateString() }}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <div :class="[
                                    'text-2xl font-bold',
                                    worker.net > 0 ? 'text-green-400' : 'text-red-400'
                                ]">
                                    ₱{{ worker.net.toLocaleString() }}
                                </div>
                                <div class="text-xs text-gray-500">Net Pay</div>
                            </div>
                        </div>
                    </div>

                    <!-- Worker Content -->
                    <div class="p-4 space-y-4">
                        <!-- Deliveries -->
                        <div v-if="Object.keys(worker.deliveries).length > 0" class="bg-gray-700/50 rounded-lg p-4">
                            <h4 class="text-sm font-medium text-gray-400 mb-3">Deliveries</h4>
                            <div class="space-y-3">
                                <template v-for="(products, category) in worker.deliveries" :key="category">
                                    <div class="space-y-2">
                                        <div class="flex justify-between text-sm">
                                            <span class="text-gray-300">{{ category }}</span>
                                            <span
                                                class="text-blue-400 font-medium">{{Object.values(products).reduce((sum,
                                                    p) => sum + p.quantity, 0)}} pcs</span>
                                        </div>
                                        <div class="space-y-1.5 pl-4">
                                            <div v-for="(data, name) in products" :key="name"
                                                class="flex justify-between text-xs">
                                                <span class="text-gray-400">{{ name }}</span>
                                                <span class="text-blue-400/80">{{ data.quantity }} pcs</span>
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </div>
                        </div>

                        <!-- Stock Summary -->
                        <div class="grid grid-cols-2 gap-4">
                            <!-- Current Stock -->
                            <div class="bg-gray-700/50 rounded-lg p-4">
                                <h4 class="text-sm font-medium text-gray-400 mb-3">Current Stock</h4>
                                <div class="space-y-3">
                                    <template v-for="(products, category) in worker.current_stock" :key="category">
                                        <div class="space-y-2">
                                            <div class="flex justify-between text-sm">
                                                <span class="text-gray-300">{{ category }}</span>
                                                <span
                                                    class="text-green-400 font-medium">{{Object.values(products).reduce((sum,
                                                        p) => sum + p.quantity, 0)}} pcs</span>
                                            </div>
                                            <div class="space-y-1.5 pl-4">
                                                <div v-for="(data, name) in products" :key="name"
                                                    class="flex justify-between text-xs">
                                                    <span class="text-gray-400">{{ name }}</span>
                                                    <span class="text-green-400/80">{{ data.quantity }} pcs</span>
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                </div>
                            </div>

                            <!-- Previous Stock -->
                            <div class="bg-gray-700/50 rounded-lg p-4">
                                <h4 class="text-sm font-medium text-gray-400 mb-3">Previous Stock</h4>
                                <div class="space-y-3">
                                    <template v-for="(products, category) in worker.previous_stock" :key="category">
                                        <div class="space-y-2">
                                            <div class="flex justify-between text-sm">
                                                <span class="text-gray-300">{{ category }}</span>
                                                <span
                                                    class="text-yellow-400 font-medium">{{Object.values(products).reduce((sum,
                                                        p) => sum + p.quantity, 0)}} pcs</span>
                                            </div>
                                            <div class="space-y-1.5 pl-4">
                                                <div v-for="(data, name) in products" :key="name"
                                                    class="flex justify-between text-xs">
                                                    <span class="text-gray-400">{{ name }}</span>
                                                    <span class="text-yellow-400/80">{{ data.quantity }} pcs</span>
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                </div>
                            </div>
                        </div>

                        <!-- Deductions -->
                        <div class="bg-gray-700/50 rounded-lg p-4">
                            <div class="flex items-center justify-between mb-3">
                                <h4 class="text-sm font-medium text-gray-400">Deductions</h4>
                                <span class="text-red-400 font-bold">-₱{{ worker.total_deductions.toLocaleString()
                                }}</span>
                            </div>
                            <div class="space-y-2">
                                <template v-for="(value, key) in worker.deductions" :key="key">
                                    <div v-if="value > 0" class="flex justify-between text-sm">
                                        <span class="text-gray-400">{{ key === 'sss' ? 'SSS' : key }}</span>
                                        <span class="text-red-400">₱{{ value.toLocaleString() }}</span>
                                    </div>
                                </template>
                                <div v-if="worker.savings > 0" class="flex justify-between text-sm">
                                    <div class="flex items-center gap-2">
                                        <span class="text-gray-400">Savings</span>
                                        <span class="text-xs text-green-400">(₱{{ worker.total_savings.toLocaleString()
                                        }})</span>
                                    </div>
                                    <span class="text-red-400">₱{{ worker.savings.toLocaleString() }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Outstanding Loan -->
                        <div v-if="worker.loan_balance > 0" class="bg-yellow-500/10 rounded-lg p-4">
                            <div class="flex items-center gap-3">
                                <svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <div class="text-sm text-gray-400">Outstanding Loan</div>
                                    <div class="text-lg font-bold text-yellow-500">₱{{
                                        worker.loan_balance.toLocaleString()
                                    }}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer Actions -->
                    <div class="p-4 bg-gray-700/30 flex justify-between">
                        <button v-if="!worker.confirmed_at" @click="commitWorker(worker)"
                            class="flex items-center gap-2 px-4 py-2 text-sm text-green-400 hover:text-white transition-colors duration-200">
                            <span>Commit Payout</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M5 13l4 4L19 7" />
                            </svg>
                        </button>
                        <button @click="openPayrollEditor(worker)"
                            class="flex items-center gap-2 px-4 py-2 text-sm text-blue-400 hover:text-white transition-colors duration-200">
                            <span>Edit Details</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.grid {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
}
</style>