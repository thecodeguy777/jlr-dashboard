<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  groupedDeliveries: Object
})

const emit = defineEmits(['edit', 'delete'])
</script>

<template>
  <div>
    <div v-for="(items, date) in groupedDeliveries" :key="date" class="mb-8">
      <h2 class="text-lg font-bold text-white mb-2">{{ date }}</h2>

      <!-- DESKTOP TABLE -->
      <table class="w-full text-sm text-left text-white/90 hidden md:table">
        <thead class="uppercase text-xs text-white bg-white/5 border-b border-white/10">
          <tr>
            <th class="px-4 py-2">Worker</th>
            <th class="px-4 py-2">Product</th>
            <th class="px-4 py-2 text-right">Qty</th>
            <th class="px-4 py-2">Notes</th>
            <th class="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.id"
            class="border-b border-white/10 hover:bg-white/5"
          >
            <td class="px-4 py-2">{{ item.workers?.name || '—' }}</td>
            <td class="px-4 py-2">{{ item.products?.name || '—' }}</td>
            <td class="px-4 py-2 text-right">{{ item.quantity }}</td>
            <td class="px-4 py-2 italic text-white/70">{{ item.notes || '—' }}</td>
            <td class="px-4 py-2 text-right space-x-2">
              <button
                @click="emit('edit', item.id, item)"
                class="text-blue-400 hover:underline"
                title="Edit"
              >✏️</button>
              <button
                @click="emit('delete', item.id)"
                class="text-red-400 hover:underline"
                title="Delete"
              >❌</button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- MOBILE CARD LIST -->
      <div class="space-y-4 md:hidden">
        <div
          v-for="item in items"
          :key="item.id"
          class="bg-white/5 rounded-xl p-4 text-white text-sm border border-white/10"
        >
          <div class="flex justify-between mb-1">
            <span class="font-semibold">Worker:</span>
            <span>{{ item.workers?.name || '—' }}</span>
          </div>
          <div class="flex justify-between mb-1">
            <span class="font-semibold">Product:</span>
            <span>{{ item.products?.name || '—' }}</span>
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
            <button
              @click="emit('edit', item.id, item)"
              class="text-blue-400 hover:underline"
              title="Edit"
            >✏️</button>
            <button
              @click="emit('delete', item.id)"
              class="text-red-400 hover:underline"
              title="Delete"
            >❌</button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="items.length === 0" class="text-white/60 italic mt-2">
        No deliveries for this date.
      </div>
    </div>
  </div>
</template>

<style scoped>
th, td {
  white-space: nowrap;
}
</style>