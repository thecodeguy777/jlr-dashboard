<template>
  <div class="min-h-screen text-white p-6 space-y-8">
    <!-- Enhanced Header -->
    <div class="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
      <div class="space-y-2">
        <h1
          class="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
          💰 Payroll Breakdown
        </h1>
        <p class="text-white/60 text-lg">Detailed financial overview and earnings summary</p>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <!-- Employee Info Card -->
        <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {{ employeeName.charAt(0) }}
            </div>
            <div>
              <p class="text-white font-semibold" v-if="!isSelf">{{ employeeName }}</p>
              <p class="text-white font-semibold" v-else>{{ employeeName }}</p>
              <p class="text-white/60 text-sm" v-if="weekParam">📅 Week: {{ weekParam }}</p>
              <p class="text-white/60 text-sm" v-else>📅 Current Week</p>
            </div>
          </div>
        </div>

        <!-- Savings Card -->
        <div v-if="currentSavings && parseFloat(currentSavings) > 0"
          class="bg-gradient-to-r from-green-600/20 to-emerald-600/20 backdrop-blur-sm rounded-xl p-4 border border-green-500/30">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1">
                </path>
              </svg>
            </div>
            <div>
              <p class="text-green-400 text-sm font-medium">Total Savings</p>
              <p class="text-white font-bold text-lg">₱{{ currentSavings || '0.00' }}</p>
            </div>
          </div>
        </div>

        <!-- Loans Card -->
        <div
          class="bg-gradient-to-r from-orange-600/20 to-red-600/20 backdrop-blur-sm rounded-xl p-4 border border-orange-500/30">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z">
                </path>
              </svg>
            </div>
            <div>
              <p class="text-orange-400 text-sm font-medium">Active Loans</p>
              <div class="flex items-center gap-2">
                <p class="text-white font-bold text-lg">₱{{ totalLoanBalance.toLocaleString() }}</p>
                <span v-if="activeLoans.length > 0"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100/20 text-orange-300">
                  {{ activeLoans.length }} {{ activeLoans.length === 1 ? 'loan' : 'loans' }}
                </span>
                <span v-else
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100/20 text-green-300">
                  No loans
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Enhanced Hero Summary Card -->
    <div
      class="relative overflow-hidden bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 rounded-3xl shadow-2xl">
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]">
        </div>
        <div
          class="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-white/10 to-transparent rounded-full -translate-y-48 translate-x-48">
        </div>
      </div>

      <div class="relative p-8 space-y-6">
        <div class="flex items-center justify-between">
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <div
                class="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1">
                  </path>
                </svg>
              </div>
              <div>
                <h2 class="text-2xl font-bold text-white">{{ employeeName }}</h2>
                <p class="text-green-100 font-medium">Week of {{ payout?.week_start || '—' }}</p>
              </div>
            </div>
          </div>

          <div class="text-right">
            <p class="text-green-100 text-sm font-medium mb-1">Net Pay</p>
            <div class="text-5xl font-bold text-white tracking-tight">₱{{ Math.round(payout?.net_total ||
              0).toLocaleString() }}</div>
            <p class="text-green-100/80 text-sm mt-2">After all deductions and additions</p>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/20">
          <div class="text-center">
            <p class="text-green-100/80 text-xs font-medium">Gross Income</p>
            <p class="text-white font-bold text-lg">₱{{ Math.round(payout?.gross_income || 0).toLocaleString() }}</p>
          </div>
          <div class="text-center">
            <p class="text-green-100/80 text-xs font-medium">Hours Worked</p>
            <p class="text-white font-bold text-lg">₱{{ Math.round(payout?.paid_by_hours || 0).toLocaleString() }}</p>
          </div>
          <div class="text-center">
            <p class="text-green-100/80 text-xs font-medium">Cash Advance</p>
            <p class="text-red-200 font-bold text-lg">-₱{{ Math.round(payout?.cash_advance || 0).toLocaleString() }}</p>
          </div>
          <div class="text-center">
            <p class="text-green-100/80 text-xs font-medium">Status</p>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100/20 text-green-100">
              ✓ Confirmed
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Admin Profile Details -->
    <div v-if="isAdmin"
      class="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
          <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div>
          <p class="text-purple-300 text-sm font-medium">Admin View</p>
          <p class="text-white/60 text-xs">ID: {{ employeeId }}</p>
        </div>
      </div>
    </div>

    <!-- Enhanced Loading State -->
    <div v-if="loading" class="space-y-6">
      <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
        <div class="flex items-center justify-center space-x-4">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <div class="space-y-2">
            <p class="text-white font-medium">Loading payroll data...</p>
            <p class="text-white/60 text-sm">Fetching earnings, deductions, and stock information</p>
          </div>
        </div>
      </div>

      <!-- Loading Skeleton -->
      <div class="grid gap-6 md:grid-cols-2">
        <div class="bg-white/5 rounded-2xl p-6 animate-pulse">
          <div class="h-4 bg-white/10 rounded mb-4"></div>
          <div class="space-y-2">
            <div class="h-3 bg-white/10 rounded"></div>
            <div class="h-3 bg-white/10 rounded w-3/4"></div>
          </div>
        </div>
        <div class="bg-white/5 rounded-2xl p-6 animate-pulse">
          <div class="h-4 bg-white/10 rounded mb-4"></div>
          <div class="space-y-2">
            <div class="h-3 bg-white/10 rounded"></div>
            <div class="h-3 bg-white/10 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Enhanced Error State -->
    <div v-else-if="!payout"
      class="bg-gradient-to-br from-red-900/20 to-orange-900/20 backdrop-blur-sm rounded-2xl p-8 border border-red-500/30">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z">
            </path>
          </svg>
        </div>
        <div class="space-y-3">
          <div>
            <h3 class="text-red-400 font-bold text-lg">No Payroll Data Found</h3>
            <p class="text-red-300/80 mt-1">We couldn't locate any payout information for this request.</p>
          </div>

          <div class="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
            <h4 class="text-red-300 font-medium text-sm mb-2">Details:</h4>
            <ul class="text-red-300/70 text-sm space-y-1">
              <li v-if="weekParam">• No confirmed payout found for week: {{ weekParam }}</li>
              <li v-else>• No recent confirmed payout found for today</li>
              <li>• Employee ID: {{ employeeId }}</li>
              <li>• Check if payouts have been generated and confirmed for this date</li>
            </ul>
          </div>

          <div class="flex gap-3">
            <button
              class="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg border border-red-500/30 transition-colors text-sm font-medium">
              Contact Support
            </button>
            <button @click="$router.go(-1)"
              class="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-colors text-sm font-medium">
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="space-y-8">
      <!-- Enhanced Weekly Summary -->
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
            <h3 class="text-xl font-bold text-white">Net Weekly Sales</h3>
            <p class="text-blue-300 text-sm">Deliveries minus previous stock (actual sales)</p>
          </div>
        </div>

        <div v-if="productBreakdown.length" class="space-y-4">
          <!-- Product List -->
          <div class="bg-white/5 rounded-xl p-4 border border-white/10">
            <h4 class="text-blue-300 font-medium text-sm mb-3">Net Sales by Product</h4>
            <div class="space-y-2">
              <div v-for="item in productBreakdown" :key="item.name"
                class="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span class="text-blue-400 text-xs font-bold">{{ item.quantity }}</span>
                  </div>
                  <div>
                    <span class="text-white font-medium">{{ item.name }}</span>
                    <div class="text-xs text-white/60">
                      {{ item.deliveryQty }} delivered - {{ item.previousQty }} prev stock
                    </div>
                  </div>
                </div>
                <span class="text-blue-300 font-bold">₱{{ Math.round(item.subtotal).toLocaleString() }}</span>
              </div>
            </div>
          </div>

          <!-- Summary Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
              <div class="flex items-center gap-2 mb-2">
                <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1">
                  </path>
                </svg>
                <span class="text-green-300 text-sm font-medium">Gross Income</span>
              </div>
              <p class="text-white text-xl font-bold">₱{{ Math.round(payout.gross_income || 0).toLocaleString() }}</p>
            </div>

            <div class="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
              <div class="flex items-center gap-2 mb-2">
                <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="text-red-300 text-sm font-medium">Cash Advance</span>
              </div>
              <p class="text-white text-xl font-bold">-₱{{ Math.round(payout.cash_advance || 0).toLocaleString() }}</p>
            </div>

            <div class="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
              <div class="flex items-center gap-2 mb-2">
                <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="text-purple-300 text-sm font-medium">Hours Pay</span>
              </div>
              <p class="text-white text-xl font-bold">₱{{ Math.round(payout.paid_by_hours || 0).toLocaleString() }}</p>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-8">
          <div class="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4">
              </path>
            </svg>
          </div>
          <p class="text-white/60 font-medium">No deliveries recorded</p>
          <p class="text-white/40 text-sm mt-1">No products were delivered during this week</p>
        </div>
      </div>



      <!-- Current Stock Only -->
      <div v-if="Object.keys(currentStockBreakdown).length > 0">
        <!-- Current Stock -->
        <div
          class="bg-gradient-to-br from-green-900/20 to-emerald-900/20 backdrop-blur-sm rounded-2xl p-6 border border-green-500/30">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">Current Stock</h3>
              <p class="text-green-300 text-sm">Products on hand now</p>
            </div>
          </div>

          <div v-if="Object.keys(currentStockBreakdown).length" class="space-y-3">
            <div v-for="(products, category) in currentStockBreakdown" :key="category"
              class="bg-white/5 rounded-lg p-3 border border-white/10">
              <h4 class="text-green-300 font-medium text-sm mb-2">{{ category }}</h4>
              <div class="space-y-2">
                <div v-for="(item, name) in products" :key="name" class="bg-white/5 rounded-lg p-2">
                  <div class="flex items-center justify-between">
                    <span class="text-white font-medium text-sm">{{ name }}</span>
                    <span class="text-green-400 font-bold">₱{{ Math.round(item.total).toLocaleString() }}</span>
                  </div>
                  <div class="flex items-center justify-between text-xs text-white/60 mt-1">
                    <span>{{ item.quantity }} pcs × ₱{{ item.price.toFixed(2) }}</span>
                    <span>{{ item.quantity }} units</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Total Stock Value -->
            <div class="bg-green-500/10 rounded-lg p-3 border border-green-500/20 mt-4">
              <div class="flex items-center justify-between">
                <span class="text-green-300 font-medium text-sm">Total Stock Value</span>
                <span class="text-green-400 font-bold text-lg">₱{{ Math.round(getTotalStockValue).toLocaleString()
                  }}</span>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-6">
            <div class="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4">
                </path>
              </svg>
            </div>
            <p class="text-white/60 font-medium">No current stock</p>
            <p class="text-white/40 text-sm">No products currently on hand</p>
          </div>
        </div>
      </div>



      <!-- Financial Details Grid -->
      <div v-if="hasFinancialDetails" class="grid gap-6" :class="getFinancialGridClass">
        <!-- Deductions -->
        <div v-if="payout.deductions && Object.keys(payout.deductions).length > 0"
          class="bg-gradient-to-br from-red-900/20 to-pink-900/20 backdrop-blur-sm rounded-2xl p-6 border border-red-500/30">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">Deductions</h3>
              <p class="text-red-300 text-sm">Amounts subtracted</p>
            </div>
          </div>

          <div v-if="payout.deductions && Object.keys(payout.deductions).length > 0" class="space-y-3">
            <div v-for="key in Object.keys(payout.deductions || {})" :key="key"
              class="bg-white/5 rounded-lg p-3 border border-white/10">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span class="text-red-400 text-xs">-</span>
                  </div>
                  <span class="text-white capitalize font-medium">{{ key.replace(/_/g, ' ') }}</span>
                </div>
                <span class="text-red-400 font-bold">-₱{{ Math.round(payout.deductions[key] || 0).toLocaleString()
                }}</span>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-6">
            <div class="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <p class="text-white/60 font-medium">No deductions</p>
            <p class="text-white/40 text-sm">No amounts were deducted</p>
          </div>
        </div>

        <!-- Allowances -->
        <div v-if="payout.allowances && Object.keys(payout.allowances).length > 0"
          class="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6">
                </path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">Allowances</h3>
              <p class="text-blue-300 text-sm">Additional benefits</p>
            </div>
          </div>

          <div v-if="parsedAllowances && Object.keys(parsedAllowances).length > 0" class="space-y-3">
            <div v-for="key in Object.keys(parsedAllowances)" :key="key"
              class="bg-white/5 rounded-lg p-3 border border-white/10">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span class="text-blue-400 text-xs">+</span>
                  </div>
                  <span class="text-white capitalize font-medium">{{ key.replace(/_/g, ' ') }}</span>
                </div>
                <span class="text-blue-400 font-bold">+₱{{
                  Math.round(parseFloat(parsedAllowances[key])).toLocaleString() }}</span>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-6">
            <div class="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <p class="text-white/60 font-medium">No allowances</p>
            <p class="text-white/40 text-sm">No additional benefits added</p>
          </div>
        </div>

        <!-- Commissions -->
        <div v-if="payout.commissions && Object.keys(payout.commissions).length > 0"
          class="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z">
                </path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">Commissions</h3>
              <p class="text-purple-300 text-sm">Performance bonuses</p>
            </div>
          </div>

          <div v-if="payout.commissions && Object.keys(payout.commissions).length > 0" class="space-y-3">
            <div v-for="key in Object.keys(payout.commissions || {})" :key="key"
              class="bg-white/5 rounded-lg p-3 border border-white/10">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <span class="text-purple-400 text-xs">★</span>
                  </div>
                  <span class="text-white capitalize font-medium">{{ key.replace(/_/g, ' ') }}</span>
                </div>
                <span class="text-purple-400 font-bold">+₱{{ Math.round(payout.commissions[key] || 0).toLocaleString()
                }}</span>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-6">
            <div class="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <p class="text-white/60 font-medium">No commissions</p>
            <p class="text-white/40 text-sm">No performance bonuses earned</p>
          </div>
        </div>
      </div>

      <!-- Loans Details Section -->
      <div v-if="activeLoans.length > 0"
        class="bg-gradient-to-br from-orange-900/20 to-amber-900/20 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
            <svg class="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2">
              </path>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-bold text-white">Active Loans</h3>
            <p class="text-orange-300 text-sm">Outstanding loan balances and repayment details</p>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div v-for="loan in activeLoans" :key="loan.id" class="bg-white/5 rounded-xl p-4 border border-white/10">
            <div class="space-y-3">
              <!-- Loan Header -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <svg class="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1">
                      </path>
                    </svg>
                  </div>
                  <span class="text-orange-300 text-sm font-medium">Loan #{{ loan.id.slice(-4).toUpperCase() }}</span>
                </div>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100/20 text-orange-300">
                  Active
                </span>
              </div>

              <!-- Loan Details -->
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-white/60 text-sm">Outstanding Balance:</span>
                  <span class="text-orange-400 font-bold">₱{{ parseFloat(loan.balance || 0).toLocaleString() }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-white/60 text-sm">Original Amount:</span>
                  <span class="text-white font-medium">₱{{ parseFloat(loan.amount || 0).toLocaleString() }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-white/60 text-sm">Start Date:</span>
                  <span class="text-white font-medium">{{ new Date(loan.start_date).toLocaleDateString() }}</span>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="space-y-2">
                <div class="flex justify-between text-xs text-white/60">
                  <span>Repayment Progress</span>
                  <span>{{ Math.round(((parseFloat(loan.amount) - parseFloat(loan.balance)) / parseFloat(loan.amount)) *
                    100) }}%</span>
                </div>
                <div class="w-full bg-white/10 rounded-full h-2">
                  <div
                    class="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-300"
                    :style="{ width: `${Math.max(0, ((parseFloat(loan.amount) - parseFloat(loan.balance)) / parseFloat(loan.amount)) * 100)}%` }">
                  </div>
                </div>
              </div>

              <!-- Loan Purpose/Remarks -->
              <div v-if="loan.remarks" class="pt-2 border-t border-white/10">
                <p class="text-white/60 text-xs mb-1">Purpose:</p>
                <p class="text-white text-sm">{{ loan.remarks }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Loan Summary -->
        <div class="mt-6 pt-4 border-t border-white/10">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center">
              <p class="text-orange-300/80 text-xs font-medium">Total Active Loans</p>
              <p class="text-white font-bold text-lg">{{ activeLoans.length }}</p>
            </div>
            <div class="text-center">
              <p class="text-orange-300/80 text-xs font-medium">Total Outstanding</p>
              <p class="text-orange-400 font-bold text-lg">₱{{ totalLoanBalance.toLocaleString() }}</p>
            </div>
            <div class="text-center">
              <p class="text-orange-300/80 text-xs font-medium">Total Borrowed</p>
              <p class="text-white font-bold text-lg">₱{{activeLoans.reduce((sum, loan) => sum + parseFloat(loan.amount
                || 0), 0).toLocaleString()}}</p>
            </div>
            <div class="text-center">
              <p class="text-orange-300/80 text-xs font-medium">Amount Paid</p>
              <p class="text-green-400 font-bold text-lg">₱{{(activeLoans.reduce((sum, loan) => sum +
                parseFloat(loan.amount || 0), 0) - totalLoanBalance).toLocaleString()}}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- No Loans State -->
      <div v-else
        class="bg-gradient-to-br from-gray-900/20 to-slate-900/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-500/30">
        <div class="text-center">
          <div class="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-bold text-white mb-2">No Active Loans</h3>
          <p class="text-white/60">This employee currently has no outstanding loan balances.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

const route = useRoute()
const userStore = useUserStore()

const employeeId = route.params.id || userStore.user?.id || 'mock-id'
const isAdmin = userStore.role === 'admin'
const isSelf = !route.params.id

// Get week from query parameter if provided
const weekParam = route.query.week

const employeeName = ref('Loading...')
const payout = ref(null)
const currentSavings = ref(null)
const productBreakdown = ref([])
const previousStockBreakdown = ref({})
const currentStockBreakdown = ref({})
const activeLoans = ref([])
const totalLoanBalance = ref(0)
const loading = ref(true)

// Computed properties for dynamic visibility
const hasDeductions = computed(() => {
  return payout.value?.deductions &&
    Object.keys(payout.value.deductions).length > 0
})

const hasAllowances = computed(() => {
  const allowances = payout.value?.allowances

  if (!allowances || typeof allowances !== 'object') {
    console.log('🔍 No allowances object found:', { allowances, type: typeof allowances })
    return false
  }

  const keys = Object.keys(allowances)
  const hasKeys = keys.length > 0

  console.log('🔍 Allowances Debug (less strict):', {
    raw: allowances,
    keys,
    values: Object.values(allowances),
    hasKeys,
    result: hasKeys
  })

  return hasKeys
})

const hasCommissions = computed(() => {
  return payout.value?.commissions &&
    Object.keys(payout.value.commissions).length > 0
})

const hasFinancialDetails = computed(() => {
  return hasDeductions.value || hasAllowances.value || hasCommissions.value
})

const getFinancialGridClass = computed(() => {
  const visibleCards = [hasDeductions.value, hasAllowances.value, hasCommissions.value].filter(Boolean).length

  if (visibleCards === 1) return 'lg:grid-cols-1 max-w-md mx-auto'
  if (visibleCards === 2) return 'lg:grid-cols-2'
  return 'lg:grid-cols-3'
})

// Computed property to get parsed allowances (simplified - no JSON parsing needed)
const parsedAllowances = computed(() => {
  return payout.value?.allowances || {}
})

// Computed property to calculate total stock value
const getTotalStockValue = computed(() => {
  let total = 0
  Object.values(currentStockBreakdown.value).forEach(categoryProducts => {
    Object.values(categoryProducts).forEach(item => {
      total += item.total || 0
    })
  })
  return total
})

onMounted(async () => {
  loading.value = true

  // Use the week parameter if provided, otherwise use today
  const targetDate = weekParam ? weekParam : format(new Date(), 'yyyy-MM-dd')

  console.log('🔍 EmployeePayout Debug:', {
    employeeId,
    weekParam,
    targetDate,
    routeQuery: route.query
  })

  try {
    // Fetch worker name
    const { data: worker } = await supabase
      .from('workers')
      .select('name')
      .eq('id', employeeId)
      .single()

    employeeName.value = worker?.name || 'Unknown Worker'

    // Fetch payout for the specific week
    let payoutData = null
    let payoutError = null

    try {
      if (weekParam) {
        // If week parameter is provided, fetch payout confirmed on that date
        console.log('🔍 Searching for payout confirmed on:', { employeeId, weekParam })

        const { data, error } = await supabase
          .from('payouts')
          .select('*')
          .eq('employee_id', employeeId)
          .gte('confirmed_at', `${weekParam}T00:00:00`)
          .lte('confirmed_at', `${weekParam}T23:59:59`)
          .order('confirmed_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        console.log('📋 Payout query result:', { data, error })
        payoutError = error
        payoutData = data

        if (error) {
          console.error('❌ ERROR fetching payout for week:', error)
        }

        // Also check what payouts exist for this employee around this date
        const { data: allPayouts, error: allPayoutsError } = await supabase
          .from('payouts')
          .select('week_start, confirmed_at, net_total, status, allowances, deductions')
          .eq('employee_id', employeeId)
          .order('confirmed_at', { ascending: false })
          .limit(10)

        console.log('📅 All recent payouts for this employee:', allPayouts)
        if (allPayoutsError) {
          console.error('❌ ERROR fetching all payouts:', allPayoutsError)
        }

      } else {
        // Otherwise, fetch most recent confirmed payout for today (original behavior)
        console.log('🔍 Searching for payout for today:', { employeeId, targetDate })

        const { data, error } = await supabase
          .from('payouts')
          .select('*')
          .eq('employee_id', employeeId)
          .gte('confirmed_at', `${targetDate}T00:00:00`)
          .lte('confirmed_at', `${targetDate}T23:59:59`)
          .order('confirmed_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        console.log('📋 Today payout query result:', { data, error })
        payoutError = error
        payoutData = data

        if (error) {
          console.error('❌ ERROR fetching today payout:', error)
        }
      }
    } catch (fetchError) {
      console.error('❌ UNEXPECTED ERROR during payout fetch:', fetchError)
      payoutError = fetchError
    }

    // Fetch current savings total for this employee
    const { data: savingsTotal } = await supabase
      .from('savings')
      .select('amount')
      .eq('worker_id', employeeId)

    const total = savingsTotal?.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0) || 0
    currentSavings.value = total.toFixed(2)

    // Fetch active loans for this employee
    const { data: loansData } = await supabase
      .from('loans')
      .select('*')
      .eq('worker_id', employeeId)
      .eq('status', 'active')
      .order('start_date', { ascending: false })

    activeLoans.value = loansData || []
    totalLoanBalance.value = activeLoans.value.reduce((sum, loan) => sum + (parseFloat(loan.balance) || 0), 0)

    payout.value = payoutData

    // COMPREHENSIVE DEBUGGING - CHECK EVERYTHING
    console.log('💰 COMPLETE PAYOUT DEBUG ANALYSIS:')
    console.log('📊 Fetch Results:', {
      payoutDataExists: !!payoutData,
      payoutError: payoutError,
      employeeId,
      weekParam,
      targetDate
    })

    if (payoutError) {
      console.error('❌ PAYOUT FETCH HAD ERRORS:', payoutError)
    }

    if (!payoutData) {
      console.warn('⚠️ NO PAYOUT DATA FOUND - this might be why allowances/deductions are empty')
      console.log('🔍 Try checking if:', {
        correctEmployeeId: employeeId,
        correctWeekParam: weekParam,
        payoutExistsForThisEmployee: 'Check database directly'
      })
    } else {
      console.log('✅ PAYOUT DATA FOUND:', {
        weekStart: payoutData.week_start,
        netTotal: payoutData.net_total,
        confirmedAt: payoutData.confirmed_at,
        status: payoutData.status
      })

      // ALLOWANCES DEBUG
      console.log('🔍 ALLOWANCES ANALYSIS:')
      const allowances = payoutData.allowances
      console.log('📊 Allowances data:', {
        allowancesRaw: allowances,
        allowancesType: typeof allowances,
        allowancesIsNull: allowances === null,
        allowancesIsUndefined: allowances === undefined,
        allowancesIsEmptyObject: allowances && typeof allowances === 'object' && Object.keys(allowances).length === 0,
        allowancesKeys: allowances && typeof allowances === 'object' ? Object.keys(allowances) : 'not an object',
        allowancesValues: allowances && typeof allowances === 'object' ? Object.values(allowances) : 'not an object'
      })

      // Test our logic exactly
      if (allowances && typeof allowances === 'object') {
        const values = Object.values(allowances)
        const hasNonZero = values.some(val => parseFloat(val) > 0)
        const totalSum = values.reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
        console.log('🧮 Allowances Logic Test:', {
          values,
          hasNonZero,
          totalSum,
          shouldShowCard: hasNonZero,
          exampleFromDB: 'Compare with {"general":400,"transport":0} or {"transport":0}'
        })
      }

      // DEDUCTIONS DEBUG
      console.log('🔍 DEDUCTIONS ANALYSIS:')
      const deductions = payoutData.deductions
      console.log('📊 Deductions data:', {
        deductionsRaw: deductions,
        deductionsType: typeof deductions,
        deductionsIsNull: deductions === null,
        deductionsIsUndefined: deductions === undefined,
        deductionsIsEmptyObject: deductions && typeof deductions === 'object' && Object.keys(deductions).length === 0,
        deductionsKeys: deductions && typeof deductions === 'object' ? Object.keys(deductions) : 'not an object',
        deductionsValues: deductions && typeof deductions === 'object' ? Object.values(deductions) : 'not an object'
      })

      // Test our logic exactly
      if (deductions && typeof deductions === 'object') {
        const values = Object.values(deductions)
        const hasNonZero = values.some(val => parseFloat(val) > 0)
        const totalSum = values.reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
        console.log('🧮 Deductions Logic Test:', {
          values,
          hasNonZero,
          totalSum,
          shouldShowCard: hasNonZero,
          exampleFromDB: 'Compare with {"sss":245,"loan":270,"cash_advance":0}'
        })
      }

      // COMMISSIONS DEBUG
      console.log('🔍 COMMISSIONS ANALYSIS:')
      const commissions = payoutData.commissions
      console.log('📊 Commissions data:', {
        commissionsRaw: commissions,
        commissionsType: typeof commissions,
        commissionsIsNull: commissions === null,
        commissionsIsUndefined: commissions === undefined,
        commissionsIsEmptyObject: commissions && typeof commissions === 'object' && Object.keys(commissions).length === 0,
        commissionsKeys: commissions && typeof commissions === 'object' ? Object.keys(commissions) : 'not an object',
        commissionsValues: commissions && typeof commissions === 'object' ? Object.values(commissions) : 'not an object'
      })
    }

    if (!payoutData?.week_start) return

    // Fetch and summarize deliveries for the specific week
    const deliveryWeekStart = new Date(payoutData.week_start)
    const deliveryWeekEnd = new Date(deliveryWeekStart)
    deliveryWeekEnd.setDate(deliveryWeekEnd.getDate() + 6) // Add 6 days to get the full week

    // First fetch deliveries data (we'll calculate net deliveries after getting stock data)
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('product_id, quantity, price_snapshot, products(name, price_per_unit)')
      .eq('worker_id', employeeId)
      .gte('delivery_date', payoutData.week_start)
      .lte('delivery_date', deliveryWeekEnd.toISOString().split('T')[0]) // Get deliveries for the entire week

    // Use confirmed_at timestamp to determine stock periods
    const confirmedAt = payoutData.confirmed_at
    const confirmedDate = new Date(confirmedAt)

    // Get the week_start that corresponds to when this payroll was confirmed
    const confirmedWeekStart = format(confirmedDate, 'yyyy-MM-dd')

    // Calculate the week before the confirmation (for previous stock)
    const prevWeekDate = new Date(confirmedDate)
    prevWeekDate.setDate(prevWeekDate.getDate() - 7)
    const prevWeekStr = format(prevWeekDate, 'yyyy-MM-dd')

    console.log('📦 Stock Timing Based on Confirmed At:', {
      confirmedAt,
      confirmedWeekStart,
      previousWeek: prevWeekStr,
      payoutWeekStart: payoutData.week_start
    })

    // Previous Stock: Stock from the week before payroll was confirmed
    const { data: prevStock } = await supabase
      .from('bodega_stock')
      .select('quantity, product_id, products(name, category)')
      .eq('worker_id', employeeId)
      .eq('week_start', prevWeekStr)

    // Current Stock: Stock from when payroll was confirmed (most recent)
    const { data: currStock } = await supabase
      .from('bodega_stock')
      .select('quantity, product_id, products(name, category, price_per_unit)')
      .eq('worker_id', employeeId)
      .eq('week_start', confirmedWeekStart)

    // Group stock by category and product name
    const groupStock = (stockData) => {
      const grouped = {}
      stockData?.forEach(item => {
        const cat = item.products?.category || 'Uncategorized'
        const name = item.products?.name || 'Unknown'
        const price = parseFloat(item.products?.price_per_unit || 0)
        if (!grouped[cat]) grouped[cat] = {}
        if (!grouped[cat][name]) {
          grouped[cat][name] = { quantity: 0, price: price, total: 0 }
        }
        grouped[cat][name].quantity += item.quantity
        grouped[cat][name].total = grouped[cat][name].quantity * price
      })
      console.log('🧮 Grouping stockData:', stockData)
      return grouped
    }

    previousStockBreakdown.value = groupStock(prevStock)
    currentStockBreakdown.value = groupStock(currStock)

    // Now calculate net deliveries (deliveries - previous stock) after stock data is available
    if (deliveries?.length) {
      const deliverySummary = {}
      deliveries.forEach(d => {
        const name = d.products?.name || 'Unknown'
        const price = parseFloat((d.price_snapshot ?? d.products?.price_per_unit) || 0)
        if (!deliverySummary[name]) deliverySummary[name] = { name, quantity: 0, subtotal: 0 }
        deliverySummary[name].quantity += d.quantity
        deliverySummary[name].subtotal += d.quantity * price
      })

      // Get previous stock quantities by product name
      const previousStockQuantities = {}
      Object.values(previousStockBreakdown.value).forEach(categoryProducts => {
        Object.entries(categoryProducts).forEach(([name, stockItem]) => {
          const qty = stockItem.quantity || 0
          previousStockQuantities[name] = (previousStockQuantities[name] || 0) + qty
        })
      })

      // Calculate net deliveries (deliveries - previous stock)
      const netDeliveries = Object.values(deliverySummary).map(item => {
        const previousQty = previousStockQuantities[item.name] || 0
        const netQuantity = item.quantity - previousQty
        const unitPrice = item.quantity > 0 ? item.subtotal / item.quantity : 0
        return {
          name: item.name,
          quantity: netQuantity,
          subtotal: netQuantity * unitPrice,
          deliveryQty: item.quantity,
          previousQty: previousQty
        }
      })

      productBreakdown.value = netDeliveries

      console.log('📦 Net Delivery Calculation:', {
        originalDeliveries: Object.values(deliverySummary),
        previousStock: previousStockQuantities,
        netDeliveries: netDeliveries
      })
    }

  } catch (err) {
    console.error('❌ Payroll Fetch Error:', err.message)
  } finally {
    loading.value = false
  }
})
</script>
