<script setup>
import { defineProps, defineEmits, ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'

const props = defineProps({
  deliveryDate: String,
  editMode: Boolean,
  formData: Object,
})

const emit = defineEmits(['submit', 'cancel-edit'])

const products = ref([])
const workers = ref([])
const subcontractors = ref([])

// Group products by category
const productsByCategory = computed(() => {
  const grouped = {
    'Single Walled': [],
    'Double Walled': [],
    'Misc': [],
    'Repaired': []
  }

  products.value.forEach(product => {
    const category = product.category || 'Misc'
    if (grouped[category]) {
      grouped[category].push(product)
    } else {
      grouped['Misc'].push(product)
    }
  })

  return grouped
})

const fetchOptions = async () => {
  const MAX_RETRIES = 2
  const RETRY_DELAY = 1000 // 1 second

  const fetchWithRetry = async (query, retries = 0) => {
    try {
      const { data, error } = await query
      if (error) throw error
      return data
    } catch (err) {
      if (retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
        return fetchWithRetry(query, retries + 1)
      }
      throw err
    }
  }

  try {
    const [productRes, workerRes, subconRes] = await Promise.allSettled([
      fetchWithRetry(supabase.from('products').select('id, name, category, unit, price_per_unit').order('name')),
      fetchWithRetry(supabase.from('workers').select('id, name').order('name')),
      fetchWithRetry(supabase.from('subcontractors').select('id, name').order('name'))
    ])

    const errors = []

    if (productRes.status === 'fulfilled') {
      products.value = productRes.value || []
    } else {
      errors.push('Failed to load products')
      console.error('Products failed:', productRes.reason)
    }

    if (workerRes.status === 'fulfilled') {
      workers.value = workerRes.value || []
    } else {
      errors.push('Failed to load workers')
      console.error('Workers failed:', workerRes.reason)
    }

    if (subconRes.status === 'fulfilled') {
      subcontractors.value = subconRes.value || []
    } else {
      errors.push('Failed to load subcontractors')
      console.error('Subcontractors failed:', subconRes.reason)
    }

    if (errors.length > 0) {
      // You can use your preferred notification system here
      alert(`Some data failed to load: ${errors.join(', ')}. Please try refreshing the page.`)
    }
  } catch (error) {
    console.error('Fatal error in fetchOptions:', error)
    alert('Failed to load form data. Please try refreshing the page.')
  }
}

function handleSubmit() {
  const product = products.value.find(p => p.id === props.formData.product_id)
  const price_snapshot = product?.price_per_unit || 0

  const payload = {
    product_id: props.formData.product_id,
    quantity: props.formData.quantity,
    price_snapshot,
    notes: props.formData.notes || ''
  }

  if (props.formData.source === 'inhouse') {
    emit('submit', {
      ...payload,
      worker_id: props.formData.worker_id,
      delivery_date: props.formData.delivery_date,
      source: 'inhouse'
    })
  } else {
    emit('submit', {
      ...payload,
      subcon_id: props.formData.subcon_id,
      pickup_date: props.formData.pickup_date,
      delivery_date: props.formData.delivery_date,
      source: 'subcon'
    })
  }
}

onMounted(fetchOptions)
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md supports-[backdrop-filter]:bg-black/30 transition-opacity duration-300 ease-out"
    @keydown.esc="$emit('cancel-edit')" @click.self="$emit('cancel-edit')" tabindex="0">

    <div id="delivery-form"
      class="w-full max-w-lg transition-transform duration-300 ease-out backdrop-blur-md p-6 rounded-2xl shadow-md border bg-gray-900/80 border-white/10">
      <h2 class="text-2xl font-bold mb-4 border-b border-gray-600 pb-2">
        {{ editMode ? 'Edit Delivery' : 'Log New Delivery' }}
      </h2>

      <form @submit.prevent="handleSubmit">
        <div class="space-y-4">
          <!-- Source Type -->
          <div class="flex space-x-2 text-sm text-white/80">
            <button type="button" @click="formData.source = 'inhouse'"
              :class="['px-4 py-2 rounded-l', formData.source === 'inhouse' ? 'bg-blue-600 text-white font-bold' : 'bg-white/10 hover:bg-white/20']">
              In-House
            </button>
            <button type="button" @click="formData.source = 'subcon'"
              :class="['px-4 py-2 rounded-r', formData.source === 'subcon' ? 'bg-green-600 text-white font-bold' : 'bg-white/10 hover:bg-white/20']">
              Subcontractor
            </button>
          </div>

          <!-- Worker or Subcontractor -->
          <div v-if="formData.source === 'inhouse'">
            <label class="block text-sm font-medium text-gray-300">Worker</label>
            <select v-model="formData.worker_id"
              class="w-full p-2 rounded bg-gray-700 text-white border border-gray-600">
              <option value="" disabled>Select worker</option>
              <option v-for="w in workers" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select>
          </div>

          <div v-if="formData.source === 'subcon'">
            <label class="block text-sm font-medium text-gray-300">Subcontractor</label>
            <select v-model="formData.subcon_id"
              class="w-full p-2 rounded bg-gray-700 text-white border border-gray-600">
              <option value="" disabled>Select subcontractor</option>
              <option v-for="s in subcontractors" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>

          <!-- Product -->
          <div>
            <label class="block text-sm font-medium text-gray-300">Product</label>
            <select v-model="formData.product_id"
              class="w-full p-2 rounded bg-gray-700 text-white border border-gray-600">
              <option value="" disabled>Select product</option>
              <optgroup v-for="(products, category) in productsByCategory" :key="category" :label="category">
                <option v-for="p in products" :key="p.id" :value="p.id">
                  {{ p.name }} ({{ p.unit }})
                </option>
              </optgroup>
            </select>
          </div>

          <!-- Quantity -->
          <div>
            <label class="block text-sm font-medium text-gray-300">Quantity</label>
            <input type="number" v-model.number="formData.quantity" min="1"
              class="w-full p-2 rounded bg-gray-700 text-white border border-gray-600" />
          </div>

          <!-- Repair Status -->
          <div class="flex items-center space-x-2">
            <input type="checkbox" v-model="formData.is_repaired" id="is_repaired"
              class="w-4 h-4 rounded bg-gray-700 text-blue-500 border-gray-600 focus:ring-blue-500" />
            <label for="is_repaired" class="text-sm font-medium text-gray-300">Repaired Product</label>
          </div>

          <!-- Dates -->
          <div v-if="formData.source === 'inhouse'">
            <label class="block text-sm font-medium text-gray-300">Delivery Date</label>
            <input type="date" v-model="formData.delivery_date"
              class="w-full p-2 rounded bg-gray-700 text-white border border-gray-600" />
          </div>

          <div v-else>
            <label class="block text-sm font-medium text-gray-300 mt-2">Delivery Date</label>
            <input type="date" v-model="formData.delivery_date"
              class="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
              :max="new Date().toISOString().split('T')[0]" />
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-gray-300">Notes</label>
            <textarea v-model="formData.notes"
              class="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 resize-none" rows="3"></textarea>
          </div>

          <!-- Buttons -->
          <div class="flex gap-2">
            <button type="submit" class="flex-1 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              {{ editMode ? 'Update Delivery' : 'Log Delivery' }}
            </button>
            <button type="button" @click="emit('cancel-edit')"
              class="flex-1 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
label {
  color: #e0e0e0;
}

.modal-fade-slide-enter-active,
.modal-fade-slide-leave-active {
  transition: opacity 0.25s cubic-bezier(.4, 0, .2, 1), transform 0.25s cubic-bezier(.4, 0, .2, 1);
}

.modal-fade-slide-enter-from,
.modal-fade-slide-leave-to {
  opacity: 0;
  transform: translateY(40px) scale(0.96);
}

.modal-fade-slide-enter-to,
.modal-fade-slide-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
</style>
