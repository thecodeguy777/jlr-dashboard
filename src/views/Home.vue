<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white p-3 md:p-6 space-y-4 md:space-y-8">
    <!-- Enhanced Header -->
    <div class="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 md:gap-4">
      <div class="flex justify-between items-center mb-6">
        <div class="text-2xl font-bold tracking-tight">👑 Executive Dashboard</div>
        <div class="flex items-center gap-4">
          <!--<button @click="copyShareableLink"
            class="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z">
              </path>
            </svg>
            Share Report
          </button>
          <p v-if="userStore.user" class="text-sm text-white/60">Welcome back, {{ userStore.user.email }}</p>-->
        </div>
      </div>
    </div>

    <!-- Period Selector -->
    <div class="bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/20">
      <div class="flex items-center gap-2 md:gap-3">
        <div
          class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <svg class="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        </div>
        <div>
          <div class="flex space-x-1 md:space-x-2 mb-1 md:mb-2">
            <button v-for="option in ['daily', 'weekly', 'monthly']" :key="option" :class="[
              'px-2 md:px-3 py-1 rounded-full text-xs transition-all',
              level === option
                ? 'bg-purple-500 text-white font-semibold'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            ]" @click="level = option">
              {{ option.charAt(0).toUpperCase() + option.slice(1) }}
            </button>
          </div>
          <input type="date" v-model="deliveryDate"
            class="bg-white/10 text-white text-xs px-2 py-1 rounded border border-white/20 w-full" />
        </div>
      </div>
    </div>

    <!-- Loading State -->
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

    <!-- Main Content -->
    <div v-else class="space-y-8">
      <!-- Enhanced Hero Summary Card -->
      <div
        class="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-2xl md:rounded-3xl shadow-2xl">
        <!-- Background Pattern -->
        <div class="absolute inset-0 opacity-10">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]">
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
                  <svg class="w-6 h-6 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1">
                    </path>
                  </svg>
                </div>
                <div>
                  <h2 class="text-lg md:text-2xl font-bold text-white leading-tight">{{ reportTitle }}</h2>
                  <p class="text-purple-100 font-medium text-sm md:text-base"> RenewCo Weekly Performance Report</p>
                </div>
              </div>
            </div>

            <div class="text-center md:text-right">
              <p class="text-purple-100 text-sm md:text-base lg:text-lg font-medium mb-2">📊 Financial Overview</p>

              <!-- Sales, Cost, Profit Grid -->
              <div class="grid grid-cols-3 gap-2 md:gap-4 mb-2">
                <div class="text-center min-w-0">
                  <p class="text-green-300 text-xs font-medium">SALES</p>
                  <p class="text-green-400 font-bold text-xs md:text-sm lg:text-base break-words">₱{{ Math.round(totalSales).toLocaleString() }}
                  </p>
                </div>
                <div class="text-center min-w-0">
                  <p class="text-red-300 text-xs font-medium">COST</p>
                  <p class="text-red-400 font-bold text-xs md:text-sm lg:text-base break-words">₱{{ Math.round(totalCosts).toLocaleString() }}
                  </p>
                </div>
                <div class="text-center min-w-0">
                  <p class="text-purple-200 text-xs font-medium">PROFIT</p>
                  <p :class="[
                    'font-bold text-xs md:text-sm lg:text-base break-words',
                    totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
                  ]">
                    {{ totalProfit >= 0 ? '+' : '' }}₱{{ Math.round(totalProfit).toLocaleString() }}
                  </p>
                </div>
              </div>

              <!-- Sales Breakdown (like AdminDashboard) -->
              <div class="text-xs text-purple-100/80 space-y-1 border-t border-white/20 pt-2">
                <div class="flex justify-between">
                  <span>Product Sales:</span>
                  <span>₱{{ Math.round(productSales).toLocaleString() }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Scrap Revenue:</span>
                  <span>₱{{ Math.round(scrapRevenue).toLocaleString() }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Payroll:</span>
                  <span>₱{{ computedTotalPayroll.toLocaleString() }}</span>
                </div>
              </div>

            </div>
          </div>

          <!-- Quick Stats -->
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 pt-3 md:pt-4 border-t border-white/20 items-center">
            <div class="text-center">
              <p class="text-purple-100/80 text-xs font-medium">In-House</p>
              <p class="text-white font-bold text-sm md:text-lg">₱{{ Math.round(totalPayroll).toLocaleString() }}</p>
            </div>
            <div class="text-center">
              <p class="text-purple-100/80 text-xs font-medium">Subcontractors</p>
              <p class="text-white font-bold text-sm md:text-lg">₱{{ Math.round(subcontractorRevenue).toLocaleString()
              }}</p>
            </div>
            <div class="text-center">
              <p class="text-purple-100/80 text-xs font-medium">Avg/Piece</p>
              <p class="text-white font-bold text-sm md:text-lg">₱{{ totalRevenue > 0 ? Math.round(totalRevenue /
                totalDeliveries)
                : 0 }}</p>
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
          <div class="bg-white/5 rounded-lg p-4 border border-white/10">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6">
                </path>
              </svg>
              <span class="text-green-300 text-sm font-medium">Weekly Total</span>
            </div>
            <p class="text-white text-2xl font-bold">{{ totalDeliveries.toLocaleString() }} pcs</p>
            <p :class="[
              'text-sm',
              weeklyChange > 0 ? 'text-green-400' : weeklyChange < 0 ? 'text-red-400' : 'text-white/40'
            ]">
              <span v-if="weeklyChange > 0">↑ +{{ weeklyChange }}% from last {{ level === 'weekly' ? 'week' : level ===
                'monthly' ? 'month' : 'day' }}</span>
              <span v-else-if="weeklyChange < 0">↓ {{ weeklyChange }}% from last {{ level === 'weekly' ?
                'week' : level === 'monthly' ? 'month' : 'day' }}</span>
              <span v-else>— No change from last {{ level === 'weekly' ? 'week' : level === 'monthly' ? 'month' : 'day'
              }}</span>
            </p>
          </div>

          <div class="bg-white/5 rounded-lg p-4 border border-white/10">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-blue-300 text-sm font-medium">Single Walled</span>
            </div>
            <p class="text-white text-2xl font-bold">{{ singleWalledTotal.toLocaleString() }}</p>
            <p class="text-blue-400 text-sm">{{ Math.round((singleWalledTotal / totalDeliveries) * 100) || 0 }}% of
              total</p>
          </div>

          <div class="bg-white/5 rounded-lg p-4 border border-white/10">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-orange-300 text-sm font-medium">Double Walled</span>
            </div>
            <p class="text-white text-2xl font-bold">{{ doubleWalledTotal.toLocaleString() }}</p>
            <p class="text-orange-400 text-sm">{{ Math.round((doubleWalledTotal / totalDeliveries) * 100) || 0 }}% of
              total
            </p>
          </div>
        </div>

        <!-- In-house vs Subcon Comparison -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="bg-white/5 rounded-lg p-4 border border-white/10">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4">
                    </path>
                  </svg>
                </div>
                <span class="text-blue-300 text-sm font-medium">In-house</span>
              </div>
              <p class="text-white text-xl font-bold">{{ filteredInHouseDeliveries.length }} deliveries</p>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-white/60 text-sm">Single Walled:</span>
                <span class="text-white font-medium">{{ inHouseSingleWalled.toLocaleString() }} pcs</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-white/60 text-sm">Double Walled:</span>
                <span class="text-white font-medium">{{ inHouseDoubleWalled.toLocaleString() }} pcs</span>
              </div>
              <div class="flex justify-between items-center pt-2 border-t border-white/10">
                <span class="text-blue-300 text-sm font-medium">Total Production:</span>
                <span class="text-blue-400 font-bold">{{ inHouseTotal.toLocaleString() }} pcs</span>
              </div>
            </div>
          </div>

          <div class="bg-white/5 rounded-lg p-4 border border-white/10">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z">
                    </path>
                  </svg>
                </div>
                <span class="text-purple-300 text-sm font-medium">Subcontractor</span>
              </div>
              <p class="text-white text-xl font-bold">{{ filteredSubconDeliveries.length }} deliveries</p>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-white/60 text-sm">Single Walled:</span>
                <span class="text-white font-medium">{{ subconSingleWalled.toLocaleString() }} pcs</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-white/60 text-sm">Double Walled:</span>
                <span class="text-white font-medium">{{ subconDoubleWalled.toLocaleString() }} pcs</span>
              </div>
              <div class="flex justify-between items-center pt-2 border-t border-white/10">
                <span class="text-purple-300 text-sm font-medium">Total Production:</span>
                <span class="text-purple-400 font-bold">{{ subconTotal.toLocaleString() }} pcs</span>
              </div>
            </div>
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
            <p class="text-indigo-300 text-sm">Payroll to be paid this {{ level === 'weekly' ? 'week' : level ===
              'monthly' ? 'month' : 'day' }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white/5 rounded-lg p-4 border border-white/10">
            <div class="flex items-center justify-between mb-2">
              <span class="text-indigo-300 text-sm font-medium">Gross Payroll Summary</span>
              <span class="text-indigo-400 font-bold text-xl">₱{{ Math.round(totalGross).toLocaleString() }}</span>
            </div>
            <div class="text-xs text-indigo-100/60 mt-2">
              Total gross earnings before deductions
            </div>
            <div class="grid grid-cols-2 gap-4 text-xs mt-3">
              <div>
                <span class="text-white/60">Deductions:</span>
                <span class="text-white font-medium ml-2">₱{{ Math.round(totalDeductions).toLocaleString() }}</span>
              </div>
              <div>
                <span class="text-white/60">Avg Gross/Worker:</span>
                <span class="text-white font-medium ml-2">₱{{ activeWorkers > 0 ? Math.round(totalGross /
                  activeWorkers).toLocaleString() : '0' }}</span>
              </div>
            </div>
          </div>
          <!-- Net Payroll Card -->
          <div class="bg-white/5 rounded-lg p-4 border border-white/10">

            <div class="flex items-center justify-between mb-2">
              <span class="text-indigo-300 text-sm font-medium">Net Payroll</span>
              <span class="text-indigo-400 font-bold text-xl">₱{{ computedTotalPayroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
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
                <span class="text-white font-medium ml-2">₱{{ activeWorkers > 0 ? Math.round(totalPayroll /
                  activeWorkers).toLocaleString() : '0' }}</span>
              </div>
            </div>
          </div>

          <!-- Gross Summary Card -->

        </div>

        <!-- Collapsible Payroll Breakdown Table -->
        <details class="bg-white/5 rounded-lg border border-white/10 mt-6">
          <summary class="cursor-pointer p-4 hover:bg-white/5 transition-colors">
            <span class="text-white font-medium">📋 Detailed Payroll Breakdown ({{ payoutBreakdown.length }} employees)</span>
          </summary>

          <div class="p-4 pt-0">
            <!-- Mobile View - Compact Card Table -->
            <div class="space-y-1 md:hidden">
              <div v-for="person in payoutBreakdown" :key="person.id"
                class="bg-white/5 px-3 py-2 rounded border border-white/10 hover:bg-white/10 transition-colors">
                <!-- Single Row Layout -->
                <div class="flex items-center justify-between gap-2">
                  <!-- Name (left side) -->
                  <div class="text-sm font-medium text-white truncate flex-1 min-w-0">
                    {{ person.name }}
                  </div>
                  <!-- Total (right side) -->
                  <div class="text-sm font-bold text-indigo-400 whitespace-nowrap">
                    ₱{{ person.total }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Desktop Table -->
            <div class="hidden md:block overflow-x-auto">
              <table class="min-w-full text-sm text-white/80 table-auto">
                <thead class="border-b border-white/10">
                  <tr>
                    <th class="text-left py-2 pr-4 text-indigo-300">Name</th>
                    <th class="text-left py-2 pr-4 text-indigo-300">Gross</th>
                    <th class="text-left py-2 pr-4 text-indigo-300">Cash Advance</th>
                    <th class="text-left py-2 pr-4 text-indigo-300">Savings</th>
                    <th class="text-left py-2 pr-4 text-indigo-300">Contributions</th>
                    <th class="text-left py-2 pr-4 text-indigo-300">Deductibles</th>
                    <th class="text-left py-2 pr-4 text-indigo-300">Allowance</th>
                    <th class="text-left py-2 pr-4 text-indigo-300">Refund</th>
                    <th class="text-left py-2 text-indigo-300">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="person in payoutBreakdown" :key="person.id"
                    class="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td class="py-2 pr-4 font-medium text-white">{{ person.name }}</td>
                    <td class="py-2 pr-4">{{ person.gross || '' }}</td>
                    <td class="py-2 pr-4 text-red-300">{{ person.cashAdvance || '' }}</td>
                    <td class="py-2 pr-4 text-red-300">{{ person.savings || '' }}</td>
                    <td class="py-2 pr-4 text-red-300">{{ person.contributions || '' }}</td>
                    <td class="py-2 pr-4 text-red-300">{{ person.deductibles || '' }}</td>
                    <td class="py-2 pr-4 text-green-300">{{ person.allowance || '' }}</td>
                    <td class="py-2 pr-4 text-green-300">{{ person.refund || '' }}</td>
                    <td class="py-2 font-bold text-indigo-400">{{ person.total || '' }}</td>
                  </tr>
                </tbody>
                <tfoot class="border-t border-white/10 text-white/80 bg-white/5">
                  <tr>
                    <th class="text-left py-3 pr-4 text-indigo-300">Total</th>
                    <th class="text-left py-3 pr-4">₱{{ totalColumn('gross') }}</th>
                    <th class="text-left py-3 pr-4 text-red-400">₱{{ totalColumn('cashAdvance') }}</th>
                    <th class="text-left py-3 pr-4 text-red-400">₱{{ totalColumn('savings') }}</th>
                    <th class="text-left py-3 pr-4 text-red-400">₱{{ totalColumn('contributions') }}</th>
                    <th class="text-left py-3 pr-4 text-red-400">₱{{ totalColumn('deductibles') }}</th>
                    <th class="text-left py-3 pr-4 text-green-400">₱{{ totalColumn('allowance') }}</th>
                    <th class="text-left py-3 pr-4 text-green-400">₱{{ totalColumn('refund') }}</th>
                    <th class="text-left py-3 font-bold text-indigo-400">₱{{ totalColumn('total') }}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </details>
      </div>
      <!-- Weekly Expense Breakdown -->
      <div v-if="Object.keys(expensesByCategory).length > 0"
        class="bg-gradient-to-br from-orange-900/20 to-red-900/20 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-orange-500/30">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
            <svg class="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1">
              </path>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-bold text-white">💸 Weekly Expense Breakdown</h3>
            <p class="text-orange-300 text-sm">Detailed breakdown of expenses by category</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="[name, category] in Object.entries(expensesByCategory)" :key="name"
            @click="toggleCategoryExpansion(name)"
            class="bg-white/5 rounded-lg p-4 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
            <div class="flex justify-between items-center mb-2">
              <h4 class="font-medium text-white/90 flex items-center gap-2">
                {{ name }}
                <svg v-if="category.items.length > 3" :class="['w-4 h-4 text-white/50 transition-transform',
                  expandedCategories.has(name) ? 'rotate-180' : '']" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </h4>
              <span class="text-orange-400 font-bold">₱{{ (category.total || 0).toLocaleString() }}</span>
            </div>

            <div class="text-xs text-white/60 mb-3">
              {{ category.count }} transaction{{ category.count !== 1 ? 's' : '' }}
            </div>

            <!-- Individual transactions -->
            <div class="space-y-1" :class="expandedCategories.has(name) ? 'max-h-none' : 'max-h-24 overflow-hidden'">
              <div v-for="expense in (expandedCategories.has(name) ? category.items : category.items.slice(0, 3))"
                :key="expense.id" class="flex justify-between items-start text-xs gap-2">
                <div class="flex-1 min-w-0">
                  <div class="text-white/60 truncate">{{ expense.note || 'No description' }}</div>
                  <div class="text-white/40 text-xs mt-0.5">
                    {{ formatExpenseDate(expense.date) }}
                  </div>
                </div>
                <span class="text-orange-300 font-medium whitespace-nowrap">₱{{
                  parseFloat(expense.amount).toLocaleString() }}</span>
              </div>
              <div v-if="category.items.length > 3 && !expandedCategories.has(name)"
                class="text-xs text-white/40 text-center hover:text-white/60 transition-colors">
                +{{ category.items.length - 3 }} more... (click to expand)
              </div>
              <div v-if="category.items.length > 3 && expandedCategories.has(name)"
                class="text-xs text-white/40 text-center hover:text-white/60 transition-colors">
                Click to collapse
              </div>
            </div>
          </div>
        </div>

        <!-- Total Summary with Balance Remaining -->
        <div class="mt-6 pt-4 border-t border-white/10 space-y-3">
          <div class="flex justify-between items-center">
            <div class="space-y-1">
              <span class="text-white/80 font-medium">Total Weekly Expenses</span>
              <p class="text-xs" :class="{
                'text-green-400': expensesPercentChange < 0,
                'text-orange-400': expensesPercentChange > 0,
                'text-white/40': expensesPercentChange === 0
              }">
                <span v-if="expensesPercentChange > 0">↑ +{{ expensesPercentChange }}% from last {{ level === 'weekly' ?
                  'week' : level === 'monthly' ? 'month' : 'day' }}</span>
                <span v-else-if="expensesPercentChange < 0">↓ {{ expensesPercentChange }}% from last {{ level === 'weekly'
                  ? 'week' : level === 'monthly' ? 'month' : 'day' }}</span>
                <span v-else>— No change from last {{ level === 'weekly' ? 'week' : level === 'monthly' ? 'month' : 'day'
                }}</span>
              </p>
            </div>
            <span class="text-2xl font-bold text-orange-400">₱{{ (totalWeeklyExpenses || 0).toLocaleString() }}</span>
          </div>
          <div class="flex justify-between items-center pt-3 border-t border-orange-500/30">
            <span class="text-white font-semibold">Balance Remaining:</span>
            <span :class="[
              'text-2xl font-bold',
              balanceRemaining >= 0 ? 'text-green-400' : 'text-red-400'
            ]">
              {{ balanceRemaining >= 0 ? '+' : '' }}₱{{ balanceRemaining.toLocaleString() }}
            </span>
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
                <span class="text-green-400 font-bold text-sm">₱{{ Math.round(record.revenue).toLocaleString() }}</span>
              </div>
              <p class="text-white/70 text-xs">
                Single: {{ record.single.toLocaleString() }} pcs, Double: {{ record.double.toLocaleString() }} pcs
              </p>
            </div>
          </div>

          <div v-if="pandiDeliveryRecords.length === 0" class="text-center py-6">
            <div class="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-3">
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
                <span class="text-purple-400 font-bold text-sm">₱{{ Math.round(record.revenue).toLocaleString()
                }}</span>
              </div>
              <p class="text-white/70 text-xs">
                Single: {{ record.single.toLocaleString() }} pcs, Double: {{ record.double.toLocaleString() }} pcs
              </p>
            </div>
          </div>

          <div v-if="subconDeliveryRecords.length === 0" class="text-center py-6">
            <div class="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4">
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
              <span class="text-orange-400 font-bold">₱{{ Math.round(subcon.totalValue).toLocaleString() }}</span>
            </div>
            <div class="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span class="text-white/60">Total Quantity:</span>
                <span class="text-white font-medium ml-2">{{ subcon.totalQuantity.toLocaleString() }} pcs</span>
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

      <!-- Bodega Stock Grid (Previous & Current Side by Side) -->
      <div class="grid gap-6 md:grid-cols-2">
        <!-- Previous Bodega Stock Summary -->
        <div
          class="bg-gradient-to-br from-teal-900/20 to-cyan-900/20 backdrop-blur-sm rounded-2xl p-6 border border-teal-500/30">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
            <svg class="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">Previous Bodega Stock Summary</h3>
            <p class="text-teal-300 text-sm">Previous week inventory levels by category</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div class="bg-white/5 rounded-lg p-4 border border-white/10">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-teal-300 text-sm font-medium">Single Walled</span>
            </div>
            <p class="text-white text-2xl font-bold">{{ bodegaSingleWallTotal.toLocaleString() }} pcs</p>
            <p class="text-teal-400 text-sm">₱{{ Math.round(bodegaSingleWallValue).toLocaleString() }} value</p>
          </div>

          <div class="bg-white/5 rounded-lg p-4 border border-white/10">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-cyan-300 text-sm font-medium">Double Walled</span>
            </div>
            <p class="text-white text-2xl font-bold">{{ bodegaDoubleWallTotal.toLocaleString() }} pcs</p>
            <p class="text-cyan-400 text-sm">₱{{ Math.round(bodegaDoubleWallValue).toLocaleString() }} value</p>
          </div>

          <div class="bg-white/5 rounded-lg p-4 border border-white/10">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-white/70 text-sm font-medium">Total Stock</span>
            </div>
            <p class="text-white text-2xl font-bold">{{ (bodegaSingleWallTotal + bodegaDoubleWallTotal).toLocaleString()
            }} pcs</p>
            <p class="text-white/70 text-sm">₱{{ Math.round(bodegaTotalValue).toLocaleString() }} total value</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 text-xs mb-4">
          <div>
            <span class="text-white/60">Active Workers:</span>
            <span class="text-white font-medium ml-2">{{ bodegaActiveWorkers }}</span>
          </div>
          <div>
            <span class="text-white/60">Avg per Worker:</span>
            <span class="text-white font-medium ml-2">₱{{ bodegaActiveWorkers > 0 ? Math.round(bodegaTotalValue /
              bodegaActiveWorkers).toLocaleString() : '0' }}</span>
          </div>
        </div>

        <!-- Grouped by Product -->
        <details class="bg-white/5 rounded-lg border border-white/10">
          <summary class="cursor-pointer p-4 hover:bg-white/5 transition-colors">
            <span class="text-white font-medium">📦 Grouped by Product ({{ previousBodegaByProduct.length }} products)</span>
          </summary>

          <div class="p-4 pt-0 space-y-3">
            <div v-for="product in previousBodegaByProduct" :key="product.productName"
              class="bg-white/5 rounded-lg p-3 border border-white/10">
              <!-- Product Name -->
              <div class="font-bold text-teal-300 mb-2">{{ product.productName }}</div>

              <!-- Worker entries -->
              <div class="space-y-1 ml-3 mb-2">
                <div v-for="(entry, idx) in product.entries" :key="idx" class="text-sm text-white/80">
                  • {{ entry.workerName }} – {{ entry.quantity.toLocaleString() }} pcs ₱{{ entry.value.toLocaleString() }}
                </div>
              </div>

              <!-- Product Total -->
              <div class="border-t border-white/20 pt-2 mt-2 text-sm font-medium text-teal-400">
                ➡ Total = {{ product.totalQty.toLocaleString() }} pcs ₱{{ product.totalValue.toLocaleString() }}
              </div>
            </div>
          </div>
        </details>
        </div>

        <!-- Current Bodega Stock Summary -->
        <div
          class="bg-gradient-to-br from-emerald-900/20 to-green-900/20 backdrop-blur-sm rounded-2xl p-6 border border-emerald-500/30">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">Current Bodega Stock Summary</h3>
            <p class="text-emerald-300 text-sm">Fetching data from: {{ new Date(currentBodegaStockDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div class="bg-white/5 rounded-lg p-4 border border-white/10">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-emerald-300 text-sm font-medium">Single Walled</span>
            </div>
            <p class="text-white text-2xl font-bold">{{ currentBodegaSingleWallTotal.toLocaleString() }} pcs</p>
            <p class="text-emerald-400 text-sm">₱{{ Math.round(currentBodegaSingleWallValue).toLocaleString() }} value</p>
          </div>

          <div class="bg-white/5 rounded-lg p-4 border border-white/10">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-green-300 text-sm font-medium">Double Walled</span>
            </div>
            <p class="text-white text-2xl font-bold">{{ currentBodegaDoubleWallTotal.toLocaleString() }} pcs</p>
            <p class="text-green-400 text-sm">₱{{ Math.round(currentBodegaDoubleWallValue).toLocaleString() }} value</p>
          </div>

          <div class="bg-white/5 rounded-lg p-4 border border-white/10">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-white/70 text-sm font-medium">Total Stock</span>
            </div>
            <p class="text-white text-2xl font-bold">{{ (currentBodegaSingleWallTotal + currentBodegaDoubleWallTotal).toLocaleString() }} pcs</p>
            <p class="text-white/70 text-sm">₱{{ Math.round(currentBodegaTotalValue).toLocaleString() }} total value</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 text-xs mb-4">
          <div>
            <span class="text-white/60">Active Workers:</span>
            <span class="text-white font-medium ml-2">{{ currentBodegaActiveWorkers }}</span>
          </div>
          <div>
            <span class="text-white/60">Avg per Worker:</span>
            <span class="text-white font-medium ml-2">₱{{ currentBodegaActiveWorkers > 0 ? Math.round(currentBodegaTotalValue / currentBodegaActiveWorkers).toLocaleString() : '0' }}</span>
          </div>
        </div>

        <!-- Grouped by Product -->
        <details class="bg-white/5 rounded-lg border border-white/10">
          <summary class="cursor-pointer p-4 hover:bg-white/5 transition-colors">
            <span class="text-white font-medium">📦 Grouped by Product ({{ bodegaByProduct.length }} products)</span>
          </summary>

          <div class="p-4 pt-0 space-y-3">
            <div v-for="product in bodegaByProduct" :key="product.productName"
              class="bg-white/5 rounded-lg p-3 border border-white/10">
              <!-- Product Name -->
              <div class="font-bold text-emerald-300 mb-2">{{ product.productName }}</div>

              <!-- Worker entries -->
              <div class="space-y-1 ml-3 mb-2">
                <div v-for="(entry, idx) in product.entries" :key="idx" class="text-sm text-white/80">
                  • {{ entry.workerName }} – {{ entry.quantity.toLocaleString() }} pcs ₱{{ entry.value.toLocaleString() }}
                </div>
              </div>

              <!-- Product Total -->
              <div class="border-t border-white/20 pt-2 mt-2 text-sm font-medium text-emerald-400">
                ➡ Total = {{ product.totalQty.toLocaleString() }} pcs ₱{{ product.totalValue.toLocaleString() }}
              </div>
            </div>
          </div>
        </details>
        </div>
      </div>

      <!-- Financial Summary Grid -->
      <div class="grid gap-6 md:grid-cols-2">

        <!-- Scrap Revenue -->
        <div
          class="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 backdrop-blur-sm rounded-2xl p-6 border border-yellow-500/30">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">
                </path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">Scrap Revenue</h3>
              <p class="text-yellow-300 text-sm">Material recovery income</p>
            </div>
          </div>

          <div class="space-y-4">
            <div class="bg-white/5 rounded-lg p-4 border border-white/10">
              <div class="flex items-center justify-between mb-2">
                <span class="text-yellow-300 text-sm font-medium">Total Scrap Sales</span>
                <span class="text-yellow-400 font-bold text-xl">₱{{ Math.round(scrapRevenue).toLocaleString() }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-white/60 text-xs">vs last {{ level === 'weekly' ? 'week' : level === 'monthly' ?
                  'month' : 'day' }}:</span>
                <span :class="[
                  'text-xs font-medium',
                  scrapChange > 0 ? 'text-green-400' : scrapChange < 0 ? 'text-red-400' : 'text-white/40'
                ]">
                  <template v-if="scrapChange > 0">↑ +{{ scrapChange }}%</template>
                  <template v-else-if="scrapChange < 0">↓ {{ scrapChange }}%</template>
                  <template v-else>— No change</template>
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { format, subDays, startOfWeek, endOfWeek, addDays } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import DeliveryBarChart from '../components/BarChart.vue'
import ProductPieChart from '../components/ProductPieChart.vue'

const router = useRouter()

// Remove userStore since we don't need auth anymore
onMounted(fetchData)

const level = ref('weekly')
const deliveryDate = ref(new Date().toISOString().split('T')[0]) // Set to current date
const isLoading = ref(true)

// Data
const deliveries = ref([])
const subconDeliveries = ref([])
const clientPriceMap = ref({})
const weeklyScrapRevenue = ref(0)
const lastWeekScrapRevenue = ref(0) // Previous week scrap revenue for comparison
const scrapPercentChange = ref(0) // Scrap revenue percentage change
const previousPeriodDeliveries = ref([])
const previousPeriodSubconDeliveries = ref([])
const actualPayrollTotal = ref(0)
const bodegaStock = ref([]) // Previous week stock
const currentBodegaStock = ref([]) // Current week stock
const currentBodegaStockDate = ref('') // Date being fetched for current bodega stock
const payoutBreakdown = ref([]) // Add payoutBreakdown data

// Computed: Total payroll from breakdown (matching AdminDashboard)
const computedTotalPayroll = computed(() => {
  return payoutBreakdown.value.reduce((sum, person) => {
    const total = parseFloat(person.total) || 0
    return sum + total
  }, 0)
})

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
  const saturday = calculateSaturday(date)
  const start = calculateStartOfWeek(saturday)
  start.setHours(0, 0, 0, 0)
  return start
})

const weekEnd = computed(() => {
  const end = new Date(weekStart.value)
  end.setDate(end.getDate() + 7)
  end.setHours(23, 59, 59, 999)
  return end
})

const monthStart = computed(() => new Date(selectedDate.value.getFullYear(), selectedDate.value.getMonth(), 1))

const monthEnd = computed(() => {
  const end = new Date(selectedDate.value.getFullYear(), selectedDate.value.getMonth() + 1, 1)
  end.setMilliseconds(-1)
  return end
})

// Create a reusable function to fetch all data
async function fetchData() {
  isLoading.value = true

  try {
    // Get date ranges for current and previous periods
    const { start, end } = getDateRange()
    const { start: lastStart, end: lastEnd } = getPreviousDateRange()

    // Fetch payout breakdown data (matching AdminDashboard logic)
    let payoutQuery = supabase
      .from('payouts')
      .select(`
        employee_id,
        gross_income,
        paid_by_hours,
        deductions,
        allowances,
        net_total,
        confirmed_at,
        week_start,
        workers:workers!payouts_employee_id_fkey (
          name
        )
      `)
      .not('confirmed_at', 'is', null)

    // For monthly: filter by week_start date range, for weekly: exact week_start match
    if (level.value === 'monthly') {
      payoutQuery = payoutQuery
        .gte('week_start', start)
        .lte('week_start', end)
    } else {
      payoutQuery = payoutQuery
        .gte('week_start', start)
        .lte('week_start', end)
    }

    const { data: payoutsThisWeek, error: payoutBreakdownError } = await payoutQuery

    if (payoutBreakdownError) {
      console.error('Error fetching payouts:', payoutBreakdownError)
    } else {
      // Group payouts by employee to handle multiple payouts in the same week
      const employeePayouts = {}
      payoutsThisWeek?.forEach(p => {
        if (!employeePayouts[p.employee_id]) {
          employeePayouts[p.employee_id] = {
            employee_id: p.employee_id,
            name: p.workers?.name || '—',
            gross: 0,
            cashAdvance: 0,
            savings: 0,
            contributions: 0,
            deductibles: 0,
            allowance: 0,
            refund: 0,
            total: 0
          }
        }

        const d = p.deductions || {}
        const a = p.allowances || {}

        employeePayouts[p.employee_id].gross += (p.gross_income || 0)
        employeePayouts[p.employee_id].cashAdvance += parseFloat(d.cash_advance || 0)
        employeePayouts[p.employee_id].savings += parseFloat(d.savings || 0)
        employeePayouts[p.employee_id].contributions += parseFloat(d.sss || 0)
        employeePayouts[p.employee_id].deductibles += parseFloat(d.loan || 0)
        employeePayouts[p.employee_id].allowance += Object.values(a).reduce((sum, val) => {
          const num = parseFloat(val)
          return sum + (isNaN(num) ? 0 : num)
        }, 0)
        employeePayouts[p.employee_id].refund += parseFloat(a.refund || 0)
        employeePayouts[p.employee_id].total += p.net_total || 0
      })

      payoutBreakdown.value = Object.values(employeePayouts).map(p => ({
        id: p.employee_id,
        name: p.name,
        gross: parseFloat(p.gross).toFixed(2),
        cashAdvance: p.cashAdvance ? parseFloat(p.cashAdvance).toFixed(2) : '',
        savings: p.savings ? parseFloat(p.savings).toFixed(2) : '',
        contributions: p.contributions ? parseFloat(p.contributions).toFixed(2) : '',
        deductibles: p.deductibles ? parseFloat(p.deductibles).toFixed(2) : '',
        allowance: p.allowance ? parseFloat(p.allowance).toFixed(2) : '',
        refund: p.refund ? parseFloat(p.refund).toFixed(2) : '',
        total: p.total ? parseFloat(p.total).toFixed(2) : ''
      }))

      console.log('Payroll Data:', {
        start,
        end,
        payouts: payoutsThisWeek,
        breakdown: payoutBreakdown.value
      })
    }

    // Fetch all-time balance (cumulative closing balance like CashTracker)
    await fetchAllTimeBalance()

    // Fetch cash tracker data (expenses and comparisons) - use transaction date ranges (Sunday-based)
    const { start: transStart, end: transEnd } = getTransactionDateRange()
    const { start: transLastStart, end: transLastEnd } = getPreviousTransactionDateRange()
    console.log('🔍 Transaction date ranges:', {
      current: { start: transStart, end: transEnd },
      previous: { start: transLastStart, end: transLastEnd }
    })
    await fetchCashTrackerData(transStart, transEnd, transLastStart, transLastEnd)

    // Fetch client prices first
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

    // Fetch scrap revenue from transactions
    const { data: scrapTopups, error: scrapErr } = await supabase
      .from('transactions')
      .select('amount, date')
      .eq('type', 'topup')
      .eq('category', 'Scrap')
      .gte('date', start)
      .lte('date', end)

    if (!scrapErr && scrapTopups) {
      weeklyScrapRevenue.value = scrapTopups.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
      console.log('Current Period Scrap Revenue:', {
        start,
        end,
        transactions: scrapTopups,
        total: weeklyScrapRevenue.value
      })
    }

    // Fetch previous period scrap revenue for comparison
    const { start: lastScrapStart, end: lastScrapEnd } = getPreviousDateRange()
    const { data: prevScrapTopups, error: prevScrapErr } = await supabase
      .from('transactions')
      .select('amount, date')
      .eq('type', 'topup')
      .eq('category', 'Scrap')
      .gte('date', lastScrapStart)
      .lte('date', lastScrapEnd)

    if (!prevScrapErr && prevScrapTopups) {
      const prevScrapRevenue = prevScrapTopups.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
      console.log('Previous Period Scrap Revenue:', {
        lastScrapStart,
        lastScrapEnd,
        transactions: prevScrapTopups,
        total: prevScrapRevenue
      })
    }

    // Fetch current period deliveries
    const { data: inHouseData, error: inHouseError } = await supabase
      .from('deliveries')
      .select('*, products(*), workers(*)')

    const { data: subconData, error: subconError } = await supabase
      .from('subcon_deliveries')
      .select('*, products(*), subcontractors(*)')

    if (!inHouseError) deliveries.value = inHouseData || []
    if (!subconError) subconDeliveries.value = subconData || []

    // Fetch previous period deliveries for percentage calculations
    const { start: prevStart, end: prevEnd } = getPreviousDateRange()

    const { data: prevInHouseData, error: prevInHouseError } = await supabase
      .from('deliveries')
      .select('quantity, product_id, delivery_date, products(category)')
      .gte('delivery_date', prevStart)
      .lte('delivery_date', prevEnd)

    const { data: prevSubconData, error: prevSubconError } = await supabase
      .from('subcon_deliveries')
      .select('quantity, product_id, delivery_date, products(category)')
      .gte('delivery_date', prevStart)
      .lte('delivery_date', prevEnd)

    if (!prevInHouseError) previousPeriodDeliveries.value = prevInHouseData || []
    if (!prevSubconError) previousPeriodSubconDeliveries.value = prevSubconData || []

    // Fetch payroll data (only confirmed payouts - matching AdminDashboard)
    let payrollQuery = supabase
      .from('payouts')
      .select('net_total, gross_income, paid_by_hours, deductions, allowances, week_start')
      .not('confirmed_at', 'is', null)

    // For monthly: filter by week_start date range
    payrollQuery = payrollQuery
      .gte('week_start', start)
      .lte('week_start', end)

    const { data: payouts, error: payoutError } = await payrollQuery

    if (!payoutError && payouts) {
      actualPayrollTotal.value = payouts.reduce((sum, p) => sum + (p.net_total || 0), 0)
      payoutBreakdown.value = payouts.map(p => {
        const d = p.deductions || {}
        const a = p.allowances || {}

        return {
          ...p,
          gross: (p.gross_income || 0).toFixed(2), // Use gross_income directly like AdminDashboard
          cashAdvance: (parseFloat(d.cash_advance || 0)).toFixed(2),
          savings: (parseFloat(d.savings || 0)).toFixed(2),
          contributions: (parseFloat(d.sss || 0)).toFixed(2),
          deductibles: (parseFloat(d.loan || 0)).toFixed(2),
          allowance: Object.values(a).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2),
          refund: (parseFloat(a.refund || 0)).toFixed(2),
          total: (p.net_total || 0).toFixed(2) // Add total field for computedTotalPayroll
        }
      })
    }

    // Fetch bodega stock data
    if (level.value === 'monthly') {
      // For monthly: aggregate all bodega stock entries within the month
      const { data: currentMonthStockData, error: currentStockError } = await supabase
        .from('bodega_stock')
        .select('*, products(name, category, price_per_unit), workers(name)')
        .gte('week_start', start)
        .lte('week_start', end)

      if (!currentStockError && currentMonthStockData) {
        currentBodegaStock.value = currentMonthStockData
      }

      // Fetch previous month stock for comparison
      const { data: prevMonthStockData, error: prevStockError } = await supabase
        .from('bodega_stock')
        .select('*, products(name, category, price_per_unit), workers(name)')
        .gte('week_start', lastStart)
        .lte('week_start', lastEnd)

      if (!prevStockError && prevMonthStockData) {
        bodegaStock.value = prevMonthStockData
      }
    } else {
      // Weekly mode: use existing week-based logic
      const today = new Date(deliveryDate.value)
      today.setHours(0, 0, 0, 0)
      const saturday = calculateSaturday(today)
      const nextSaturday = new Date(saturday)
      nextSaturday.setDate(saturday.getDate() + 7)
      const nextWeekStart = calculateBodegaWeekStart(nextSaturday)
      const currentWeekStart = formatDateForDB(nextWeekStart)

      console.log('Current Stock Query:', {
        weekStart: currentWeekStart,
        selectedDate: deliveryDate.value
      })

      // Use the calculated current week start date
      currentBodegaStockDate.value = currentWeekStart // Store the date for display
      const { data: currentStockData, error: currentStockError } = await supabase
        .from('bodega_stock')
        .select('*, products(name, category, price_per_unit), workers(name)')
        .eq('week_start', currentWeekStart)

      if (!currentStockError && currentStockData) {
        currentBodegaStock.value = currentStockData
      }

      // Fetch previous bodega stock data (week -1, starts June 21)
      const startOfWeek = calculateBodegaWeekStart(saturday)
      const prevWeekStartStr = formatDateForDB(startOfWeek)

      console.log('Previous Stock Query:', {
        weekStart: prevWeekStartStr,
        selectedDate: deliveryDate.value
      })

      const { data: prevStockData, error: prevStockError } = await supabase
        .from('bodega_stock')
        .select('*, products(name, category, price_per_unit), workers(name)')
        .eq('week_start', prevWeekStartStr)

      if (!prevStockError && prevStockData) {
        bodegaStock.value = prevStockData
      }
    }

  } catch (error) {
    console.error('Error fetching dashboard data:', error)
  } finally {
    isLoading.value = false
  }
}

