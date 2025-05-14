<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import MetricCard from '../components/MetricCard.vue'
import DeliveryBarChart from '../components/BarChart.vue'
import ProductPieChart from '../components/ProductPieChart.vue'
import DeliveryTable from '../components/DeliveryTable.vue'
import { useDeliveries } from '../composables/useDeliveries'

const level = ref('daily')
const selectedWeek = ref(null)
const selectedMonth = ref(null)
const deliveryDate = ref(getCurrentDate())

const { deliveries, fetchDeliveries } = useDeliveries()

const isLoading = ref(true)
onMounted(() => {
  watch(deliveries, () => {
    isLoading.value = false
  }, { immediate: true })
})

function getCurrentDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

const selectedDate = computed(() => new Date(deliveryDate.value))

const weekStart = computed(() => {
  const date = new Date(selectedDate.value)
  const day = date.getDay()
  const sunday = new Date(date)
  sunday.setDate(date.getDate() - day)
  sunday.setHours(0, 0, 0, 0)
  return sunday
})

const weekEnd = computed(() => {
  const saturday = new Date(weekStart.value)
  saturday.setDate(weekStart.value.getDate() + 6)
  saturday.setHours(23, 59, 59, 999)
  return saturday
})

const monthStart = computed(() => {
  const date = new Date(selectedDate.value)
  return new Date(date.getFullYear(), date.getMonth(), 1)
})

const monthEnd = computed(() => {
  const date = new Date(selectedDate.value)
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
})

const filteredDeliveries = computed(() => {
  let results = []
  if (level.value === 'weekly') {
    results = deliveries.value.filter(d => {
      const date = new Date(d.delivery_date)
      return date >= weekStart.value && date <= weekEnd.value
    })
  } else if (level.value === 'monthly') {
    results = deliveries.value.filter(d => {
      const date = new Date(d.delivery_date)
      return date >= monthStart.value && date <= monthEnd.value
    })
  } else {
    results = deliveries.value.filter(d => d.delivery_date === deliveryDate.value)
  }
  return results.filter(d => ['Single Walled', 'Double Walled'].includes(d.products?.category))
})

const formattedDate = computed(() => {
  const d = new Date(deliveryDate.value)
  return d.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
  })
})

const reportTitle = computed(() => {
  if (level.value === 'weekly') {
    return `📅 Weekly Report – ${formatDate(weekStart.value)} to ${formatDate(weekEnd.value)}`
  } else if (level.value === 'monthly') {
    return `📅 Monthly Report – ${formatDate(monthStart.value)} to ${formatDate(monthEnd.value)}`
  }
  return `📅 Daily Report – ${formattedDate.value}`
})

const singleWalledTotal = computed(() =>
  filteredDeliveries.value.filter(d => d.products?.category === 'Single Walled').reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const doubleWalledTotal = computed(() =>
  filteredDeliveries.value.filter(d => d.products?.category === 'Double Walled').reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const totalDeliveries = computed(() => singleWalledTotal.value + doubleWalledTotal.value)

const barChartData = computed(() => {
  const map = {}
  filteredDeliveries.value.forEach(d => {
    const name = d.workers?.name || 'Unknown'
    map[name] = (map[name] || 0) + d.quantity
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
  filteredDeliveries.value.forEach(d => {
    const name = d.products?.name || 'Unknown'
    map[name] = (map[name] || 0) + d.quantity
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
  if (level.value === 'monthly') {
    filteredDeliveries.value.forEach(d => {
      const date = new Date(d.delivery_date)
      const sunday = new Date(date)
      sunday.setDate(date.getDate() - date.getDay())
      sunday.setHours(0, 0, 0, 0)
      const key = sunday.toISOString().split('T')[0]
      if (!map[key]) map[key] = []
      map[key].push(d)
    })
  } else {
    filteredDeliveries.value.forEach(d => {
      const date = d.delivery_date || 'Unknown'
      if (!map[date]) map[date] = []
      map[date].push(d)
    })
  }
  return map
})
</script>

<template>
  <div class="p-6 space-y-6">
    <div v-if="isLoading" class="text-white text-center py-10 text-lg italic">
      Loading deliveries...
    </div>

    <div v-else>
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
      <div>
        <h1 class="text-2xl font-bold text-white">
          {{ reportTitle }}
        </h1>
        <div v-if="level === 'weekly' || level === 'monthly'" class="text-sm text-blue-400 cursor-pointer hover:underline" @click="level = 'daily'">
          ← Back to Daily View
        </div>
      </div>
      <input
        type="date"
        v-model="deliveryDate"
        class="bg-white/10 text-white px-4 py-2 rounded-md border border-white/20"
      />
    </div>

    <!-- Metrics Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <MetricCard title="Total Deliveries" :value="totalDeliveries + ' pcs'" />
      <MetricCard title="Single-Walled Total" :value="singleWalledTotal + ' pcs'" />
      <MetricCard title="Double-Walled Total" :value="doubleWalledTotal + ' pcs'" />
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <DeliveryBarChart :data="barChartData" />
      <ProductPieChart :data="pieChartData" />
    </div>

    <!-- Delivery Table -->
    <div class="bg-white/10 rounded-xl p-4">
      <DeliveryTable :grouped-deliveries="groupedDeliveries" />
    </div>
  </div>
      </div>
  </div>
</template>