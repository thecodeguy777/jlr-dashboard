<template>
    <div class="min-h-screen text-white">
        <!-- Tab Bar -->
        <div class="flex justify-around border-b border-white/20 text-sm text-white/70">
            <button v-for="tab in tabs" :key="tab" @click="activeTab = tab" :class="[
                'flex-1 py-4 text-center font-semibold transition',
                activeTab === tab ? 'border-b-2 border-green-400 text-white' : ''
            ]">
                {{ tab }}
            </button>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
            <component :is="currentComponent" />
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Tab labels
const tabs = ['Generate Payroll', 'Bodega Stock']
const activeTab = ref('Generate Payroll')

// Components
import GeneratePayrollView from '../components/GeneratePayrollView.vue'
import BodegaStockView from '../components/BodegaStockView.vue'

const tabMap = {
    'Generate Payroll': GeneratePayrollView,
    'Bodega Stock': BodegaStockView
}

const currentComponent = computed(() => tabMap[activeTab.value])
</script>
