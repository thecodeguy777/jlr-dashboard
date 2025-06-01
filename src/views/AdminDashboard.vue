<template>
  <Suspense>
    <template #default>
      <div class="min-h-screen bg-gray-900 text-white p-6">
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
          <div class="text-2xl font-bold tracking-tight">👑 Admin Panel</div>
          <p class="text-sm text-white/60">Welcome back, Admin Jayson</p>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white/10 rounded-xl p-4 shadow">
            <h2 class="text-sm font-medium text-white/70">Deliveries This Week</h2>
            <p class="text-3xl font-bold text-green-400 mt-2">{{ deliveriesCount }} pcs</p>
            <p class="text-xs mt-1" :class="{
              'text-green-400': deliveriesPercentChange > 0,
              'text-red-400': deliveriesPercentChange < 0,
              'text-white/40': deliveriesPercentChange === 0
            }">
              <span v-if="deliveriesPercentChange > 0">↑ {{ deliveriesPercentChange }}% from last week</span>
              <span v-else-if="deliveriesPercentChange < 0">↓ {{ Math.abs(deliveriesPercentChange) }}% from last
                week</span>
              <span v-else>— 0% change</span>
            </p>
            <div class="grid grid-cols-2 gap-2 mt-2 text-sm text-white/60">
              <div><span class="font-medium text-white/80">Single Wall:</span> {{ deliveriesByCategory.singleWall }} pcs
              </div>
              <div><span class="font-medium text-white/80">Double Wall:</span> {{ deliveriesByCategory.doubleWall }} pcs
              </div>
            </div>
          </div>

          <div class="bg-white/10 rounded-xl p-4 shadow">
            <h2 class="text-sm font-medium text-white/70">Total Savings of Employees</h2>
            <p class="text-3xl font-bold text-blue-400 mt-2">₱{{ activeEmployees }}</p>
            <p class="text-xs text-white/40 mt-1">Accumulated from savings table</p>
          </div>

          <div class="bg-white/10 rounded-xl p-4 shadow">
            <h2 class="text-sm font-medium text-white/70">Payroll to be Paid This Week</h2>
            <p class="text-3xl font-bold text-red-400 mt-2">₱{{ totalSalaries.toLocaleString() }}</p>
            <p class="text-xs text-white/40 mt-1">Updated today</p>
          </div>

          <div class="bg-white/10 rounded-xl p-4 shadow space-y-2">
            <h2 class="text-sm font-medium text-white/70">Gross Sales</h2>

            <!-- Segmented Buttons -->
            <div class="flex gap-2 text-xs">
              <button v-for="type in ['all', 'inhouse', 'subcon']" :key="type" @click="salesView = type" :class="[
                'px-3 py-1 rounded-full font-semibold transition',
                salesView === type
                  ? 'bg-green-600 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              ]">
                {{ type === 'all' ? 'All' : type === 'inhouse' ? 'In-House' : 'Subcon' }}
              </button>
            </div>

            <p class="text-3xl font-bold text-green-400">
              ₱{{ (grossSalesTotal[salesView] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
            </p>

            <p class="text-xs text-white/40">Based on deliveries this week</p>
          </div>


        </div>

        <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-6">
          <div class="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <label class="text-sm text-white/60">📅 Select Week Ending (Saturday):</label>
            <input type="date" v-model="selectedSaturday"
              class="bg-gray-800 text-white text-sm p-2 rounded border border-white/10" @change="snapToSaturday" />
          </div>

        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap gap-4 mt-4 mb-10">
          <router-link to="/summary"
            class="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow transition">
            📊 View Summary
          </router-link>
          <router-link to="/deliveries"
            class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow transition">
            📦 Manage Deliveries
          </router-link>
        </div>

        <!-- Payout Breakdown Table -->
        <!-- Mobile View (shown when screen is small) -->
        <!-- Mobile Payout Cards -->
        <div class="space-y-4 md:hidden">
          <router-link v-for="person in payoutBreakdown" :key="person.id" :to="`/payout/${person.id}`"
            class="block bg-white/5 p-4 rounded-xl shadow-lg ring-1 ring-white/10 transition hover:ring-green-500 hover:shadow-green-500/10">
            <div class="flex justify-between items-center mb-3">
              <div class="text-lg font-bold text-white">{{ person.name }}</div>
              <div class="text-sm text-white/60 italic">Total: ₱{{ person.total }}</div>
            </div>

            <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-white/80">
              <template v-if="parseFloat(person.gross)">
                <div><span class="block text-white/50">Gross</span>₱{{ person.gross }}</div>
              </template>
              <template v-if="parseFloat(person.cashAdvance)">
                <div><span class="block text-white/50">Cash Advance</span>₱{{ person.cashAdvance }}</div>
              </template>
              <template v-if="parseFloat(person.savings)">
                <div><span class="block text-white/50">Savings</span>₱{{ person.savings }}</div>
              </template>
              <template v-if="parseFloat(person.contributions)">
                <div><span class="block text-white/50">Contributions</span>₱{{ person.contributions }}</div>
              </template>
              <template v-if="parseFloat(person.deductibles)">
                <div><span class="block text-white/50">Loan Deductibles</span>₱{{ person.deductibles }}</div>
              </template>
              <template v-if="parseFloat(person.allowance)">
                <div><span class="block text-white/50">Allowance</span>₱{{ person.allowance }}</div>
              </template>
              <template v-if="parseFloat(person.refund)">
                <div><span class="block text-white/50">Refund</span>₱{{ person.refund }}</div>
              </template>
            </div>
          </router-link>
        </div>



        <!-- Desktop Table (only visible on md and up) -->
        <div class="hidden md:block overflow-x-auto">
          <table class="min-w-full text-sm text-white/80 table-auto">
            <thead class="border-b border-white/10">
              <tr>
                <th class="text-left py-2 pr-4">Name</th>
                <th class="text-left py-2 pr-4">Gross</th>
                <th class="text-left py-2 pr-4">Cash Advance</th>
                <th class="text-left py-2 pr-4">Savings</th>
                <th class="text-left py-2 pr-4">Contributions</th>
                <th class="text-left py-2 pr-4">Deductibles (Loan)</th>
                <th class="text-left py-2 pr-4">Allowance</th>
                <th class="text-left py-2 pr-4">Refund</th>
                <th class="text-left py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="person in payoutBreakdown" :key="person.name" class="border-b border-white/5">
                <td class="py-2 pr-4 font-medium">{{ person.name }}</td>
                <td class="py-2 pr-4">{{ person.gross || '' }}</td>
                <td class="py-2 pr-4">{{ person.cashAdvance || '' }}</td>
                <td class="py-2 pr-4">{{ person.savings || '' }}</td>
                <td class="py-2 pr-4">{{ person.contributions || '' }}</td>
                <td class="py-2 pr-4">{{ person.deductibles || '' }}</td>
                <td class="py-2 pr-4">{{ person.allowance || '' }}</td>
                <td class="py-2 pr-4">{{ person.refund || '' }}</td>
                <td class="py-2">{{ person.total || '' }}</td>
              </tr>
            </tbody>
            <tfoot class="border-t border-white/10 text-white/80">
              <tr>
                <th class="text-left py-2 pr-4">Total</th>
                <th class="text-left py-2 pr-4">₱{{ totalColumn('gross') }}</th>
                <th class="text-left py-2 pr-4 text-red-400">₱{{ totalColumn('cashAdvance') }}</th>
                <th class="text-left py-2 pr-4 text-red-400">₱{{ totalColumn('savings') }}</th>
                <th class="text-left py-2 pr-4 text-red-400">₱{{ totalColumn('contributions') }}</th>
                <th class="text-left py-2 pr-4 text-red-400">₱{{ totalColumn('deductibles') }}</th>
                <th class="text-left py-2 pr-4 text-green-400">₱{{ totalColumn('allowance') }}</th>
                <th class="text-left py-2 pr-4 text-green-400">₱{{ totalColumn('refund') }}</th>
                <th class="text-left py-2 text-white/80">₱{{ totalColumn('total') }}</th>
              </tr>
            </tfoot>


          </table>
        </div>

      </div>
    </template>
    <template #fallback>
      <div class="text-white text-center py-20">Loading dashboard...</div>
    </template>
  </Suspense>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

const selectedSaturday = ref(new Date().toISOString().split('T')[0])
const loading = ref(false)
const deliveriesCount = ref(0)
const activeEmployees = ref(0)
const totalSalaries = ref(0)
const deliveriesByCategory = ref({ singleWall: 0, doubleWall: 0 })
const deliveriesPercentChange = ref(0)
const payoutBreakdown = ref([])
const grossSalesTotal = ref(0)
const salesView = ref('all') // 'all', 'inhouse', 'subcon'

function snapToSaturday() {
  const selected = new Date(selectedSaturday.value)
  const offset = (6 - selected.getDay() + 7) % 7
  selected.setDate(selected.getDate() + offset)
  selectedSaturday.value = selected.toISOString().split('T')[0]
}

function getRange() {
  const today = new Date(selectedSaturday.value)
  today.setHours(0, 0, 0, 0)
  const saturday = new Date(today)
  saturday.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7))
  const startOfWeek = new Date(saturday)
  startOfWeek.setDate(saturday.getDate() - 6)
  const lastSaturday = new Date(saturday)
  lastSaturday.setDate(saturday.getDate() - 7)
  const lastStartOfWeek = new Date(lastSaturday)
  lastStartOfWeek.setDate(lastSaturday.getDate() - 6)

  return {
    start: startOfWeek.toISOString().split('T')[0],
    end: saturday.toISOString().split('T')[0],
    lastStart: lastStartOfWeek.toISOString().split('T')[0],
    lastEnd: lastSaturday.toISOString().split('T')[0]
  }
}

function totalColumn(key) {
  const sum = payoutBreakdown.value.reduce((total, p) => {
    const num = parseFloat(p[key])
    return total + (isNaN(num) ? 0 : num)
  }, 0)
  return sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function sumSales(rows = [], priceMap = {}) {
  return rows.reduce((total, row) => {
    const qty = +row.quantity || 0
    const price = priceMap[row.product_id] || 0
    return total + qty * price
  }, 0)
}

async function fetchKPIs() {
  loading.value = true
  const { start, end, lastStart, lastEnd } = getRange()

  const { data: deliveries } = await supabase.from('deliveries').select('quantity, product_id, delivery_date')
  const { data: products } = await supabase.from('products').select('id, category')
  const productMap = Object.fromEntries(products?.map(p => [p.id, p.category]) || [])

  const filteredDeliveries = deliveries?.filter(d => {
    const date = new Date(d.delivery_date)
    return date >= new Date(start) && date <= new Date(end) && productMap[d.product_id]
  }) || []

  let singleWall = 0, doubleWall = 0
  for (const d of filteredDeliveries) {
    const qty = d.quantity || 0
    const category = productMap[d.product_id]
    if (category === 'Single Walled') singleWall += qty
    if (category === 'Double Walled') doubleWall += qty
  }

  deliveriesCount.value = singleWall + doubleWall
  deliveriesByCategory.value = { singleWall, doubleWall }

  const lastDeliveries = deliveries?.filter(d => {
    const date = new Date(d.delivery_date)
    return date >= new Date(lastStart) && date <= new Date(lastEnd) && productMap[d.product_id]
  }) || []
  const lastTotal = lastDeliveries.reduce((sum, d) => sum + (d.quantity || 0), 0)
  if (lastTotal > 0) {
    deliveriesPercentChange.value = Math.round(((deliveriesCount.value - lastTotal) / lastTotal) * 100)
  }

  const { data: savingsSum } = await supabase.from('savings').select('amount')
  activeEmployees.value = savingsSum
    ? savingsSum.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
      .toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : '0.00'

  const { data: payouts } = await supabase.from('payouts')
    .select('net_total')
    .gte('week_start', start)
    .lte('week_start', end)

  totalSalaries.value = payouts?.reduce((sum, p) => sum + (p.net_total || 0), 0) || 0

  const confirmedDay = selectedSaturday.value

  const { data: payoutsThisWeek, error } = await supabase
    .from('payouts')
    .select(`
      employee_id,
      gross_income,
      paid_by_hours,
      deductions,
      allowances,
      net_total,
      confirmed_at,
      workers:workers!payouts_employee_id_fkey (
        name
      )
    `)
    .gte('confirmed_at', `${confirmedDay}T00:00:00`)
    .lte('confirmed_at', `${confirmedDay}T23:59:59`)

  if (error) console.error('Supabase error:', error)

  const { data: savingsData } = await supabase
    .from('savings')
    .select('worker_id, amount')
    .gte('week_start', start)
    .lte('week_start', end)

  const savingsMap = {}
  savingsData?.forEach(s => {
    const amount = parseFloat(s.amount) || 0
    savingsMap[s.worker_id] = (savingsMap[s.worker_id] || 0) + amount
  })

  payoutBreakdown.value = (payoutsThisWeek || []).map(p => {
    const d = p.deductions || {}
    const a = p.allowances || {}

    return {
      id: p.employee_id,
      name: p.workers?.name || '—',
      gross: ((p.gross_income || 0) + (p.paid_by_hours || 0)).toFixed(2),
      cashAdvance: isNaN(parseFloat(d.cash_advance)) ? '' : parseFloat(d.cash_advance).toFixed(2),
      savings: savingsMap[p.employee_id]?.toFixed(2) || '',
      contributions: isNaN(parseFloat(d.sss)) ? '' : parseFloat(d.sss).toFixed(2),
      deductibles: d.loan ? d.loan.toFixed(2) : '',
      allowance: Object.values(a).reduce((sum, val) => {
        const num = parseFloat(val)
        return sum + (isNaN(num) ? 0 : num)
      }, 0).toFixed(2),
      refund: a.refund ? a.refund.toFixed(2) : '',
      total: p.net_total ? p.net_total.toFixed(2) : ''
    }
  })

  const { data: clientPrices, error: priceErr } = await supabase
    .from('client_product_prices')
    .select('product_id, price')

  if (priceErr) {
    console.error('Price fetch error:', priceErr)
    grossSalesTotal.value = { all: 0, inhouse: 0, subcon: 0 }
  } else {
    const priceMap = {}
    for (const entry of clientPrices) {
      if (!priceMap[entry.product_id]) {
        priceMap[entry.product_id] = parseFloat(entry.price)
      }
    }

    const { data: inhouse, error: inErr } = await supabase
      .from('deliveries')
      .select('product_id, quantity, delivery_date')
      .gte('delivery_date', start)
      .lte('delivery_date', end)

    const { data: subcon, error: subErr } = await supabase
      .from('subcon_deliveries')
      .select('product_id, quantity, delivery_date')
      .gte('delivery_date', start)
      .lte('delivery_date', end)

    if (inErr || subErr) {
      console.error('Delivery fetch error:', inErr || subErr)
      grossSalesTotal.value = { all: 0, inhouse: 0, subcon: 0 }
    } else {
      grossSalesTotal.value = {
        all: sumSales(inhouse, priceMap) + sumSales(subcon, priceMap),
        inhouse: sumSales(inhouse, priceMap),
        subcon: sumSales(subcon, priceMap)
      }
    }
  }

  loading.value = false
}


watch(selectedSaturday, async () => {
  snapToSaturday()
  await fetchKPIs()
})

onMounted(() => {
  snapToSaturday()
  fetchKPIs()
})
</script>
