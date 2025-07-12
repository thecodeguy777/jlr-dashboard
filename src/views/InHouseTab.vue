<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import MetricCard from '../components/MetricCard.vue'
import DeliveryBarChart from '../components/BarChart.vue'
import ProductPieChart from '../components/ProductPieChart.vue'
import DeliveryTable from '../components/DeliveryTable.vue'
import DeliveryForm from '../components/DeliveryForm.vue'
import { useDeliveries } from '../composables/useDeliveries'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'

// State
const level = ref('weekly')
const selectedWeek = ref(null)
const deliveryDate = ref(getCurrentDate())
const isLoading = ref(true)
const showForm = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const showLogButton = ref(true)

// Payroll and filtering state
const workerNameFilter = ref('')
const showMissingDataOnly = ref(false)
const showPayrollSummary = ref(false)
const selectedCategories = ref([])
const selectedProducts = ref([])
const showFilters = ref(false)
const showCharts = ref(true)

// Stock data for payroll calculations
const previousStockData = ref([])
const currentStockData = ref([])

const formData = ref({
  worker_id: '', product_id: '', quantity: 1,
  delivery_date: getCurrentDate(), notes: ''
})

// Composables
const { deliveries, fetchDeliveries } = useDeliveries()

// Watchers
onMounted(() => {
  watch(deliveries, () => { isLoading.value = false }, { immediate: true })
  // Fetch stock data when deliveries change
  watch([deliveries, level, deliveryDate], fetchStockData, { immediate: true })
})

