<template>
    <div
        class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white p-3 md:p-6 space-y-4 md:space-y-8">
        <!-- Enhanced Header -->
        <div class="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 md:gap-4">
            <div class="flex justify-between items-center mb-6">
                <div class="text-2xl font-bold tracking-tight">{{ reportTitle }}</div>
            </div>
        </div>

        <!-- Enhanced Loading State -->
        <div v-if="isLoading" class="space-y-6">
            <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                <div class="flex items-center justify-center space-x-4">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <div class="space-y-2">
                        <p class="text-white font-medium">Loading executive summary...</p>
                        <p class="text-white/60 text-sm">Fetching deliveries, revenue, and operational data</p>
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="space-y-8">
            <!-- Enhanced Hero Summary Card -->
            <div
                class="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-2xl md:rounded-3xl shadow-2xl">
                <!-- Background Pattern -->
                <div class="absolute inset-0 opacity-10">
                    <div
                        class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]">
                    </div>
                    <div
                        class="absolute top-0 right-0 w-48 h-48 md:w-96 md:h-96 bg-gradient-to-bl from-white/10 to-transparent rounded-full -translate-y-24 translate-x-24 md:-translate-y-48 md:translate-x-48">
                    </div>
                </div>

                <div class="relative p-4 md:p-8 space-y-4 md:space-y-6">
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div class="space-y-2">
                            <div class="flex items-center gap-2 md:gap-3">
                                <div
                                    class="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                    <svg class="w-6 h-6 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1">
                                        </path>
                                    </svg>
                                </div>
                                <div>
                                    <h2 class="text-lg md:text-2xl font-bold text-white leading-tight">{{ reportTitle }}
                                    </h2>
                                    <p class="text-purple-100 font-medium text-sm md:text-base">Carton Recycling
                                        Manufacturing</p>
                                </div>
                            </div>
                        </div>

                        <div class="text-center md:text-right">
                            <p class="text-purple-100 text-xs md:text-sm font-medium mb-2">📊 Financial Overview</p>

                            <!-- Sales, Cost, Profit Grid -->
                            <div class="grid grid-cols-3 gap-2 md:gap-4 mb-2">
                                <div class="text-center">
                                    <p class="text-green-300 text-xs font-medium">SALES</p>
                                    <p class="text-green-400 font-bold text-sm md:text-lg">₱{{
                                        Math.round(totalSales).toLocaleString() }}</p>
                                </div>
                                <div class="text-center">
                                    <p class="text-red-300 text-xs font-medium">COST</p>
                                    <p class="text-red-400 font-bold text-sm md:text-lg">₱{{
                                        Math.round(totalCosts).toLocaleString() }}</p>
                                </div>
                                <div class="text-center">
                                    <p class="text-purple-200 text-xs font-medium">PROFIT</p>
                                    <p
                                        :class="['font-bold text-sm md:text-lg', totalProfit >= 0 ? 'text-green-400' : 'text-red-400']">
                                        {{ totalProfit >= 0 ? '+' : '' }}₱{{ Math.round(totalProfit).toLocaleString() }}
                                    </p>
                                </div>
                            </div>

                            <!-- Sales Breakdown -->
                            <div class="text-xs text-purple-100/80 space-y-1 border-t border-white/20 pt-2">
                                <div class="flex justify-between">
                                    <span>Product Sales:</span>
                                    <span>₱{{ Math.round(productSales).toLocaleString() }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Scrap Revenue:</span>
                                    <span>₱{{ Math.round(scrapRevenue).toLocaleString() }}</span>
                                </div>
                            </div>

                            <p class="text-purple-100/80 text-xs md:text-sm">{{ totalDeliveries.toLocaleString() }}
                                pieces delivered (Single & Double Walled only)</p>
                        </div>
                    </div>

                    <!-- Quick Stats -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 pt-3 md:pt-4 border-t border-white/20">
                        <div class="text-center">
                            <p class="text-purple-100/80 text-xs font-medium">In-House</p>
                            <p class="text-white font-bold text-sm md:text-lg">₱{{
                                Math.round(inHouseRevenue).toLocaleString() }}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-purple-100/80 text-xs font-medium">Subcontractors</p>
                            <p class="text-white font-bold text-sm md:text-lg">₱{{
                                Math.round(subcontractorRevenue).toLocaleString() }}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-purple-100/80 text-xs font-medium">Active Workers</p>
                            <p class="text-white font-bold text-sm md:text-lg">{{ activeWorkers + activeSubcontractors
                                }}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-purple-100/80 text-xs font-medium">Avg/Piece</p>
                            <p class="text-white font-bold text-sm md:text-lg">₱{{ totalDeliveries > 0 ?
                                Math.round(totalRevenue / totalDeliveries) : 0 }}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Delivery Summary -->
            <div
                class="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-white">Delivery Summary</h3>
                        <p class="text-blue-300 text-sm">Single & Double Walled only (excludes miscellaneous)</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div class="flex items-center gap-2 mb-2">
                            <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                            </svg>
                            <span class="text-green-300 text-sm font-medium">Weekly Total</span>
                        </div>
                        <p class="text-white text-2xl font-bold">{{ totalDeliveries.toLocaleString() }} pcs</p>
                    </div>

                    <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-blue-300 text-sm font-medium">Single Walled</span>
                        </div>
                        <p class="text-white text-2xl font-bold">{{ singleWalledTotal.toLocaleString() }}</p>
                        <p class="text-blue-400 text-sm">{{ totalDeliveries > 0 ? Math.round((singleWalledTotal /
                            totalDeliveries) * 100) : 0 }}%
                            of total</p>
                    </div>

                    <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-orange-300 text-sm font-medium">Double Walled</span>
                        </div>
                        <p class="text-white text-2xl font-bold">{{ doubleWalledTotal.toLocaleString() }}</p>
                        <p class="text-orange-400 text-sm">{{ totalDeliveries > 0 ? Math.round((doubleWalledTotal /
                            totalDeliveries) * 100) : 0 }}% of total</p>
                    </div>
                </div>
            </div>

            <!-- Detailed Metrics Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Expense Summary -->
                <div
                    class="bg-gradient-to-br from-red-900/20 to-orange-900/20 backdrop-blur-sm rounded-2xl p-6 border border-red-500/30">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                            <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z">
                                </path>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-white">Expense Summary</h3>
                            <p class="text-red-300 text-sm">Weekly expense breakdown</p>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div class="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-red-300 text-sm font-medium">Total Expenses</span>
                                <span class="text-red-400 font-bold text-xl">₱{{
                                    Math.round(totalWeeklyExpenses).toLocaleString() }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-white/60 text-xs">vs last week:</span>
                                <span :class="[
                                    'text-xs font-medium',
                                    expensesPercentChange <= 0 ? 'text-green-400' : 'text-red-400'
                                ]">
                                    {{ expensesPercentChange >= 0 ? '+' : '' }}{{ expensesPercentChange }}%
                                </span>
                            </div>
                        </div>

                        <!-- Expense Categories -->
                        <div class="space-y-3">
                            <template v-for="(data, category) in expensesByCategory" :key="category">
                                <div class="bg-white/5 rounded-lg p-3 border border-white/10">
                                    <div class="flex items-center justify-between">
                                        <span class="text-white/80 text-sm">{{ category }}</span>
                                        <span class="text-white font-medium">₱{{ Math.round(data.total).toLocaleString()
                                            }}</span>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>
                </div>

                <!-- Subcontractor Summary -->
                <div
                    class="bg-gradient-to-br from-green-900/20 to-teal-900/20 backdrop-blur-sm rounded-2xl p-6 border border-green-500/30">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z">
                                </path>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-white">Subcontractor Summary</h3>
                            <p class="text-green-300 text-sm">Active subcontractors: {{ activeSubcontractors }}</p>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <!-- Subcontractor List -->
                        <div v-for="subcon in subcontractorBreakdown" :key="subcon.name"
                            class="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-green-300 text-sm font-medium">{{ subcon.name }}</span>
                                <span class="text-green-400 font-bold">₱{{
                                    Math.round(subcon.totalValue).toLocaleString() }}</span>
                            </div>
                            <div class="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span class="text-white/60">Deliveries:</span>
                                    <span class="text-white font-medium ml-2">{{ subcon.deliveries }}</span>
                                </div>
                                <div>
                                    <span class="text-white/60">Total Qty:</span>
                                    <span class="text-white font-medium ml-2">{{ subcon.totalQuantity }}</span>
                                </div>
                            </div>
                        </div>

                        <div v-if="subcontractorBreakdown.length === 0" class="text-center py-6">
                            <div
                                class="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-3">
                                <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z">
                                    </path>
                                </svg>
                            </div>
                            <p class="text-white/60 font-medium">No subcontractor data</p>
                            <p class="text-white/40 text-sm">No subcontractor records found</p>
                        </div>
                    </div>
                </div>

                <!-- Payroll Summary -->
                <div
                    class="bg-gradient-to-br from-indigo-900/20 to-blue-900/20 backdrop-blur-sm rounded-2xl p-6 border border-indigo-500/30">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1">
                                </path>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-white">Payroll Summary</h3>
                            <p class="text-indigo-300 text-sm">Weekly payroll breakdown</p>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div class="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-indigo-300 text-sm font-medium">Payroll to be Paid</span>
                                <span class="text-indigo-400 font-bold text-xl">₱{{
                                    Math.round(totalPayroll).toLocaleString() }}</span>
                            </div>
                            <div class="text-xs text-indigo-100/60 mt-2">
                                Only confirmed payouts for this period
                            </div>
                            <div class="grid grid-cols-2 gap-4 text-xs mt-3">
                                <div>
                                    <span class="text-white/60">Active Workers:</span>
                                    <span class="text-white font-medium ml-2">{{ activeWorkers }}</span>
                                </div>
                                <div>
                                    <span class="text-white/60">Avg per Worker:</span>
                                    <span class="text-white font-medium ml-2">₱{{ activeWorkers > 0 ?
                                        Math.round(totalPayroll /
                                            activeWorkers).toLocaleString() : '0' }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Pandi and Subcon Delivery Logs -->
            <div class="grid gap-6 md:grid-cols-2">
                <!-- PANDI Delivery Dates -->
                <div
                    class="bg-gradient-to-br from-green-900/20 to-emerald-900/20 backdrop-blur-sm rounded-2xl p-6 border border-green-500/30">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4">
                                </path>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-white">PANDI Delivery Dates</h3>
                            <p class="text-green-300 text-sm">In-house production records</p>
                        </div>
                    </div>

                    <div class="space-y-3 max-h-80 overflow-y-auto">
                        <div v-for="record in pandiDeliveryRecords" :key="record.date"
                            class="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-white font-medium text-sm">{{ formatDate(record.date) }}</span>
                                <span class="text-green-400 font-bold text-sm">₱{{
                                    Math.round(record.revenue).toLocaleString()
                                }}</span>
                            </div>
                            <p class="text-white/70 text-xs">
                                Single: {{ record.single.toLocaleString() }} pcs, Double: {{
                                    record.double.toLocaleString() }} pcs
                            </p>
                        </div>
                    </div>

                    <div v-if="pandiDeliveryRecords.length === 0" class="text-center py-6">
                        <div
                            class="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-3">
                            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4">
                                </path>
                            </svg>
                        </div>
                        <p class="text-white/60 font-medium">No PANDI deliveries</p>
                        <p class="text-white/40 text-sm">No in-house deliveries recorded</p>
                    </div>
                </div>

                <!-- SUBCON Delivery Dates -->
                <div
                    class="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z">
                                </path>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-white">SUBCON Delivery Dates</h3>
                            <p class="text-purple-300 text-sm">Subcontractor production records</p>
                        </div>
                    </div>

                    <div class="space-y-3 max-h-80 overflow-y-auto">
                        <div v-for="record in subconDeliveryRecords" :key="record.date"
                            class="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-white font-medium text-sm">{{ formatDate(record.date) }}</span>
                                <span class="text-purple-400 font-bold text-sm">₱{{
                                    Math.round(record.revenue).toLocaleString()
                                }}</span>
                            </div>
                            <p class="text-white/70 text-xs">
                                Single: {{ record.single.toLocaleString() }} pcs, Double: {{
                                    record.double.toLocaleString() }} pcs
                            </p>
                        </div>
                    </div>

                    <div v-if="subconDeliveryRecords.length === 0" class="text-center py-6">
                        <div
                            class="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-3">
                            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z">
                                </path>
                            </svg>
                        </div>
                        <p class="text-white/60 font-medium">No subcon deliveries</p>
                        <p class="text-white/40 text-sm">No subcontractor deliveries recorded</p>
                    </div>
                </div>
            </div>

            <!-- Subcon Breakdown -->
            <div
                class="bg-gradient-to-br from-orange-900/20 to-red-900/20 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z">
                            </path>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-white">Subcontractor Breakdown</h3>
                        <p class="text-orange-300 text-sm">Individual subcontractor performance</p>
                    </div>
                </div>

                <div class="space-y-3">
                    <div v-for="subcon in subcontractorBreakdown" :key="subcon.name"
                        class="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                                    <span class="text-orange-400 font-bold text-sm">{{ subcon.name.charAt(0) }}</span>
                                </div>
                                <div>
                                    <span class="text-white font-medium">{{ subcon.name }}</span>
                                    <p class="text-white/60 text-xs">{{ subcon.deliveries }} deliveries</p>
                                </div>
                            </div>
                            <span class="text-orange-400 font-bold">₱{{ Math.round(subcon.totalValue).toLocaleString()
                                }}</span>
                        </div>
                        <div class="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <span class="text-white/60">Total Quantity:</span>
                                <span class="text-white font-medium ml-2">{{ subcon.totalQuantity.toLocaleString() }}
                                    pcs</span>
                            </div>
                            <div>
                                <span class="text-white/60">Avg per Delivery:</span>
                                <span class="text-white font-medium ml-2">₱{{ Math.round(subcon.totalValue /
                                    subcon.deliveries).toLocaleString() }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="subcontractorBreakdown.length === 0" class="text-center py-6">
                    <div class="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-3">
                        <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z">
                            </path>
                        </svg>
                    </div>
                    <p class="text-white/60 font-medium">No subcontractor data</p>
                    <p class="text-white/40 text-sm">No subcontractor records found</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { format, subDays, startOfWeek, endOfWeek, addDays } from 'date-fns'
import DeliveryBarChart from '@/components/BarChart.vue'
import ProductPieChart from '@/components/ProductPieChart.vue'

const route = useRoute()
const reportId = route.params.id
const isLoading = ref(true)

// Data refs
const reportData = ref(null)
const deliveries = ref([])
const subconDeliveries = ref([])
const clientPriceMap = ref({})
const weeklyScrapRevenue = ref(0)
const previousPeriodDeliveries = ref([])
const previousPeriodSubconDeliveries = ref([])
const actualPayrollTotal = ref(0)
const bodegaStock = ref([]) // Previous week stock
const currentBodegaStock = ref([]) // Current week stock

// Weekly Expense Breakdown
const weeklyExpenses = ref([])
const totalWeeklyExpenses = ref(0)
const expensesByCategory = ref({})
const lastWeekExpenses = ref(0)
const expensesPercentChange = ref(0)
const expandedCategories = ref(new Set())

// Function to toggle category expansion
function toggleCategoryExpansion(categoryName) {
    const expanded = expandedCategories.value
    if (expanded.has(categoryName)) {
        expanded.delete(categoryName)
    } else {
        expanded.add(categoryName)
    }
    expandedCategories.value = new Set(expanded)
}

// Format expense date like AdminDashboard
function formatExpenseDate(dateStr) {
    if (!dateStr) return 'Unknown date'

    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
        return 'Today'
    }

    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday'
    }

    // Otherwise return formatted date
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
    })
}

