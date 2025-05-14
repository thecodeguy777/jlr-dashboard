<template>
  <div class="space-y-6">
    <!-- DEBUG OUTPUT -->
    <div class="bg-gray-100 text-xs text-gray-800 p-2 rounded">
      <strong>DEBUG barChartData:</strong>
      <pre>{{ barChartData }}</pre>
    </div>

    <!-- Deliveries by Timeframe -->
    <div class="bg-white rounded-xl shadow p-4">
      <h3 class="text-md font-semibold mb-2">
        <span v-if="mode === 'daily'">Deliveries per Worker (Today)</span>
        <span v-else-if="mode === 'weekly'">Deliveries per Worker (This Week)</span>
        <span v-else-if="mode === 'monthly'">Deliveries per Worker (This Month)</span>
      </h3>
      <BarChart :data="barChartData" />
    </div>

    <!-- Status Breakdown -->
    <div class="bg-white rounded-xl shadow p-4">
      <h3 class="text-md font-semibold mb-2">Status Breakdown</h3>
      <PieChart :data="statusChartData" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import BarChart from '@/components/BarChart.vue'
import PieChart from '@/components/PieChart.vue'

const props = defineProps({
  mode: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    default: () => ({})
  }
})

const barChartData = computed(() => {
  const map = {}

  if (props.mode === 'daily') {
    props.data?.workers?.forEach(worker => {
      const key = worker.worker || worker.name
      map[key] = (map[key] || 0) + worker.deliveries
    })
  } else if (props.mode === 'weekly' || props.mode === 'monthly') {
    const entries = Array.isArray(props.data) ? props.data : Object.values(props.data)
    entries.forEach(entry => {
      entry.workers?.forEach(worker => {
        const key = worker.name
        map[key] = (map[key] || 0) + worker.deliveries
      })
    })
  }

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

const statusChartData = computed(() => {
  if (props.mode === 'daily') {
    const counts = { Completed: 0, Pending: 0, Late: 0 }
    props.data?.deliveries?.forEach(d => {
      if (counts[d.status] !== undefined) counts[d.status]++
    })
    return {
      labels: Object.keys(counts),
      datasets: [
        {
          label: 'Status',
          data: Object.values(counts),
          backgroundColor: ['#34d399', '#facc15', '#f87171']
        }
      ]
    }
  }
  return {
    labels: props.data?.statusBreakdown?.map(s => s.label) || [],
    datasets: [
      {
        data: props.data?.statusBreakdown?.map(s => s.value) || [],
        backgroundColor: ['#34d399', '#facc15', '#f87171']
      }
    ]
  }
})
</script>