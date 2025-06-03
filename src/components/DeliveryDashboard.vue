<script setup>
import { ref, watch, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useDeliveries } from '../composables/useDeliveries'
import DeliveryForm from './DeliveryForm.vue'
import DeliveryCard from './DeliveryCard.vue'
import SummaryCard from './SummaryCard.vue'
import { Plus, } from 'lucide-vue-next'

// Routing
const router = useRouter()
const route = useRoute()

// States
const showForm = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const deliveryTypeFilter = ref('all')
const deliveryDate = ref(getCurrentDate())

// Date & Week
const selectedSaturday = ref(getNextSaturday(new Date()))
const selectedSaturdayString = computed({
  get: () => selectedSaturday.value.toISOString().split('T')[0],
  set: val => selectedSaturday.value = new Date(val)
})
const selectedWeekRange = computed(() => getWeekRange(selectedSaturday.value))

// Data
const products = ref([])
const deliverySummary = ref([])
const formData = ref(initFormData())
const { deliveries } = useDeliveries()

// Computed Deliveries
const filteredDeliveries = computed(() =>
  deliveries.value.filter(d => deliveryTypeFilter.value === 'all' || d.type === deliveryTypeFilter.value)
)

const totalSingleWalledDelivered = computed(() =>
  filteredDeliveries.value.filter(d => d.products?.category === 'Single Walled')
    .reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const totalDoubleWalledDelivered = computed(() =>
  filteredDeliveries.value.filter(d => d.products?.category === 'Double Walled')
    .reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const totalDeliveries = computed(() =>
  filteredDeliveries.value.filter(d => ['Single Walled', 'Double Walled'].includes(d.products?.category))
    .reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const dailyCategoryTotals = computed(() => {
  const map = {}
  filteredDeliveries.value.forEach(({ delivery_date, products, quantity }) => {
    const category = products?.category
    if (!map[delivery_date]) map[delivery_date] = { single: 0, double: 0 }
    if (category === 'Single Walled') map[delivery_date].single += quantity || 0
    if (category === 'Double Walled') map[delivery_date].double += quantity || 0
  })
  return map
})


const groupedDeliveries = computed(() => {
  const map = {}

  filteredDeliveries.value.forEach(d => {
    const {
      delivery_date,
      name = 'Unknown',
      id,
      products,
      product_id,
      quantity,
      type,
      worker_id,
      subcon_id
    } = d

    if (!map[delivery_date]) map[delivery_date] = {}
    if (!map[delivery_date][name]) map[delivery_date][name] = []

    map[delivery_date][name].push({
      id,
      product: products?.name || 'Unknown',
      product_id,
      quantity: quantity || 0,
      editedQty: quantity || 0,
      editedProductId: product_id,
      type,
      worker_id,
      subcon_id
    })
  })

  return Object.entries(map)
    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
    .map(([date, workers]) => ({
      date,
      workers: Object.entries(workers)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, deliveries]) => {
          const first = deliveries[0] || {}
          return {
            name,
            id: first.type === 'inhouse' ? first.worker_id : first.subcon_id,
            type: first.type,
            deliveries
          }
        })
    }))
})




// Lifecycle
onMounted(async () => {
  if (route.query.action === 'new') {
    handleNewEntry()
    router.replace({ path: route.path, query: {} })
  }
  const { data } = await supabase.from('products').select('*')
  products.value = data || []
  await refreshWeek()
})

watch(selectedSaturday, async () => {
  await refreshWeek()
})

// Utilities
function getCurrentDate() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function getNextSaturday(date) {
  const day = date.getDay()
  const daysUntilSaturday = (6 - day + 7) % 7
  const saturday = new Date(date)
  saturday.setDate(date.getDate() + daysUntilSaturday)
  saturday.setHours(0, 0, 0, 0)
  return saturday
}

function getWeekRange(saturday) {
  const end = new Date(saturday)
  const start = new Date(end)
  start.setDate(end.getDate() - 6)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
}

function initFormData() {
  return {
    source: 'inhouse',
    worker_id: '',
    subcon_id: '',
    product_id: '',
    quantity: 0,
    delivery_date: getCurrentDate(),
    notes: ''
  }
}

// Data Fetching
async function refreshWeek() {
  const { start, end } = selectedWeekRange.value
  await Promise.all([fetchDeliveriesForWeek(start, end), fetchSummaryForWeek(start, end)])
}

async function fetchDeliveriesForWeek(start, end) {
  const [inhouseResult, subconResult] = await Promise.all([
    supabase.from('deliveries').select('*, workers(*), products(*)').gte('delivery_date', start).lte('delivery_date', end),
    supabase.from('subcon_deliveries').select('*, subcontractors(*), products(*)').gte('delivery_date', start).lte('delivery_date', end)
  ])

  deliveries.value = [
    ...(inhouseResult.data || []).map(d => ({ ...d, type: 'inhouse', name: d.workers?.name || 'Unknown' })),
    ...(subconResult.data || []).map(d => ({ ...d, type: 'subcon', name: d.subcontractors?.name || 'Unknown' }))
  ]
}

async function fetchSummaryForWeek(start, end) {
  const { data, error } = await supabase.from('delivery_summary').select('*').gte('delivery_date', start).lte('delivery_date', end)
  if (error) return console.error('Error fetching summary:', error)
  deliverySummary.value = (data || []).map(entry => ({ ...entry, type: entry.source || 'inhouse' }))
}

// Form Logic
function handleNewEntry() {
  formData.value = initFormData()
  isEditing.value = false
  showForm.value = true
  nextTick(() => document.querySelector('#delivery-form')?.scrollIntoView({ behavior: 'smooth' }))
}

