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
const searchQuery = ref('')

// Filtered workers based on search query
const filteredWorkers = computed(() => {
    if (!searchQuery.value.trim()) {
        return workers.value
    }

    const query = searchQuery.value.toLowerCase()
    return workers.value.filter(worker =>
        worker.name.toLowerCase().includes(query)
    )
})

// Calculate week range based on selected date (Sunday to Saturday)
const weekRange = computed(() => {
    const date = new Date(selectedWeek.value)
    
    // Calculate Saturday of that week (week end)
    const saturday = new Date(date)
    const dayOfWeek = saturday.getDay()
    const daysToSaturday = (6 - dayOfWeek + 7) % 7
    saturday.setDate(saturday.getDate() + daysToSaturday)
    saturday.setHours(0, 0, 0, 0)
    
    // Calculate Sunday (week start) - 6 days before Saturday
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
    console.log('Worker rate fields:', {
        inhouse_rate: worker.inhouse_rate,
        assistant_rate: worker.assistant_rate,
        hourly_rate: worker.hourly_rate,
        regular_rate: worker.regular_rate
    })
    console.log('Previous stock:', worker.previous_stock)
    console.log('Current stock:', worker.current_stock)
    console.log('Deliveries:', worker.deliveries)
    console.log('Hours data:', {
        regular_hours: worker.regular_hours,
        assistant_hours: worker.assistant_hours,
        paid_by_hours: worker.paid_by_hours,
        rates: {
            regular: worker.regular_rate,
            assistant: worker.assistant_rate
        }
    })

    selectedWorker.value = {
        ...worker,
        week: worker.week_start,
        position: 'Worker',
        employee_id: worker.id,
        inhouse_rate: worker.inhouse_rate || worker.hourly_rate || worker.regular_rate,  // Use the correct rate field
        regular_rate: worker.inhouse_rate || worker.hourly_rate || worker.regular_rate,  // Also set regular_rate for backward compatibility
        assistant_rate: worker.assistant_rate,
        regular_hours: worker.regular_hours || 0,  // Ensure we pass the hours
        assistant_hours: worker.assistant_hours || 0,
        paid_by_hours: worker.paid_by_hours || { inhouse: 0, assistant: 0 },  // Ensure we pass paid_by_hours
        gross: worker.gross,
        deductions: worker.deductions || {},
        allowances: worker.allowances || {},
        commissions: worker.commissions || {},
        savings: worker.savings,
        total_savings: worker.total_savings,
        loan_balance: worker.loan_balance,
        previous_stock: worker.previous_stock,
        current_stock: worker.current_stock,
        deliveries: worker.deliveries
    }

    // Fetch payment history when opening editor
    fetchPaymentHistory(worker.id).then(history => {
        selectedWorker.value.paymentHistory = history
    })

    showPayrollEditor.value = true
}

async function handlePayrollSave(data) {
    try {
        console.log('Saving payout data:', data)
        
        const { error } = await supabase
            .from('payouts')
            .upsert({
                ...data,
                status: 'pending',
                confirmed_at: null  // Keep it null until committed
            }, {
                onConflict: 'employee_id,week_start'  // Use unique constraint on employee_id + week_start
            })

        if (error) throw error

        console.log('Payout saved successfully')
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
            // Update the payout record directly
            const { error: payoutError } = await supabase
                .from('payouts')
                .update({
                    confirmed_at: now,
                    amount: worker.net,
                    status: 'confirmed'
                })
                .eq('employee_id', worker.id)
                .eq('week_start', worker.week_start)

            if (payoutError) {
                console.error(`Failed to commit payout for ${worker.name}:`, payoutError)
                throw new Error(`Failed to commit payout for ${worker.name}`)
            }

            // Update loan balance if there's a loan deduction
            const loanDeduction = worker.deductions?.loan || 0
            if (loanDeduction > 0) {
                // First get the current loan balance
                const { data: loanData, error: fetchError } = await supabase
                    .from('loans')
                    .select('balance')
                    .eq('worker_id', worker.id)
                    .eq('status', 'active')
                    .single()

                if (fetchError) {
                    console.error(`Failed to fetch loan balance for ${worker.name}:`, fetchError)
                } else if (loanData) {
                    const newBalance = loanData.balance - loanDeduction
                    const { error: loanError } = await supabase
                        .from('loans')
                        .update({
                            balance: newBalance
                        })
                        .eq('worker_id', worker.id)
                        .eq('status', 'active')

                    if (loanError) {
                        console.error(`Failed to update loan for ${worker.name}:`, loanError)
                    }
                }
            }

            // Insert/update savings if there's a savings amount
            const savingsAmount = worker.savings || 0
            console.log(`Processing savings for ${worker.name}:`, {
                savingsAmount,
                worker_id: worker.id,
                week_start: worker.week_start
            })
            
            if (savingsAmount > 0) {
                // First try to update existing record
                const { data: updateResult, error: updateError } = await supabase
                    .from('savings')
                    .update({ amount: savingsAmount })
                    .eq('worker_id', worker.id)
                    .eq('week_start', worker.week_start)
                    .eq('type', 'auto')
                    .select()

                if (updateError) {
                    console.error(`Failed to update savings for ${worker.name}:`, updateError)
                }

                // If no rows were updated, insert a new record
                if (!updateResult || updateResult.length === 0) {
                    const savingsData = {
                        worker_id: worker.id,
                        amount: savingsAmount,
                        week_start: worker.week_start,
                        type: 'auto',
                        created_at: new Date().toISOString()
                    }
                    
                    console.log('Inserting new savings record:', savingsData)
                    
                    const { data: insertResult, error: insertError } = await supabase
                        .from('savings')
                        .insert(savingsData)
                        .select()

                    if (insertError) {
                        console.error(`Failed to insert savings for ${worker.name}:`, insertError)
                        alert(`Failed to save savings for ${worker.name}: ${insertError.message}`)
                    } else {
                        console.log(`Successfully inserted savings for ${worker.name}:`, insertResult)
                    }
                } else {
                    console.log(`Successfully updated savings for ${worker.name}:`, updateResult)
                }
            } else {
                console.log(`No savings to process for ${worker.name} (amount: ${savingsAmount})`)
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

async function fetchPaymentHistory(worker_id) {
    console.log('\n=== Fetching Payment History ===')
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
                status,
                returns_summary
            `)
            .eq('employee_id', worker_id)
            .not('confirmed_at', 'is', null)  // Only get confirmed payouts
            .order('week_start', { ascending: false })
            .limit(10)

        if (error) throw error

        console.log('Raw confirmed payouts:', data)

        const processedHistory = data.map(payout => {
            // Get rates from rate_snapshots  
            const rates = payout.rate_snapshots || {
                inhouse: 56.25,
                assistant: 75.00
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

        console.log('Final processed history:', processedHistory)
        return processedHistory
    } catch (err) {
        console.error('Failed to fetch payment history:', err)
        return []
    }
}

// Load workers and their payroll data
async function loadData() {
    isLoading.value = true
    error.value = null

    try {
        // Calculate week dates first to ensure they're available throughout the function
        const weekStartStr = weekRange.value.start  // Sunday
        const weekEndStr = weekRange.value.end       // Saturday

        console.log('Week calculation:', {
            weekStart: weekStartStr,  // Sunday
            weekEnd: weekEndStr,      // Saturday (stock record date)
            selectedDate: selectedWeek.value,
            weekStartDay: new Date(weekStartStr).toLocaleDateString('en-US', { weekday: 'long' }),
            weekEndDay: new Date(weekEndStr).toLocaleDateString('en-US', { weekday: 'long' })
        })

        // Stock logic: Use selectedWeek directly for current stock
        // - Current stock: Use selectedWeek.value (the exact date picked by user)
        // - Previous stock: Exactly 7 days before current stock
        const currentStockDate = selectedWeek.value  // Use selected date directly for current stock
        
        const prevStockDate = new Date(currentStockDate)
        prevStockDate.setDate(prevStockDate.getDate() - 7)  // Go back exactly 7 days
        const prevWeekStr = format(prevStockDate, 'yyyy-MM-dd')

        console.log('Stock dates:', {
            current: currentStockDate,
            previous: prevWeekStr,
            currentDay: new Date(currentStockDate).toLocaleDateString('en-US', { weekday: 'long' }),
            previousDay: new Date(prevWeekStr).toLocaleDateString('en-US', { weekday: 'long' }),
            note: 'Using selectedWeek directly for current stock, weekRange for payroll period'
        })

        // 1. Get all active workers
        const { data: workersData, error: workersError } = await supabase
            .from('workers')
            .select('*')
            .eq('is_active', true)

        if (workersError) throw workersError

        console.log('Raw workers data from database:', workersData.map(w => ({
            name: w.name,
            regular_rate: w.regular_rate,
            inhouse_rate: w.inhouse_rate,
            assistant_rate: w.assistant_rate,
            hourly_rate: w.hourly_rate
        })))

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
                status,
                returns_summary
            `)
            .eq('week_start', weekStartStr)

        if (payoutsError) throw payoutsError

        // 3. Get returns data for this week
        const { data: returnsData, error: returnsError } = await supabase
            .from('returns')
            .select(`
                id,
                created_at,
                worker_id,
                repair_worker_id,
                product_id,
                quantity,
                type,
                labor_cost,
                product:product_id (name),
                worker:worker_id (name)
            `)
            .gte('created_at', weekStartStr)
            .lte('created_at', weekEndStr)

        if (returnsError) throw returnsError

        // Group returns by worker
        const returnsByWorker = {}
        returnsData.forEach(r => {
            // As repair worker
            if (r.repair_worker_id) {
                if (!returnsByWorker[r.repair_worker_id]) {
                    returnsByWorker[r.repair_worker_id] = {
                        as_repair_worker: [],
                        as_worker: []
                    }
                }
                returnsByWorker[r.repair_worker_id].as_repair_worker.push(r)
            }

            // As worker with returns
            if (r.worker_id) {
                if (!returnsByWorker[r.worker_id]) {
                    returnsByWorker[r.worker_id] = {
                        as_repair_worker: [],
                        as_worker: []
                    }
                }
                returnsByWorker[r.worker_id].as_worker.push(r)
            }
        })

        // 4. Get products info
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, name, price_per_unit, category')

        if (productsError) throw productsError

        // Create a price map for quick lookup
        const priceMap = products.reduce((acc, p) => {
            acc[p.id] = p.price_per_unit
            return acc
        }, {})

        // 5. Get previous stock (at previous Saturday)
        console.log('Fetching previous stock for date:', prevWeekStr)
        const { data: prevStock, error: prevError } = await supabase
            .from('bodega_stock')
            .select('*, products(name, category, price_per_unit), workers(name)')
            .eq('week_start', prevWeekStr)

        // Use only exact week_start match for previous stock
        const previousStock = prevStock || []
        console.log('Found previous stock records for exact week_start:', previousStock.length)

        // 6. Get current stock (at selected date)
        console.log('Fetching current stock for date:', currentStockDate)
        const { data: currentStock, error: currentStockError } = await supabase
            .from('bodega_stock')
            .select('*, products(name, category, price_per_unit), workers(name)')
            .eq('week_start', currentStockDate)

        console.log('Found current stock records:', currentStock?.length || 0)

        if (prevError) console.error('Error fetching previous stock:', prevError)
        if (currentStockError) throw currentStockError

        // 7. Get deliveries for the week
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
            const workerReturns = returnsByWorker[worker.id] || { as_repair_worker: [], as_worker: [] }

            // Calculate returns summary if not in existing payout
            let returnsSummary = existingPayout?.returns_summary
            if (!returnsSummary) {
                returnsSummary = {
                    as_repair_worker: workerReturns.as_repair_worker.map(r => ({
                        id: r.id,
                        type: r.type,
                        quantity: r.quantity,
                        labor_cost: r.labor_cost,
                        product_name: r.product?.name || `Product ${r.product_id}`,
                        worker_name: r.worker?.name || 'Unknown Worker'
                    })),
                    as_worker: workerReturns.as_worker.map(r => ({
                        id: r.id,
                        type: r.type,
                        quantity: r.quantity,
                        product_name: r.product?.name || `Product ${r.product_id}`
                    })),
                    totals: {
                        labor_earnings: workerReturns.as_repair_worker.reduce((sum, r) => sum + (Number(r.labor_cost) || 0), 0),
                        repaired_quantity: workerReturns.as_repair_worker.filter(r => r.type === 'repair').reduce((sum, r) => sum + (Number(r.quantity) || 0), 0),
                        transformed_quantity: workerReturns.as_repair_worker.filter(r => r.type === 'transform').reduce((sum, r) => sum + (Number(r.quantity) || 0), 0),
                        returned_quantity: workerReturns.as_worker.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)
                    }
                }
            }

            // Initialize variables
            let regularHours = 0
            let assistantHours = 0
            let regularRate = worker.inhouse_rate || worker.hourly_rate || worker.regular_rate || 56.25
            let assistantRate = worker.assistant_rate || 75.00
            let paidByHours = { inhouse: 0, assistant: 0 }

            if (existingPayout) {
                // Always use current worker rates, not old snapshots
                console.log(`Rate calculation for ${worker.name}:`, {
                    worker_regular_rate: worker.regular_rate,
                    existing_snapshot_inhouse: existingPayout.rate_snapshots?.inhouse,
                    final_regular_rate: worker.regular_rate || existingPayout.rate_snapshots?.inhouse || 56.25
                })
                regularRate = worker.inhouse_rate || worker.hourly_rate || worker.regular_rate || existingPayout.rate_snapshots?.inhouse || 56.25
                assistantRate = worker.assistant_rate || existingPayout.rate_snapshots?.assistant || 75.00

                // Handle paid_by_hours (could be a number or an object)
                if (existingPayout.paid_by_hours) {
                    console.log('Processing paid_by_hours for worker:', {
                        worker: worker.name,
                        paid_by_hours: existingPayout.paid_by_hours,
                        type: typeof existingPayout.paid_by_hours
                    })

                    if (typeof existingPayout.paid_by_hours === 'number') {
                        // Legacy format: all hours are inhouse hours
                        paidByHours = {
                            inhouse: Number(existingPayout.paid_by_hours),
                            assistant: 0
                        }
                        regularHours = Math.round(paidByHours.inhouse / regularRate)
                        assistantHours = 0

                        console.log('Processed legacy format:', {
                            paid_by_hours: paidByHours,
                            hours: { regularHours, assistantHours }
                        })
                    } else {
                        // New JSONB format
                        paidByHours = {
                            inhouse: Number(existingPayout.paid_by_hours.inhouse || 0),
                            assistant: Number(existingPayout.paid_by_hours.assistant || 0)
                        }
                        regularHours = Math.round(paidByHours.inhouse / regularRate)
                        assistantHours = Math.round(paidByHours.assistant / assistantRate)

                        console.log('Processed JSONB format:', {
                            paid_by_hours: paidByHours,
                            hours: { regularHours, assistantHours }
                        })
                    }
                }
            }

            // Calculate total hours pay
            const hoursPay = (regularHours * regularRate) + (assistantHours * assistantRate)

            // Group current stock by category
            const workerCurrStock = (currentStock || []).filter(s => s.worker_id === worker.id)
            const workerPrevStock = (previousStock || []).filter(s => s.worker_id === worker.id)

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
            const totalDeductions = Object.values(existingPayout?.deductions || {}).reduce((a, b) => a + (b || 0), 0)
            const totalAllowances = Object.values(existingPayout?.allowances || {}).reduce((a, b) => a + (b || 0), 0)
            // Don't include labor in commissions total - it's already in gross
            const totalCommissions = Object.entries(existingPayout?.commissions || {})
                .filter(([key]) => key !== 'labor')
                .reduce((sum, [, val]) => sum + (val || 0), 0)

            const workerData = {
                id: worker.id,
                name: worker.name,
                avatar: worker.name.substring(0, 2).toUpperCase(),
                week_start: weekStartStr,
                confirmed_at: existingPayout?.confirmed_at || null,
                gross: existingPayout?.gross_income || grossFromStock,
                regular_hours: regularHours,
                assistant_hours: assistantHours,
                regular_rate: regularRate,
                assistant_rate: assistantRate,
                paid_by_hours: paidByHours,
                rate_snapshots: existingPayout?.rate_snapshots || {
                    inhouse: regularRate,
                    assistant: assistantRate
                },
                total_hours: regularHours + assistantHours,
                hours_pay: hoursPay,
                deductions: existingPayout?.deductions || {},
                allowances: existingPayout?.allowances || {},
                commissions: {
                    ...(existingPayout?.commissions || {}),
                    labor: returnsSummary.totals.labor_earnings || 0
                },
                savings,
                total_savings: totalSavings,
                loan_balance: loanBalance,
                total_deductions: totalDeductions + savings,
                total_additions: totalAllowances + totalCommissions,  // Labor is already in gross
                net: existingPayout?.net_total || (
                    grossFromStock +
                    hoursPay +
                    totalAllowances +
                    totalCommissions +
                    (returnsSummary.totals.labor_earnings || 0) -
                    totalDeductions -
                    savings
                ),
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
                }, {}),
                returns_summary: returnsSummary
            }

            console.log('Prepared worker data:', {
                worker: worker.name,
                hours: {
                    regular: workerData.regular_hours,
                    assistant: workerData.assistant_hours
                },
                paid_by_hours: workerData.paid_by_hours,
                rates: {
                    regular: workerData.regular_rate,
                    assistant: workerData.assistant_rate
                },
                deductions: workerData.deductions,
                existingPayout: !!existingPayout,
                savings_in_deductions: existingPayout?.deductions?.savings
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

        // Update the payout record directly
        const { error: payoutError } = await supabase
            .from('payouts')
            .update({
                confirmed_at: now,
                amount: worker.net,
                status: 'confirmed'
            })
            .eq('employee_id', worker.id)
            .eq('week_start', worker.week_start)

        if (payoutError) throw payoutError

        // Update loan balance if there's a loan deduction
        const loanDeduction = worker.deductions?.loan || 0
        if (loanDeduction > 0) {
            // First get the current loan balance
            const { data: loanData, error: fetchError } = await supabase
                .from('loans')
                .select('balance')
                .eq('worker_id', worker.id)
                .eq('status', 'active')
                .single()

            if (fetchError) {
                console.error(`Failed to fetch loan balance for ${worker.name}:`, fetchError)
            } else if (loanData) {
                const newBalance = loanData.balance - loanDeduction
                const { error: loanError } = await supabase
                    .from('loans')
                    .update({
                        balance: newBalance
                    })
                    .eq('worker_id', worker.id)
                    .eq('status', 'active')

                if (loanError) {
                    console.error(`Failed to update loan for ${worker.name}:`, loanError)
                }
            }
        }

        // Handle savings - insert/update savings table (from deductions field)
        const savingsAmount = worker.deductions?.savings || 0
        if (savingsAmount > 0) {
            // Check if savings record already exists
            const { data: existingSavings } = await supabase
                .from('savings')
                .select('id')
                .eq('worker_id', worker.id)
                .eq('week_start', worker.week_start)
                .eq('type', 'auto')
                .single()

            if (existingSavings) {
                // Update existing savings record
                const { error: savingsUpdateError } = await supabase
                    .from('savings')
                    .update({ amount: savingsAmount })
                    .eq('id', existingSavings.id)

                if (savingsUpdateError) {
                    console.error(`Failed to update savings for ${worker.name}:`, savingsUpdateError)
                }
            } else {
                // Insert new savings record
                const { error: savingsInsertError } = await supabase
                    .from('savings')
                    .insert({
                        worker_id: worker.id,
                        amount: savingsAmount,
                        week_start: worker.week_start,
                        type: 'auto'
                    })

                if (savingsInsertError) {
                    console.error(`Failed to insert savings for ${worker.name}:`, savingsInsertError)
                }
            }
        }

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
                        <!-- Search Input -->
                        <div class="relative flex-1 max-w-xs">
                            <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input type="text" v-model="searchQuery" placeholder="Search workers..."
                                class="w-full bg-gray-700 text-white pl-10 pr-10 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                            <button v-if="searchQuery" @click="searchQuery = ''"
                                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

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

            <!-- Summary Table (Desktop) -->
            <div v-if="!isLoading && !error && workers.length > 0" class="hidden md:block bg-gray-800 rounded-xl overflow-hidden mb-6">
                <div class="p-4 border-b border-gray-700">
                    <h2 class="text-lg font-semibold text-white">📋 Payroll Summary</h2>
                    <p class="text-sm text-gray-400">Quick overview - click row to edit, or commit directly</p>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full text-sm text-white/80 table-auto">
                        <thead class="border-b border-white/10 bg-gray-700/50">
                            <tr>
                                <th class="text-left py-3 px-4">Name</th>
                                <th class="text-right py-3 px-4">Gross</th>
                                <th class="text-right py-3 px-4">Deductions</th>
                                <th class="text-right py-3 px-4">Additions</th>
                                <th class="text-right py-3 px-4">Net Pay</th>
                                <th class="text-center py-3 px-4">Status</th>
                                <th class="text-center py-3 px-4">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="worker in filteredWorkers" :key="'summary-' + worker.id"
                                @click="openPayrollEditor(worker)"
                                class="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors">
                                <td class="py-3 px-4 font-medium">
                                    <div class="flex items-center gap-2">
                                        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-xs font-bold">
                                            {{ worker.avatar }}
                                        </div>
                                        {{ worker.name }}
                                    </div>
                                </td>
                                <td class="py-3 px-4 text-right text-blue-400">₱{{ (worker.gross || 0).toLocaleString() }}</td>
                                <td class="py-3 px-4 text-right text-red-400">-₱{{ (worker.total_deductions || 0).toLocaleString() }}</td>
                                <td class="py-3 px-4 text-right text-green-400">+₱{{ (worker.total_additions || 0).toLocaleString() }}</td>
                                <td class="py-3 px-4 text-right font-bold" :class="worker.net >= 0 ? 'text-green-400' : 'text-red-400'">
                                    ₱{{ (worker.net || 0).toLocaleString() }}
                                </td>
                                <td class="py-3 px-4 text-center">
                                    <span v-if="worker.confirmed_at" class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Committed
                                    </span>
                                    <span v-else class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Pending
                                    </span>
                                </td>
                                <td class="py-3 px-4 text-center" @click.stop>
                                    <button v-if="!worker.confirmed_at" @click="commitWorker(worker)"
                                        class="px-3 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                                        Commit
                                    </button>
                                    <button v-else @click="openPayrollEditor(worker)"
                                        class="px-3 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors">
                                        View
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                        <tfoot class="border-t border-white/10 bg-gray-700/30">
                            <tr class="font-semibold">
                                <td class="py-3 px-4">Total ({{ filteredWorkers.length }} workers)</td>
                                <td class="py-3 px-4 text-right text-blue-400">₱{{ filteredWorkers.reduce((sum, w) => sum + (w.gross || 0), 0).toLocaleString() }}</td>
                                <td class="py-3 px-4 text-right text-red-400">-₱{{ filteredWorkers.reduce((sum, w) => sum + (w.total_deductions || 0), 0).toLocaleString() }}</td>
                                <td class="py-3 px-4 text-right text-green-400">+₱{{ filteredWorkers.reduce((sum, w) => sum + (w.total_additions || 0), 0).toLocaleString() }}</td>
                                <td class="py-3 px-4 text-right text-white">₱{{ filteredWorkers.reduce((sum, w) => sum + (w.net || 0), 0).toLocaleString() }}</td>
                                <td class="py-3 px-4 text-center">
                                    <span class="text-xs text-gray-400">
                                        {{ filteredWorkers.filter(w => w.confirmed_at).length }}/{{ filteredWorkers.length }} committed
                                    </span>
                                </td>
                                <td class="py-3 px-4"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <!-- Mobile Summary Cards -->
            <div v-if="!isLoading && !error && workers.length > 0" class="md:hidden space-y-3 mb-6">
                <div class="bg-gray-800 rounded-xl p-4">
                    <h2 class="text-lg font-semibold text-white mb-3">📋 Quick Summary</h2>
                    <div class="space-y-2">
                        <div v-for="worker in filteredWorkers" :key="'mobile-summary-' + worker.id"
                            class="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                            @click="openPayrollEditor(worker)">
                            <div class="flex items-center gap-3">
                                <div :class="[
                                    'w-2 h-2 rounded-full',
                                    worker.confirmed_at ? 'bg-green-500' : 'bg-yellow-500'
                                ]"></div>
                                <span class="font-medium text-white">{{ worker.name }}</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="font-bold" :class="worker.net >= 0 ? 'text-green-400' : 'text-red-400'">
                                    ₱{{ (worker.net || 0).toLocaleString() }}
                                </span>
                                <button v-if="!worker.confirmed_at" @click.stop="commitWorker(worker)"
                                    class="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors">
                                    ✓
                                </button>
                            </div>
                        </div>
                    </div>
                    <!-- Mobile Total -->
                    <div class="mt-4 pt-3 border-t border-gray-600 flex justify-between items-center">
                        <span class="text-gray-400">Total Payroll</span>
                        <span class="text-xl font-bold text-white">₱{{ filteredWorkers.reduce((sum, w) => sum + (w.net || 0), 0).toLocaleString() }}</span>
                    </div>
                </div>
            </div>

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

            <!-- No Search Results -->
            <div v-else-if="filteredWorkers.length === 0" class="text-center py-12">
                <svg class="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 class="text-lg font-medium text-gray-400 mb-2">No Workers Found</h3>
                <p class="text-gray-500">No workers match your search for "{{ searchQuery }}"</p>
                <button @click="searchQuery = ''"
                    class="mt-4 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 rounded-lg transition-colors duration-200">
                    Clear Search
                </button>
            </div>

            <!-- Workers Grid -->
            <div v-else class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                <div v-for="worker in filteredWorkers" :key="worker.id"
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
                                    ]" :title="worker.confirmed_at ? 'Committed' : 'Pending'"></div>
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

                        <!-- Returns Summary -->
                        <div v-if="worker.returns_summary?.totals" class="bg-gray-700/50 rounded-lg p-4">
                            <div class="flex items-center justify-between mb-3">
                                <h4 class="text-sm font-medium text-gray-400">Returns & Labor</h4>
                                <span v-if="worker.returns_summary.totals.labor_earnings > 0"
                                    class="text-green-400 font-bold">
                                    +₱{{ worker.returns_summary.totals.labor_earnings.toLocaleString() }}
                                </span>
                            </div>
                            <div class="grid grid-cols-3 gap-3 text-center">
                                <div v-if="worker.returns_summary.totals.repaired_quantity > 0"
                                    class="bg-gray-700/30 rounded-lg p-2">
                                    <div class="text-xs text-gray-400">Repaired</div>
                                    <div class="text-sm font-medium text-blue-400">{{
                                        worker.returns_summary.totals.repaired_quantity }} pcs
                                    </div>
                                </div>
                                <div v-if="worker.returns_summary.totals.transformed_quantity > 0"
                                    class="bg-gray-700/30 rounded-lg p-2">
                                    <div class="text-xs text-gray-400">Transformed</div>
                                    <div class="text-sm font-medium text-purple-400">{{
                                        worker.returns_summary.totals.transformed_quantity }}
                                        pcs</div>
                                </div>
                                <div v-if="worker.returns_summary.totals.returned_quantity > 0"
                                    class="bg-gray-700/30 rounded-lg p-2">
                                    <div class="text-xs text-gray-400">Returned</div>
                                    <div class="text-sm font-medium text-red-400">{{
                                        worker.returns_summary.totals.returned_quantity }} pcs
                                    </div>
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
                                <!-- Show all deduction types -->
                                <div v-if="worker.deductions?.sss > 0" class="flex justify-between text-sm">
                                    <span class="text-gray-400">SSS</span>
                                    <span class="text-red-400">₱{{ worker.deductions.sss.toLocaleString() }}</span>
                                </div>
                                <div v-if="worker.deductions?.philhealth > 0" class="flex justify-between text-sm">
                                    <span class="text-gray-400">PhilHealth</span>
                                    <span class="text-red-400">₱{{ worker.deductions.philhealth.toLocaleString() }}</span>
                                </div>
                                <div v-if="worker.deductions?.pagibig > 0" class="flex justify-between text-sm">
                                    <span class="text-gray-400">Pag-IBIG</span>
                                    <span class="text-red-400">₱{{ worker.deductions.pagibig.toLocaleString() }}</span>
                                </div>
                                <div v-if="worker.deductions?.loan > 0" class="flex justify-between text-sm">
                                    <span class="text-gray-400">Loan</span>
                                    <span class="text-red-400">₱{{ worker.deductions.loan.toLocaleString() }}</span>
                                </div>
                                <div v-if="worker.deductions?.cash_advance > 0" class="flex justify-between text-sm">
                                    <span class="text-gray-400">Cash Advance</span>
                                    <span class="text-red-400">₱{{ worker.deductions.cash_advance.toLocaleString() }}</span>
                                </div>
                                <div v-if="worker.deductions?.uniform > 0" class="flex justify-between text-sm">
                                    <span class="text-gray-400">Uniform</span>
                                    <span class="text-red-400">₱{{ worker.deductions.uniform.toLocaleString() }}</span>
                                </div>
                                <div v-if="worker.deductions?.tools > 0" class="flex justify-between text-sm">
                                    <span class="text-gray-400">Tools</span>
                                    <span class="text-red-400">₱{{ worker.deductions.tools.toLocaleString() }}</span>
                                </div>
                                <div v-if="worker.deductions?.others > 0" class="flex justify-between text-sm">
                                    <span class="text-gray-400">Others</span>
                                    <span class="text-red-400">₱{{ worker.deductions.others.toLocaleString() }}</span>
                                </div>
                                <!-- Show savings deduction from payouts table or fallback to separate savings field -->
                                <div v-if="(worker.deductions?.savings > 0) || (worker.savings > 0)" class="flex justify-between text-sm">
                                    <div class="flex items-center gap-2">
                                        <span class="text-gray-400">Savings</span>
                                        <span v-if="worker.total_savings > 0" class="text-xs text-green-400">(₱{{ worker.total_savings.toLocaleString() }})</span>
                                    </div>
                                    <span class="text-red-400">₱{{ (worker.deductions?.savings || worker.savings || 0).toLocaleString() }}</span>
                                </div>
                                <!-- Any other deductions not explicitly listed -->
                                <template v-for="(value, key) in worker.deductions" :key="key">
                                    <div v-if="value > 0 && !['sss', 'philhealth', 'pagibig', 'loan', 'cash_advance', 'uniform', 'tools', 'others', 'savings'].includes(key)" class="flex justify-between text-sm">
                                        <span class="text-gray-400">{{ key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ') }}</span>
                                        <span class="text-red-400">₱{{ value.toLocaleString() }}</span>
                                    </div>
                                </template>
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
                        <div v-else class="flex items-center gap-2 px-4 py-2 text-sm text-gray-500">
                            <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Committed</span>
                        </div>
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