// Fetch cash tracker data with comparisons (like AdminDashboard)
async function fetchCashTrackerData(start, end, lastStart, lastEnd) {
    try {
        // Fetch current period expenses
        const { data: currentExpenses, error: currentError } = await supabase
            .from('cash_tracker')
            .select('*')
            .gte('date', start)
            .lte('date', end)
            .order('date', { ascending: false })

        if (!currentError) {
            weeklyExpenses.value = currentExpenses || []
            totalWeeklyExpenses.value = currentExpenses?.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) || 0

            // Group by category
            const categoryMap = {}
            currentExpenses?.forEach(expense => {
                const category = expense.category || 'Uncategorized'
                if (!categoryMap[category]) {
                    categoryMap[category] = {
                        total: 0,
                        expenses: []
                    }
                }
                categoryMap[category].total += parseFloat(expense.amount)
                categoryMap[category].expenses.push(expense)
            })
            expensesByCategory.value = categoryMap
        }

        // Fetch last period expenses for comparison
        const { data: lastPeriodExpenses, error: lastError } = await supabase
            .from('cash_tracker')
            .select('amount')
            .gte('date', lastStart)
            .lte('date', lastEnd)

        if (!lastError) {
            lastWeekExpenses.value = lastPeriodExpenses?.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) || 0

            // Calculate percentage change
            if (lastWeekExpenses.value > 0) {
                expensesPercentChange.value = Math.round(
                    ((totalWeeklyExpenses.value - lastWeekExpenses.value) / lastWeekExpenses.value) * 100
                )
            } else {
                expensesPercentChange.value = 100 // If no previous expenses, show as 100% increase
            }
        }

    } catch (error) {
        console.error('Error fetching cash tracker data:', error)
        weeklyExpenses.value = []
        totalWeeklyExpenses.value = 0
        expensesByCategory.value = {}
        lastWeekExpenses.value = 0
        expensesPercentChange.value = 0
    }
}

