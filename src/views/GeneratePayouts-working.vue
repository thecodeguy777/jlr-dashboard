<template>
  <div class="min-h-screen bg-gray-900 text-white p-6 space-y-6">
    <div class="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
      <h1 class="text-xl font-bold">📤 Generate Weekly Payouts</h1>
      <div class="flex flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <label class="text-white/70 text-sm">Select Week:</label>
          <input type="date" v-model="selectedSaturday"
            class="bg-gray-800 text-white p-2 rounded border border-white/10" />
        </div>

        <button @click="previewMode ? commitPayouts() : previewPayouts()" :disabled="loading"
          class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded">
          {{ previewMode ? '✅ Commit All' : '👁️ Preview Payouts' }}
        </button>
      </div>
    </div>



    <div v-if="loading" class="text-sm text-white/60 italic">Processing...</div>

    <div v-if="previewMode && previews.length" class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="p in previews" :key="p.employee_id" @click="loadPayout(p)"
        class="bg-white/10 p-4 rounded-2xl shadow space-y-1 cursor-pointer hover:bg-white/5 transition w-full h-full flex flex-col justify-between">
        <div class="flex justify-between">
          <h2 class="text-lg font-semibold">{{ p.name }}</h2>
          <span class="text-green-400 font-bold text-lg">₱{{ computeNet(p) }}</span>
        </div>
        <p class="text-sm text-white/60">Gross: ₱{{ Math.round(p.gross_income) }} | Hours: {{ p.hours_worked }}
          hrs</p>
        <p class="text-xs text-white/40">Week: {{ p.week_start }}</p>

        <div class="text-xs text-white/50 mt-2 space-y-2">
          <div v-for="(products, category) in p.productBreakdownByCategory" :key="category">
            <strong class="text-white/70">📦 {{ category }}:</strong>
            <ul class="ml-4 list-disc list-inside">
              <li v-for="(qty, name) in products" :key="name">
                {{ name }}: {{ qty }} pcs
              </li>
            </ul>
          </div>
        </div>
        <!-- Add inside card -->
        <div class="text-xs text-white/50 mt-2 space-y-2">
          <div v-for="(products, category) in p.previousBodegaByCategory" :key="'prev-' + category">
            <strong class="text-white/70">📦 Previous – {{ category }}:</strong>
            <ul class="ml-4 list-disc list-inside">
              <li v-for="(qty, name) in products" :key="name">{{ name }}: {{ qty }} pcs</li>
            </ul>
          </div>
          <div v-for="(products, category) in p.currentBodegaByCategory" :key="'curr-' + category">
            <strong class="text-white/70">📦 Current – {{ category }}:</strong>
            <ul class="ml-4 list-disc list-inside">
              <li v-for="(qty, name) in products" :key="name">{{ name }}: {{ qty }} pcs</li>
            </ul>
          </div>
        </div>



        <p class="text-xs" :class="p.exists ? 'text-yellow-400' : 'text-green-500'">
          {{ p.exists ? '⚠️ Already exists. Skipping on commit.' : '✅ Ready to commit.' }}
        </p>
        <button v-if="!p.exists" @click.stop="commitSinglePayout(p)"
          class="mt-2 text-xs bg-green-700 hover:bg-green-800 px-3 py-1 rounded w-fit self-end text-white">
          Commit
        </button>

      </div>
    </div>

    <!-- Editable Modal -->
    <div v-if="selected" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div class="bg-gray-800 p-6 rounded-2xl shadow-lg w-full max-w-lg space-y-4">
        <h2 class="text-lg font-semibold text-white">✏️ Edit Payout for {{ selected.name }}</h2>

        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label class="block text-white/60">Savings</label>
            <input type="number" v-model.number="selected.savings" class="w-full p-2 rounded bg-white/10 text-white" />
          </div>
          <div>
            <label class="block text-white/60">Gross Income</label>
            <input type="number" v-model.number="selected.gross_income"
              class="w-full p-2 rounded bg-white/10 text-white" />
          </div>
          <div>
            <label class="block text-white/60">Hours Worked</label>
            <input type="number" v-model.number="selected.hours_worked"
              class="w-full p-2 rounded bg-white/10 text-white" />
          </div>

          <div>
            <label class="block text-white/60">Hourly Rate</label>
            <input type="number" v-model.number="selected.hourly_rate"
              class="w-full p-2 rounded bg-white/10 text-white" />
          </div>

          <div v-for="(value, key) in selected.deductions" :key="'deduction-' + key">
            <label class="block text-white/60 flex justify-between">
              <span>Deduction – {{ key === 'sss' ? 'contributions' : key }}</span>
              <span v-if="key === 'loan'" class="text-green-400 text-xs ml-2">₱8,700 left</span>
            </label>
            <input type="number" v-model.number="selected.deductions[key]"
              class="w-full p-2 rounded bg-white/10 text-white" />
          </div>

          <div>
            <label class="block text-white/60">Allowance</label>
            <input type="number" v-model.number="selected.allowances.general"
              class="w-full p-2 rounded bg-white/10 text-white" />
          </div>

          <div v-for="(value, key) in selected.commissions" :key="'commission-' + key">
            <label class="block text-white/60">Commission – {{ key }}</label>
            <input type="number" v-model.number="selected.commissions[key]"
              class="w-full p-2 rounded bg-white/10 text-white" />
          </div>
        </div>

        <div class="flex justify-between items-center mt-4">
          <span class="text-sm text-white/80">Net Pay: <span class="text-green-400 font-bold">₱{{
            computeNet(selected)
              }}</span></span>
          <div class="space-x-2">
            <button @click="saveChanges" class="text-sm text-white/60 hover:underline">Save Changes</button>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

