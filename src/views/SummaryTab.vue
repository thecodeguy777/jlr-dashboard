<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import MetricCard from '../components/MetricCard.vue'
import ProductPieChart from '../components/ProductPieChart.vue'
import LineChart from '../components/LineChart.vue'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'

const level = ref('weekly')
const deliveryDate = ref(getCurrentDate())
const isLoading = ref(true)

const deliveries = ref([])
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

const formattedDateRange = computed(() => {
    if (level.value === 'weekly') {
        return `📅 Weekly Report – ${formatDate(weekStart.value)} to ${formatDate(weekEnd.value)}`
    } else if (level.value === 'monthly') {
        return `📅 Monthly Report – ${formatDate(monthStart.value)} to ${formatDate(monthEnd.value)}`
    }
    return `📅 Daily Report – ${formatDate(deliveryDate.value)}`
})

onMounted(async () => {
    isLoading.value = true

    const { data: d1 } = await supabase.from('deliveries')
        .select('quantity, delivery_date, products(id, name, price_per_unit, category)')

    const { data: d2, error } = await supabase.from('subcon_deliveries')
        .select(`
            id, quantity, delivery_date, price_snapshot, product_id,
            subcon_id, products(id, name, category, subcon_price),
            subcontractors(id, name)
        `)

    if (error) {
        console.error('❌ Supabase join error:', error.message)
    }

    deliveries.value = d1 || []
    subconDeliveries.value = d2?.map(d => ({
        ...d,
        price_snapshot: d.price_snapshot ?? d.products?.subcon_price ?? 0
    })) || []

    isLoading.value = false
})

function filterByDate(data) {
    return data.filter(d => {
        const date = new Date(d.delivery_date)
        if (level.value === 'weekly') return date >= weekStart.value && date <= weekEnd.value
        if (level.value === 'monthly') return date >= monthStart.value && date <= monthEnd.value
        return d.delivery_date === deliveryDate.value
    })
}

function filterByCategory(data) {
    return data.filter(d =>
        ['Single Walled', 'Double Walled', 'Miscellaneous'].includes(d.products?.category)
    )
}

const filteredDeliveries = computed(() => filterByCategory(filterByDate(deliveries.value)))
const filteredSubconDeliveries = computed(() => filterByCategory(filterByDate(subconDeliveries.value)))

