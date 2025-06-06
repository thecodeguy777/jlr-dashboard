<script setup>
import { ref, onMounted, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import InHouseTab from './InHouseTab.vue'
import SubcontractorTab from './SubcontractorTab.vue'
import SummaryTab from './SummaryTab.vue' // optional

const tabs = ['Summary', 'In-house', 'Subcon'] // add 'Summary' if you want a merged overview
const activeTab = ref('Summary')

// Gross Sales functionality
const selectedSaturday = ref(new Date().toISOString().split('T')[0])
const grossSalesTotal = ref({ all: 0, inhouse: 0, subcon: 0 })
const grossCostTotal = ref({ all: 0, inhouse: 0, subcon: 0 })
const profitTotal = ref({ all: 0, inhouse: 0, subcon: 0 })
const salesView = ref('all') // 'all', 'inhouse', 'subcon'
const loading = ref(false)

// Helper functions from AdminDashboard
function snapToSaturday() {
  const selected = new Date(selectedSaturday.value)
  const offset = (6 - selected.getDay() + 7) % 7
  selected.setDate(selected.getDate() + offset)
  selectedSaturday.value = formatDate(selected)
}

function getRange() {
  const today = new Date(selectedSaturday.value);
  today.setHours(0, 0, 0, 0);

  if (isNaN(today.getTime())) {
    console.error('Invalid date:', selectedSaturday.value);
    return { start: '', end: '' };
  }

  const saturday = calculateSaturday(today);
  const startOfWeek = calculateStartOfWeek(saturday);

  return {
    start: formatDate(startOfWeek),
    end: formatDate(saturday)
  };
}

function calculateSaturday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = 6 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function calculateStartOfWeek(saturday) {
  const startOfWeek = new Date(saturday);
  startOfWeek.setDate(saturday.getDate() - 6);
  return startOfWeek;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function sumSales(rows = [], priceMap = {}) {
  return rows.reduce((total, row) => {
    const qty = +row.quantity || 0
    const price = priceMap[row.product_id] || 0
    return total + qty * price
  }, 0)
}

function sumCosts(rows = [], type = 'inhouse') {
  return rows.reduce((total, row) => {
    const qty = +row.quantity || 0
    let costPrice = 0

    if (type === 'inhouse') {
      // For in-house deliveries, use price_per_unit from products
      costPrice = row.products?.price_per_unit || 0
    } else {
      // For subcon deliveries, use price_snapshot or subcon_price from products
      costPrice = row.price_snapshot || row.products?.subcon_price || 0
    }

    return total + qty * costPrice
  }, 0)
}

async function fetchGrossSales() {
  loading.value = true
  const { start, end } = getRange()

  console.log('🔄 Fetching gross sales and costs for:', { start, end })

  try {
    // Fetch client prices for sales calculation
    const { data: clientPrices, error: priceErr } = await supabase
      .from('client_product_prices')
      .select('product_id, price')

    if (priceErr) {
      console.error('Price fetch error:', priceErr)
      grossSalesTotal.value = { all: 0, inhouse: 0, subcon: 0 }
      grossCostTotal.value = { all: 0, inhouse: 0, subcon: 0 }
      profitTotal.value = { all: 0, inhouse: 0, subcon: 0 }
      return
    }

    const clientPriceMap = {}
    for (const entry of clientPrices) {
      if (!clientPriceMap[entry.product_id]) {
        clientPriceMap[entry.product_id] = parseFloat(entry.price)
      }
    }

    // Fetch deliveries with product cost information
    const { data: inhouse, error: inErr } = await supabase
      .from('deliveries')
      .select('product_id, quantity, delivery_date, products(price_per_unit)')
      .gte('delivery_date', start)
      .lte('delivery_date', end)

    const { data: subcon, error: subErr } = await supabase
      .from('subcon_deliveries')
      .select('product_id, quantity, delivery_date, price_snapshot, products(subcon_price)')
      .gte('delivery_date', start)
      .lte('delivery_date', end)

    if (inErr || subErr) {
      console.error('Delivery fetch error:', inErr || subErr)
      grossSalesTotal.value = { all: 0, inhouse: 0, subcon: 0 }
      grossCostTotal.value = { all: 0, inhouse: 0, subcon: 0 }
      profitTotal.value = { all: 0, inhouse: 0, subcon: 0 }
      return
    }

    // Calculate gross sales (using client prices)
    const inhouseSales = sumSales(inhouse, clientPriceMap)
    const subconSales = sumSales(subcon, clientPriceMap)

    grossSalesTotal.value = {
      all: inhouseSales + subconSales,
      inhouse: inhouseSales,
      subcon: subconSales
    }

    // Calculate gross costs (using cost prices)
    const inhouseCosts = sumCosts(inhouse, 'inhouse')
    const subconCosts = sumCosts(subcon, 'subcon')

    grossCostTotal.value = {
      all: inhouseCosts + subconCosts,
      inhouse: inhouseCosts,
      subcon: subconCosts
    }

    // Calculate profit (sales - costs)
    profitTotal.value = {
      all: grossSalesTotal.value.all - grossCostTotal.value.all,
      inhouse: grossSalesTotal.value.inhouse - grossCostTotal.value.inhouse,
      subcon: grossSalesTotal.value.subcon - grossCostTotal.value.subcon
    }

    console.log('💰 Financial data calculated:', {
      sales: grossSalesTotal.value,
      costs: grossCostTotal.value,
      profit: profitTotal.value
    })

  } catch (error) {
    console.error('Error fetching financial data:', error)
    grossSalesTotal.value = { all: 0, inhouse: 0, subcon: 0 }
    grossCostTotal.value = { all: 0, inhouse: 0, subcon: 0 }
    profitTotal.value = { all: 0, inhouse: 0, subcon: 0 }
  } finally {
    loading.value = false
  }
}

// Watchers and lifecycle
watch(selectedSaturday, async () => {
  snapToSaturday()
  await fetchGrossSales()
})

onMounted(() => {
  snapToSaturday()
  fetchGrossSales()
})
</script>

<template>
  <div class="px-6 pt-6 pb-24 space-y-8 xl:space-y-12">
    <!-- Gross Sales Card -->
    <div class="bg-white/10 rounded-xl p-6 shadow space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-white/90 mb-2">💰 Gross Sales</h2>
          <div class="flex items-center gap-2">
            <label class="text-sm text-white/60">📅 Select Week Ending (Saturday):</label>
            <input type="date" v-model="selectedSaturday"
              class="bg-gray-800 text-white text-sm p-2 rounded border border-white/10" />
          </div>
        </div>

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
      </div>

      <div class="text-center space-y-4">
        <!-- Gross Sales -->
        <div>
          <p class="text-sm text-white/60 uppercase tracking-wide font-medium">Gross Sales</p>
          <p class="text-4xl font-bold text-green-400" v-if="!loading">
            ₱{{ (grossSalesTotal[salesView] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
          </p>
          <p class="text-4xl font-bold text-white/40" v-else>
            Loading...
          </p>
        </div>

        <!-- Gross Cost -->
        <div>
          <p class="text-sm text-white/60 uppercase tracking-wide font-medium">Gross Cost</p>
          <p class="text-3xl font-bold text-red-400" v-if="!loading">
            ₱{{ (grossCostTotal[salesView] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
          </p>
          <p class="text-3xl font-bold text-white/40" v-else>
            Loading...
          </p>
        </div>

        <!-- Profit -->
        <div class="pt-4 border-t border-white/10">
          <p class="text-sm text-white/60 uppercase tracking-wide font-medium">Profit (Sales - Cost)</p>
          <p class="text-5xl font-bold" :class="[
            !loading ? (profitTotal[salesView] >= 0 ? 'text-green-400' : 'text-red-400') : 'text-white/40'
          ]">
            <span v-if="!loading">
              {{ profitTotal[salesView] >= 0 ? '+' : '' }}₱{{ (profitTotal[salesView] || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2
              }) }}
            </span>
            <span v-else>Loading...</span>
          </p>
          <p class="text-sm text-white/60 mt-1">
            {{ salesView === 'all' ? 'Total profit' :
              salesView === 'inhouse' ? 'In-house profit' :
                'Subcontractor profit' }} for selected week
          </p>
        </div>
      </div>

      <!-- Financial Breakdown -->
      <div v-if="salesView === 'all'" class="grid grid-cols-2 gap-6 pt-6 border-t border-white/10">
        <!-- In-House Breakdown -->
        <div class="bg-white/5 rounded-lg p-4">
          <h3 class="text-sm text-blue-400 font-medium mb-3 text-center">📦 In-House</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-white/60">Sales:</span>
              <span class="text-green-400 font-medium">₱{{ grossSalesTotal.inhouse.toLocaleString(undefined, {
                minimumFractionDigits: 2
              }) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/60">Cost:</span>
              <span class="text-red-400 font-medium">₱{{ grossCostTotal.inhouse.toLocaleString(undefined, {
                minimumFractionDigits: 2
              }) }}</span>
            </div>
            <div class="flex justify-between pt-2 border-t border-white/10">
              <span class="text-white font-medium">Profit:</span>
              <span class="font-bold" :class="profitTotal.inhouse >= 0 ? 'text-green-400' : 'text-red-400'">
                {{ profitTotal.inhouse >= 0 ? '+' : '' }}₱{{ profitTotal.inhouse.toLocaleString(undefined, {
                  minimumFractionDigits: 2
                }) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Subcontractor Breakdown -->
        <div class="bg-white/5 rounded-lg p-4">
          <h3 class="text-sm text-purple-400 font-medium mb-3 text-center">🚛 Subcontractor</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-white/60">Sales:</span>
              <span class="text-green-400 font-medium">₱{{ grossSalesTotal.subcon.toLocaleString(undefined, {
                minimumFractionDigits: 2
              }) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/60">Cost:</span>
              <span class="text-red-400 font-medium">₱{{ grossCostTotal.subcon.toLocaleString(undefined, {
                minimumFractionDigits: 2
              }) }}</span>
            </div>
            <div class="flex justify-between pt-2 border-t border-white/10">
              <span class="text-white font-medium">Profit:</span>
              <span class="font-bold" :class="profitTotal.subcon >= 0 ? 'text-green-400' : 'text-red-400'">
                {{ profitTotal.subcon >= 0 ? '+' : '' }}₱{{ profitTotal.subcon.toLocaleString(undefined, {
                  minimumFractionDigits: 2
                }) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex justify-around border-b border-white/20 text-sm text-white/70">
      <button v-for="tab in tabs" :key="tab" @click="activeTab = tab" :class="[
        'flex-1 py-4 text-center font-semibold transition',
        activeTab === tab
          ? tab === 'In-house' ? 'border-b-2 border-blue-400 text-blue-400'
            : tab === 'Subcon' ? 'border-b-2 border-green-400 text-green-400'
              : 'border-b-2 border-yellow-400 text-yellow-400'
          : ''
      ]">
        {{ tab }}
      </button>
    </div>

    <!-- Tab Contents -->
    <div v-if="activeTab === 'In-house'">
      <InHouseTab />
    </div>
    <div v-else-if="activeTab === 'Subcon'">
      <SubcontractorTab />
    </div>
    <div v-else-if="activeTab === 'Summary'">
      <SummaryTab />
    </div>
  </div>
</template>