// Utility
function getCurrentDate() {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

// Date Computations
const selectedDate = computed(() => new Date(deliveryDate.value))

const weekStart = computed(() => {
  const date = new Date(selectedDate.value)
  const start = new Date(date)
  start.setDate(date.getDate() - date.getDay())
  start.setHours(0, 0, 0, 0)
  return start
})

const weekEnd = computed(() => {
  const end = new Date(weekStart.value)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
})

const monthStart = computed(() => new Date(selectedDate.value.getFullYear(), selectedDate.value.getMonth(), 1))

const monthEnd = computed(() => {
  const end = new Date(selectedDate.value.getFullYear(), selectedDate.value.getMonth() + 1, 1)
  end.setMilliseconds(-1)
  return end
})

// Stock fetching function
async function fetchStockData() {
  if (!deliveries.value?.length) return

  try {
    let startDate, endDate

    if (level.value === 'weekly') {
      startDate = format(weekStart.value, 'yyyy-MM-dd')
      endDate = format(weekEnd.value, 'yyyy-MM-dd')
    } else if (level.value === 'monthly') {
      startDate = format(monthStart.value, 'yyyy-MM-dd')
      endDate = format(monthEnd.value, 'yyyy-MM-dd')
    } else {
      startDate = deliveryDate.value
      endDate = deliveryDate.value
    }

    // Calculate previous Saturday for stock comparison
    // Use the existing week logic but get the Saturday before week start
    const currentWeekStart = new Date(weekStart.value)
    const prevSaturday = new Date(currentWeekStart)
    prevSaturday.setDate(prevSaturday.getDate() - 1) // -1 day from week start to get previous Saturday
    const prevWeekStr = format(prevSaturday, 'yyyy-MM-dd')



    // Fetch previous stock (week before the current period)
    const { data: prevStock, error: prevError } = await supabase
      .from('bodega_stock')
      .select('quantity, product_id, worker_id, products(name, category, price_per_unit)')
      .eq('week_start', prevWeekStr)

    // If no exact match for previous week, try to find the most recent stock before current period
    if (!prevStock || prevStock.length === 0) {
      const { data: recentStock, error: recentError } = await supabase
        .from('bodega_stock')
        .select('quantity, product_id, worker_id, week_start, products(name, category, price_per_unit)')
        .lt('week_start', startDate)
        .order('week_start', { ascending: false })
        .limit(50) // Get recent entries

      previousStockData.value = recentStock || []
    } else {
      previousStockData.value = prevStock || []
    }

    // Fetch current stock (for the current period)
    const { data: currStock, error: currError } = await supabase
      .from('bodega_stock')
      .select('quantity, product_id, worker_id, products(name, category, price_per_unit)')
      .eq('week_start', startDate)

    if (prevError) console.error('Error fetching previous stock:', prevError)
    if (currError) console.error('Error fetching current stock:', currError)

    currentStockData.value = currStock || []

  } catch (error) {
    console.error('Error fetching stock data:', error)
    previousStockData.value = []
    currentStockData.value = []
  }
}

// Helper function to get previous stock quantity for a worker and product
function getPreviousStockQuantity(workerId, productId) {
  // If we have multiple stock entries for the same worker/product, sum them up
  const stockItems = previousStockData.value.filter(
    item => item.worker_id === workerId && item.product_id === productId
  )

  const totalQuantity = stockItems.reduce((sum, item) => sum + (item.quantity || 0), 0)



  return totalQuantity
}

// Data Filtering
// Check for missing data in delivery records
const hasMissingData = (delivery) => {
  return !delivery.workers?.name ||
    !delivery.products?.name ||
    !delivery.quantity ||
    delivery.quantity <= 0 ||
    !delivery.delivery_date ||
    (!delivery.price_snapshot && !delivery.products?.price_per_unit)
}

// Get all unique worker names for filtering
const availableWorkers = computed(() => {
  const workers = new Set()
  deliveries.value?.forEach(d => {
    if (d.workers?.name) {
      workers.add(d.workers.name)
    }
  })
  return Array.from(workers).sort()
})

// Get all unique categories for filtering
const availableCategories = computed(() => {
  const categories = new Set()
  deliveries.value?.forEach(d => {
    if (d.products?.category) {
      categories.add(d.products.category)
    }
  })
  return Array.from(categories).sort()
})

// Get all unique products for filtering
const availableProducts = computed(() => {
  const products = new Set()
  deliveries.value?.forEach(d => {
    if (d.products?.name) {
      products.add(d.products.name)
    }
  })
  return Array.from(products).sort()
})

const filteredDeliveries = computed(() => {
  let results = Array.isArray(deliveries.value) ? deliveries.value : []

  // Filter by date range
  if (level.value === 'weekly') {
    results = results.filter(d => {
      const date = new Date(d.delivery_date)
      return date >= weekStart.value && date <= weekEnd.value
    })
  } else if (level.value === 'monthly') {
    results = results.filter(d => {
      const date = new Date(d.delivery_date)
      return date >= monthStart.value && date <= monthEnd.value
    })
  } else {
    results = results.filter(d => d.delivery_date === deliveryDate.value)
  }

  // Filter by category
  results = results.filter(d => ['Single Walled', 'Double Walled', 'Miscellaneous'].includes(d.products?.category))

  // Filter by worker name
  if (workerNameFilter.value) {
    results = results.filter(d =>
      d.workers?.name?.toLowerCase().includes(workerNameFilter.value.toLowerCase())
    )
  }

  // Filter by categories
  if (selectedCategories.value.length > 0) {
    results = results.filter(d =>
      selectedCategories.value.includes(d.products?.category)
    )
  }

  // Filter by products
  if (selectedProducts.value.length > 0) {
    results = results.filter(d =>
      selectedProducts.value.includes(d.products?.name)
    )
  }

  // Filter to show only records with missing data
  if (showMissingDataOnly.value) {
    results = results.filter(d => hasMissingData(d))
  }

  return results
})

// Payroll analysis with stock deduction
const payrollAnalysis = computed(() => {
  const analysis = {
    totalRecords: filteredDeliveries.value.length,
    missingDataRecords: filteredDeliveries.value.filter(d => hasMissingData(d)),
    workerSummary: {}
  }



  // Group by worker for payroll summary
  filteredDeliveries.value.forEach(d => {
    const workerName = d.workers?.name || 'Unknown Worker'
    const workerId = d.workers?.id

    if (!analysis.workerSummary[workerName]) {
      analysis.workerSummary[workerName] = {
        workerId: workerId,
        totalQuantity: 0,
        totalValue: 0,
        netQuantity: 0, // New: net quantity after stock deduction
        netValue: 0,    // New: net value after stock deduction
        recordCount: 0,
        missingDataCount: 0,
        records: [],
        productBreakdown: {
          'Single Walled': {},
          'Double Walled': {},
          'Miscellaneous': {}
        },
        netProductBreakdown: { // New: net breakdown after stock deduction
          'Single Walled': {},
          'Double Walled': {},
          'Miscellaneous': {}
        },
        stockDeductions: {} // New: track stock deductions by product
      }
    }

    const price = d.price_snapshot ?? d.products?.price_per_unit ?? 0
    const quantity = d.quantity || 0
    const productName = d.products?.name || 'Unknown Product'
    const category = d.products?.category || 'Miscellaneous'
    const productId = d.products?.id // Fixed: use d.products.id instead of d.product_id

    // Original calculations (gross)
    analysis.workerSummary[workerName].totalQuantity += quantity
    analysis.workerSummary[workerName].totalValue += quantity * price
    analysis.workerSummary[workerName].recordCount += 1
    analysis.workerSummary[workerName].records.push(d)

    // Group by product within category (gross)
    if (!analysis.workerSummary[workerName].productBreakdown[category]) {
      analysis.workerSummary[workerName].productBreakdown[category] = {}
    }

    if (!analysis.workerSummary[workerName].productBreakdown[category][productName]) {
      analysis.workerSummary[workerName].productBreakdown[category][productName] = {
        quantity: 0,
        value: 0
      }
    }

    analysis.workerSummary[workerName].productBreakdown[category][productName].quantity += quantity
    analysis.workerSummary[workerName].productBreakdown[category][productName].value += quantity * price

    // NEW: Calculate net quantities and values (after stock deduction)
    const previousStockQty = getPreviousStockQuantity(workerId, productId)



    // Track stock deductions by product
    if (!analysis.workerSummary[workerName].stockDeductions[productName]) {
      analysis.workerSummary[workerName].stockDeductions[productName] = {
        previousStock: 0,
        deliveredQty: 0,
        netQty: 0
      }
    }

    analysis.workerSummary[workerName].stockDeductions[productName].previousStock = previousStockQty
    analysis.workerSummary[workerName].stockDeductions[productName].deliveredQty += quantity

    // Calculate net quantity for this delivery (delivery - proportional previous stock)
    const netQuantity = Math.max(0, quantity - previousStockQty)
    const netValue = netQuantity * price

    analysis.workerSummary[workerName].netQuantity += netQuantity
    analysis.workerSummary[workerName].netValue += netValue

    analysis.workerSummary[workerName].stockDeductions[productName].netQty =
      Math.max(0, analysis.workerSummary[workerName].stockDeductions[productName].deliveredQty - previousStockQty)

    // Group net calculations by product within category
    if (!analysis.workerSummary[workerName].netProductBreakdown[category]) {
      analysis.workerSummary[workerName].netProductBreakdown[category] = {}
    }

    if (!analysis.workerSummary[workerName].netProductBreakdown[category][productName]) {
      analysis.workerSummary[workerName].netProductBreakdown[category][productName] = {
        quantity: 0,
        value: 0,
        previousStock: previousStockQty,
        grossQuantity: 0
      }
    }

    analysis.workerSummary[workerName].netProductBreakdown[category][productName].quantity += netQuantity
    analysis.workerSummary[workerName].netProductBreakdown[category][productName].value += netValue
    analysis.workerSummary[workerName].netProductBreakdown[category][productName].grossQuantity += quantity

    if (hasMissingData(d)) {
      analysis.workerSummary[workerName].missingDataCount += 1
    }
  })

  return analysis
})

// Labels
const formattedDate = computed(() => formatDate(deliveryDate.value))

const reportTitle = computed(() => {
  if (level.value === 'weekly') return `📅 Pandi Weekly Report – ${formatDate(weekStart.value)} to ${formatDate(weekEnd.value)}`
  if (level.value === 'monthly') return `📅 Pandi Monthly Report – ${formatDate(monthStart.value)} to ${formatDate(monthEnd.value)}`
  return `📅 Pandi Daily Report – ${formattedDate.value}`
})

// Metrics
const singleWalledTotal = computed(() =>
  filteredDeliveries.value.filter(d => d.products?.category === 'Single Walled')
    .reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const doubleWalledTotal = computed(() =>
  filteredDeliveries.value.filter(d => d.products?.category === 'Double Walled')
    .reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const totalDeliveries = computed(() => singleWalledTotal.value + doubleWalledTotal.value)

const totalGross = computed(() =>
  filteredDeliveries.value.reduce((sum, d) => {
    const price = d.price_snapshot ?? d.products?.price_per_unit ?? 0
    return sum + (d.quantity || 0) * price
  }, 0)
)

// Charts
const barChartData = computed(() => {
  const map = {}
  filteredDeliveries.value.forEach(d => {
    const name = d.workers?.name || 'Unknown'
    map[name] = (map[name] || 0) + d.quantity
  })

  return {
    labels: Object.keys(map),
    datasets: [{
      label: 'Total Deliveries',
      data: Object.values(map),
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1
    }]
  }
})

const pieChartData = computed(() => {
  const map = {}
  filteredDeliveries.value.forEach(d => {
    const name = d.products?.name || 'Unknown'
    map[name] = (map[name] || 0) + d.quantity
  })

  return {
    labels: Object.keys(map),
    datasets: [{
      data: Object.values(map),
      backgroundColor: Object.keys(map).map((_, i) => `hsl(${i * 47 % 360}, 70%, 60%)`)
    }]
  }
})

const groupedDeliveries = computed(() => {
  const map = {}
  filteredDeliveries.value.forEach(d => {
    const date = d.delivery_date || 'Unknown'
    if (!map[date]) map[date] = []
    map[date].push(d)
  })
  return map
})

// Actions
function handleNewEntry() {
  resetForm()
  showForm.value = true
}

function resetForm() {
  formData.value = {
    worker_id: '', product_id: '', quantity: 1,
    delivery_date: getCurrentDate(), notes: ''
  }
  isEditing.value = false
  showForm.value = false
}

async function handleSubmit(delivery) {
  const { error } = await supabase.from('deliveries').insert({ ...delivery, status: 'delivered' })
  if (!error) {
    await fetchDeliveries()
    resetForm()
  }
}

async function deleteDelivery(id) {
  const { error } = await supabase.from('deliveries').delete().eq('id', id)
  if (!error) await fetchDeliveries()
}

function editDelivery(id, delivery) {
  formData.value = {
    worker_id: delivery.workers.id,
    product_id: delivery.products.id,
    quantity: delivery.quantity,
    delivery_date: delivery.delivery_date,
    notes: delivery.notes || ''
  }
  isEditing.value = true
  editingId.value = id
  showForm.value = true
}

// Helper function to get products with non-zero quantities
function getNonZeroProducts(productBreakdown) {
  const result = {}
  Object.entries(productBreakdown).forEach(([category, products]) => {
    const nonZeroProducts = Object.entries(products).filter(([_, data]) => data.quantity > 0)
    if (nonZeroProducts.length > 0) {
      result[category] = Object.fromEntries(nonZeroProducts)
    }
  })
  return result
}

// Filter management functions
function toggleCategory(category) {
  const index = selectedCategories.value.indexOf(category)
  if (index > -1) {
    selectedCategories.value.splice(index, 1)
  } else {
    selectedCategories.value.push(category)
  }
}

function toggleProduct(product) {
  const index = selectedProducts.value.indexOf(product)
  if (index > -1) {
    selectedProducts.value.splice(index, 1)
  } else {
    selectedProducts.value.push(product)
  }
}

function clearAllFilters() {
  workerNameFilter.value = ''
  selectedCategories.value = []
  selectedProducts.value = []
  showMissingDataOnly.value = false
}

function hasActiveFilters() {
  return workerNameFilter.value ||
    selectedCategories.value.length > 0 ||
    selectedProducts.value.length > 0 ||
    showMissingDataOnly.value
}
</script>

<template>
  <div class="px-6 pt-6 pb-24 space-y-8 xl:space-y-12">
    <div v-if="isLoading" class="text-white text-center py-10 text-lg italic">
      Loading deliveries...
    </div>

    <div v-else class="space-y-8 xl:space-y-12">
      <!-- Tabs -->
      <div class="flex space-x-4 text-white text-sm mb-4">
        <button v-for="option in ['monthly', 'weekly', 'daily']" :key="option" :class="[
          'px-4 py-2 rounded-full transition-all',
          level === option
            ? 'bg-blue-500 text-white font-semibold'
            : 'bg-white/10 text-white/60 hover:bg-white/20'
        ]" @click="level = option">
          {{ option.charAt(0).toUpperCase() + option.slice(1) }}
        </button>
      </div>


      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white">
            {{ reportTitle }}
          </h1>
        </div>
        <input type="date" v-model="deliveryDate"
          class="bg-white/10 text-white px-4 py-2 rounded-md border border-white/20" />
      </div>

      <!-- Filter Controls -->
      <div class="bg-white/5 rounded-xl p-4 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <!-- Left: Search and Stats -->
          <div class="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
            <div class="relative">
              <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" fill="none"
                stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              <input v-model="workerNameFilter" type="text" placeholder="Search workers..."
                class="pl-10 pr-4 py-2 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              <button v-if="workerNameFilter" @click="workerNameFilter = ''"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Quick Stats Pills -->
            <div class="flex gap-2 flex-wrap">
              <div
                class="flex items-center gap-2 bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-full text-xs font-medium">
                <span class="w-2 h-2 bg-blue-400 rounded-full"></span>
                {{ payrollAnalysis.totalRecords }} records
              </div>
              <button @click="showMissingDataOnly = !showMissingDataOnly" :class="[
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                showMissingDataOnly
                  ? 'bg-red-500/30 text-red-300 ring-1 ring-red-500/50'
                  : payrollAnalysis.missingDataRecords.length > 0
                    ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                    : 'bg-green-500/20 text-green-300'
              ]">
                <span :class="[
                  'w-2 h-2 rounded-full',
                  payrollAnalysis.missingDataRecords.length > 0 ? 'bg-red-400' : 'bg-green-400'
                ]"></span>
                {{ payrollAnalysis.missingDataRecords.length }} issues
              </button>
              <div
                class="flex items-center gap-2 bg-green-500/20 text-green-300 px-3 py-1.5 rounded-full text-xs font-medium">
                <span class="w-2 h-2 bg-green-400 rounded-full"></span>
                {{ Object.keys(payrollAnalysis.workerSummary).length }} workers
              </div>
            </div>
          </div>

          <!-- Right: Actions -->
          <div class="flex gap-2">
            <button @click="showFilters = !showFilters" :class="[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              showFilters || hasActiveFilters()
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            ]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z">
                </path>
              </svg>
              Filters
              <span v-if="hasActiveFilters()" class="bg-white/20 text-xs px-2 py-0.5 rounded-full">
                {{ (selectedCategories.length + selectedProducts.length + (workerNameFilter ? 1 : 0) +
                  (showMissingDataOnly ? 1 : 0)) }}
              </span>
            </button>
            <button @click="showCharts = !showCharts" :class="[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              showCharts
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            ]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  :d="showCharts ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L12 12m-2.122-2.122L12 12m0 0l2.121 2.121M12 12l2.121-2.121m-2.121 2.121L12 12' : 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'">
                </path>
              </svg>
              {{ showCharts ? 'Hide' : 'Show' }} Charts
            </button>
            <button @click="showPayrollSummary = !showPayrollSummary" :class="[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              showPayrollSummary
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            ]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  :d="showPayrollSummary ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L12 12m-2.122-2.122L12 12m0 0l2.121 2.121M12 12l2.121-2.121m-2.121 2.121L12 12' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'">
                </path>
              </svg>
              {{ showPayrollSummary ? 'Hide' : 'Show' }} Summary
            </button>
          </div>
        </div>

        <!-- Advanced Filters Panel -->
        <div v-if="showFilters" class="border-t border-white/10 pt-4 space-y-4">
          <div class="flex flex-col sm:flex-row gap-4">
            <!-- Category Filter -->
            <div class="flex-1">
              <label class="block text-sm font-medium text-white/70 mb-2">Categories:</label>
              <div class="flex flex-wrap gap-2">
                <button v-for="category in availableCategories" :key="category" @click="toggleCategory(category)"
                  :class="[
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                    selectedCategories.includes(category)
                      ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                  ]">
                  {{ category }}
                  <span v-if="selectedCategories.includes(category)" class="ml-1">✓</span>
                </button>
                <span v-if="availableCategories.length === 0" class="text-white/40 text-xs py-1.5">No categories
                  available</span>
              </div>
            </div>

            <!-- Product Filter -->
            <div class="flex-1">
              <label class="block text-sm font-medium text-white/70 mb-2">Products:</label>
              <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                <button v-for="product in availableProducts" :key="product" @click="toggleProduct(product)" :class="[
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  selectedProducts.includes(product)
                    ? 'bg-green-600 text-white ring-2 ring-green-400'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                ]">
                  {{ product }}
                  <span v-if="selectedProducts.includes(product)" class="ml-1">✓</span>
                </button>
                <span v-if="availableProducts.length === 0" class="text-white/40 text-xs py-1.5">No products
                  available</span>
              </div>
            </div>
          </div>

          <!-- Active Filters & Clear -->
          <div v-if="hasActiveFilters()"
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-white/5 rounded-lg border border-white/10">
            <div class="flex flex-wrap gap-2">
              <span class="text-white/70 text-sm font-medium">Active filters:</span>
              <span v-if="workerNameFilter" class="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
                Worker: "{{ workerNameFilter }}"
              </span>
              <span v-for="category in selectedCategories" :key="category"
                class="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs">
                Category: {{ category }}
              </span>
              <span v-for="product in selectedProducts" :key="product"
                class="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">
                Product: {{ product }}
              </span>
              <span v-if="showMissingDataOnly" class="bg-red-500/20 text-red-300 px-2 py-1 rounded text-xs">
                Missing data only
              </span>
            </div>
            <button @click="clearAllFilters()"
              class="text-white/60 hover:text-white text-sm underline transition-colors">
              Clear all filters
            </button>
          </div>
        </div>
      </div>

      <!-- Payroll Summary -->
      <div v-if="showPayrollSummary" class="bg-white/5 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-white mb-4">👥 Worker Payroll Summary</h3>

        <!-- Debug Info -->

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div v-for="(worker, name) in payrollAnalysis.workerSummary" :key="name"
            class="bg-white/5 rounded-lg p-5 border border-white/10">

            <!-- Header -->
            <div class="flex justify-between items-start mb-4">
              <div>
                <h4 class="font-semibold text-white text-lg">{{ name }}</h4>
                <p class="text-white/60 text-sm">Records: {{ worker.recordCount }}</p>
              </div>
              <span v-if="worker.missingDataCount > 0"
                class="bg-red-500/20 text-red-300 text-xs px-2 py-1 rounded-full">
                {{ worker.missingDataCount }} missing
              </span>
              <span v-else class="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded-full">
                Complete
              </span>
            </div>

            <!-- Product Breakdown -->
            <div class="space-y-4 mb-4">
              <div v-for="(products, category) in getNonZeroProducts(worker.productBreakdown)" :key="category"
                class="space-y-2">
                <h5 class="font-medium text-white/80 text-sm border-b border-white/10 pb-1">{{ category }}:</h5>
                <div class="space-y-1 ml-2">
                  <div v-for="(productData, productName) in products" :key="productName" class="space-y-1">
                    <!-- Gross quantity -->
                    <div class="flex justify-between text-sm">
                      <span class="text-white/70">- {{ productName }} (Gross):</span>
                      <span class="text-blue-300 font-medium">{{ productData.quantity }} pcs</span>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            <!-- Total Value -->
            <div class="pt-3 border-t border-white/10 space-y-3">
              <!-- Gross Values -->
              <div>
                <div class="flex justify-between items-center">
                  <span class="text-white/70 font-medium">Gross Value:</span>
                  <span class="text-blue-400 font-bold text-lg">₱{{ worker.totalValue.toLocaleString() }}</span>
                </div>
                <div class="flex justify-between items-center text-sm mt-1">
                  <span class="text-white/60">Gross Quantity:</span>
                  <span class="text-white/80">{{ worker.totalQuantity }} pcs</span>
                </div>
              </div>
            </div>

            <!-- Missing data details -->
            <div v-if="worker.missingDataCount > 0" class="mt-4 p-3 bg-red-500/10 rounded border border-red-500/20">
              <div class="text-xs text-red-300 mb-2 font-medium">⚠️ Missing data issues:</div>
              <div class="space-y-1">
                <div v-for="record in worker.records.filter(r => hasMissingData(r))" :key="record.id"
                  class="text-xs text-red-200">
                  • {{ record.delivery_date }}:
                  <span v-if="!record.workers?.name"> Missing worker</span>
                  <span v-if="!record.products?.name"> Missing product</span>
                  <span v-if="!record.quantity || record.quantity <= 0"> Invalid quantity</span>
                  <span v-if="!record.price_snapshot && !record.products?.price_per_unit"> Missing price</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Metrics Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <MetricCard title="Total Deliveries" :value="totalDeliveries" suffix=" pcs" color="blue" />
        <MetricCard title="Single-Walled Total" :value="singleWalledTotal" suffix=" pcs" color="blue" />
        <MetricCard title="Double-Walled Total" :value="doubleWalledTotal" suffix=" pcs" color="blue" />
        <MetricCard title="Gross Value" :value="Math.round(totalGross)" prefix="₱" color="blue" />
      </div>

      <!-- Charts -->
      <div v-if="showCharts" class="space-y-8">
        <div class="rounded-2xl bg-blue-900/10 p-6 xl:p-8">
          <DeliveryBarChart :data="barChartData" />
        </div>
        <div class="rounded-2xl bg-blue-900/10 p-6 xl:p-8">
          <ProductPieChart :data="pieChartData" />
        </div>
      </div>

      <!-- Delivery Table -->
      <div class="space-y-6">
        <div v-for="(deliveries, date) in groupedDeliveries" :key="date" class="bg-white/10 rounded-2xl p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-white">
              {{ new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }}
            </h2>
            <div class="flex gap-2 text-xs">
              <span class="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                {{ deliveries.length }} records
              </span>
              <span v-if="deliveries.filter(d => hasMissingData(d)).length > 0"
                class="bg-red-500/20 text-red-300 px-2 py-1 rounded-full">
                {{deliveries.filter(d => hasMissingData(d)).length}} incomplete
              </span>
            </div>
          </div>

          <!-- Missing data warning -->
          <div v-if="deliveries.filter(d => hasMissingData(d)).length > 0"
            class="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div class="text-yellow-300 text-sm font-medium mb-1">⚠️ Payroll Warning</div>
            <div class="text-yellow-200 text-xs">
              {{deliveries.filter(d => hasMissingData(d)).length}} record(s) have missing data that may affect payroll
              calculations.
              Use the filters above to review and fix these issues.
            </div>
          </div>

          <DeliveryTable :deliveries="deliveries" @edit="editDelivery" @delete="deleteDelivery" />
        </div>
      </div>


    </div>
    <!-- ✅ Closed the v-else block properly -->

    <!-- Delivery Modal -->
    <transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 scale-90"
      enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-90">
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <DeliveryForm
          class="w-full max-w-lg bg-gray-900 text-white p-6 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
          :delivery-date="deliveryDate" :edit-mode="isEditing" :form-data="formData" @submit="handleSubmit"
          @cancel-edit="resetForm" />
      </div>
    </transition>
  </div>
</template>