// Helper functions for financial calculations
function sumSales(rows = [], priceMap = {}) {
    return rows.reduce((total, row) => {
        const qty = +row.quantity || 0
        const price = priceMap[row.product_id] || 0
        return total + qty * price
    }, 0)
}

function sumCosts(rows = [], type = 'inhouse') {
    return rows.reduce((total, row) => {
        const qty = +row.quantity || 0
        let costPrice = 0

        if (type === 'inhouse') {
            // For in-house deliveries, use price_per_unit from products
            costPrice = row.products?.price_per_unit || 0
        } else {
            // For subcon deliveries, use price_snapshot or subcon_price from products
            costPrice = row.price_snapshot || row.products?.subcon_price || 0
        }

        return total + qty * costPrice
    }, 0)
}

// Date handling
const reportDate = computed(() => {
    // Get the date from the report ID or use current date
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
})

const weekStart = computed(() => {
    const date = new Date(reportDate.value)
    const start = startOfWeek(date, { weekStartsOn: 0 })
    start.setHours(0, 0, 0, 0)
    return start
})

const weekEnd = computed(() => {
    const end = endOfWeek(weekStart.value, { weekStartsOn: 0 })
    end.setHours(23, 59, 59, 999)
    return end
})

// Formatting functions
function formatDate(date) {
    return format(date, 'MMMM d, yyyy')
}