function resetForm() {
  formData.value = initFormData()
  isEditing.value = false
  editingId.value = null
  showForm.value = false
}

async function handleSubmit(delivery) {
  let snapshotPrice = delivery.price_snapshot

  if (delivery.source === 'subcon') {
    // Fetch subcon_price from products table if not manually provided
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('subcon_price')
      .eq('id', delivery.product_id)
      .single()

    if (productError) {
      console.error('❌ Failed to fetch subcon_price:', productError.message)
      return
    }

    snapshotPrice = productData.subcon_price || 0
  }

  const payload = {
    product_id: delivery.product_id,
    quantity: delivery.quantity,
    price_snapshot: snapshotPrice,
    notes: delivery.notes || ''
  }

  const error = delivery.source === 'inhouse'
    ? isEditing.value
      ? (await supabase.from('deliveries').update({ ...payload, worker_id: delivery.worker_id, delivery_date: delivery.delivery_date, status: 'delivered' }).eq('id', editingId.value)).error
      : (await supabase.from('deliveries').insert({ ...payload, worker_id: delivery.worker_id, delivery_date: delivery.delivery_date, status: 'delivered' })).error
    : (await supabase.from('subcon_deliveries').insert({ ...payload, subcon_id: delivery.subcon_id, delivery_date: delivery.delivery_date })).error

  if (error) {
    console.error('❌ Submit error:', error.message)
    return
  }

  await refreshWeek()
  resetForm()
}


async function handleDelete(id) {
  const delivery = deliveries.value.find(d => d.id === id)
  if (!delivery) return
  const table = delivery.type === 'subcon' ? 'subcon_deliveries' : 'deliveries'
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) return console.error("Delete failed:", error)
  await refreshWeek()
}
</script>



<template>
  <div class="flex flex-col min-h-screen bg-gray-900 text-white font-sans">

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      <SummaryCard title="Single-Walled" :value="totalSingleWalledDelivered" color="blue" />
      <SummaryCard title="Double-Walled" :value="totalDoubleWalledDelivered" color="purple" />
      <SummaryCard title="Total" :value="totalDeliveries" color="green" icon="📊" />
    </div>

    <!-- Date Picker and Filter -->
    <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 px-6 py-4">
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-400">Select Week:</label>
        <input type="date" v-model="selectedSaturdayString"
          class="bg-gray-800 text-white border border-gray-600 rounded px-3 py-2" />
      </div>
      <p class="text-sm text-gray-400 italic">Week: {{ selectedWeekRange.start }} to {{ selectedWeekRange.end }}</p>
    </div>

    <!-- Filter Buttons -->
    <div class="flex gap-2 px-6 mb-4">
      <button @click="deliveryTypeFilter = 'all'"
        :class="['px-4 py-2 rounded', deliveryTypeFilter === 'all' ? 'bg-green-600 text-white font-semibold' : 'bg-gray-800 text-gray-300']">All</button>
      <button @click="deliveryTypeFilter = 'inhouse'"
        :class="['px-4 py-2 rounded', deliveryTypeFilter === 'inhouse' ? 'bg-blue-600 text-white font-semibold' : 'bg-gray-800 text-gray-300']">In-House</button>
      <button @click="deliveryTypeFilter = 'subcon'"
        :class="['px-4 py-2 rounded', deliveryTypeFilter === 'subcon' ? 'bg-purple-600 text-white font-semibold' : 'bg-gray-800 text-gray-300']">Subcon</button>
    </div>

    <!-- No Deliveries Message -->
    <div v-if="Array.isArray(groupedDeliveries) && groupedDeliveries.length === 0"
      class="text-center text-gray-400 italic mt-8">
      No deliveries found for this week.
    </div>

    <!-- Main Section -->
    <div class="flex flex-col lg:flex-row flex-1 overflow-hidden">

      <!-- Delivery Form Panel -->
      <transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 translate-x-10"
        enter-to-class="opacity-100 translate-x-0" leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-x-0" leave-to-class="opacity-0 translate-x-10">
        <DeliveryForm v-if="showForm" class="w-full lg:w-1/3 bg-gray-800 p-6 overflow-y-auto"
          :delivery-date="deliveryDate" :edit-mode="isEditing" :form-data="formData" @submit="handleSubmit"
          @cancel-edit="resetForm" />
      </transition>

      <!-- Delivery Groups -->
      <div class="flex-1 p-6 space-y-8 overflow-y-auto">
        <div v-for="group in groupedDeliveries" :key="group.date" class="space-y-6">
          <div class="flex justify-between items-center text-sm text-gray-400">
            <span>{{ group.date }}</span>
            <span class="text-base text-gray-200 italic">
              Single: {{ dailyCategoryTotals[group.date]?.single || 0 }} pcs,
              Double: {{ dailyCategoryTotals[group.date]?.double || 0 }} pcs
            </span>
          </div>

          <DeliveryCard v-for="worker in group.workers" :key="group.date + '-' + worker.name" :worker="worker"
            :date="group.date" :products="products" :on-refresh="refreshWeek" @delete="handleDelete"
            @update:deliveries="newDeliveries => worker.deliveries = newDeliveries" />
        </div>
      </div>
    </div>

    <!-- Floating Action Button -->
    <button @click="handleNewEntry"
      class="fixed right-6 bottom-20 z-50 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-full shadow-lg transition duration-200 active:scale-95">
      <Plus class="w-5 h-5 text-white" />
      <span class="text-sm sm:text-base">Add Delivery</span>
    </button>
  </div>
</template>
