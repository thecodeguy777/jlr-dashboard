<template>
    <div v-if="modelValue" class="fixed inset-0 bg-black/50 z-50 flex items-end">
        <div class="bg-gray-900 w-full rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-bold">{{ payroll?.id ? 'Edit Payroll Entry' : 'Add Payroll Entry' }}</h2>
                <button @click="$emit('update:modelValue', false)" class="text-white/60 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <form @submit.prevent="handleSubmit" class="space-y-4">
                <!-- Employee Selection -->
                <div>
                    <label class="block text-sm font-medium text-white/60 mb-1">Employee</label>
                    <select v-model="formData.user_id" required
                        class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500">
                        <option value="">Select Employee</option>
                        <option v-for="employee in employees" :key="employee.id" :value="employee.id">
                            {{ employee.full_name }}
                        </option>
                    </select>
                </div>

                <!-- Date -->
                <div>
                    <label class="block text-sm font-medium text-white/60 mb-1">Date</label>
                    <input type="date" v-model="formData.date" required
                        class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500">
                </div>

                <!-- Salary -->
                <div>
                    <label class="block text-sm font-medium text-white/60 mb-1">Salary</label>
                    <input type="number" v-model="formData.salary" required min="0" step="0.01"
                        class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500">
                </div>

                <!-- Deductions -->
                <div>
                    <label class="block text-sm font-medium text-white/60 mb-1">Deductions</label>
                    <input type="number" v-model="formData.deductions" min="0" step="0.01"
                        class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500">
                </div>

                <!-- Notes -->
                <div>
                    <label class="block text-sm font-medium text-white/60 mb-1">Notes</label>
                    <textarea v-model="formData.notes"
                        class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                        rows="3"></textarea>
                </div>

                <!-- Action Buttons -->
                <div class="flex gap-3 pt-4">
                    <button type="submit"
                        class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200">
                        {{ payroll?.id ? 'Update' : 'Save' }}
                    </button>
                    <button v-if="payroll?.id" type="button" @click="handleDelete"
                        class="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200">
                        Delete
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { supabase } from '@/lib/supabase'

const props = defineProps({
    modelValue: Boolean,
    payroll: Object
})

const emit = defineEmits(['update:modelValue', 'save', 'delete'])

const formData = ref({
    user_id: '',
    date: new Date().toISOString().split('T')[0],
    salary: 0,
    deductions: 0,
    notes: ''
})

const employees = ref([])

watch(() => props.payroll, (newPayroll) => {
    if (newPayroll) {
        formData.value = { ...newPayroll }
    } else {
        formData.value = {
            user_id: '',
            date: new Date().toISOString().split('T')[0],
            salary: 0,
            deductions: 0,
            notes: ''
        }
    }
}, { immediate: true })

async function fetchEmployees() {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('id, full_name, position, employee_id')
            .order('full_name')

        if (error) throw error
        employees.value = data
    } catch (error) {
        console.error('Error fetching employees:', error)
    }
}

function handleSubmit() {
    emit('save', { ...formData.value })
}

function handleDelete() {
    if (confirm('Are you sure you want to delete this payroll entry?')) {
        emit('delete', props.payroll)
    }
}

onMounted(() => {
    fetchEmployees()
})
</script>