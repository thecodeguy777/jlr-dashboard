<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import MetricCard from '../components/MetricCard.vue'
import DeliveryBarChart from '../components/BarChart.vue'
import ProductPieChart from '../components/ProductPieChart.vue'
import DeliveryTable from '../components/DeliveryTable.vue'
import DeliveryForm from '../components/DeliveryForm.vue'
import { useDeliveries } from '../composables/useDeliveries'
import { supabase } from '../lib/supabase'

// State
const level = ref('weekly')
const selectedWeek = ref(null)
const deliveryDate = ref(getCurrentDate())
const isLoading = ref(true)
const showForm = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const showLogButton = ref(true)

const formData = ref({
  worker_id: '', product_id: '', quantity: 1,
  delivery_date: getCurrentDate(), notes: ''
})

// Composables
const { deliveries, fetchDeliveries } = useDeliveries()

// Watchers
onMounted(() => {
  watch(deliveries, () => { isLoading.value = false }, { immediate: true })
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

// Data Filtering
const filteredDeliveries = computed(() => {
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

  return results.filter(d => ['Single Walled', 'Double Walled', 'Miscellaneous'].includes(d.products?.category))
})


// Labels
const formattedDate = computed(() => formatDate(deliveryDate.value))

const reportTitle = computed(() => {
  if (level.value === 'weekly') return `📅 Weekly Report – ${formatDate(weekStart.value)} to ${formatDate(weekEnd.value)}`
  if (level.value === 'monthly') return `📅 Monthly Report – ${formatDate(monthStart.value)} to ${formatDate(monthEnd.value)}`
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

      <!-- Metrics Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <MetricCard title="Total Deliveries" :value="totalDeliveries" suffix=" pcs" color="blue" />
        <MetricCard title="Single-Walled Total" :value="singleWalledTotal" suffix=" pcs" color="blue" />
        <MetricCard title="Double-Walled Total" :value="doubleWalledTotal" suffix=" pcs" color="blue" />
        <MetricCard title="Gross Value" :value="Math.round(totalGross)" prefix="₱" color="blue" />


      </div>

      <!-- Charts -->
      <div class="rounded-2xl bg-blue-900/10 p-6 xl:p-8">
        <DeliveryBarChart :data="barChartData" />
      </div>
      <div class="rounded-2xl bg-blue-900/10 p-6 xl:p-8">
        <ProductPieChart :data="pieChartData" />
      </div>

      <!-- Delivery Table -->
      <div class="space-y-6">
        <div v-for="(deliveries, date) in groupedDeliveries" :key="date" class="bg-white/10 rounded-2xl p-6">
          <h2 class="text-lg font-semibold text-white mb-4">
            {{ new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }}
          </h2>
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
