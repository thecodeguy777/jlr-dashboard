<!-- SummaryCard.vue -->
<template>
    <div :class="`bg-${color}-600 p-6 rounded-xl shadow-lg transition-transform transform hover:scale-105`">
        <div class="flex items-center justify-between">
            <div>
                <h3 class="text-sm uppercase text-white/80">{{ title }}</h3>
                <p class="text-3xl font-bold mt-2">{{ value.toLocaleString() }} pcs</p>
            </div>
            <span class="text-4xl">{{ icon }}</span>
        </div>
    </div>
</template>

<script setup>
defineProps({
    title: String,
    value: Number,
    color: String,
    icon: {
        type: String,
        default: '📦'
    }
})
</script>
