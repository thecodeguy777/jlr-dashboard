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
            <Suspense>
                <template #default>
                    <component :is="currentComponent" />
                </template>
                <template #fallback>
                    <div class="text-center py-8 text-gray-400">
                        <div class="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent rounded-full"
                            role="status" aria-label="loading">
                            <span class="sr-only">Loading...</span>
                        </div>
                        <div class="mt-2">Loading...</div>
                    </div>
                </template>
            </Suspense>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Tab labels
const tabs = ['Generate Payroll', 'Bodega Stock']
const activeTab = ref('Generate Payroll')

// Components
import GeneratePayrollView from './GeneratePayrollView.vue'
import BodegaStockView from '../components/BodegaStockView.vue'

const tabMap = {
    'Generate Payroll': GeneratePayrollView,
    'Bodega Stock': BodegaStockView
}

const currentComponent = computed(() => tabMap[activeTab.value])
</script>

<style scoped>
.flex-1 {
    min-width: fit-content;
    padding-left: 1rem;
    padding-right: 1rem;
}
</style>
