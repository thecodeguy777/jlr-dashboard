<template>
    <transition name="modal-fade">
        <div v-if="modelValue" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <transition name="modal-slide">
                <div class="bg-gray-900 border border-white/10 w-full max-w-md rounded-2xl p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-lg font-bold">
                            {{ isEdit ? '✏️ Edit' : '➕ Add' }} Transaction
                        </h2>
                        <button @click="close" class="text-sm text-white/60 hover:text-white">Close</button>
                    </div>

                    <div class="space-y-4">
                        <!-- Type Button Tabs -->
                        <div class="flex space-x-2 mb-4">
                            <button @click="localForm.type = 'expense'" :class="[
                                'flex-1 py-2 rounded font-semibold',
                                localForm.type === 'expense' ? 'bg-red-600 text-white' : 'bg-gray-700 text-white/60'
                            ]">
                                Expense
                            </button>
                            <button @click="localForm.type = 'topup'" :class="[
                                'flex-1 py-2 rounded font-semibold',
                                localForm.type === 'topup' ? 'bg-green-600 text-white' : 'bg-gray-700 text-white/60'
                            ]">
                                Top-up
                            </button>
                        </div>
                        <!-- Category Dropdown -->
                        <div>
                            <label for="category" class="block text-sm mb-1 text-white/70">Category</label>
                            <select id="category" v-model="localForm.category"
                                class="bg-gray-800 text-white w-full p-3 rounded">
                                <option disabled value="">-- Select a category --</option>
                                <option v-for="cat in categoryOptions" :key="cat" :value="cat">
                                    {{ cat }}
                                </option>
                            </select>
                        </div>



                        <!-- Amount -->
                        <div>
                            <input v-model.number="localForm.amount" type="number" placeholder="Amount" :class="[
                                'bg-gray-800 w-full p-3 rounded text-lg',
                                localForm.type === 'topup' ? 'text-green-400' : 'text-red-400'
                            ]" />
                        </div>

                        <!-- Type Selection -->



                        <!-- Note with Autocomplete -->
                        <div class="relative">
                            <textarea
                                v-model="localForm.note"
                                @input="handleNoteInput"
                                @focus="showSuggestions = true"
                                @blur="hideSuggestions"
                                placeholder="Write note (e.g., Estong, Everest)"
                                class="bg-gray-800 text-white w-full p-3 rounded"
                                rows="3">
                            </textarea>

                            <!-- Suggestions Dropdown -->
                            <div v-if="showSuggestions && filteredSuggestions.length > 0"
                                 class="absolute z-10 w-full mt-1 bg-gray-800 border border-white/20 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                <div v-for="suggestion in filteredSuggestions"
                                     :key="suggestion"
                                     @mousedown.prevent="selectSuggestion(suggestion)"
                                     class="px-4 py-2 hover:bg-white/10 cursor-pointer text-white/80 hover:text-white transition-colors text-sm">
                                    {{ suggestion }}
                                </div>
                            </div>
                        </div>

                        <!-- Date Picker -->
                        <div>
                            <input type="date" v-model="localForm.date"
                                class="bg-gray-800 text-white w-full p-3 rounded" />
                        </div>

                        <!-- With Receipt Toggle -->
                        <div class="flex items-center space-x-2">
                            <input type="checkbox" v-model="localForm.withReceipt" class="accent-green-500"
                                id="receipt-toggle" />
                            <label for="receipt-toggle" class="text-sm">With Receipt</label>
                        </div>

                        <!-- Action Buttons -->
                        <div class="space-y-2 pt-2">
                            <button @click="handleSave"
                                class="w-full py-3 rounded bg-green-600 hover:bg-green-700 text-white font-semibold">
                                {{ isEdit ? 'Update' : 'Save' }}
                            </button>

                            <button v-if="isEdit" @click="handleDelete"
                                class="w-full py-3 rounded bg-red-600 hover:bg-red-700 text-white font-semibold">
                                🗑️ Delete
                            </button>
                        </div>

                    </div>


                </div>
            </transition>
        </div>
    </transition>
</template>
<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

// Props from parent
const props = defineProps({
    modelValue: Boolean,
    transaction: Object,
    expenseCategories: Array,
    topupCategories: Array,
    currentDate: String, // Currently selected date from parent
    onSave: Function,
    onDelete: Function
})

// Emits
const emit = defineEmits(['update:modelValue', 'save', 'delete'])

// Is this edit mode?
const isEdit = computed(() => !!props.transaction?.id)

// Default form structure
const defaultForm = () => ({
    amount: 0,
    category: '',
    note: '',
    date: props.currentDate || new Date().toISOString().split('T')[0],
    type: 'expense',
    withReceipt: false
})

// Reactive local form
const localForm = ref(defaultForm())

// Autocomplete suggestions
const allSuggestions = ref([])
const showSuggestions = ref(false)
const filteredSuggestions = computed(() => {
    if (!localForm.value.note || localForm.value.note.length < 1) {
        return allSuggestions.value.slice(0, 10) // Show top 10 when empty
    }

    const searchTerm = localForm.value.note.toLowerCase()
    return allSuggestions.value
        .filter(s => s.toLowerCase().includes(searchTerm))
        .slice(0, 10) // Limit to 10 suggestions
})

// Watch for incoming transaction prop to preload form
watch(
    () => props.transaction,
    (newVal) => {
        localForm.value = newVal ? { ...defaultForm(), ...newVal } : defaultForm()
    },
    { immediate: true }
)

// Dynamically return category options based on type
const categoryOptions = computed(() => {
    return localForm.value.type === 'topup'
        ? props.topupCategories
        : props.expenseCategories
})

// Convert camelCase to snake_case payload for Supabase
function toSnakeCasePayload() {
    const { withReceipt, ...rest } = localForm.value
    return {
        ...rest,
        with_receipt: withReceipt
    }
}

// Fetch unique notes from database for autocomplete
async function fetchNoteSuggestions() {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('note')
            .not('note', 'is', null)
            .not('note', 'eq', '')

        if (error) {
            console.error('[TransactionActions] Error fetching suggestions:', error)
            return
        }

        // Get unique notes and sort by frequency
        const noteCounts = {}
        data.forEach(t => {
            const note = t.note.trim()
            if (note) {
                noteCounts[note] = (noteCounts[note] || 0) + 1
            }
        })

        // Sort by frequency (most used first)
        allSuggestions.value = Object.keys(noteCounts)
            .sort((a, b) => noteCounts[b] - noteCounts[a])

    } catch (err) {
        console.error('[TransactionActions] Unexpected error:', err)
    }
}

// Autocomplete handlers
function handleNoteInput() {
    showSuggestions.value = true
}

function selectSuggestion(suggestion) {
    localForm.value.note = suggestion
    showSuggestions.value = false
}

function hideSuggestions() {
    // Delay to allow click event to fire
    setTimeout(() => {
        showSuggestions.value = false
    }, 200)
}

// Event handlers
function handleSave() {
    emit('save', toSnakeCasePayload())
    close()
}

function handleDelete() {
    emit('delete', toSnakeCasePayload())
    close()
}

function close() {
    emit('update:modelValue', false)
}

// Fetch suggestions on mount
onMounted(() => {
    fetchNoteSuggestions()
})
</script>