// Watch for changes in date or level and refetch data
watch([deliveryDate, level], fetchData)

// Helper function to get date range based on current filter (matching AdminDashboard exactly)
function getDateRange() {
  if (level.value === 'weekly') {
    // Use EXACT same logic as AdminDashboard
    const today = new Date(deliveryDate.value)
    today.setHours(0, 0, 0, 0)

    const saturday = calculateSaturday(today)
    const startOfWeek = calculateStartOfWeek(saturday)

    return {
      start: formatDateForDB(startOfWeek),
      end: formatDateForDB(saturday)
    }
  } else if (level.value === 'monthly') {
    return {
      start: monthStart.value.toISOString().split('T')[0],
      end: monthEnd.value.toISOString().split('T')[0]
    }
  } else {
    const nextDay = new Date(deliveryDate.value)
    nextDay.setDate(nextDay.getDate() + 1)
    return {
      start: deliveryDate.value,
      end: formatDateForDB(nextDay)
    }
  }
}

// Date range specifically for transaction data (expenses, scrap) - uses Sunday-based weeks
function getTransactionDateRange() {
  if (level.value === 'weekly') {
    // Use 6-day calculation (Sunday to Saturday) to match AdminDashboard and database
    const today = new Date(deliveryDate.value)
    today.setHours(0, 0, 0, 0)

    const saturday = calculateSaturday(today)
    const startOfWeek = new Date(saturday)
    startOfWeek.setDate(saturday.getDate() - 6)  // Sunday-based week

    return {
      start: formatDateForDB(startOfWeek),
      end: formatDateForDB(saturday)
    }
  } else if (level.value === 'monthly') {
    return {
      start: monthStart.value.toISOString().split('T')[0],
      end: monthEnd.value.toISOString().split('T')[0]
    }
  } else {
    const nextDay = new Date(deliveryDate.value)
    nextDay.setDate(nextDay.getDate() + 1)
    return {
      start: deliveryDate.value,
      end: formatDateForDB(nextDay)
    }
  }
}