const loading = ref(false)
const previews = ref([])
const previewMode = ref(false)
const selected = ref(null)
const selectedSaturday = ref(new Date())

function computeNet(p) {
  const d = Object.values(p.deductions || {}).reduce((a, b) => a + (b || 0), 0)
  const a = Object.values(p.allowances || {}).reduce((a, b) => a + (b || 0), 0)
  const c = Object.values(p.commissions || {}).reduce((a, b) => a + (b || 0), 0)
  const savings = p.savings ?? 0
  const hours = (p.hours_worked || 0) * (p.hourly_rate || 0)
  return Math.round((p.gross_income || 0) + hours + a + c - d - savings)
}

function getWeekStart(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}
async function loadPayout(p) {
  selected.value = { ...p } // Set baseline from preview

  const { data: payoutData, error } = await supabase
    .from('payouts')
    .select('*')
    .eq('employee_id', p.employee_id)
    .eq('week_start', p.week_start)
    .maybeSingle()

  if (payoutData && !error) {
    selected.value = {
      ...selected.value,
      gross_income: payoutData.gross_income,
      hours_worked: payoutData.paid_by_hours / p.hourly_rate,
      deductions: payoutData.deductions || {},
      allowances: payoutData.allowances || {},
      commissions: payoutData.commissions || {},
      savings: (await fetchSavings(p.employee_id, p.week_start)) || 0
    }
  }
}

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

async function saveChanges() {
  if (!selected.value) return

  const p = selected.value

  // Update payout
  const { error: payoutError } = await supabase
    .from('payouts')
    .update({
      gross_income: p.gross_income,
      paid_by_hours: p.hours_worked * p.hourly_rate,
      deductions: p.deductions,
      allowances: p.allowances,
      commissions: p.commissions,
      net_total: computeNet(p),
    })
    .eq('employee_id', p.employee_id)
    .eq('week_start', p.week_start)

  // Update savings
  if (p.savings > 0) {
    await supabase
      .from('savings')
      .upsert({
        worker_id: p.employee_id,
        week_start: p.week_start,
        amount: p.savings,
        type: 'auto',
        remarks: 'Weekly deduction'
      })
  }

  if (payoutError) {
    console.error('Failed to update payout:', payoutError)
    return
  }

  // Sync back to previews
  const i = previews.value.findIndex(pr => pr.employee_id === p.employee_id)
  if (i !== -1) {
    previews.value[i] = { ...p }
  }

  selected.value = null
}


