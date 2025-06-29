<script setup>
import { ref } from 'vue'
import ReturnsForm from '../components/ReturnsForm.vue'

// Demo states
const showModal = ref(false)
const activeTab = ref('buttons')
const demoSwitch = ref(false)

// Demo data
const colorSchemes = [
    { name: 'Purple', base: 'purple', textLight: 'purple-400', bgLight: 'purple-500/10', bgSolid: 'purple-500' },
    { name: 'Blue', base: 'blue', textLight: 'blue-400', bgLight: 'blue-500/10', bgSolid: 'blue-500' },
    { name: 'Red', base: 'red', textLight: 'red-400', bgLight: 'red-500/10', bgSolid: 'red-500' },
    { name: 'Green', base: 'green', textLight: 'green-400', bgLight: 'green-500/10', bgSolid: 'green-500' }
]

const demoCards = [
    { title: 'Total Returns', value: '156 pcs', change: '+12%', color: 'red' },
    { title: 'Total Repairs', value: '43 pcs', change: '-5%', color: 'blue' },
    { title: 'Labor Cost', value: '₱12,450', change: '+8%', color: 'purple' }
]
</script>

<template>
    <div class="min-h-screen bg-gray-900 p-6">
        <ReturnsForm v-if="showModal" @close="showModal = false" />

        <!-- Header -->
        <div class="bg-gray-800 rounded-xl p-6 shadow-lg mb-8">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold text-white">Component Showcase</h1>
                    <p class="text-gray-400">A collection of reusable UI components and patterns</p>
                </div>
                <button @click="showModal = true"
                    class="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors">
                    Open Demo Modal
                </button>
            </div>
        </div>

        <!-- Navigation -->
        <div class="flex gap-2 mb-6 border-b border-gray-700">
            <button v-for="tab in ['buttons', 'cards', 'forms', 'modals']" :key="tab" @click="activeTab = tab"
                class="px-4 py-2 text-sm font-medium transition-all relative -mb-px" :class="[
                    activeTab === tab
                        ? 'text-purple-400 border-b-2 border-purple-400'
                        : 'text-gray-400 border-b-2 border-transparent hover:text-white'
                ]">
                {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
            </button>
        </div>

        <!-- Content -->
        <div class="space-y-8">
            <!-- Color Schemes -->
            <section class="bg-gray-800/50 rounded-xl p-6 space-y-4">
                <h2 class="text-lg font-semibold text-white mb-4">Color Schemes</h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div v-for="scheme in colorSchemes" :key="scheme.name" class="bg-gray-800 rounded-lg p-4 space-y-3">
                        <h3 class="font-medium text-white">{{ scheme.name }}</h3>
                        <div class="space-y-2">
                            <div :class="`text-${scheme.textLight}`">Text Color</div>
                            <div :class="`bg-${scheme.bgLight} p-2 rounded`">Background Light</div>
                            <div :class="`bg-${scheme.bgSolid} p-2 rounded text-white`">Background Solid</div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Cards -->
            <section class="bg-gray-800/50 rounded-xl p-6 space-y-4">
                <h2 class="text-lg font-semibold text-white mb-4">Card Patterns</h2>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div v-for="card in demoCards" :key="card.title"
                        :class="`bg-${card.color}-500/10 rounded-lg p-4 border border-${card.color}-500/20`">
                        <div class="text-gray-400 text-sm">{{ card.title }}</div>
                        <div class="text-white text-2xl font-bold mt-1">{{ card.value }}</div>
                        <div :class="`text-${card.color}-400 text-sm mt-2`">{{ card.change }} from last week</div>
                    </div>
                </div>
            </section>

            <!-- Form Elements -->
            <section class="bg-gray-800/50 rounded-xl p-6 space-y-4">
                <h2 class="text-lg font-semibold text-white mb-4">Form Elements</h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <!-- Inputs -->
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-1">Text Input</label>
                            <div class="relative">
                                <input type="text" placeholder="Enter text..."
                                    class="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-3 py-2 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800" />
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-1">Select Input</label>
                            <select
                                class="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800">
                                <option value="">Select an option</option>
                                <option value="1">Option 1</option>
                                <option value="2">Option 2</option>
                                <option value="3">Option 3</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-1">Toggle Switch</label>
                            <button @click="demoSwitch = !demoSwitch"
                                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
                                :class="demoSwitch ? 'bg-purple-500' : 'bg-gray-600'">
                                <span class="sr-only">Toggle switch</span>
                                <span
                                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
                                    :class="demoSwitch ? 'translate-x-6' : 'translate-x-1'"></span>
                            </button>
                        </div>
                    </div>

                    <!-- Buttons -->
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Button Styles</label>
                            <div class="flex flex-wrap gap-2">
                                <button
                                    class="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors">
                                    Primary
                                </button>
                                <button
                                    class="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors">
                                    Secondary
                                </button>
                                <button
                                    class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                                    Danger
                                </button>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Button with Icon</label>
                            <button
                                class="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Add New</span>
                            </button>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Ghost Button</label>
                            <button
                                class="px-4 py-2 border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors">
                                Ghost Style
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>

<style scoped>
/* Smooth transitions */
.transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Input focus styles */
input:focus,
select:focus,
textarea:focus {
    box-shadow: 0 0 0 2px var(--tw-ring-color);
}

/* Button hover effect */
button:not(:disabled):hover {
    transform: translateY(-1px);
}

button:not(:disabled):active {
    transform: translateY(0);
}
</style>