// AdminDashboard's date calculation functions
function calculateSaturday(date) {
  const d = new Date(date)
  const day = d.getDay()
  // Saturday is 6
  const diff = 6 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function calculateStartOfWeek(saturday) {
  const startOfWeek = new Date(saturday)
  startOfWeek.setDate(saturday.getDate() - 7)
  return startOfWeek
}

// Separate function for bodega stock (uses old 6-day calculation)
function calculateBodegaWeekStart(saturday) {
  const startOfWeek = new Date(saturday)
  startOfWeek.setDate(saturday.getDate() - 6)
  return startOfWeek
}

function formatDateForDB(date) {
  return date.toISOString().split('T')[0]
}

// Helper function to get previous period date range (same as AdminDashboard)
function getPreviousDateRange() {
  if (level.value === 'weekly') {
    // Use AdminDashboard's Saturday-based week system
    const today = new Date(deliveryDate.value)
    today.setHours(0, 0, 0, 0)

    const saturday = calculateSaturday(today)
    const lastSaturday = new Date(saturday)
    lastSaturday.setDate(saturday.getDate() - 7)
    const lastStartOfWeek = calculateStartOfWeek(lastSaturday)

    return {
      start: formatDateForDB(lastStartOfWeek),
      end: formatDateForDB(lastSaturday)
    }
  } else if (level.value === 'monthly') {
    const prevMonthStart = new Date(monthStart.value)
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1)
    const prevMonthEnd = new Date(monthEnd.value)
    prevMonthEnd.setMonth(prevMonthEnd.getMonth() - 1)

    return {
      start: prevMonthStart.toISOString().split('T')[0],
      end: prevMonthEnd.toISOString().split('T')[0]
    }
  } else {
    const prevDay = new Date(deliveryDate.value)
    prevDay.setDate(prevDay.getDate() - 1)
    const prevDayStr = prevDay.toISOString().split('T')[0]

    return {
      start: prevDayStr,
      end: prevDayStr
    }
  }
}

