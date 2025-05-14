<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import DeliveryForm from './DeliveryForm.vue'
import DeliveryTable from './DeliveryTable.vue'
import { useDeliveries } from '../composables/useDeliveries' // fetch only
import { supabase } from '../lib/supabase'

const { deliveries, fetchDeliveries } = useDeliveries()

const formData = ref({
  worker_id: '',
  product_id: '',
  quantity: 0,
  delivery_date: getCurrentDate(),
  notes: ''
})

const deliveryDate = ref(getCurrentDate())
const isEditing = ref(false)
const editingId = ref(null)

const handleSubmit = async (delivery) => {
  if (isEditing.value) {
    const { error } = await supabase
      .from('deliveries')
      .update({ ...delivery, status: 'delivered' })
      .eq('id', editingId.value)
    if (!error) await fetchDeliveries()
  } else {
    const { error } = await supabase
      .from('deliveries')
      .insert({ ...delivery, status: 'delivered' })
    if (!error) await fetchDeliveries()
  }
  resetForm()
}

const editDelivery = (id, delivery) => {
  formData.value = {
    worker_id: delivery.workers.id,
    product_id: delivery.products.id,
    quantity: delivery.quantity,
    delivery_date: delivery.delivery_date,
    notes: ''
  }
  isEditing.value = true
  editingId.value = id
  nextTick(() => {
    const el = document.querySelector('#delivery-form')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  })
}

const deleteDelivery = async (id) => {
  const { error } = await supabase.from('deliveries').delete().eq('id', id)
  if (!error) await fetchDeliveries()
}

const resetForm = () => {
  formData.value = {
    worker_id: '',
    product_id: '',
    quantity: 0,
    delivery_date: getCurrentDate(),
    notes: ''
  }
  isEditing.value = false
  editingId.value = null
}

function getCurrentDate() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

const totalSingleWalledDelivered = computed(() =>
  deliveries.value.filter(d => d.products.category === 'Single Walled')
    .reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const totalDoubleWalledDelivered = computed(() =>
  deliveries.value.filter(d => d.products.category === 'Double Walled')
    .reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const totalDeliveries = computed(() =>
  deliveries.value
    .filter(d => ['Single Walled', 'Double Walled'].includes(d.products?.category))
    .reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const groupedDeliveries = computed(() => {
  const map = {}
  deliveries.value.forEach(d => {
    const date = d.delivery_date || 'Unknown'
    if (!map[date]) map[date] = []
    map[date].push(d)
  })
  return map
})

onMounted(fetchDeliveries)
</script>

<template>
  <div class="flex flex-col min-h-screen bg-gray-900 text-white font-sans">
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      <div class="bg-blue-600 p-6 rounded-xl shadow-lg">
        <h3 class="text-sm font-medium uppercase text-white/80">Single-Walled</h3>
        <p class="text-3xl font-bold">{{ totalSingleWalledDelivered }} pcs</p>
      </div>
      <div class="bg-purple-600 p-6 rounded-xl shadow-lg">
        <h3 class="text-sm font-medium uppercase text-white/80">Double-Walled</h3>
        <p class="text-3xl font-bold">{{ totalDoubleWalledDelivered }} pcs</p>
      </div>
      <div class="bg-green-600 p-6 rounded-xl shadow-lg">
        <h3 class="text-sm font-medium uppercase text-white/80">Total</h3>
        <p class="text-3xl font-bold">{{ totalDeliveries }} pcs</p>
      </div>
    </div>

    <!-- Main Section -->
    <div class="flex flex-col lg:flex-row flex-1 overflow-hidden">
      <DeliveryForm
        class="w-full lg:w-1/3 bg-gray-800 p-6 overflow-y-auto"
        :delivery-date="deliveryDate"
        :edit-mode="isEditing"
        :form-data="formData"
        @submit="handleSubmit"
        @cancel-edit="resetForm"
      />
      <DeliveryTable
        class="flex-1 bg-gray-900 p-6 overflow-hidden"
        :grouped-deliveries="groupedDeliveries"
        @edit="editDelivery"
        @delete="deleteDelivery"
      />
    </div>
  </div>
</template>