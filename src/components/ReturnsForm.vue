<script setup>
import { ref, computed, watch } from 'vue'
import { supabase } from '@/lib/supabase'

const props = defineProps({
    delivery_id: {
        type: String,
        required: false,
        default: null
    },
    worker_id: {
        type: String,
        required: false,
        default: null
    },
    product_id: {
        type: String,
        required: false,
        default: null
    }
})

const emit = defineEmits(['close', 'saved'])

// Form data
const formData = ref({
    quantity: 0,
    reason: '',
    type: 'return', // return, repair, transform
    status: 'pending',
    notes: '',
    labor_cost: 0,
    labor_cost_per_piece: 0.5,
    source_product_id: props.product_id,
    target_product_id: null,
    repair_worker_id: null
})

// Show/hide sections based on type
const showRepairFields = computed(() => formData.value.type === 'repair')
const showModifyFields = computed(() => formData.value.type === 'transform')
const showScrapFields = computed(() => formData.value.type === 'scrap')

// Computed total labor cost
const totalLaborCost = computed(() => {
    if (formData.value.type === 'repair' || formData.value.type === 'transform') {
        return formData.value.quantity * formData.value.labor_cost_per_piece
    }
    return 0
})

// Watch quantity and labor_cost_per_piece to update total
watch([
    () => formData.value.quantity,
    () => formData.value.labor_cost_per_piece
], () => {
    if (formData.value.type === 'repair' || formData.value.type === 'transform') {
        formData.value.labor_cost = totalLaborCost.value
    }
})

// Available workers for repair
const repairWorkers = ref([])
const targetProducts = ref([])
const selectedProduct = ref(null)

// Load workers and products
async function loadData() {
    try {
        const [workersResult, productsResult] = await Promise.all([
            supabase.from('workers').select('id, name').eq('is_active', true),
            supabase.from('products').select('id, name, category')
        ])

        if (workersResult.error) throw workersResult.error
        if (productsResult.error) throw productsResult.error

        repairWorkers.value = workersResult.data
        targetProducts.value = productsResult.data

        // If we have a product_id, find it in the loaded products
        if (props.product_id) {
            selectedProduct.value = targetProducts.value.find(p => p.id === props.product_id) || null
        }
    } catch (error) {
        console.error('Error loading data:', error)
    }
}

// Watch for product_id changes
watch(() => props.product_id, (newId) => {
    if (newId) {
        selectedProduct.value = targetProducts.value.find(p => p.id === newId) || null
        formData.value.source_product_id = newId
    } else {
        selectedProduct.value = null
        formData.value.source_product_id = null
    }
})

// Save return record
async function saveReturn() {
    try {
        // Validate required fields
        if (!formData.value.quantity || formData.value.quantity <= 0) {
            throw new Error('Please enter a valid quantity')
        }

        if (!formData.value.reason) {
            throw new Error('Please provide a reason')
        }

        // For transform type, validate both products
        if (formData.value.type === 'transform') {
            if (!formData.value.source_product_id) {
                throw new Error('Please select source product')
            }
            if (!formData.value.target_product_id) {
                throw new Error('Please select target product')
            }
            if (!formData.value.repair_worker_id) {
                throw new Error('Please select a worker')
            }
        }

        // For repair type, validate worker
        if (formData.value.type === 'repair' && !formData.value.repair_worker_id) {
            throw new Error('Please select a repair worker')
        }

        const saveData = {
            quantity: formData.value.quantity,
            reason: formData.value.reason,
            type: formData.value.type,
            status: formData.value.status,
            notes: formData.value.notes,
            labor_cost: (formData.value.type === 'repair' || formData.value.type === 'transform') ?
                formData.value.quantity * formData.value.labor_cost_per_piece : null,
            labor_cost_per_piece: (formData.value.type === 'repair' || formData.value.type === 'transform') ?
                formData.value.labor_cost_per_piece : null,
            target_product_id: formData.value.type === 'transform' ? formData.value.target_product_id : null,
            repair_worker_id: (formData.value.type === 'repair' || formData.value.type === 'transform') ?
                formData.value.repair_worker_id : null
        }

        // Only add IDs if they exist
        if (props.worker_id) saveData.worker_id = props.worker_id
        if (formData.value.type === 'transform' ? formData.value.source_product_id : props.product_id) {
            saveData.product_id = formData.value.type === 'transform' ? formData.value.source_product_id : props.product_id
        }
        if (props.delivery_id) saveData.delivery_id = props.delivery_id

        console.log('Saving return:', saveData)

        const { data, error } = await supabase
            .from('returns')
            .insert(saveData)

        if (error) throw error

        emit('saved', data)
        emit('close')
    } catch (error) {
        console.error('Error saving return:', error)
        alert(error.message || 'Failed to save return. Please try again.')
    }
}