// Previous transaction date range - uses Sunday-based weeks
function getPreviousTransactionDateRange() {
  if (level.value === 'weekly') {
    // Use 6-day calculation (Sunday to Saturday) for previous week
    const today = new Date(deliveryDate.value)
    today.setHours(0, 0, 0, 0)

    const saturday = calculateSaturday(today)
    const lastSaturday = new Date(saturday)
    lastSaturday.setDate(saturday.getDate() - 7)
    const lastStartOfWeek = new Date(lastSaturday)
    lastStartOfWeek.setDate(lastSaturday.getDate() - 6)  // Sunday-based week

    return {
      start: formatDateForDB(lastStartOfWeek),
      end: formatDateForDB(lastSaturday)
    }
  } else if (level.value === 'monthly') {
    const prevMonthStart = new Date(monthStart.value)
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1)
    const prevMonthEnd = new Date(monthEnd.value)
    prevMonthEnd.setMonth(prevMonthEnd.getMonth() - 1)

    return {
      start: prevMonthStart.toISOString().split('T')[0],
      end: prevMonthEnd.toISOString().split('T')[0]
    }
  } else {
    const prevDay = new Date(deliveryDate.value)
    prevDay.setDate(prevDay.getDate() - 1)
    const prevDayStr = prevDay.toISOString().split('T')[0]

    return {
      start: prevDayStr,
      end: prevDayStr
    }
  }
}

