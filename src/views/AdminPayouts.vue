<template>
  <div class="min-h-screen bg-gray-900 text-white p-6 space-y-6">
    <h1 class="text-2xl font-bold">💸 Weekly Payroll</h1>

    <button @click="generatePayroll"
      class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded shadow">
      ➕ Generate Payroll for the Week
    </button>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div v-for="(payout, index) in payouts" :key="index" class="bg-white/10 rounded-xl p-4 shadow space-y-2">
        <div class="flex justify-between items-center">
          <h2 class="font-semibold text-lg">{{ payout.name }}</h2>
          <span :class="[
            'px-2 py-1 rounded text-xs font-medium',
            payout.status === 'paid'
              ? 'bg-green-600 text-white'
              : 'bg-yellow-500 text-black'
          ]">
            {{ payout.status }}
          </span>
        </div>

        <div class="text-sm">
          <div class="flex justify-between text-white/80">
            <span>Gross</span>
            <span>₱{{ payout.delivered * ratePerBox }}</span>
          </div>
          <div class="flex justify-between text-yellow-300">
            <span>Deduction</span>
            <span>-₱{{ payout.prevBodega * ratePerBox }}</span>
          </div>
          <div class="flex justify-between text-green-400 font-semibold">
            <span>Net Pay</span>
            <span>₱{{ payout.amount }}</span>
          </div>
        </div>

        <div class="text-xs text-white/50">
          Confirmed: {{ payout.date || '—' }}
        </div>

        <div class="mt-2">
          <button v-if="payout.status !== 'paid'" @click="markAsPaid(index)"
            class="w-full bg-green-600 hover:bg-green-700 py-1.5 rounded text-sm font-medium">
            ✅ Mark as Paid
          </button>
          <span v-else class="block text-center text-green-400 text-sm font-medium">
            ✓ Confirmed
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const employees = [
  { name: 'Joper', delivered: 120, prevBodega: 10 },
  { name: 'Mhar', delivered: 105, prevBodega: 8 },
  { name: 'Bong', delivered: 130, prevBodega: 12 },
  { name: 'Ronald', delivered: 110, prevBodega: 0 }
]

const ratePerBox = 50
const payouts = ref([])

function generatePayroll() {
  payouts.value = employees.map(emp => {
    const net = emp.delivered - emp.prevBodega
    return {
      name: emp.name,
      delivered: emp.delivered,
      prevBodega: emp.prevBodega,
      net,
      amount: net * ratePerBox,
      status: 'pending',
      date: null
    }
  })
}

function markAsPaid(index) {
  const now = new Date()
  const formatted = now.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  payouts.value[index].status = 'paid'
  payouts.value[index].date = formatted
}
</script>
