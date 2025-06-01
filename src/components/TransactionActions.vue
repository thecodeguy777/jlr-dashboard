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
                        <input v-model="localForm.category" list="category-options" type="text" placeholder="Category"
                            class="bg-gray-800 text-white w-full p-3 rounded" />
                        <datalist id="category-options">
                            <option v-for="cat in categories" :key="cat" :value="cat" />
                        </datalist>

                        <input v-model.number="localForm.amount" type="number" placeholder="Amount" :class="[
                            'bg-gray-800 w-full p-3 rounded text-lg',
                            localForm.type === 'topup' ? 'text-green-400' : 'text-red-400'
                        ]" />

                        <select v-model="localForm.type" class="bg-gray-800 text-white w-full p-3 rounded">
                            <option value="expense">Expense</option>
                            <option value="topup">Top-up</option>
                        </select>

                        <textarea v-model="localForm.note" placeholder="Write note"
                            class="bg-gray-800 text-white w-full p-3 rounded"></textarea>

                        <input type="date" v-model="localForm.date" class="bg-gray-800 text-white w-full p-3 rounded" />

                        <label class="inline-flex items-center space-x-2">
                            <input type="checkbox" v-model="localForm.withReceipt" class="accent-green-500" />
                            <span class="text-sm">With Receipt</span>
                        </label>

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
            </transition>
        </div>
    </transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
    modelValue: Boolean,
    transaction: Object,
    categories: Array,
    onSave: Function,
    onDelete: Function
})

const emit = defineEmits(['update:modelValue', 'save', 'delete'])

const isEdit = computed(() => !!props.transaction)

const defaultForm = () => ({
    amount: 0,
    category: '',
    note: '',
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    withReceipt: false
})

const localForm = ref(defaultForm())

watch(
    () => props.transaction,
    (newVal) => {
        localForm.value = newVal ? { ...defaultForm(), ...newVal } : defaultForm()
    },
    { immediate: true }
)

function toSnakeCasePayload() {
    const { withReceipt, ...rest } = localForm.value
    return {
        ...rest,
        with_receipt: withReceipt
    }
}

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
</script>
