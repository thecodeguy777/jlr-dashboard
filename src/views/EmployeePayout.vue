<template>
  <div class="min-h-screen text-white p-6 space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h1 class="text-xl font-bold">🧾 Payroll Breakdown</h1>
      <div class="text-right">
        <span class="text-sm text-white/60" v-if="!isSelf">Viewing: {{ employeeName }}</span>
        <div class="text-xs text-white/40" v-if="weekParam">
          📅 Week: {{ weekParam }}
        </div>
      </div>
    </div>
    <p class="text-sm text-green-400 font-medium">
      💰 Current Savings: ₱{{ currentSavings || '0.00' }}
    </p>
    <!-- Hero Summary Card -->
    <div class="bg-green-700 p-6 rounded-2xl shadow space-y-1 text-white">
      <h2 class="text-xl font-semibold">{{ employeeName }}</h2>
      <p class="text-sm text-white/80">Week of {{ payout?.week_start || '—' }}</p>
      <div class="text-3xl font-bold">₱{{ Math.round(payout?.net_total || 0) }}</div>
      <p class="text-xs text-white/60">Net Pay after all deductions and additions</p>
    </div>

    <!-- Profile Details (for Admin) -->
    <div v-if="isAdmin" class="bg-white/10 p-4 rounded-2xl shadow text-sm text-white/60">
      <p>ID: {{ employeeId }}</p>
      <p>Role: {{ isAdmin ? 'Admin View' : 'Employee View' }}</p>
    </div>

    <div v-if="loading" class="text-white/60 text-sm italic">Loading payroll data...</div>
    <div v-else-if="!payout" class="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
      <div class="text-red-400 font-medium">No payout found for this employee.</div>
      <div class="text-sm text-red-300/70 mt-2">
        <div v-if="weekParam">No payout record found confirmed on {{ weekParam }}</div>
        <div v-else>No recent confirmed payout found for today</div>
        <div class="mt-2 text-xs">Check if payouts have been generated and confirmed for this date.</div>
      </div>
    </div>

    <div v-else class="space-y-6">
      <!-- Weekly Summary -->
      <div class="bg-white/10 p-4 rounded-2xl shadow">
        <h3 class="text-base font-semibold text-white/80 mb-2">📦 Weekly Summary</h3>
        <div v-if="productBreakdown.length" class="space-y-1">
          <div v-for="item in productBreakdown" :key="item.name" class="flex justify-between text-sm">
            <span>{{ item.name }} × {{ item.quantity }}</span>
            <span>₱{{ Math.round(item.subtotal) }}</span>
          </div>
        </div>
        <div v-else class="text-sm text-white/40">No deliveries recorded.</div>

        <div class="flex justify-between font-semibold mt-2 border-t border-white/10 pt-2 text-sm">
          <span>Gross Income:</span>
          <span>₱{{ Math.round(payout.gross_income || 0) }}</span>
        </div>
        <div class="flex justify-between text-sm text-white/80">
          <span>Cash Advance (Bale):</span>
          <span>-₱{{ Math.round(payout.cash_advance || 0) }}</span>
        </div>
        <div class="flex justify-between text-sm text-white/80">
          <span>Paid by Hours:</span>
          <span>₱{{ Math.round(payout.paid_by_hours || 0) }}</span>
        </div>
      </div>



      <!-- Current Stock Breakdown -->
      <div class="bg-white/10 p-4 rounded-2xl shadow">
        <h3 class="text-base font-semibold text-white/80 mb-2">⏩ Current Stock</h3>
        <div v-if="Object.keys(currentStockBreakdown).length" class="space-y-1">
          <div v-for="(products, category) in currentStockBreakdown" :key="category">
            <strong class="text-white/70 block">{{ category }}</strong>
            <div v-for="(qty, name) in products" :key="name" class="flex justify-between text-sm">
              <span>{{ name }} × {{ qty }}</span>
            </div>
          </div>
        </div>
        <div v-else class="text-sm text-white/40">No current stock recorded.</div>
      </div>

      <!-- Previous Stock Breakdown -->
      <div class="bg-white/10 p-4 rounded-2xl shadow">
        <h3 class="text-base font-semibold text-white/80 mb-2">⏪ Previous Stock</h3>
        <div v-if="Object.keys(previousStockBreakdown).length" class="space-y-1">
          <div v-for="(products, category) in previousStockBreakdown" :key="category">
            <strong class="text-white/70 block">{{ category }}</strong>
            <div v-for="(qty, name) in products" :key="name" class="flex justify-between text-sm">
              <span>{{ name }} × {{ qty }}</span>
            </div>
          </div>
        </div>
        <div v-else class="text-sm text-white/40">No previous stock recorded.</div>
      </div>



      <!-- Deductions -->
      <div class="bg-white/10 p-4 rounded-2xl shadow">
        <h3 class="text-base font-semibold text-white/80 mb-2">💸 Deductions</h3>
        <div v-if="!payout.deductions || Object.keys(payout.deductions).length === 0" class="text-sm text-white/40">No
          deductions recorded.</div>
        <div v-for="key in Object.keys(payout.deductions || {})" :key="key" class="flex justify-between text-sm">
          <span class="capitalize">{{ key.replace(/_/g, ' ') }}</span>
          <span>-₱{{ Math.round(payout.deductions[key] || 0) }}</span>
        </div>
      </div>

      <!-- Allowances -->
      <div class="bg-white/10 p-4 rounded-2xl shadow">
        <h3 class="text-base font-semibold text-white/80 mb-2">🎁 Allowances</h3>
        <div v-if="!payout.allowances || Object.keys(payout.allowances).length === 0" class="text-sm text-white/40">No
          allowances recorded.</div>
        <div v-for="key in Object.keys(payout.allowances || {})" :key="key" class="flex justify-between text-sm">
          <span class="capitalize">{{ key.replace(/_/g, ' ') }}</span>
          <span class="text-green-400">₱{{ Math.round(payout.allowances[key] || 0) }}</span>
        </div>
      </div>

      <!-- Commissions -->
      <div class="bg-white/10 p-4 rounded-2xl shadow">
        <h3 class="text-base font-semibold text-white/80 mb-2">💼 Commissions</h3>
        <div v-if="!payout.commissions || Object.keys(payout.commissions).length === 0" class="text-sm text-white/40">No
          commissions recorded.</div>
        <div v-for="key in Object.keys(payout.commissions || {})" :key="key" class="flex justify-between text-sm">
          <span class="capitalize">{{ key.replace(/_/g, ' ') }}</span>
          <span class="text-green-400">₱{{ Math.round(payout.commissions[key] || 0) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

const route = useRoute()
const userStore = useUserStore()

const employeeId = route.params.id || userStore.user?.id || 'mock-id'
const isAdmin = userStore.role === 'admin'
const isSelf = !route.params.id

// Get week from query parameter if provided
const weekParam = route.query.week

const employeeName = ref('Loading...')
const payout = ref(null)
const currentSavings = ref(null)
const productBreakdown = ref([])
const previousStockBreakdown = ref({})
const currentStockBreakdown = ref({})
const loading = ref(true)

onMounted(async () => {
  loading.value = true

  // Use the week parameter if provided, otherwise use today
  const targetDate = weekParam ? weekParam : format(new Date(), 'yyyy-MM-dd')

  console.log('🔍 EmployeePayout Debug:', {
    employeeId,
    weekParam,
    targetDate,
    routeQuery: route.query
  })

  try {
    // Fetch worker name
    const { data: worker } = await supabase
      .from('workers')
      .select('name')
      .eq('id', employeeId)
      .single()

    employeeName.value = worker?.name || 'Unknown Worker'

    // Fetch payout for the specific week
    let payoutData = null

    if (weekParam) {
      // If week parameter is provided, fetch payout confirmed on that date
      console.log('🔍 Searching for payout confirmed on:', { employeeId, weekParam })

      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('confirmed_at', `${weekParam}T00:00:00`)
        .lte('confirmed_at', `${weekParam}T23:59:59`)
        .order('confirmed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      console.log('📋 Payout query result:', { data, error })

      // Also check what payouts exist for this employee around this date
      const { data: allPayouts } = await supabase
        .from('payouts')
        .select('week_start, confirmed_at, net_total, status')
        .eq('employee_id', employeeId)
        .order('confirmed_at', { ascending: false })
        .limit(10)

      console.log('📅 All recent payouts for this employee:', allPayouts)

      payoutData = data
    } else {
      // Otherwise, fetch most recent confirmed payout for today (original behavior)
      const { data } = await supabase
        .from('payouts')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('confirmed_at', `${targetDate}T00:00:00`)
        .lte('confirmed_at', `${targetDate}T23:59:59`)
        .order('confirmed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      payoutData = data
    }

    // Fetch current savings total for this employee
    const { data: savingsTotal } = await supabase
      .from('savings')
      .select('amount')
      .eq('worker_id', employeeId)

    const total = savingsTotal?.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0) || 0
    currentSavings.value = total.toFixed(2)

    payout.value = payoutData

    console.log('💰 Payout Data Found:', {
      payoutData,
      weekStart: payoutData?.week_start,
      netTotal: payoutData?.net_total
    })

    if (!payoutData?.week_start) return

    // Fetch and summarize deliveries for the specific week
    const deliveryWeekStart = new Date(payoutData.week_start)
    const deliveryWeekEnd = new Date(deliveryWeekStart)
    deliveryWeekEnd.setDate(deliveryWeekEnd.getDate() + 6) // Add 6 days to get the full week

    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('product_id, quantity, price_snapshot, products(name, price_per_unit)')
      .eq('worker_id', employeeId)
      .gte('delivery_date', payoutData.week_start)
      .lte('delivery_date', deliveryWeekEnd.toISOString().split('T')[0]) // Get deliveries for the entire week

    if (deliveries?.length) {
      const summary = {}
      deliveries.forEach(d => {
        const name = d.products?.name || 'Unknown'
        const price = parseFloat((d.price_snapshot ?? d.products?.price_per_unit) || 0)
        if (!summary[name]) summary[name] = { name, quantity: 0, subtotal: 0 }
        summary[name].quantity += d.quantity
        summary[name].subtotal += d.quantity * price
      })
      productBreakdown.value = Object.values(summary)
    }

    // Determine previous and current week stock
    const weekStart = payoutData.week_start

    const { data: prevWeek } = await supabase
      .from('bodega_stock')
      .select('week_start')
      .lt('week_start', weekStart)
      .order('week_start', { ascending: false })
      .limit(1)

    const prevWeekStr = prevWeek?.[0]?.week_start

    const { data: prevStock } = await supabase
      .from('bodega_stock')
      .select('quantity, product_id, products(name, category)')
      .eq('worker_id', employeeId)
      .eq('week_start', prevWeekStr)

    const { data: currStock } = await supabase
      .from('bodega_stock')
      .select('quantity, product_id, products(name, category)')
      .eq('worker_id', employeeId)
      .eq('week_start', weekStart)

    // Group stock by category and product name
    const groupStock = (stockData) => {
      const grouped = {}
      stockData?.forEach(item => {
        const cat = item.products?.category || 'Uncategorized'
        const name = item.products?.name || 'Unknown'
        if (!grouped[cat]) grouped[cat] = {}
        grouped[cat][name] = (grouped[cat][name] || 0) + item.quantity
      })
      console.log('🧮 Grouping stockData:', stockData)
      return grouped
    }

    previousStockBreakdown.value = groupStock(prevStock)
    currentStockBreakdown.value = groupStock(currStock)

  } catch (err) {
    console.error('❌ Payroll Fetch Error:', err.message)
  } finally {
    loading.value = false
  }
})
</script>
