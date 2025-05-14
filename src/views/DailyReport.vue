<script setup>
import { ref, computed } from 'vue'
import MetricCard from '../components/MetricCard.vue'
import DeliveryBarChart from '../components/BarChart.vue'
import ProductPieChart from '../components/ProductPieChart.vue'
import DeliveryTable from '../components/DeliveryTable.vue'

const level = ref('daily')
const selectedWeek = ref(null)
const selectedMonth = ref(null)

const knownWorkers = ['Mhar', 'Joper', 'Bong']
const deliveries = ref([])
const deliveryDate = ref(getCurrentDate())

if (localStorage.getItem('deliveries')) {
  deliveries.value = JSON.parse(localStorage.getItem('deliveries'))
}

function getCurrentDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formattedDate = computed(() => {
  const d = new Date(deliveryDate.value)
  return d.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
  })
})

const totalDeliveries = computed(() => deliveries.value.reduce((sum, d) => sum + Number(d.quantityDelivered || 0), 0))
const dishwashingTotal = computed(() => deliveries.value.filter(d => d.client === 'Dishwashing').reduce((sum, d) => sum + Number(d.quantityDelivered || 0), 0))
const steelTotal = computed(() => deliveries.value.filter(d => d.client === 'Steel Nails').reduce((sum, d) => sum + Number(d.quantityDelivered || 0), 0))
const singleWalledTotal = computed(() => deliveries.value.filter(d => ['1L'].includes(d.productType)).reduce((sum, d) => sum + Number(d.quantityDelivered || 0), 0))
const doubleWalledTotal = computed(() => deliveries.value.filter(d => ['1.5L', 'Gallon', '330mL'].includes(d.productType)).reduce((sum, d) => sum + Number(d.quantityDelivered || 0), 0))
const accessoryTotal = computed(() => deliveries.value.filter(d => d.productType === 'Square Pads').reduce((sum, d) => sum + Number(d.quantityDelivered || 0), 0))

const missingWorkers = computed(() => {
  const logged = deliveries.value.map(d => d.workerName)
  return knownWorkers.filter(w => !logged.includes(w))
})

const barChartData = computed(() => {
  const map = {}
  deliveries.value.forEach(d => {
    map[d.workerName] = (map[d.workerName] || 0) + d.quantityDelivered
  })
  return {
    labels: Object.keys(map),
    datasets: [
      {
        label: 'Total Deliveries',
        data: Object.values(map),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      }
    ]
  }
})

const pieChartData = computed(() => {
  const map = {}
  deliveries.value.forEach(d => {
    map[d.productType] = (map[d.productType] || 0) + d.quantityDelivered
  })
  return {
    labels: Object.keys(map),
    datasets: [
      {
        data: Object.values(map),
        backgroundColor: ['#60a5fa', '#f472b6', '#fbbf24', '#34d399']
      }
    ]
  }
})

const groupedDeliveries = computed(() => {
  const map = {}
  deliveries.value.forEach(d => {
    const date = d.deliveryDate || 'Unknown'
    if (!map[date]) map[date] = []
    map[date].push(d)
  })
  return map
})
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Breadcrumb -->
    <div class="text-sm text-white/70">
      <span class="cursor-pointer hover:underline" @click="level = 'monthly'">Monthly</span>
      <span v-if="level !== 'monthly'"> > </span>
      <span
        v-if="level === 'weekly' || level === 'daily'"
        class="cursor-pointer hover:underline"
        @click="level = 'weekly'"
      >
        Week {{ selectedWeek || '–' }}
      </span>
      <span v-if="level === 'daily'"> > {{ formattedDate }}</span>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white">
        📅 Daily Report – {{ formattedDate }}
      </h1>
      <button class="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md">
        Switch Date
      </button>
    </div>

    <!-- Metrics Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <MetricCard title="Total Deliveries" :value="totalDeliveries + ' pcs'" />
      <MetricCard title="Dishwashing Total" :value="dishwashingTotal + ' pcs'" />
      <MetricCard title="Steel Nails Total" :value="steelTotal + ' pcs'" />
      <MetricCard title="Single-Walled Total" :value="singleWalledTotal + ' pcs'" />
      <MetricCard title="Double-Walled Total" :value="doubleWalledTotal + ' pcs'" />
      <MetricCard title="Square Pads Sold" :value="accessoryTotal + ' kg'" />
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <DeliveryBarChart :data="barChartData" />
      <ProductPieChart :data="pieChartData" />
    </div>

    <!-- Missing Workers -->
    <div
      v-if="missingWorkers.length"
      class="bg-red-500/10 text-red-300 border border-red-400 rounded-lg p-4"
    >
      <strong>⚠ Missing Logs:</strong>
      <ul class="mt-1 list-disc list-inside">
        <li v-for="worker in missingWorkers" :key="worker">{{ worker }}</li>
      </ul>
    </div>

    <!-- Delivery Table -->
    <div class="bg-white/10 rounded-xl p-4">
      <DeliveryTable :grouped-deliveries="groupedDeliveries" />
    </div>
  </div>
</template>
