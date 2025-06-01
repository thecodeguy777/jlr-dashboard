<script setup>
import { ref, computed, onMounted } from 'vue'
import MetricCard from '../components/MetricCard.vue'
import DeliveryBarChart from '../components/BarChart.vue'
import ProductPieChart from '../components/ProductPieChart.vue'
import DeliveryTable from '../components/DeliveryTable.vue'
import { supabase } from '../lib/supabase'

const level = ref('weekly')
const deliveryDate = ref(getCurrentDate())
const isLoading = ref(true)

const subconDeliveries = ref([])

function getCurrentDate() {
    const today = new Date()
    return today.toISOString().split('T')[0]
}

function formatDate(date) {
    return new Date(date).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
    })
}

const selectedDate = computed(() => new Date(deliveryDate.value))

const weekStart = computed(() => {
    const date = new Date(selectedDate.value)
    const start = new Date(date)
    start.setDate(date.getDate() - date.getDay())
    start.setHours(0, 0, 0, 0)
    return start
})

const weekEnd = computed(() => {
    const end = new Date(weekStart.value)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return end
})

const monthStart = computed(() => new Date(selectedDate.value.getFullYear(), selectedDate.value.getMonth(), 1))

const monthEnd = computed(() => {
    const end = new Date(selectedDate.value.getFullYear(), selectedDate.value.getMonth() + 1, 1)
    end.setMilliseconds(-1)
    return end
})

onMounted(async () => {
    const { data, error } = await supabase
        .from('subcon_deliveries')
        .select('*, products(*), subcontractors(*)')

    if (!error) subconDeliveries.value = data
    isLoading.value = false
})

const filteredDeliveries = computed(() => {
    let results = Array.isArray(subconDeliveries.value) ? subconDeliveries.value : []

    if (level.value === 'weekly') {
        results = results.filter(d => {
            const date = new Date(d.delivery_date)
            return date >= weekStart.value && date <= weekEnd.value
        })
    } else if (level.value === 'monthly') {
        results = results.filter(d => {
            const date = new Date(d.delivery_date)
            return date >= monthStart.value && date <= monthEnd.value
        })
    } else {
        results = results.filter(d => d.delivery_date === deliveryDate.value)
    }

    return results
})

const totalQuantity = computed(() =>
    filteredDeliveries.value.reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const totalGross = computed(() =>
    filteredDeliveries.value.reduce((sum, d) => {
        const price = d.price_snapshot ?? 0
        return sum + (d.quantity || 0) * price
    }, 0)
)

const singleWalledTotal = computed(() =>
    filteredDeliveries.value.filter(d => d.products?.category === 'Single Walled')
        .reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const doubleWalledTotal = computed(() =>
    filteredDeliveries.value.filter(d => d.products?.category === 'Double Walled')
        .reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const barChartData = computed(() => {
    const map = {}
    filteredDeliveries.value.forEach(d => {
        const name = d.subcontractors?.name || 'Unknown'
        map[name] = (map[name] || 0) + d.quantity
    })

    return {
        labels: Object.keys(map),
        datasets: [
            {
                label: 'Total Delivered',
                data: Object.values(map),
                backgroundColor: 'rgba(16, 185, 129, 0.5)',
                borderColor: 'rgba(5, 150, 105, 1)',
                borderWidth: 1
            }
        ]
    }
})

const pieChartData = computed(() => {
    const map = {}
    filteredDeliveries.value.forEach(d => {
        const name = d.products?.name || 'Unknown'
        map[name] = (map[name] || 0) + d.quantity
    })

    return {
        labels: Object.keys(map),
        datasets: [
            {
                data: Object.values(map),
                backgroundColor: Object.keys(map).map((_, i) => `hsl(${i * 47 % 360}, 70%, 60%)`)
            }
        ]
    }
})

const groupedDeliveries = computed(() => {
    const map = {}
    filteredDeliveries.value.forEach(d => {
        const date = d.delivery_date || 'Unknown'
        if (!map[date]) map[date] = []
        map[date].push(d)
    })
    return map
})
</script>


<template>
    <div class="px-6 pt-6 pb-24 space-y-8 xl:space-y-12">
        <div v-if="isLoading" class="text-white text-center py-10 text-lg italic">
            Loading subcontractor deliveries...
        </div>

        <div v-else class="space-y-8 xl:space-y-12">
            <!-- Tabs -->
            <div class="flex space-x-4 text-white text-sm mb-4">
                <button v-for="option in ['monthly', 'weekly', 'daily']" :key="option" :class="[
                    'px-4 py-2 rounded-full transition-all',
                    level === option
                        ? 'bg-green-500 text-white font-semibold'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                ]" @click="level = option">
                    {{ option.charAt(0).toUpperCase() + option.slice(1) }}
                </button>
            </div>

            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-bold text-white">
                        Subcontractor Report –
                        <span v-if="level === 'weekly'">
                            {{ formatDate(weekStart) }} to {{ formatDate(weekEnd) }}
                        </span>
                        <span v-else-if="level === 'monthly'">
                            {{ formatDate(monthStart) }} to {{ formatDate(monthEnd) }}
                        </span>
                        <span v-else>{{ formatDate(deliveryDate) }}</span>
                    </h1>
                </div>
                <input type="date" v-model="deliveryDate"
                    class="bg-white/10 text-white px-4 py-2 rounded-md border border-white/20" />
            </div>

            <!-- Metrics Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title="Total Deliveries" :value="totalQuantity" suffix=" pcs" color="green" />
                <MetricCard title="Single-Walled Total" :value="singleWalledTotal" suffix=" pcs" color="green" />
                <MetricCard title="Double-Walled Total" :value="doubleWalledTotal" suffix=" pcs" color="green" />
                <MetricCard title="Gross Value" :value="Math.round(totalGross)" prefix="₱" color="green" />


            </div>

            <!-- Charts -->
            <div class="rounded-2xl bg-green-900/10 p-6 xl:p-8">
                <DeliveryBarChart :data="barChartData" />
            </div>
            <div class="rounded-2xl bg-green-900/10 p-6 xl:p-8">
                <ProductPieChart :data="pieChartData" />
            </div>


            <!-- Grouped Delivery Table -->
            <div class="space-y-6">
                <div v-for="(deliveries, date) in groupedDeliveries" :key="date" class="bg-white/10 rounded-2xl p-6">
                    <h2 class="text-lg font-semibold text-white mb-4">
                        {{ new Date(date).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric', year:
                                'numeric'
                        }) }}
                    </h2>
                    <DeliveryTable :deliveries="deliveries" />
                </div>
            </div>

        </div>
    </div>
</template>