async function previewPayouts() {
  loading.value = true
  previews.value = []
  previewMode.value = true

  const weekStart = new Date('2025-05-11T00:00:00')
  const weekStartStr = weekStart.toISOString().split('T')[0]

  const { data: workers } = await supabase.from('workers').select('*')
  const { data: products } = await supabase.from('products').select('id, name, price_per_unit, category')

  const priceMap = {}
  products.forEach(p => (priceMap[p.id] = parseFloat(p.price_per_unit || 0)))

  const prevMap = {}
  const { data: previousStock } = await supabase
    .from('bodega_stock')
    .select('*')
    .eq('week_start', '2025-05-10')

  previousStock?.forEach(item => {
    const key = `${item.worker_id}_${item.product_id}`
    prevMap[key] = (prevMap[key] || 0) + item.quantity
  })

  for (const worker of workers) {
    let gross = 0
    let adjustedGross = 0
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('product_id, quantity, delivery_date')
      .eq('worker_id', worker.id)
      .gte('delivery_date', '2025-05-11')
      .lte('delivery_date', '2025-05-17')

    const breakdownByCategory = {}
    deliveries?.forEach(d => {
      const price = priceMap[d.product_id] || 0
      gross += (d.quantity || 0) * price
      const product = products.find(p => p.id === d.product_id)
      if (!product) return
      const category = product.category || 'Uncategorized'
      const name = product.name || 'Unknown'
      if (!breakdownByCategory[category]) breakdownByCategory[category] = {}
      breakdownByCategory[category][name] = (breakdownByCategory[category][name] || 0) + d.quantity
    })

    adjustedGross = gross

    const { data: currentStock } = await supabase
      .from('bodega_stock')
      .select('*')
      .eq('week_start', '2025-05-17')

    const currMap = {}
    currentStock?.forEach(item => {
      const key = `${item.worker_id}_${item.product_id}`
      currMap[key] = (currMap[key] || 0) + item.quantity
    })

    for (const product of products) {
      const price = priceMap[product.id] || 0
      const prevQty = prevMap[`${worker.id}_${product.id}`] || 0
      const currQty = currMap[`${worker.id}_${product.id}`] || 0
      adjustedGross = adjustedGross - (prevQty * price) + (currQty * price)
    }

    const { data: timesheets } = await supabase
      .from('timesheets')
      .select('hours_worked')
      .eq('worker_id', worker.id)
      .gte('date', '2025-05-11')
      .lte('date', '2025-05-17')

    const totalHours = timesheets.reduce((sum, t) => sum + (t.hours_worked || 0), 0)

    const deductions = {
      sss: 250,
      loan: 300,
      cash_advance: 0
    }
    const allowances = { transport: 0 }
    const commissions = { bonus: 0 }

    const totalDeductions = Object.values(deductions).reduce((a, b) => a + (b || 0), 0)
    const totalAdditions = Object.values(allowances).reduce((a, b) => a + (b || 0), 0) + Object.values(commissions).reduce((a, b) => a + (b || 0), 0)
    const net = adjustedGross + (totalHours * worker.hourly_rate) + totalAdditions - totalDeductions

    const { data: existingPayout } = await supabase
      .from('payouts')
      .select('*')
      .eq('employee_id', worker.id)
      .eq('week_start', weekStartStr)
      .maybeSingle()


    // Group bodega stock for display
    const previousBodegaByCategory = {}
    const currentBodegaByCategory = {}

    products.forEach(product => {
      const category = product.category || 'Uncategorized'
      const name = product.name || 'Unknown'
      const prevQty = prevMap[`${worker.id}_${product.id}`] || 0
      const currQty = currMap[`${worker.id}_${product.id}`] || 0

      if (prevQty > 0) {
        if (!previousBodegaByCategory[category]) previousBodegaByCategory[category] = {}
        previousBodegaByCategory[category][name] = prevQty
      }

      if (currQty > 0) {
        if (!currentBodegaByCategory[category]) currentBodegaByCategory[category] = {}
        currentBodegaByCategory[category][name] = currQty
      }
    })

    const payout = {
      employee_id: worker.id,
      name: worker.name,
      week_start: weekStartStr,
      gross_income: existingPayout?.gross_income ?? Math.round(adjustedGross),
      hours_worked: existingPayout?.paid_by_hours ? existingPayout.paid_by_hours / worker.hourly_rate : totalHours,
      hourly_rate: worker.hourly_rate,
      deductions: existingPayout?.deductions ?? deductions,
      allowances: existingPayout?.allowances ?? allowances,
      commissions: existingPayout?.commissions ?? commissions,
      savings: await fetchSavings(worker.id, weekStartStr),
      net_total: computeNet({
        ...existingPayout,
        gross_income: existingPayout?.gross_income ?? adjustedGross,
        hourly_rate: worker.hourly_rate,
        hours_worked: totalHours,
        deductions: existingPayout?.deductions ?? deductions,
        allowances: existingPayout?.allowances ?? allowances,
        commissions: existingPayout?.commissions ?? commissions,
        savings: existingPayout?.savings ?? 0
      }),
      productBreakdownByCategory: breakdownByCategory,
      previousBodegaByCategory,
      currentBodegaByCategory,
      exists: !!existingPayout
    }

    previews.value.push(payout)
  }

  loading.value = false
}
async function commitSinglePayout(p) {
  loading.value = true

  await supabase.from('payouts').insert({
    employee_id: p.employee_id,
    week_start: p.week_start,
    gross_income: p.gross_income,
    paid_by_hours: (p.hours_worked || 0) * (p.hourly_rate || 0),
    deductions: p.deductions,
    allowances: p.allowances,
    commissions: p.commissions,
    net_total: computeNet(p),
    status: 'pending'
  })

  if (p.savings > 0) {
    await supabase.from('savings').insert({
      worker_id: p.employee_id,
      week_start: p.week_start,
      amount: p.savings,
      type: 'auto',
      remarks: 'Weekly deduction'
    })
  }

  // Mark as committed in UI
  p.exists = true
  loading.value = false
}

async function commitPayouts() {
  loading.value = true

  for (const p of previews.value) {
    if (p.exists) continue

    await supabase.from('payouts').insert({
      employee_id: p.employee_id,
      week_start: p.week_start,
      gross_income: p.gross_income,
      paid_by_hours: (p.hours_worked || 0) * (p.hourly_rate || 0),
      deductions: p.deductions,
      allowances: p.allowances,
      commissions: p.commissions,
      net_total: computeNet(p),
      status: 'pending'
    })

    if (p.savings > 0) {
      await supabase.from('savings').upsert({
        worker_id: p.employee_id,
        week_start: p.week_start,
        amount: p.savings,
        type: 'auto',
        remarks: 'Weekly deduction'
      }, { onConflict: ['worker_id', 'week_start'] })
    }
  }

  loading.value = false
  previewMode.value = false
  previews.value = []
}
</script>