// Filtered deliveries based on date range
const filteredDeliveries = computed(() => {
    return deliveries.value.filter(d => {
        const date = new Date(d.delivery_date)
        return date >= weekStart.value && date <= weekEnd.value
    })
})

const filteredSubconDeliveries = computed(() => {
    return subconDeliveries.value.filter(d => {
        const date = new Date(d.delivery_date)
        return date >= weekStart.value && date <= weekEnd.value
    })
})

// Sales metrics
const productSales = computed(() => {
    return sumSales([...filteredDeliveries.value, ...filteredSubconDeliveries.value], clientPriceMap.value)
})

const totalSales = computed(() => {
    return productSales.value + weeklyScrapRevenue.value
})

const totalRevenue = computed(() => {
    return totalSales.value
})

const totalCosts = computed(() => {
    const inHouseCosts = sumCosts(filteredDeliveries.value, 'inhouse')
    const subconCosts = sumCosts(filteredSubconDeliveries.value, 'subcon')
    return inHouseCosts + subconCosts
})

const totalProfit = computed(() => {
    return totalSales.value - totalCosts.value
})

const inHouseRevenue = computed(() => {
    return filteredDeliveries.value.reduce((sum, d) => {
        const price = d.price_snapshot || d.products?.price_per_unit || 0
        return sum + (d.quantity || 0) * price
    }, 0)
})