const totalDeliveries = computed(() =>
    filteredDeliveries.value
        .filter(d => ['Single Walled', 'Double Walled'].includes(d.products?.category))
        .reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const totalSubconDeliveries = computed(() =>
    filteredSubconDeliveries.value.reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const singleWalled = computed(() =>
    filteredDeliveries.value.filter(d => d.products?.category === 'Single Walled')
        .reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const doubleWalled = computed(() =>
    filteredDeliveries.value.filter(d => d.products?.category === 'Double Walled')
        .reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const subconSingle = computed(() =>
    filteredSubconDeliveries.value.filter(d => d.products?.category === 'Single Walled')
        .reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const subconDouble = computed(() =>
    filteredSubconDeliveries.value.filter(d => d.products?.category === 'Double Walled')
        .reduce((sum, d) => sum + (d.quantity || 0), 0)
)

const totalGross = computed(() =>
    filteredDeliveries.value.reduce((sum, d) => {
        const price = d.products?.price_per_unit ?? 0
        return sum + (d.quantity || 0) * price
    }, 0)
)

const itemSummary = computed(() => {
    const summary = {
        inHouse: {},
        subcon: {}
    }

    // Process in-house deliveries
    filteredDeliveries.value.forEach(d => {
        const productName = d.products?.name || 'Unknown Product'
        const category = d.products?.category || 'Miscellaneous'
        const price = d.products?.price_per_unit ?? 0
        const quantity = d.quantity || 0

        if (!summary.inHouse[category]) {
            summary.inHouse[category] = {}
        }
        if (!summary.inHouse[category][productName]) {
            summary.inHouse[category][productName] = {
                quantity: 0,
                value: 0
            }
        }

        summary.inHouse[category][productName].quantity += quantity
        summary.inHouse[category][productName].value += quantity * price
    })

    // Process subcontractor deliveries
    filteredSubconDeliveries.value.forEach(d => {
        const productName = d.products?.name || 'Unknown Product'
        const category = d.products?.category || 'Miscellaneous'
        const price = d.price_snapshot ?? d.products?.subcon_price ?? 0
        const quantity = d.quantity || 0

        if (!summary.subcon[category]) {
            summary.subcon[category] = {}
        }
        if (!summary.subcon[category][productName]) {
            summary.subcon[category][productName] = {
                quantity: 0,
                value: 0
            }
        }

        summary.subcon[category][productName].quantity += quantity
        summary.subcon[category][productName].value += quantity * price
    })

    return summary
})

const inHouseTotals = computed(() => {
    const totals = {
        value: 0,
        quantity: 0
    }

    Object.values(itemSummary.value.inHouse).forEach(category => {
        Object.values(category).forEach(product => {
            totals.value += product.value
            totals.quantity += product.quantity
        })
    })

    return totals
})

const subconTotals = computed(() => {
    const totals = {
        value: 0,
        quantity: 0
    }

    Object.values(itemSummary.value.subcon).forEach(category => {
        Object.values(category).forEach(product => {
            totals.value += product.value
            totals.quantity += product.quantity
        })
    })

    return totals
})

const deliverySourcePie = computed(() => {
    return {
        labels: ['In-House', 'Subcontractor'],
        datasets: [
            {
                data: [totalDeliveries.value, totalSubconDeliveries.value],
                backgroundColor: ['rgba(59,130,246,0.6)', 'rgba(34,197,94,0.6)']
            }
        ]
    }
})

const deliveryTrendLine = computed(() => {
    const labels = []
    const inHouseMap = {}
    const subconMap = {}

    let start = new Date(deliveryDate.value)
    let count = 1
    let formatter = { month: 'short', day: 'numeric' }

    if (level.value === 'weekly') {
        start = new Date(weekStart.value)
        count = 7
        formatter = { weekday: 'short', month: 'short', day: 'numeric' }
    } else if (level.value === 'monthly') {
        start = new Date(monthStart.value)
        const end = new Date(monthEnd.value)
        count = (end.getDate() - start.getDate()) + 1
    }

    for (let i = 0; i < count; i++) {
        const date = new Date(start)
        date.setDate(date.getDate() + i)
        const key = date.toISOString().split('T')[0]
        labels.push(key)
        inHouseMap[key] = 0
        subconMap[key] = 0
    }

    filteredDeliveries.value.forEach(d => {
        const key = d.delivery_date
        if (inHouseMap[key] !== undefined) {
            inHouseMap[key] += d.quantity || 0
        }
    })

    filteredSubconDeliveries.value.forEach(d => {
        const key = d.delivery_date
        if (subconMap[key] !== undefined) {
            subconMap[key] += d.quantity || 0
        }
    })

    const inHouseData = labels.map(d => inHouseMap[d])
    const subconData = labels.map(d => subconMap[d])
    const totalData = labels.map((d, i) => inHouseData[i] + subconData[i])

    return {
        labels: labels.map(d => new Date(d).toLocaleDateString(undefined, formatter)),
        datasets: [
            {
                label: 'Total Deliveries',
                data: totalData,
                borderColor: 'rgba(255, 255, 255, 0.7)',
                backgroundColor: 'transparent',
                tension: 0.5,
                borderWidth: 3,
                borderCapStyle: 'round'
            },
            {
                label: 'In-house',
                data: inHouseData,
                borderColor: 'rgba(59, 130, 246, 1)',
                backgroundColor: 'transparent',
                tension: 0.5,
                borderWidth: 3,
                borderCapStyle: 'round'
            },
            {
                label: 'Subcontractor',
                data: subconData,
                borderColor: 'rgba(34, 197, 94, 1)',
                backgroundColor: 'transparent',
                tension: 0.5,
                borderWidth: 3,
                borderCapStyle: 'round'
            }
        ]
    }
})
</script>

<template>
    <div class="px-6 pt-6 pb-24 space-y-8 xl:space-y-12">
        <div class="flex space-x-4 text-white text-sm mb-4">
            <button v-for="option in ['monthly', 'weekly', 'daily']" :key="option" :class="[
                'px-4 py-2 rounded-full transition-all',
                level === option
                    ? 'bg-yellow-500 text-white font-semibold'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
            ]" @click="level = option">
                {{ option.charAt(0).toUpperCase() + option.slice(1) }}
            </button>
        </div>


        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold text-white">
                    {{ formattedDateRange }}
                </h1>
            </div>
            <input type="date" v-model="deliveryDate"
                class="bg-white/10 text-white px-4 py-2 rounded-md border border-white/20" />
        </div>
        <div v-if="isLoading" class="text-white text-center py-10 text-lg italic">
            Loading summary data...
        </div>


        <div v-else class="space-y-10">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                <MetricCard title="In-House Deliveries" :value="totalDeliveries" suffix=" pcs" color="blue" />
                <MetricCard title="Gross (In-House)" :value="Math.round(totalGross)" prefix="₱" color="blue" />
                <MetricCard title="Single-Walled (In-house)" :value="singleWalled" suffix=" pcs" color="blue" />
                <MetricCard title="Double-Walled (In-house)" :value="doubleWalled" suffix=" pcs" color="blue" />


                <MetricCard title="Subcon Deliveries" :value="totalSubconDeliveries" suffix=" pcs" color="green" />
                <MetricCard title="Gross (Subcon)" :value="Math.round(totalGross)" prefix="₱" color="green" />
                <MetricCard title="Single-Walled (Subcon)" :value="subconSingle" suffix=" pcs" color="green" />
                <MetricCard title="Double-Walled (Subcon)" :value="subconDouble" suffix=" pcs" color="green" />

            </div>

            <!-- Date Display -->
            <div class="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                <h2 class="text-2xl font-bold text-white">
                    {{ new Date(deliveryDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }) }}
                </h2>
            </div>

            <!-- Item-based Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- In-house Summary Card -->
                <div class="bg-white/5 rounded-xl p-6 border border-white/10">
                    <h3 class="text-lg font-semibold text-white mb-4">📦 In-House Item Summary</h3>
                    <div class="space-y-6">
                        <div v-for="(products, category) in itemSummary.inHouse" :key="category" class="space-y-4">
                            <h4 class="font-medium text-white/80 text-sm border-b border-white/10 pb-1">{{ category }}:
                            </h4>
                            <div class="space-y-4">
                                <div v-for="(data, productName) in products" :key="productName"
                                    class="bg-white/5 rounded-lg p-3">
                                    <div class="flex justify-between items-center mb-1">
                                        <span class="text-white/70">{{ productName }}</span>
                                        <span class="text-blue-300 font-medium">{{ data.quantity }} pcs</span>
                                    </div>
                                    <div class="flex justify-between items-center text-sm">
                                        <span class="text-white/60">Value:</span>
                                        <span class="text-blue-400 font-semibold">₱{{
                                            Math.round(data.value).toLocaleString() }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Total Values -->
                    <div class="mt-6 pt-3 border-t border-white/10">
                        <div class="flex justify-between items-center">
                            <span class="text-white/70 font-medium">Total Value:</span>
                            <span class="text-blue-400 font-bold text-lg">₱{{
                                Math.round(inHouseTotals.value).toLocaleString() }}</span>
                        </div>
                        <div class="flex justify-between items-center text-sm mt-1">
                            <span class="text-white/60">Total Quantity:</span>
                            <span class="text-white/80">{{ inHouseTotals.quantity }} pcs</span>
                        </div>
                    </div>
                </div>

                <!-- Subcontractor Summary Card -->
                <div class="bg-white/5 rounded-xl p-6 border border-white/10">
                    <h3 class="text-lg font-semibold text-white mb-4">🚚 Subcontractor Item Summary</h3>
                    <div class="space-y-6">
                        <div v-for="(products, category) in itemSummary.subcon" :key="category" class="space-y-4">
                            <h4 class="font-medium text-white/80 text-sm border-b border-white/10 pb-1">{{ category }}:
                            </h4>
                            <div class="space-y-4">
                                <div v-for="(data, productName) in products" :key="productName"
                                    class="bg-white/5 rounded-lg p-3">
                                    <div class="flex justify-between items-center mb-1">
                                        <span class="text-white/70">{{ productName }}</span>
                                        <span class="text-green-300 font-medium">{{ data.quantity }} pcs</span>
                                    </div>
                                    <div class="flex justify-between items-center text-sm">
                                        <span class="text-white/60">Value:</span>
                                        <span class="text-green-400 font-semibold">₱{{
                                            Math.round(data.value).toLocaleString() }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Total Values -->
                    <div class="mt-6 pt-3 border-t border-white/10">
                        <div class="flex justify-between items-center">
                            <span class="text-white/70 font-medium">Total Value:</span>
                            <span class="text-green-400 font-bold text-lg">₱{{
                                Math.round(subconTotals.value).toLocaleString() }}</span>
                        </div>
                        <div class="flex justify-between items-center text-sm mt-1">
                            <span class="text-white/60">Total Quantity:</span>
                            <span class="text-white/80">{{ subconTotals.quantity }} pcs</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="rounded-2xl bg-white/5 p-6 xl:p-8">
                <ProductPieChart :data="deliverySourcePie" />
            </div>
            <div class="rounded-2xl bg-white/5 p-6 xl:p-8">
                <LineChart :data="deliveryTrendLine" />

            </div>
        </div>
    </div>
</template>
