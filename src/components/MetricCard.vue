<template>
  <div class="p-4 rounded-xl shadow hover:shadow-lg transition" :class="{
    'bg-blue-900/30 border-blue-400': color === 'blue',
    'bg-green-900/30 border-green-400': color === 'green',
    'bg-yellow-900/30 border-yellow-400': color === 'yellow',
    'bg-white/10 border-white/10': !color
  }">
    <h3 class="text-sm uppercase tracking-wide text-white/70 mb-1">
      {{ title }}
    </h3>
    <p class="text-2xl font-bold text-white">
      <span v-if="prefix">{{ prefix }}</span>{{ formattedValue }}<span v-if="suffix"> {{ suffix }}</span>
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: String,
  value: [String, Number],
  suffix: String,
  prefix: String,
  color: String
})

const formattedValue = computed(() => {
  const val = props.value
  if (typeof val === 'number') return val.toLocaleString()
  if (!isNaN(val)) return Number(val).toLocaleString()
  return val
})
</script>
