<template>
    <div class="min-h-screen text-white p-4 pb-24">
        <h2 class="text-xl font-bold mb-4">My Payroll</h2>
        <div v-for="entry in myPayroll" :key="entry.id" class="bg-white/10 rounded-xl p-4 mb-4">
            <div class="flex justify-between items-center mb-2">
                <div>
                    <div class="text-sm text-white/60">Period</div>
                    <div class="font-semibold">{{ formatPeriod(entry.period || entry.date) }}</div>
                </div>
                <div :class="entry.status === 'Processed' ? 'text-green-400' : 'text-yellow-400'">
                    {{ entry.status || (entry.processed ? 'Processed' : 'Pending') }}
                </div>
            </div>
            <div class="flex justify-between">
                <div>Gross Pay:</div>
                <div>₱{{ (entry.gross || entry.salary || 0).toLocaleString() }}</div>
            </div>
            <div class="flex justify-between">
                <div>Deductions:</div>
                <div>₱{{ (entry.deductions || 0).toLocaleString() }}</div>
            </div>
            <div class="flex justify-between font-bold mt-2">
                <div>Net Pay:</div>
                <div>₱{{ ((entry.gross || entry.salary || 0) - (entry.deductions || 0)).toLocaleString() }}</div>
            </div>
        </div>
        <div v-if="myPayroll.length === 0" class="text-white/40 text-center mt-8">
            No payroll records found.
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'

const myPayroll = ref([
    {
        id: 1,
        period: '2024-01-31',
        gross: 25000,
        deductions: 2000,
        status: 'Processed',
    },
    {
        id: 2,
        period: '2023-12-31',
        gross: 25000,
        deductions: 1800,
        status: 'Processed',
    },
    {
        id: 3,
        period: '2023-11-30',
        gross: 25000,
        deductions: 2100,
        status: 'Processed',
    },
    {
        id: 4,
        period: '2023-10-31',
        gross: 25000,
        deductions: 1700,
        status: 'Pending',
    },
])

function formatPeriod(period) {
    if (!period) return ''
    const date = new Date(period)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
</script>

<style scoped>
/* Add any component-specific styles here */
</style>