// Load data on mount
loadData()
</script>

<template>
    <Transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0"
        enter-to-class="opacity-100" leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 scale-95"
                enter-to-class="opacity-100 scale-100" leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
                <div
                    class="bg-gray-800 rounded-xl w-full max-w-lg flex flex-col max-h-[90vh] shadow-2xl shadow-purple-500/10">
                    <!-- Header - Fixed -->
                    <div class="p-4 border-b border-gray-700 flex-shrink-0">
                        <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                            <span class="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                                </svg>
                            </span>
                            Record Return/Repair
                        </h2>
                        <p class="text-sm text-gray-400 mt-1 ml-10">{{ selectedProduct?.name }} - {{
                            selectedProduct?.category }}</p>
                    </div>

                    <!-- Tabs - Fixed -->
                    <div class="border-b border-gray-700 flex-shrink-0">
                        <div class="flex gap-1">
                            <button v-for="type in ['return', 'repair', 'transform']" :key="type"
                                @click="formData.type = type"
                                class="relative px-4 py-2 text-sm font-medium transition-all duration-200 group" :class="[
                                    formData.type === type
                                        ? 'text-white'
                                        : 'text-gray-400 hover:text-white'
                                ]">
                                <span class="relative z-10">{{ type.charAt(0).toUpperCase() + type.slice(1) }}</span>
                                <div class="absolute inset-0 rounded-t-lg transition-all duration-200" :class="[
                                    formData.type === type
                                        ? type === 'return' ? 'bg-red-500/10' : type === 'repair' ? 'bg-blue-500/10' : 'bg-purple-500/10'
                                        : 'bg-transparent group-hover:bg-white/5'
                                ]"></div>
                                <div class="absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-200" :class="[
                                    formData.type === type
                                        ? type === 'return' ? 'bg-red-500' : type === 'repair' ? 'bg-blue-500' : 'bg-purple-500'
                                        : 'bg-transparent'
                                ]"></div>
                            </button>
                        </div>
                    </div>

                    <!-- Content - Scrollable -->
                    <div class="flex-1 overflow-y-auto p-4 space-y-4 relative">
                        <!-- Basic Fields -->
                        <div class="space-y-4">
                            <div class="group">
                                <label class="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
                                <div class="relative">
                                    <input type="number" v-model="formData.quantity"
                                        class="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-3 py-2 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800"
                                        :class="[
                                            formData.type === 'return' ? 'focus:ring-red-500' :
                                                formData.type === 'repair' ? 'focus:ring-blue-500' : 'focus:ring-purple-500'
                                        ]" />
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg class="w-5 h-5 transition-colors duration-200" :class="[
                                            formData.type === 'return' ? 'text-red-400' :
                                                formData.type === 'repair' ? 'text-blue-400' : 'text-purple-400'
                                        ]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div class="group">
                                <label class="block text-sm font-medium text-gray-300 mb-1">Reason</label>
                                <div class="relative">
                                    <textarea v-model="formData.reason"
                                        class="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-3 py-2 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800"
                                        :class="[
                                            formData.type === 'return' ? 'focus:ring-red-500' :
                                                formData.type === 'repair' ? 'focus:ring-blue-500' : 'focus:ring-purple-500'
                                        ]" rows="2"></textarea>
                                    <div class="absolute top-2 left-0 pl-3 flex items-start pointer-events-none">
                                        <svg class="w-5 h-5 transition-colors duration-200" :class="[
                                            formData.type === 'return' ? 'text-red-400' :
                                                formData.type === 'repair' ? 'text-blue-400' : 'text-purple-400'
                                        ]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Dynamic Section -->
                        <Transition enter-active-class="transition-all duration-300 ease-out"
                            enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0"
                            leave-active-class="transition-all duration-200 ease-in"
                            leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-4">
                            <!-- Modify Fields -->
                            <div v-if="showModifyFields"
                                class="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50 space-y-4">
                                <h3 class="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    Transform Products
                                </h3>

                                <!-- Product Selection -->
                                <div class="grid grid-cols-3 gap-3 items-center">
                                    <div>
                                        <div class="text-xs text-gray-400 mb-1">From</div>
                                        <select v-model="formData.source_product_id"
                                            class="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800">
                                            <option value="">Select Product</option>
                                            <option v-for="product in targetProducts" :key="product.id"
                                                :value="product.id">
                                                {{ product.name }}
                                            </option>
                                        </select>
                                    </div>
                                    <div class="flex justify-center">
                                        <svg class="w-5 h-5 text-purple-400 animate-pulse" fill="none"
                                            stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div class="text-xs text-gray-400 mb-1">To</div>
                                        <select v-model="formData.target_product_id"
                                            class="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800">
                                            <option value="">Select Product</option>
                                            <option v-for="product in targetProducts" :key="product.id"
                                                :value="product.id">
                                                {{ product.name }}
                                            </option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Worker and Labor -->
                                <div>
                                    <div class="text-xs text-gray-400 mb-1">Assigned Worker</div>
                                    <select v-model="formData.repair_worker_id"
                                        class="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800">
                                        <option value="">Select Worker</option>
                                        <option v-for="worker in repairWorkers" :key="worker.id" :value="worker.id">
                                            {{ worker.name }}
                                        </option>
                                    </select>
                                </div>

                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <div class="text-xs text-gray-400 mb-1">Labor Cost Per Piece</div>
                                        <div class="relative">
                                            <span class="absolute left-3 top-2 text-xs text-gray-400">₱</span>
                                            <input type="number" v-model="formData.labor_cost_per_piece" step="0.1"
                                                class="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-7 pr-3 py-2 text-sm text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800" />
                                        </div>
                                    </div>
                                    <div>
                                        <div class="text-xs text-gray-400 mb-1">Total Labor Cost</div>
                                        <div
                                            class="bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2 text-sm">
                                            <span class="text-purple-400">₱{{ totalLaborCost.toFixed(2) }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Repair Fields -->
                            <div v-else-if="showRepairFields"
                                class="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50 space-y-4">
                                <h3 class="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                    </svg>
                                    Repair Details
                                </h3>

                                <div>
                                    <div class="text-xs text-gray-400 mb-1">Repair Worker</div>
                                    <select v-model="formData.repair_worker_id"
                                        class="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800">
                                        <option value="">Select Worker</option>
                                        <option v-for="worker in repairWorkers" :key="worker.id" :value="worker.id">
                                            {{ worker.name }}
                                        </option>
                                    </select>
                                </div>

                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <div class="text-xs text-gray-400 mb-1">Labor Cost Per Piece</div>
                                        <div class="relative">
                                            <span class="absolute left-3 top-2 text-xs text-gray-400">₱</span>
                                            <input type="number" v-model="formData.labor_cost_per_piece" step="0.1"
                                                class="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-7 pr-3 py-2 text-sm text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800" />
                                        </div>
                                    </div>
                                    <div>
                                        <div class="text-xs text-gray-400 mb-1">Total Labor Cost</div>
                                        <div
                                            class="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-sm">
                                            <span class="text-blue-400">₱{{ totalLaborCost.toFixed(2) }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Transition>

                        <!-- Notes -->
                        <div>
                            <label class="block text-xs font-medium text-gray-400 mb-1">Additional Notes</label>
                            <div class="relative">
                                <textarea v-model="formData.notes"
                                    class="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-3 py-2 text-sm text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800"
                                    :class="[
                                        formData.type === 'return' ? 'focus:ring-red-500' :
                                            formData.type === 'repair' ? 'focus:ring-blue-500' : 'focus:ring-purple-500'
                                    ]" rows="2"></textarea>
                                <div class="absolute top-2 left-0 pl-3 flex items-start pointer-events-none">
                                    <svg class="w-5 h-5 transition-colors duration-200" :class="[
                                        formData.type === 'return' ? 'text-red-400' :
                                            formData.type === 'repair' ? 'text-blue-400' : 'text-purple-400'
                                    ]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer - Fixed -->
                    <div class="p-4 border-t border-gray-700 flex justify-end gap-3 flex-shrink-0">
                        <button @click="emit('close')"
                            class="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors duration-200">
                            Cancel
                        </button>
                        <button @click="saveReturn"
                            class="px-6 py-2 text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800"
                            :class="[
                                formData.type === 'return'
                                    ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
                                    : formData.type === 'repair'
                                        ? 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'
                                        : 'bg-purple-500 hover:bg-purple-600 focus:ring-purple-500'
                            ]">
                            Save
                        </button>
                    </div>
                </div>
            </Transition>
        </div>
    </Transition>
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