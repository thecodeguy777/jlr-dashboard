<template>
  <div class="px-6 pt-6 pb-24 space-y-8 xl:space-y-12">
    <div v-if="isLoading" class="text-white text-center py-10 text-lg italic">
      Loading executive summary...
    </div>

    <div v-else class="space-y-8 xl:space-y-12">
      <!-- Tabs -->
      <div class="flex space-x-4 text-white text-sm mb-4">
        <button v-for="option in ['monthly', 'weekly', 'daily']" :key="option" :class="[
          'px-4 py-2 rounded-full transition-all',
          level === option
            ? 'bg-purple-500 text-white font-semibold'
            : 'bg-white/10 text-white/60 hover:bg-white/20'
        ]" @click="level = option">
          {{ option.charAt(0).toUpperCase() + option.slice(1) }}
        </button>
      </div>

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-white">
            {{ reportTitle }}
          </h1>
          <p class="text-white/60 mt-2">
            Carton Recycling Manufacturing - Executive Overview
          </p>
        </div>
        <input type="date" v-model="deliveryDate"
          class="bg-white/10 text-white px-4 py-2 rounded-md border border-white/20" />
      </div>

      <!-- Key Performance Indicators -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Revenue" :value="Math.round(totalRevenue)" prefix="₱" color="purple"
          :subtitle="`${totalDeliveries.toLocaleString()} pieces delivered`" />
        <MetricCard title="In-House Revenue" :value="Math.round(inHouseRevenue)" prefix="₱" color="blue"
          :subtitle="`${activeWorkers} active workers`" />
        <MetricCard title="Subcontractor Revenue" :value="Math.round(subcontractorRevenue)" prefix="₱" color="green"
          :subtitle="`${activeSubcontractors} active subcontractors`" />
        <MetricCard title="Total Production" :value="totalDeliveries" suffix=" pcs" color="orange"
          :subtitle="`${singleWalledTotal + doubleWalledTotal} walled cartons`" />
      </div>

      <!-- Revenue Comparison Chart -->
      <div class="bg-white/5 rounded-2xl p-6 xl:p-8">
        <h2 class="text-xl font-semibold text-white mb-6">Revenue Breakdown</h2>
        <DeliveryBarChart :data="revenueComparisonData" />
      </div>

      <!-- Product Category Breakdown -->
      <div class="bg-white/5 rounded-2xl p-6 xl:p-8">
        <h2 class="text-xl font-semibold text-white mb-6">Production by Category</h2>
        <ProductPieChart :data="categoryBreakdownData" />
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- In-House Summary -->
        <div class="bg-blue-900/20 rounded-xl p-6 border border-blue-500/20">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-3 h-3 bg-blue-400 rounded-full"></div>
            <h3 class="text-lg font-semibold text-white">In-House Operations</h3>
          </div>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-white/70">Active Workers:</span>
              <span class="text-white font-medium">{{ activeWorkers }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/70">Total Deliveries:</span>
              <span class="text-white font-medium">{{filteredInHouseDeliveries.reduce((sum, d) => sum + (d.quantity ||
                0), 0).toLocaleString()}} pcs</span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/70">Revenue:</span>
              <span class="text-blue-400 font-bold">₱{{ Math.round(inHouseRevenue).toLocaleString() }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/70">Avg per Worker:</span>
              <span class="text-white/90">₱{{ activeWorkers > 0 ? Math.round(inHouseRevenue /
                activeWorkers).toLocaleString() : '0' }}</span>
            </div>
          </div>
        </div>

        <!-- Subcontractor Summary -->
        <div class="bg-green-900/20 rounded-xl p-6 border border-green-500/20">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-3 h-3 bg-green-400 rounded-full"></div>
            <h3 class="text-lg font-semibold text-white">Subcontractor Operations</h3>
          </div>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-white/70">Active Subcontractors:</span>
              <span class="text-white font-medium">{{ activeSubcontractors }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/70">Total Deliveries:</span>
              <span class="text-white font-medium">{{filteredSubconDeliveries.reduce((sum, d) => sum + (d.quantity ||
                0), 0).toLocaleString()}} pcs</span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/70">Revenue:</span>
              <span class="text-green-400 font-bold">₱{{ Math.round(subcontractorRevenue).toLocaleString() }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/70">Avg per Subcontractor:</span>
              <span class="text-white/90">₱{{ activeSubcontractors > 0 ? Math.round(subcontractorRevenue /
                activeSubcontractors).toLocaleString() : '0' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Stats Grid -->
      <div class="bg-white/5 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-white mb-4">📋 Quick Statistics</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-white">{{ singleWalledTotal.toLocaleString() }}</div>
            <div class="text-white/60 text-sm">Single Walled</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-white">{{ doubleWalledTotal.toLocaleString() }}</div>
            <div class="text-white/60 text-sm">Double Walled</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-white">{{ (activeWorkers + activeSubcontractors) }}</div>
            <div class="text-white/60 text-sm">Total Active</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-white">₱{{ totalRevenue > 0 ? Math.round(totalRevenue / totalDeliveries)
              : 0 }}</div>
            <div class="text-white/60 text-sm">Avg Price/Piece</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import MetricCard from '../components/MetricCard.vue'
import DeliveryBarChart from '../components/BarChart.vue'
import ProductPieChart from '../components/ProductPieChart.vue'
import { supabase } from '../lib/supabase'

const level = ref('weekly')
const deliveryDate = ref(getCurrentDate())
const isLoading = ref(true)

// Data
const deliveries = ref([])
const subconDeliveries = ref([])

function getCurrentDate() {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

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

onMounted(async () => {
  // Fetch in-house deliveries
  const { data: inHouseData, error: inHouseError } = await supabase
    .from('deliveries')
    .select('*, products(*), workers(*)')

  // Fetch subcontractor deliveries
  const { data: subconData, error: subconError } = await supabase
    .from('subcon_deliveries')
    .select('*, products(*), subcontractors(*)')

  if (!inHouseError) deliveries.value = inHouseData || []
  if (!subconError) subconDeliveries.value = subconData || []

  isLoading.value = false
})

// Filter deliveries by date range
const filteredInHouseDeliveries = computed(() => {
  let results = Array.isArray(deliveries.value) ? deliveries.value : []

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

  return results
})

const filteredSubconDeliveries = computed(() => {
  let results = Array.isArray(subconDeliveries.value) ? subconDeliveries.value : []

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

  return results
})

// Combined metrics
const totalDeliveries = computed(() => {
  const inHouseQty = filteredInHouseDeliveries.value.reduce((sum, d) => sum + (d.quantity || 0), 0)
  const subconQty = filteredSubconDeliveries.value.reduce((sum, d) => sum + (d.quantity || 0), 0)
  return inHouseQty + subconQty
})

const totalRevenue = computed(() => {
  const inHouseRevenue = filteredInHouseDeliveries.value.reduce((sum, d) => {
    const price = d.price_snapshot ?? d.products?.price_per_unit ?? 0
    return sum + (d.quantity || 0) * price
  }, 0)

  const subconRevenue = filteredSubconDeliveries.value.reduce((sum, d) => {
    const price = d.price_snapshot ?? 0
    return sum + (d.quantity || 0) * price
  }, 0)

  return inHouseRevenue + subconRevenue
})

const inHouseRevenue = computed(() => {
  return filteredInHouseDeliveries.value.reduce((sum, d) => {
    const price = d.price_snapshot ?? d.products?.price_per_unit ?? 0
    return sum + (d.quantity || 0) * price
  }, 0)
})

const subcontractorRevenue = computed(() => {
  return filteredSubconDeliveries.value.reduce((sum, d) => {
    const price = d.price_snapshot ?? 0
    return sum + (d.quantity || 0) * price
  }, 0)
})

const singleWalledTotal = computed(() => {
  const inHouse = filteredInHouseDeliveries.value
    .filter(d => d.products?.category === 'Single Walled')
    .reduce((sum, d) => sum + (d.quantity || 0), 0)

  const subcon = filteredSubconDeliveries.value
    .filter(d => d.products?.category === 'Single Walled')
    .reduce((sum, d) => sum + (d.quantity || 0), 0)

  return inHouse + subcon
})

const doubleWalledTotal = computed(() => {
  const inHouse = filteredInHouseDeliveries.value
    .filter(d => d.products?.category === 'Double Walled')
    .reduce((sum, d) => sum + (d.quantity || 0), 0)

  const subcon = filteredSubconDeliveries.value
    .filter(d => d.products?.category === 'Double Walled')
    .reduce((sum, d) => sum + (d.quantity || 0), 0)

  return inHouse + subcon
})

// Chart data
const revenueComparisonData = computed(() => {
  return {
    labels: ['In-House', 'Subcontractors'],
    datasets: [{
      label: 'Revenue (₱)',
      data: [inHouseRevenue.value, subcontractorRevenue.value],
      backgroundColor: [
        'rgba(59, 130, 246, 0.5)',  // Blue for in-house
        'rgba(16, 185, 129, 0.5)'   // Green for subcontractors
      ],
      borderColor: [
        'rgba(59, 130, 246, 1)',
        'rgba(5, 150, 105, 1)'
      ],
      borderWidth: 1
    }]
  }
})

const categoryBreakdownData = computed(() => {
  return {
    labels: ['Single Walled', 'Double Walled', 'Miscellaneous'],
    datasets: [{
      data: [
        singleWalledTotal.value,
        doubleWalledTotal.value,
        totalDeliveries.value - singleWalledTotal.value - doubleWalledTotal.value
      ],
      backgroundColor: [
        'hsl(200, 70%, 60%)',
        'hsl(150, 70%, 60%)',
        'hsl(50, 70%, 60%)'
      ]
    }]
  }
})

const reportTitle = computed(() => {
  if (level.value === 'weekly') return `📊 Executive Summary – ${formatDate(weekStart.value)} to ${formatDate(weekEnd.value)}`
  if (level.value === 'monthly') return `📊 Executive Summary – ${formatDate(monthStart.value)} to ${formatDate(monthEnd.value)}`
  return `📊 Executive Summary – ${formatDate(deliveryDate.value)}`
})

// Active workers and subcontractors count
const activeWorkers = computed(() => {
  const workers = new Set()
  filteredInHouseDeliveries.value.forEach(d => {
    if (d.workers?.name) workers.add(d.workers.name)
  })
  return workers.size
})

const activeSubcontractors = computed(() => {
  const subcontractors = new Set()
  filteredSubconDeliveries.value.forEach(d => {
    if (d.subcontractors?.name) subcontractors.add(d.subcontractors.name)
  })
  return subcontractors.size
})
</script>