const subcontractorRevenue = computed(() => {
    return filteredSubconDeliveries.value.reduce((sum, d) => {
        const price = d.price_snapshot || d.products?.subcon_price || 0
        return sum + (d.quantity || 0) * price
    }, 0)
})

const activeWorkers = computed(() => {
    const workers = new Set()
    filteredDeliveries.value.forEach(d => {
        if (d.workers?.name) workers.add(d.workers.name)
    })
    return workers.size
})

const activeSubcontractors = computed(() => {
    const subcontractors = new Set()
    filteredSubconDeliveries.value.forEach(d => {
        if (d.subcontractors?.name) subcontractors.add(d.subcontractors.name)
    })
    return subcontractors.size
})

const weeklyPerformance = computed(() => {
    const currentDeliveries = totalDeliveries.value
    const targetDeliveries = 10000 // Weekly target
    if (currentDeliveries === 0) return 0
    return Math.min(Math.round((currentDeliveries / targetDeliveries) * 100), 100)
})

const reportTitle = computed(() => {
    if (!reportData.value) return '📊 Executive Summary'
    const start = new Date(reportData.value.week_start)
    const end = new Date(reportData.value.week_end)
    return `📊 Executive Summary – ${formatDate(start)} to ${formatDate(end)}`
})

// Fetch all data on mount
onMounted(async () => {
    try {
        isLoading.value = true

        // Fetch the stored report data
        const { data: report, error } = await supabase
            .from('reports')
            .select('*')
            .eq('id', reportId)
            .single()

        if (error) throw error
        if (!report) throw new Error('Report not found')

        // Set the data from the stored report
        reportData.value = report.data
        deliveries.value = report.data.deliveries || []
        subconDeliveries.value = report.data.subcon_deliveries || []
        weeklyExpenses.value = report.data.expenses || []
        weeklyScrapRevenue.value = report.data.scrap_revenue || 0
        actualPayrollTotal.value = report.data.payroll_total || 0
        clientPriceMap.value = report.data.client_price_map || {}
        totalWeeklyExpenses.value = report.data.total_weekly_expenses || 0
        expensesPercentChange.value = report.data.expenses_percent_change || 0
        lastWeekExpenses.value = report.data.last_week_expenses || 0
        expensesByCategory.value = report.data.expenses_by_category || {}
        bodegaStock.value = report.data.bodega_stock || []
        currentBodegaStock.value = report.data.current_bodega_stock || []

        // Calculate totals
        totalWeeklyExpenses.value = weeklyExpenses.value.reduce((sum, exp) => sum + parseFloat(exp.amount), 0)

        // Group expenses by category
        const categoryMap = {}
        weeklyExpenses.value.forEach(expense => {
            const category = expense.category || 'Uncategorized'
            if (!categoryMap[category]) {
                categoryMap[category] = {
                    total: 0,
                    expenses: []
                }
            }
            categoryMap[category].total += parseFloat(expense.amount)
            categoryMap[category].expenses.push(expense)
        })
        expensesByCategory.value = categoryMap

        // Fetch client prices for revenue calculations
        const { data: clientPrices, error: priceErr } = await supabase
            .from('client_product_prices')
            .select('product_id, price')

        if (!priceErr && clientPrices) {
            const priceMap = {}
            for (const entry of clientPrices) {
                if (!priceMap[entry.product_id]) {
                    priceMap[entry.product_id] = parseFloat(entry.price)
                }
            }
            clientPriceMap.value = priceMap
        }

        isLoading.value = false
    } catch (error) {
        console.error('Error fetching report data:', error)
        isLoading.value = false
    }
})