// Filter deliveries by date range
const filteredInHouseDeliveries = computed(() => {
  let results = Array.isArray(deliveries.value) ? deliveries.value : []

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

  // Filter by category (exclude miscellaneous)
  results = results.filter(d => ['Single Walled', 'Double Walled'].includes(d.products?.category))

  console.log('Filtered In-house Deliveries:', {
    date: deliveryDate.value,
    level: level.value,
    count: results.length,
    deliveries: results
  })

  return results
})

const filteredSubconDeliveries = computed(() => {
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

  // Filter by category (exclude miscellaneous)
  results = results.filter(d => ['Single Walled', 'Double Walled'].includes(d.products?.category))

  console.log('Filtered Subcon Deliveries:', {
    date: deliveryDate.value,
    level: level.value,
    count: results.length,
    deliveries: results
  })

  return results
})

// Combined metrics (excluding miscellaneous)
const totalDeliveries = computed(() => {
  return totalCategorizedDeliveries.value
})

// Helper functions for financial calculations (same as AdminDashboard)
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

// Sales Revenue (what customers pay us) - using client prices + scrap
const totalSales = computed(() => {
  // Calculate product sales using client prices
  const inHouseSales = sumSales(filteredInHouseDeliveries.value, clientPriceMap.value)
  const subconSales = sumSales(filteredSubconDeliveries.value, clientPriceMap.value)

  // Add scrap revenue to total sales (like AdminDashboard does)
  return inHouseSales + subconSales + (weeklyScrapRevenue.value || 0)
})

