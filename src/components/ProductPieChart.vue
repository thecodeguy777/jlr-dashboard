<template>
  <div class="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-xl">
    <h3 class="text-sm font-semibold text-white/80 mb-2">Product Distribution</h3>
    <Pie v-if="data?.labels?.length" :data="data" :options="options" />
    <p v-else class="text-red-400 text-sm">⚠️ No product data to display.</p>
  </div>
</template>

<script>
import { Pie } from 'vue-chartjs';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default {
  name: 'ProductPieChart',
  components: { Pie },
  props: {
    data: {
      type: Object,
      required: true,
    },
  },
  computed: {
    options() {
      return {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#ccc',
            },
          },
        },
      };
    },
  },
};
</script>