// Product category totals
const singleWalledTotal = computed(() => {
    const inHouse = filteredDeliveries.value
        .filter(d => d.products?.category === 'Single Walled')
        .reduce((sum, d) => sum + (d.quantity || 0), 0)

    const subcon = filteredSubconDeliveries.value
        .filter(d => d.products?.category === 'Single Walled')
        .reduce((sum, d) => sum + (d.quantity || 0), 0)

    return inHouse + subcon
})

const doubleWalledTotal = computed(() => {
    const inHouse = filteredDeliveries.value
        .filter(d => d.products?.category === 'Double Walled')
        .reduce((sum, d) => sum + (d.quantity || 0), 0)

    const subcon = filteredSubconDeliveries.value
        .filter(d => d.products?.category === 'Double Walled')
        .reduce((sum, d) => sum + (d.quantity || 0), 0)

    return inHouse + subcon
})

// Total deliveries excluding miscellaneous
const totalDeliveries = computed(() => {
    return singleWalledTotal.value + doubleWalledTotal.value
})

// Chart data
const revenueComparisonData = computed(() => ({
    labels: ['In-House', 'Subcontractors'],
    datasets: [{
        data: [
            inHouseRevenue.value,
            subcontractorRevenue.value
        ],
        backgroundColor: [
            'rgba(59, 130, 246, 0.5)',  // Blue for in-house
            'rgba(16, 185, 129, 0.5)'   // Green for subcontractors
        ],
        borderColor: [
            'rgba(59, 130, 246, 1)',
            'rgba(5, 150, 105, 1)'
        ],
        borderWidth: 1
    }]
}))

