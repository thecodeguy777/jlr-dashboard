<template>
  <div class="w-full h-full">
    <pie-chart :data="pieData" :options="pieOptions" />
  </div>
</template>

<script>
import { Pie } from 'vue-chartjs';
import { reactive, watch } from 'vue';
import { Chart as ChartJS, ArcElement, CategoryScale, Tooltip, Legend } from 'chart.js';

// Register the necessary components for Chart.js
ChartJS.register(ArcElement, CategoryScale, Tooltip, Legend);

export default {
  name: 'PieChart',
  components: {
    PieChart: Pie,
  },
  props: {
    data: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const pieOptions = reactive({
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.dataset.label || '';
              const value = context.raw || '';
              return `${label}: ${value} pcs`;
            },
          },
        },
      },
    });

    const pieData = reactive({
      labels: props.data.labels || [],
      datasets: props.data.datasets || []
    });

    // Watch the prop data to update the chart if needed
    watch(
      () => props.data,
      (newData) => {
        if (!newData || !newData.datasets || !newData.datasets[0]) return;
        pieData.labels = newData.labels;
        pieData.datasets[0].data = newData.datasets[0].data;
      },
      { immediate: true }
    );

    return { pieOptions, pieData };
  },
};
</script>

<style scoped>
.w-full {
  width: 100%;
  height: 400px;
}
</style>