// Product Sales (excluding scrap)
const productSales = computed(() => {
  const inHouseSales = sumSales(filteredInHouseDeliveries.value, clientPriceMap.value)
  const subconSales = sumSales(filteredSubconDeliveries.value, clientPriceMap.value)
  return inHouseSales + subconSales
})

// Total Costs (what we spend to produce) - matching AdminDashboard logic
const totalCosts = computed(() => {
  // Product costs (in-house production costs + subcontractor costs)
  const inHouseCosts = sumCosts(filteredInHouseDeliveries.value, 'inhouse')
  const subconCosts = sumCosts(filteredSubconDeliveries.value, 'subcon')

  // Add payroll and expenses to cost
  const total = inHouseCosts + subconCosts + computedTotalPayroll.value + (totalWeeklyExpenses.value || 0)

  console.log('Total Costs Breakdown:', {
    inHouseCosts,
    subconCosts,
    payroll: computedTotalPayroll.value,
    expenses: totalWeeklyExpenses.value,
    total
  })

  return total
})

// Total Profit (Sales - Costs which already includes payroll and expenses)
const totalProfit = computed(() => {
  return totalSales.value - totalCosts.value
})

// Keep totalRevenue for backward compatibility, but use totalSales for display
const totalRevenue = computed(() => {
  return totalSales.value
})

const inHouseRevenue = computed(() => {
  return filteredInHouseDeliveries.value.reduce((sum, d) => {
    const price = d.price_snapshot ?? d.products?.price_per_unit ?? 0
    return sum + (d.quantity || 0) * price
  }, 0)
})

const subcontractorRevenue = computed(() => {
  return filteredSubconDeliveries.value.reduce((sum, d) => {
    const price = d.price_snapshot ?? 0
    return sum + (d.quantity || 0) * price
  }, 0)
})

const singleWalledTotal = computed(() => {
  const inHouse = filteredInHouseDeliveries.value
    .filter(d => d.products?.category === 'Single Walled')
    .reduce((sum, d) => sum + (d.quantity || 0), 0)

  const subcon = filteredSubconDeliveries.value
    .filter(d => d.products?.category === 'Single Walled')
    .reduce((sum, d) => sum + (d.quantity || 0), 0)

  return inHouse + subcon
})

const doubleWalledTotal = computed(() => {
  const inHouse = filteredInHouseDeliveries.value
    .filter(d => d.products?.category === 'Double Walled')
    .reduce((sum, d) => sum + (d.quantity || 0), 0)

  const subcon = filteredSubconDeliveries.value
    .filter(d => d.products?.category === 'Double Walled')
    .reduce((sum, d) => sum + (d.quantity || 0), 0)

  return inHouse + subcon
})

// Total deliveries excluding miscellaneous
const totalCategorizedDeliveries = computed(() => {
  return singleWalledTotal.value + doubleWalledTotal.value
})

// Weekly Expense Breakdown (matching AdminDashboard)
const weeklyExpenses = ref([])
const totalWeeklyExpenses = ref(0)
const expensesByCategory = ref({})
const lastWeekExpenses = ref(0)
const expensesPercentChange = ref(0)
const expandedCategories = ref(new Set())
const totalWeeklyTopups = ref(0) // All topups (for closing balance calculation)
const allTimeTopups = ref(0) // Cumulative topups from all time
const allTimeExpenses = ref(0) // Cumulative expenses from all time

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

// Calculate total for a column in payroll breakdown (like AdminDashboard)
function totalColumn(key) {
  const sum = payoutBreakdown.value.reduce((total, p) => {
    const num = parseFloat(p[key])
    return total + (isNaN(num) ? 0 : num)
  }, 0)
  return sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Fetch all-time transactions for cumulative closing balance (like CashTracker)
async function fetchAllTimeBalance() {
  try {
    const { data: allTransactions, error } = await supabase
      .from('transactions')
      .select('*')

    if (error) {
      console.error('All-time balance fetch error:', error)
      return
    }

    const allTopups = allTransactions?.filter(t => t.type === 'topup') || []
    const allExpenses = allTransactions?.filter(t => t.type === 'expense') || []

    allTimeTopups.value = allTopups.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
    allTimeExpenses.value = allExpenses.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)

    console.log('💰 All-time balance:', {
      topups: allTimeTopups.value,
      expenses: allTimeExpenses.value,
      balance: allTimeTopups.value - allTimeExpenses.value
    })
  } catch (error) {
    console.error('Error fetching all-time balance:', error)
    allTimeTopups.value = 0
    allTimeExpenses.value = 0
  }
}

// Fetch cash tracker data with comparisons (like AdminDashboard)
async function fetchCashTrackerData(start, end, lastStart, lastEnd) {
  try {
    console.log('🔄 Fetching cash tracker data for:', { start, end, lastStart, lastEnd })

    // Fetch current week transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', start)
      .lte('date', end)

    console.log('📊 Transactions fetched:', {
      count: transactions?.length || 0,
      transactions: transactions
    })

    // Fetch last week transactions for comparison
    const { data: lastWeekTransactions, error: lastWeekError } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', lastStart)
      .lte('date', lastEnd)

    if (error || lastWeekError) {
      console.error('Cash tracker fetch error:', error || lastWeekError)
      return
    }

    // Filter current week expenses and topups
    const expenses = transactions?.filter(t => t.type === 'expense') || []
    const allTopups = transactions?.filter(t => t.type === 'topup') || []
    const scrapTopups = allTopups.filter(t => t.category === 'Scrap')

    weeklyExpenses.value = expenses
    weeklyScrapRevenue.value = scrapTopups.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
    totalWeeklyExpenses.value = expenses.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
    totalWeeklyTopups.value = allTopups.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)

    // Filter last week expenses and scrap topups
    const lastExpenses = lastWeekTransactions?.filter(t => t.type === 'expense') || []
    const lastScrapTopups = lastWeekTransactions?.filter(t => t.type === 'topup' && t.category === 'Scrap') || []
    
    lastWeekExpenses.value = lastExpenses.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
    lastWeekScrapRevenue.value = lastScrapTopups.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)

    // Calculate percentage changes
    if (lastWeekExpenses.value > 0) {
      expensesPercentChange.value = Math.round(((totalWeeklyExpenses.value - lastWeekExpenses.value) / lastWeekExpenses.value) * 100)
    }

    if (lastWeekScrapRevenue.value > 0) {
      scrapPercentChange.value = Math.round(((weeklyScrapRevenue.value - lastWeekScrapRevenue.value) / lastWeekScrapRevenue.value) * 100)
    }

    // Group expenses by category (like AdminDashboard)
    const categoryMap = {}
    expenses.forEach(expense => {
      const category = expense.category || 'Uncategorized'
      if (!categoryMap[category]) {
        categoryMap[category] = { total: 0, count: 0, items: [] }
      }
      categoryMap[category].total += parseFloat(expense.amount) || 0
      categoryMap[category].count += 1
      categoryMap[category].items.push(expense)
    })

    expensesByCategory.value = categoryMap

    console.log('💰 Cash tracker data with comparisons:', {
      thisWeek: {
        expenses: totalWeeklyExpenses.value,
        scrap: weeklyScrapRevenue.value
      },
      lastWeek: {
        expenses: lastWeekExpenses.value,
        scrap: lastWeekScrapRevenue.value
      },
      changes: {
        expensesPercent: expensesPercentChange.value,
        scrapPercent: scrapPercentChange.value
      }
    })

  } catch (error) {
    console.error('Error fetching cash tracker data:', error)
    weeklyExpenses.value = []
    totalWeeklyExpenses.value = 0
    expensesByCategory.value = {}
    lastWeekExpenses.value = 0
    expensesPercentChange.value = 0
  }
}

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