const categoryBreakdownData = computed(() => {
    return {
        labels: ['Single Walled', 'Double Walled'],
        datasets: [{
            data: [
                singleWalledTotal.value,
                doubleWalledTotal.value
            ],
            backgroundColor: [
                'hsl(200, 70%, 60%)',
                'hsl(150, 70%, 60%)'
            ]
        }]
    }
})

// Subcontractor breakdown
const subcontractorBreakdown = computed(() => {
    const breakdown = {}

    filteredSubconDeliveries.value.forEach(delivery => {
        const name = delivery.subcontractors?.name || 'Unknown'
        const qty = delivery.quantity || 0
        const price = delivery.price_snapshot || delivery.products?.subcon_price || 0

        if (!breakdown[name]) {
            breakdown[name] = {
                name,
                deliveries: 0,
                totalQuantity: 0,
                totalValue: 0
            }
        }

        breakdown[name].deliveries += 1
        breakdown[name].totalQuantity += qty
        breakdown[name].totalValue += qty * price
    })

    return Object.values(breakdown).sort((a, b) => b.totalValue - a.totalValue)
})

// Update scrap revenue calculation to use actual transaction data
const scrapRevenue = computed(() => {
    return weeklyScrapRevenue.value || 0
})

const scrapChange = computed(() => {
    // Calculate scrap change based on current vs previous period
    const currentScrap = scrapRevenue.value

    if (currentScrap === 0) return 0

    // Note: In a real implementation, you would fetch previous period scrap data
    // For now, using mock data similar to AdminDashboard's pattern
    const mockPreviousScrap = 2250 // Weekly mock value

    return Math.round(((currentScrap - mockPreviousScrap) / mockPreviousScrap) * 100)
})

// Payroll data using actual payout data
const totalPayroll = computed(() => {
    const baseAmount = actualPayrollTotal.value || 0
    // Add +1000 offset when payroll is not zero (President's special request)
    return baseAmount > 0 ? baseAmount + 1000 : baseAmount
})

const pandiDeliveryRecords = computed(() => {
    const records = {}
    deliveries.value
        .filter(delivery => ['Single Walled', 'Double Walled'].includes(delivery.products?.category))
        .forEach(delivery => {
            const date = delivery.delivery_date
            if (!records[date]) {
                records[date] = {
                    date,
                    single: 0,
                    double: 0,
                    revenue: 0
                }
            }
            const qty = delivery.quantity || 0
            const price = delivery.price_snapshot ?? delivery.products?.price_per_unit ?? 0
            if (delivery.products?.category === 'Single Walled') {
                records[date].single += qty
            } else if (delivery.products?.category === 'Double Walled') {
                records[date].double += qty
            }
            records[date].revenue += qty * price
        })
    return Object.values(records).sort((a, b) => new Date(b.date) - new Date(a.date))
})

const subconDeliveryRecords = computed(() => {
    const records = {}
    subconDeliveries.value
        .filter(delivery => ['Single Walled', 'Double Walled'].includes(delivery.products?.category))
        .forEach(delivery => {
            const date = delivery.delivery_date
            if (!records[date]) {
                records[date] = {
                    date,
                    single: 0,
                    double: 0,
                    revenue: 0
                }
            }
            const qty = delivery.quantity || 0
            const price = delivery.price_snapshot ?? 0
            if (delivery.products?.category === 'Single Walled') {
                records[date].single += qty
            } else if (delivery.products?.category === 'Double Walled') {
                records[date].double += qty
            }
            records[date].revenue += qty * price
        })
    return Object.values(records).sort((a, b) => new Date(b.date) - new Date(a.date))
})
</script>

<style scoped>
/* Custom Scrollbar Styling */
.custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
}
</style>