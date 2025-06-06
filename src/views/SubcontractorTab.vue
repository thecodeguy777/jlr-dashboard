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

// Payroll and filtering state
const subcontractorNameFilter = ref('')
const showMissingDataOnly = ref(false)
const showPayrollSummary = ref(false)

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

// Check for missing data in subcontractor delivery records
const hasMissingData = (delivery) => {
    return !delivery.subcontractors?.name ||
        !delivery.products?.name ||
        !delivery.quantity ||
        delivery.quantity <= 0 ||
        !delivery.delivery_date ||
        !delivery.price_snapshot
}

// Get all unique subcontractor names for filtering
const availableSubcontractors = computed(() => {
    const subcontractors = new Set()
    subconDeliveries.value?.forEach(d => {
        if (d.subcontractors?.name) {
            subcontractors.add(d.subcontractors.name)
        }
    })
    return Array.from(subcontractors).sort()
})

const filteredDeliveries = computed(() => {
    let results = Array.isArray(subconDeliveries.value) ? subconDeliveries.value : []

    // Filter by date range
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

    // Filter by subcontractor name
    if (subcontractorNameFilter.value) {
        results = results.filter(d =>
            d.subcontractors?.name?.toLowerCase().includes(subcontractorNameFilter.value.toLowerCase())
        )
    }

    // Filter to show only records with missing data
    if (showMissingDataOnly.value) {
        results = results.filter(d => hasMissingData(d))
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

// Payroll analysis for subcontractors
const payrollAnalysis = computed(() => {
    const analysis = {
        totalRecords: filteredDeliveries.value.length,
        missingDataRecords: filteredDeliveries.value.filter(d => hasMissingData(d)),
        subcontractorSummary: {}
    }

    // Group by subcontractor for payroll summary
    filteredDeliveries.value.forEach(d => {
        const subcontractorName = d.subcontractors?.name || 'Unknown Subcontractor'
        if (!analysis.subcontractorSummary[subcontractorName]) {
            analysis.subcontractorSummary[subcontractorName] = {
                totalQuantity: 0,
                totalValue: 0,
                recordCount: 0,
                missingDataCount: 0,
                records: [],
                productBreakdown: {
                    'Single Walled': {},
                    'Double Walled': {},
                    'Miscellaneous': {}
                }
            }
        }

        const price = d.price_snapshot || 0
        const quantity = d.quantity || 0
        const productName = d.products?.name || 'Unknown Product'
        const category = d.products?.category || 'Miscellaneous'

        analysis.subcontractorSummary[subcontractorName].totalQuantity += quantity
        analysis.subcontractorSummary[subcontractorName].totalValue += quantity * price
        analysis.subcontractorSummary[subcontractorName].recordCount += 1
        analysis.subcontractorSummary[subcontractorName].records.push(d)

        // Group by product within category
        if (!analysis.subcontractorSummary[subcontractorName].productBreakdown[category]) {
            analysis.subcontractorSummary[subcontractorName].productBreakdown[category] = {}
        }

        if (!analysis.subcontractorSummary[subcontractorName].productBreakdown[category][productName]) {
            analysis.subcontractorSummary[subcontractorName].productBreakdown[category][productName] = {
                quantity: 0,
                value: 0
            }
        }

        analysis.subcontractorSummary[subcontractorName].productBreakdown[category][productName].quantity += quantity
        analysis.subcontractorSummary[subcontractorName].productBreakdown[category][productName].value += quantity * price

        if (hasMissingData(d)) {
            analysis.subcontractorSummary[subcontractorName].missingDataCount += 1
        }
    })

    return analysis
})

// Helper function to get products with non-zero quantities
function getNonZeroProducts(productBreakdown) {
    const result = {}
    Object.entries(productBreakdown).forEach(([category, products]) => {
        const nonZeroProducts = Object.entries(products).filter(([_, data]) => data.quantity > 0)
        if (nonZeroProducts.length > 0) {
            result[category] = Object.fromEntries(nonZeroProducts)
        }
    })
    return result
}
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

            <!-- Payroll Controls -->
            <div class="bg-white/5 rounded-xl p-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <!-- Left: Search and Stats -->
                    <div class="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
                        <div class="relative">
                            <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <input v-model="subcontractorNameFilter" type="text" placeholder="Search subcontractors..."
                                class="pl-10 pr-4 py-2 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" />
                            <button v-if="subcontractorNameFilter" @click="subcontractorNameFilter = ''"
                                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>

                        <!-- Quick Stats Pills -->
                        <div class="flex gap-2 flex-wrap">
                            <div
                                class="flex items-center gap-2 bg-green-500/20 text-green-300 px-3 py-1.5 rounded-full text-xs font-medium">
                                <span class="w-2 h-2 bg-green-400 rounded-full"></span>
                                {{ payrollAnalysis.totalRecords }} records
                            </div>
                            <button @click="showMissingDataOnly = !showMissingDataOnly" :class="[
                                'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                                showMissingDataOnly
                                    ? 'bg-red-500/30 text-red-300 ring-1 ring-red-500/50'
                                    : payrollAnalysis.missingDataRecords.length > 0
                                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                        : 'bg-green-500/20 text-green-300'
                            ]">
                                <span :class="[
                                    'w-2 h-2 rounded-full',
                                    payrollAnalysis.missingDataRecords.length > 0 ? 'bg-red-400' : 'bg-green-400'
                                ]"></span>
                                {{ payrollAnalysis.missingDataRecords.length }} issues
                            </button>
                            <div
                                class="flex items-center gap-2 bg-green-500/20 text-green-300 px-3 py-1.5 rounded-full text-xs font-medium">
                                <span class="w-2 h-2 bg-green-400 rounded-full"></span>
                                {{ Object.keys(payrollAnalysis.subcontractorSummary).length }} subcontractors
                            </div>
                        </div>
                    </div>

                    <!-- Right: Actions -->
                    <div class="flex gap-2">
                        <button @click="showPayrollSummary = !showPayrollSummary" :class="[
                            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                            showPayrollSummary
                                ? 'bg-green-600 text-white shadow-lg'
                                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                        ]">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    :d="showPayrollSummary ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L12 12m-2.122-2.122L12 12m0 0l2.121 2.121M12 12l2.121-2.121m-2.121 2.121L12 12' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'">
                                </path>
                            </svg>
                            {{ showPayrollSummary ? 'Hide' : 'Show' }} Summary
                        </button>
                    </div>
                </div>
            </div>

            <!-- Payroll Summary -->
            <div v-if="showPayrollSummary" class="bg-white/5 rounded-xl p-6">
                <h3 class="text-lg font-semibold text-white mb-4">🏭 Subcontractor Payroll Summary</h3>

                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <div v-for="(subcontractor, name) in payrollAnalysis.subcontractorSummary" :key="name"
                        class="bg-white/5 rounded-lg p-5 border border-white/10">

                        <!-- Header -->
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h4 class="font-semibold text-white text-lg">{{ name }}</h4>
                                <p class="text-white/60 text-sm">Records: {{ subcontractor.recordCount }}</p>
                            </div>
                            <span v-if="subcontractor.missingDataCount > 0"
                                class="bg-red-500/20 text-red-300 text-xs px-2 py-1 rounded-full">
                                {{ subcontractor.missingDataCount }} missing
                            </span>
                            <span v-else class="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded-full">
                                Complete
                            </span>
                        </div>

                        <!-- Product Breakdown -->
                        <div class="space-y-4 mb-4">
                            <div v-for="(products, category) in getNonZeroProducts(subcontractor.productBreakdown)"
                                :key="category" class="space-y-2">
                                <h5 class="font-medium text-white/80 text-sm border-b border-white/10 pb-1">{{ category
                                }}:</h5>
                                <div class="space-y-1 ml-2">
                                    <div v-for="(productData, productName) in products" :key="productName"
                                        class="flex justify-between text-sm">
                                        <span class="text-white/70">- {{ productName }}:</span>
                                        <span class="text-white/90 font-medium">{{ productData.quantity }} pcs</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Total Value -->
                        <div class="pt-3 border-t border-white/10">
                            <div class="flex justify-between items-center">
                                <span class="text-white/70 font-medium">Total Value:</span>
                                <span class="text-green-400 font-bold text-lg">₱{{
                                    subcontractor.totalValue.toLocaleString() }}</span>
                            </div>
                            <div class="flex justify-between items-center text-sm mt-1">
                                <span class="text-white/60">Total Quantity:</span>
                                <span class="text-white/80">{{ subcontractor.totalQuantity }} pcs</span>
                            </div>
                        </div>

                        <!-- Missing data details -->
                        <div v-if="subcontractor.missingDataCount > 0"
                            class="mt-4 p-3 bg-red-500/10 rounded border border-red-500/20">
                            <div class="text-xs text-red-300 mb-2 font-medium">⚠️ Missing data issues:</div>
                            <div class="space-y-1">
                                <div v-for="record in subcontractor.records.filter(r => hasMissingData(r))"
                                    :key="record.id" class="text-xs text-red-200">
                                    • {{ record.delivery_date }}:
                                    <span v-if="!record.subcontractors?.name"> Missing subcontractor</span>
                                    <span v-if="!record.products?.name"> Missing product</span>
                                    <span v-if="!record.quantity || record.quantity <= 0"> Invalid quantity</span>
                                    <span v-if="!record.price_snapshot"> Missing price</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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
                <div v-for="(deliveries, date) in groupedDeliveries" :key="date"
                    class="bg-white/10 rounded-2xl p-6 transition-all hover:bg-white/20">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-lg font-semibold text-white">
                            {{ new Date(date).toLocaleDateString(undefined, {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            }) }}
                        </h2>
                        <div class="flex gap-2 text-xs">
                            <span class="bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                                {{ deliveries.length }} records
                            </span>
                            <span v-if="deliveries.filter(d => hasMissingData(d)).length > 0"
                                class="bg-red-500/20 text-red-300 px-2 py-1 rounded-full">
                                {{deliveries.filter(d => hasMissingData(d)).length}} incomplete
                            </span>
                        </div>
                    </div>

                    <!-- Missing data warning -->
                    <div v-if="deliveries.filter(d => hasMissingData(d)).length > 0"
                        class="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <div class="text-yellow-300 text-sm font-medium mb-1">⚠️ Payroll Warning</div>
                        <div class="text-yellow-200 text-xs">
                            {{deliveries.filter(d => hasMissingData(d)).length}} record(s) have missing data that may
                            affect payroll calculations.
                            Use the filters above to review and fix these issues.
                        </div>
                    </div>

                    <DeliveryTable :deliveries="deliveries" class="transition-opacity duration-200" />
                </div>
            </div>

        </div>
    </div>
</template>
