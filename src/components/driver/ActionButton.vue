<template>
  <button
    :disabled="disabled || loading"
    :class="[
      'w-full p-6 rounded-xl border transition-all duration-200',
      'flex items-center gap-4 text-left',
      disabled
        ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
        : variant === 'danger'
        ? 'bg-red-900/20 border-red-500/30 hover:bg-red-900/30 hover:border-red-500/50 active:scale-98'
        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-orange-500/30 active:scale-98'
    ]"
    @click="$emit('click')"
  >
    <div class="text-3xl">{{ loading ? '⏳' : icon }}</div>
    <div class="flex-1">
      <div class="font-semibold text-lg">{{ title }}</div>
      <div class="text-sm text-gray-300 mt-1">{{ subtitle }}</div>
    </div>
    <div v-if="loading" class="animate-spin text-orange-400">
      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  </button>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: 'default',
    validator: value => ['default', 'danger'].includes(value)
  }
})

defineEmits(['click'])
</script> 