<template>
  <VChart class="h-80 w-full" :option="options" autoresize />
</template>

<script setup>
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
  TitleComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

use([
  CanvasRenderer,
  PieChart,
  TooltipComponent,
  LegendComponent,
  TitleComponent
])

const props = defineProps({
  data: {
    type: Object,
    required: true
  }
})

const options = computed(() => ({
  title: {
    text: 'Deliveries by Product',
    left: 'center',
    textStyle: { color: 'white', fontSize: 16 }
  },
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} pcs ({d}%)'
  },
  legend: {
    bottom: 10,
    left: 'center',
    textStyle: { color: '#ccc' }
  },
  series: [
    {
      name: 'Products',
      type: 'pie',
      radius: '65%',
      center: ['50%', '50%'],
      data: props.data.labels.map((label, index) => ({
        value: props.data.datasets[0].data[index],
        name: label
      })),
      label: {
        color: '#fff', // sets label text to white
        fontSize: 12,
        fontWeight: 'normal',
        borderWidth: 0, // removes border
        borderColor: 'transparent' // optional fallback
      },
      itemStyle: {
        borderColor: '#1a1a1a',
        borderWidth: 0
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }
  ]
}))
</script>