const reportTitle = computed(() => {
  if (level.value === 'weekly') return `${formatDate(weekStart.value)} to ${formatDate(weekEnd.value)}`
  if (level.value === 'monthly') return ` ${formatDate(monthStart.value)} to ${formatDate(monthEnd.value)}`
  return ` – ${formatDate(deliveryDate.value)}`
})

// Active workers and subcontractors count
const activeWorkers = computed(() => {
  const workers = new Set()
  filteredInHouseDeliveries.value.forEach(d => {
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

// New computed properties for the enhanced template
const weeklyPerformance = computed(() => {
  // Calculate performance based on current vs target deliveries
  const currentDeliveries = totalDeliveries.value
  const targetDeliveries = level.value === 'weekly' ? 10000 : level.value === 'monthly' ? 40000 : 500

  if (currentDeliveries === 0) return 0
  return Math.min(Math.round((currentDeliveries / targetDeliveries) * 100), 100)
})

const weeklyChange = computed(() => {
  // Calculate previous period deliveries (excluding miscellaneous, same as current)
  const prevInHouse = previousPeriodDeliveries.value
    .filter(d => ['Single Walled', 'Double Walled'].includes(d.products?.category))
    .reduce((sum, d) => sum + (d.quantity || 0), 0)

  const prevSubcon = previousPeriodSubconDeliveries.value
    .filter(d => ['Single Walled', 'Double Walled'].includes(d.products?.category))
    .reduce((sum, d) => sum + (d.quantity || 0), 0)

  const previousTotal = prevInHouse + prevSubcon
  const currentTotal = totalDeliveries.value

  // Calculate percentage change
  if (previousTotal > 0) {
    return Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
  }

  // If no previous data, return 0
  return 0
})

// Format date for short display
function formatDateShort(date) {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric'
  })
}

// PANDI (In-house) delivery records grouped by date (excluding miscellaneous)
const pandiDeliveryRecords = computed(() => {
  const records = {}

  filteredInHouseDeliveries.value
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

// SUBCON delivery records grouped by date (excluding miscellaneous)
const subconDeliveryRecords = computed(() => {
  const records = {}

  filteredSubconDeliveries.value
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

// Subcontractor breakdown with individual performance
const subcontractorBreakdown = computed(() => {
  const breakdown = {}

  filteredSubconDeliveries.value.forEach(delivery => {
    const name = delivery.subcontractors?.name || 'Unknown Subcontractor'
    if (!breakdown[name]) {
      breakdown[name] = {
        name,
        deliveries: 0,
        totalQuantity: 0,
        totalValue: 0
      }
    }

    const qty = delivery.quantity || 0
    const price = delivery.price_snapshot ?? 0

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

// Track scrap change percentage
const scrapChange = ref(0)

// Function to update scrap change
async function updateScrapChange() {
  try {
    // Get previous period scrap revenue from transactions
    const { start: lastStart, end: lastEnd } = getPreviousDateRange()

    // Get previous period scrap transactions
    const { data: prevScrapTopups } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'topup')
      .eq('category', 'Scrap')
      .gte('date', lastStart)
      .lte('date', lastEnd)

    // Calculate previous period scrap revenue
    const previousScrap = (prevScrapTopups || []).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
    const currentScrap = scrapRevenue.value

    console.log('Scrap Revenue Change:', {
      previousScrap,
      currentScrap,
      lastStart,
      lastEnd,
      previousTransactions: prevScrapTopups
    })

    // Calculate percentage change using the same logic as weeklyChange
    if (previousScrap > 0) {
      scrapChange.value = Math.round(((currentScrap - previousScrap) / previousScrap) * 100)
    } else if (previousScrap === 0 && currentScrap > 0) {
      scrapChange.value = 100
    } else {
      scrapChange.value = 0
    }
  } catch (error) {
    console.error('Error updating scrap change:', error)
    scrapChange.value = 0
  }
}

// Call updateScrapChange when data changes
watch([scrapRevenue, deliveryDate, level], updateScrapChange)

// Initial update
onMounted(updateScrapChange)

// Payroll data using actual payout data
const totalPayroll = computed(() => {
  return actualPayrollTotal.value || 0
})

// Individual deduction totals (matching AdminDashboard logic)
const totalCashAdvance = computed(() => {
  return payoutBreakdown.value.reduce((sum, p) => {
    const num = parseFloat(p.cashAdvance || 0)
    return sum + (isNaN(num) ? 0 : num)
  }, 0)
})

const totalSavings = computed(() => {
  return payoutBreakdown.value.reduce((sum, p) => {
    const num = parseFloat(p.savings || 0)
    return sum + (isNaN(num) ? 0 : num)
  }, 0)
})

const totalContributions = computed(() => {
  return payoutBreakdown.value.reduce((sum, p) => {
    const num = parseFloat(p.contributions || 0)
    return sum + (isNaN(num) ? 0 : num)
  }, 0)
})

const totalDeductibles = computed(() => {
  return payoutBreakdown.value.reduce((sum, p) => {
    const num = parseFloat(p.deductibles || 0)
    return sum + (isNaN(num) ? 0 : num)
  }, 0)
})

const totalDeductions = computed(() => {
  // Sum of all deduction types (matching AdminDashboard logic)
  return totalCashAdvance.value + totalSavings.value + totalContributions.value + totalDeductibles.value
})

// Bodega Stock computed properties
const bodegaSingleWallTotal = computed(() => {
  return bodegaStock.value
    .filter(entry => entry.products?.category === 'Single Walled')
    .reduce((sum, entry) => sum + (entry.quantity || 0), 0)
})

const bodegaDoubleWallTotal = computed(() => {
  return bodegaStock.value
    .filter(entry => entry.products?.category === 'Double Walled')
    .reduce((sum, entry) => sum + (entry.quantity || 0), 0)
})

const bodegaSingleWallValue = computed(() => {
  return bodegaStock.value
    .filter(entry => entry.products?.category === 'Single Walled')
    .reduce((sum, entry) => {
      const qty = entry.quantity || 0
      const price = entry.price_snapshot || entry.products?.price_per_unit || 0
      return sum + (qty * price)
    }, 0)
})

const bodegaDoubleWallValue = computed(() => {
  return bodegaStock.value
    .filter(entry => entry.products?.category === 'Double Walled')
    .reduce((sum, entry) => {
      const qty = entry.quantity || 0
      const price = entry.price_snapshot || entry.products?.price_per_unit || 0
      return sum + (qty * price)
    }, 0)
})

const bodegaTotalValue = computed(() => {
  return bodegaSingleWallValue.value + bodegaDoubleWallValue.value
})

const bodegaActiveWorkers = computed(() => {
  const workers = new Set()
  bodegaStock.value.forEach(entry => {
    if (entry.workers?.name) workers.add(entry.workers.name)
  })
  return workers.size
})

// Current Bodega Stock computed properties
const currentBodegaSingleWallTotal = computed(() => {
  return currentBodegaStock.value
    .filter(entry => entry.products?.category === 'Single Walled')
    .reduce((sum, entry) => sum + (entry.quantity || 0), 0)
})

const currentBodegaDoubleWallTotal = computed(() => {
  return currentBodegaStock.value
    .filter(entry => entry.products?.category === 'Double Walled')
    .reduce((sum, entry) => sum + (entry.quantity || 0), 0)
})

const currentBodegaSingleWallValue = computed(() => {
  return currentBodegaStock.value
    .filter(entry => entry.products?.category === 'Single Walled')
    .reduce((sum, entry) => {
      const qty = entry.quantity || 0
      const price = entry.price_snapshot || entry.products?.price_per_unit || 0
      return sum + (qty * price)
    }, 0)
})

const currentBodegaDoubleWallValue = computed(() => {
  return currentBodegaStock.value
    .filter(entry => entry.products?.category === 'Double Walled')
    .reduce((sum, entry) => {
      const qty = entry.quantity || 0
      const price = entry.price_snapshot || entry.products?.price_per_unit || 0
      return sum + (qty * price)
    }, 0)
})

const currentBodegaTotalValue = computed(() => {
  return currentBodegaSingleWallValue.value + currentBodegaDoubleWallValue.value
})

const currentBodegaActiveWorkers = computed(() => {
  const workers = new Set()
  currentBodegaStock.value.forEach(entry => {
    if (entry.workers?.name) workers.add(entry.workers.name)
  })
  return workers.size
})

// Group bodega stock by product name
const bodegaByProduct = computed(() => {
  const grouped = {}

  currentBodegaStock.value.forEach(entry => {
    const productName = entry.products?.name
    if (!productName) return

    if (!grouped[productName]) {
      grouped[productName] = {
        productName,
        entries: [],
        totalQty: 0,
        totalValue: 0
      }
    }

    const qty = entry.quantity || 0
    const price = entry.price_snapshot || entry.products?.price_per_unit || 0
    const value = qty * price

    grouped[productName].entries.push({
      workerName: entry.workers?.name || 'Unknown',
      quantity: qty,
      value: value
    })

    grouped[productName].totalQty += qty
    grouped[productName].totalValue += value
  })

  // Convert to array and sort by product name
  return Object.values(grouped).sort((a, b) => a.productName.localeCompare(b.productName))
})

// Grand total for bodega stock
const bodegaGrandTotal = computed(() => {
  return bodegaByProduct.value.reduce((acc, product) => {
    acc.totalQty += product.totalQty
    acc.totalValue += product.totalValue
    return acc
  }, { totalQty: 0, totalValue: 0 })
})

// Group previous bodega stock by product name
const previousBodegaByProduct = computed(() => {
  const grouped = {}

  bodegaStock.value.forEach(entry => {
    const productName = entry.products?.name
    if (!productName) return

    if (!grouped[productName]) {
      grouped[productName] = {
        productName,
        entries: [],
        totalQty: 0,
        totalValue: 0
      }
    }

    const qty = entry.quantity || 0
    const price = entry.price_snapshot || entry.products?.price_per_unit || 0
    const value = qty * price

    grouped[productName].entries.push({
      workerName: entry.workers?.name || 'Unknown',
      quantity: qty,
      value: value
    })

    grouped[productName].totalQty += qty
    grouped[productName].totalValue += value
  })

  // Convert to array and sort by product name
  return Object.values(grouped).sort((a, b) => a.productName.localeCompare(b.productName))
})

// Grand total for previous bodega stock
const previousBodegaGrandTotal = computed(() => {
  return previousBodegaByProduct.value.reduce((acc, product) => {
    acc.totalQty += product.totalQty
    acc.totalValue += product.totalValue
    return acc
  }, { totalQty: 0, totalValue: 0 })
})

// Closing balance (same as CashTracker) - Cumulative all-time topups minus all-time expenses
const balanceRemaining = computed(() => {
  return allTimeTopups.value - allTimeExpenses.value
})

const copyShareableLink = async () => {
  try {
    // Generate a unique ID for this report
    const reportId = uuidv4()

    // Store the current data in Supabase
    const { error } = await supabase
      .from('reports')
      .insert({
        id: reportId,
        type: 'executive_summary',
        data: {
          deliveries: filteredInHouseDeliveries.value,
          subcon_deliveries: filteredSubconDeliveries.value,
          expenses: weeklyExpenses.value,
          scrap_revenue: weeklyScrapRevenue.value,
          payroll_total: actualPayrollTotal.value,
          week_start: weekStart.value.toISOString(),
          week_end: weekEnd.value.toISOString(),
          // Add all the necessary data fields
          client_price_map: clientPriceMap.value,
          total_weekly_expenses: totalWeeklyExpenses.value,
          expenses_percent_change: expensesPercentChange.value,
          last_week_expenses: lastWeekExpenses.value,
          expenses_by_category: expensesByCategory.value,
          bodega_stock: bodegaStock.value,
          current_bodega_stock: currentBodegaStock.value
        },
        created_at: new Date().toISOString(),
        created_by: userStore.user?.id || null || null
      })

    if (error) throw error

    // Create the shareable URL
    const baseUrl = window.location.origin
    const shareableUrl = `${baseUrl}/report/${reportId}`

    // Copy to clipboard
    await navigator.clipboard.writeText(shareableUrl)

    // Show success message
    alert('Shareable link copied to clipboard!')
  } catch (error) {
    console.error('Error generating shareable link:', error)
    alert('Failed to generate shareable link. Please try again.')
  }
}

// In-house vs Subcon Comparison
const inHouseSingleWalled = computed(() => {
  return filteredInHouseDeliveries.value
    .filter(d => d.products?.category === 'Single Walled')
    .reduce((sum, d) => sum + (d.quantity || 0), 0)
})

const inHouseDoubleWalled = computed(() => {
  return filteredInHouseDeliveries.value
    .filter(d => d.products?.category === 'Double Walled')
    .reduce((sum, d) => sum + (d.quantity || 0), 0)
})

const inHouseTotal = computed(() => {
  return inHouseSingleWalled.value + inHouseDoubleWalled.value
})

const subconSingleWalled = computed(() => {
  return filteredSubconDeliveries.value
    .filter(d => d.products?.category === 'Single Walled')
    .reduce((sum, d) => sum + (d.quantity || 0), 0)
})

const subconDoubleWalled = computed(() => {
  return filteredSubconDeliveries.value
    .filter(d => d.products?.category === 'Double Walled')
    .reduce((sum, d) => sum + (d.quantity || 0), 0)
})

const subconTotal = computed(() => {
  return subconSingleWalled.value + subconDoubleWalled.value
})

// Keep the existing totalGross computed property
const totalGross = computed(() => {
  // Calculate total gross from payouts (matching AdminDashboard logic)
  return payoutBreakdown.value.reduce((sum, payout) => {
    return sum + (parseFloat(payout.gross) || 0)
  }, 0)
})
</script>

<style scoped>
/* Custom Scrollbar Styling */
:deep(.max-h-80) {
  scrollbar-width: thin;
  scrollbar-color: rgba(168, 85, 247, 0.4) rgba(255, 255, 255, 0.05);
}

/* Webkit Scrollbar Styling for Chrome/Safari/Edge */
:deep(.max-h-80)::-webkit-scrollbar {
  width: 8px;
}

:deep(.max-h-80)::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  margin: 8px 0;
}

:deep(.max-h-80)::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom,
      rgba(168, 85, 247, 0.6),
      rgba(147, 51, 234, 0.4));
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

:deep(.max-h-80)::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(to bottom,
      rgba(168, 85, 247, 0.8),
      rgba(147, 51, 234, 0.6));
  border-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

:deep(.max-h-80)::-webkit-scrollbar-thumb:active {
  background: linear-gradient(to bottom,
      rgba(168, 85, 247, 1),
      rgba(147, 51, 234, 0.8));
}

/* Global scrollbar for the entire page */
:deep(html) {
  scrollbar-width: thin;
  scrollbar-color: rgba(59, 130, 246, 0.4) rgba(255, 255, 255, 0.03);
}

:deep(body)::-webkit-scrollbar {
  width: 12px;
}

:deep(body)::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
}

:deep(body)::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom,
      rgba(59, 130, 246, 0.5),
      rgba(37, 99, 235, 0.3));
  border-radius: 10px;
  border: 2px solid rgba(255, 255, 255, 0.08);
  transition: all 0.3s ease;
}

:deep(body)::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(to bottom,
      rgba(59, 130, 246, 0.7),
      rgba(37, 99, 235, 0.5));
  border-color: rgba(255, 255, 255, 0.15);
}

/* Additional smooth scrolling enhancement */
:deep(*) {
  scroll-behavior: smooth;
}

/* Custom scrollbar for subcontractor breakdown section */
:deep(.space-y-3) {
  scrollbar-width: thin;
  scrollbar-color: rgba(251, 146, 60, 0.4) rgba(255, 255, 255, 0.05);
}

:deep(.space-y-3)::-webkit-scrollbar {
  width: 6px;
}

:deep(.space-y-3)::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

:deep(.space-y-3)::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom,
      rgba(251, 146, 60, 0.6),
      rgba(249, 115, 22, 0.4));
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.space-y-3)::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(to bottom,
      rgba(251, 146, 60, 0.8),
      rgba(249, 115, 22, 0.6));
}
</style>
