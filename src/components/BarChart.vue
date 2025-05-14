<template>
  <div class="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-xl">
    <h3 class="text-sm font-semibold text-white/80 mb-2">Deliveries Overview</h3>
    <Bar v-if="data?.labels?.length" :data="data" :options="options" />
    <p v-else class="text-red-400 text-sm">⚠️ No data available for chart.</p>
  </div>
</template>

<script>
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default {
  name: 'BarChart',
  components: { Bar },
  props: {
    data: {
      type: Object,
      required: true
    }
  },
  computed: {
    options() {
      return {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#ccc' }
          },
          x: {
            ticks: { color: '#ccc' }
          }
        }
      }
    }
  }
}
</script>
