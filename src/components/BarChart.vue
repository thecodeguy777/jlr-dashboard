<template>
  <VChart class="h-80 w-full" :option="options" autoresize />
</template>

<script setup>
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
])

const props = defineProps({
  data: {
    type: Object,
    required: true
  }
})

const options = computed(() => ({
  title: {
    text: 'Deliveries by Worker',
    left: 'center',
    textStyle: { color: '#fff', fontSize: 16 }
  },
  tooltip: {
    trigger: 'axis'
  },
  xAxis: {
    type: 'category',
    data: props.data.labels,
    axisLabel: { color: '#aaa' },
    axisLine: { lineStyle: { color: '#555' } }
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: '#aaa' },
    splitLine: { lineStyle: { color: '#333' } }
  },
  grid: { top: 60, bottom: 40, left: 40, right: 20 },
  series: [
    {
      name: 'Deliveries',
      type: 'bar',
      data: props.data.datasets[0].data,
      itemStyle: { color: '#22c55e' },
      barWidth: '50%'
    }
  ]
}))
</script>
