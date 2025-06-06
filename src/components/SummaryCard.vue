<!-- SummaryCard.vue -->
<template>
    <div class="bg-white/10 p-4 rounded-2xl shadow" :class="colorClasses">
        <h3 class="text-base font-semibold text-white/80 mb-2 flex items-center gap-2">
            <span v-if="icon">{{ icon }}</span> {{ title }}
        </h3>
        <div class="text-2xl font-bold text-white">
            {{ formattedValue }}
            <span class="text-sm font-normal text-white/70 ml-1">pcs</span>
        </div>
        <slot />
    </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    icon: String,
    title: String,
    value: [Number, String],
    color: String
})

const colorClasses = computed(() => {
    const colors = {
        blue: 'border-l-4 border-blue-500',
        purple: 'border-l-4 border-purple-500',
        green: 'border-l-4 border-green-500',
        red: 'border-l-4 border-red-500',
        yellow: 'border-l-4 border-yellow-500'
    }
    return colors[props.color] || ''
})

const formattedValue = computed(() => {
    const num = Number(props.value) || 0
    return num.toLocaleString()
})
</script>
