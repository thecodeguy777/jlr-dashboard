<script setup>
import { defineProps, defineEmits, computed } from 'vue'

const { deliveries } = defineProps({
  deliveries: {
    type: Array,
    required: true,
    default: () => []
  }
})
const emit = defineEmits(['edit', 'delete'])

const categoryTotals = computed(() => {
  return deliveries.reduce(
    (totals, item) => {
      const category = item.products?.category
      const qty = item.quantity || 0
      if (category === 'Single Walled') totals.single += qty
      if (category === 'Double Walled') totals.double += qty
      if (category === 'Misc') totals.misc += qty
      return totals
    },
    { single: 0, double: 0, misc: 0 }
  )
})

const formatCategory = (category) => {
  switch (category) {
    case 'Single Walled': return 'Single'
    case 'Double Walled': return 'Double'
    case 'Misc': return 'Misc'
    default: return category
  }
}
</script>

<template>
  <div>
    <div v-if="Array.isArray(deliveries)" class="text-lg text-slate-50 italic mb-2 flex flex-wrap gap-4">
      <span>Single: {{ categoryTotals.single }} pcs</span>
      <span>Double: {{ categoryTotals.double }} pcs</span>
      <span>Misc: {{ categoryTotals.misc }} pcs</span>
    </div>

    <!-- Desktop Table -->
    <table class="w-full text-sm text-left text-white/90 hidden md:table">
      <thead class="uppercase text-xs text-white bg-white/5 border-b border-white/10">
        <tr>
          <th class="px-4 py-2">Worker</th>
          <th class="px-4 py-2">Product</th>
          <th class="px-4 py-2">Category</th>
          <th class="px-4 py-2 text-right">Qty</th>
          <th class="px-4 py-2">Notes</th>
          <th class="px-4 py-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in deliveries" :key="item.id" class="border-b border-white/10 hover:bg-white/5">
          <td class="px-4 py-2">{{ item.workers?.name || '—' }}</td>
          <td class="px-4 py-2">{{ item.products?.name || '—' }}</td>
          <td class="px-4 py-2">{{ formatCategory(item.products?.category) || '—' }}</td>
          <td class="px-4 py-2 text-right">{{ item.quantity }}</td>
          <td class="px-4 py-2 italic text-white/70">{{ item.notes || '—' }}</td>
          <td class="px-4 py-2 text-right space-x-2">
            <button @click="emit('edit', item.id, item)" class="text-blue-400 hover:underline">✏️</button>
            <button @click="emit('delete', item.id)" class="text-red-400 hover:underline">❌</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Mobile Cards -->
    <div class="space-y-4 md:hidden">
      <div v-for="item in deliveries" :key="item.id"
        class="bg-white/5 rounded-xl p-4 text-white text-sm border border-white/10">
        <div class="flex justify-between mb-1">
          <span class="font-semibold">Worker:</span>
          <span>{{ item.workers?.name || '—' }}</span>
        </div>
        <div class="flex justify-between mb-1">
          <span class="font-semibold">Product:</span>
          <span>{{ item.products?.name || '—' }}</span>
        </div>
        <div class="flex justify-between mb-1">
          <span class="font-semibold">Category:</span>
          <span>{{ formatCategory(item.products?.category) || '—' }}</span>
        </div>
        <div class="flex justify-between mb-1">
          <span class="font-semibold">Qty:</span>
          <span>{{ item.quantity }}</span>
        </div>
        <div class="flex justify-between mb-2">
          <span class="font-semibold">Notes:</span>
          <span class="italic text-white/60">{{ item.notes || '—' }}</span>
        </div>
        <div class="text-right space-x-2">
          <button @click="emit('edit', item.id, item)" class="text-blue-400 hover:underline">✏️</button>
          <button @click="emit('delete', item.id)" class="text-red-400 hover:underline">❌</button>
        </div>
      </div>
    </div>

    <div v-if="deliveries.length === 0" class="text-white/60 italic mt-2">
      No deliveries for this date.
    </div>
  </div>
</template>

<style scoped>
th,
td {
  white-space: nowrap;
}
</style>
