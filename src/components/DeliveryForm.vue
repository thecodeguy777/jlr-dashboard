<script setup>
import { defineProps, defineEmits, ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const props = defineProps({
  deliveryDate: String,
  editMode: Boolean,
  formData: Object,
})

const emit = defineEmits(['submit', 'cancel-edit'])

const products = ref([])
const workers = ref([])

const fetchOptions = async () => {
  const [{ data: productData }, { data: workerData }] = await Promise.all([
    supabase.from('products').select('id, name, category, unit').order('name'),
    supabase.from('workers').select('id, name').order('name')
  ])
  products.value = productData || []
  workers.value = workerData || []
}

onMounted(fetchOptions)
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
  >
    <div
      id="delivery-form"
      class="w-full max-w-lg backdrop-blur-md p-6 rounded-2xl shadow-md border transition-all bg-white/10 border-white/10"
    >
      <h2 class="text-2xl font-bold mb-4 border-b border-gray-600 pb-2">
        {{ editMode ? 'Edit Delivery' : 'Log New Delivery' }}
      </h2>

      <form @submit.prevent="emit('submit', props.formData)">
        <div class="space-y-4">
          <!-- Worker -->
          <div>
            <label class="block text-sm font-medium text-gray-300">Worker</label>
            <select
              v-model="props.formData.worker_id"
              class="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
            >
              <option value="" disabled>Select worker</option>
              <option v-for="w in workers" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select>
          </div>

          <!-- Product -->
          <div>
            <label class="block text-sm font-medium text-gray-300">Product</label>
            <select
              v-model="props.formData.product_id"
              class="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
            >
              <option value="" disabled>Select product</option>
              <option v-for="p in products" :key="p.id" :value="p.id">
                {{ p.name }} ({{ p.unit }})
              </option>
            </select>
          </div>

          <!-- Quantity -->
          <div>
            <label class="block text-sm font-medium text-gray-300">Quantity</label>
            <input
              type="number"
              v-model.number="props.formData.quantity"
              min="1"
              class="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
            />
          </div>

          <!-- Date -->
          <div>
            <label class="block text-sm font-medium text-gray-300">Date</label>
            <input
              type="date"
              v-model="props.formData.delivery_date"
              class="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
            />
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-gray-300">Notes</label>
            <textarea
              v-model="props.formData.notes"
              class="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 resize-none"
              rows="3"
            ></textarea>
          </div>

          <!-- Buttons -->
          <div class="flex gap-2">
            <button
              type="submit"
              class="flex-1 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              {{ editMode ? 'Update Delivery' : 'Log Delivery' }}
            </button>
            <button
              type="button"
              @click="emit('cancel-edit')"
              class="flex-1 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
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
</style>
