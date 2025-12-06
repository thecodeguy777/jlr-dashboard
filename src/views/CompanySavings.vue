<template>
    <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white p-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
                <h1
                    class="text-3xl font-bold bg-gradient-to-r from-white via-green-100 to-emerald-200 bg-clip-text text-transparent">
                    💰 Company Savings</h1>
                <p class="text-white/60 mt-2">Manage employee savings and refund processing</p>
            </div>
            <div class="flex gap-4 items-center">
                <div class="bg-green-600/20 rounded-lg px-4 py-2 border border-green-500/30">
                    <span class="text-white/60 text-sm">Total Savings:</span>
                    <span class="text-green-400 font-bold text-lg ml-2">₱{{ totalSavings.toLocaleString() }}</span>
                </div>
                <div class="bg-blue-600/20 rounded-lg px-4 py-2 border border-blue-500/30">
                    <span class="text-white/60 text-sm">Total Deposits:</span>
                    <span class="text-blue-400 font-bold text-lg ml-2">₱{{ totalDeposits.toLocaleString() }}</span>
                </div>
                <div class="bg-orange-600/20 rounded-lg px-4 py-2 border border-orange-500/30">
                    <span class="text-white/60 text-sm">Total Refunds:</span>
                    <span class="text-orange-400 font-bold text-lg ml-2">₱{{ Math.abs(totalRefunds).toLocaleString()
                    }}</span>
                </div>
                <button @click="downloadPDF"
                    class="bg-purple-600/80 hover:bg-purple-600 rounded-lg px-4 py-2 border border-purple-500/30 transition-colors flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <span class="font-medium">Download PDF</span>
                </button>
            </div>
        </div>

        <!-- Filter Controls -->
        <div class="bg-white/5 backdrop-blur-sm rounded-xl p-4 mb-8 border border-white/10">
            <div class="flex flex-col sm:flex-row sm:items-center gap-4">
                <div class="relative flex-1">
                    <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" fill="none"
                        stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <input v-model="searchQuery" type="text" placeholder="Search employees..."
                        class="pl-10 pr-4 py-2 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all w-full" />
                </div>

                <div class="flex gap-2">
                    <button v-for="filter in savingsFilters" :key="filter.key" @click="activeFilter = filter.key"
                        :class="[
                            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                            activeFilter === filter.key
                                ? 'bg-green-600 text-white shadow-lg'
                                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                        ]">
                        {{ filter.label }}
                        <span class="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">{{ filter.count }}</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-20">
            <div class="text-white/60 text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                <p>Loading employees and savings data...</p>
            </div>
        </div>

        <!-- Employee Savings Cards -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div v-for="employee in filteredEmployees" :key="employee.id"
                class="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-green-500/50 transition-all group hover:bg-white/15">

                <!-- Employee Info -->
                <div class="flex items-center gap-3 mb-4 cursor-pointer" @click="openRefundModal(employee)">
                    <div
                        class="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                        {{ employee.name.charAt(0) }}
                    </div>
                    <div class="flex-1">
                        <h3 class="font-semibold text-white group-hover:text-green-300 transition-colors">{{
                            employee.name }}</h3>
                        <p class="text-white/60 text-sm">{{ employee.position }}</p>
                    </div>
                    <div class="text-right">
                        <span :class="[
                            'text-xs px-2 py-1 rounded-full font-medium',
                            employee.totalSavings > 0
                                ? 'bg-green-500/20 text-green-300'
                                : 'bg-gray-500/20 text-gray-300'
                        ]">
                            {{ employee.totalSavings > 0 ? `₱${employee.totalSavings.toLocaleString()}` : 'No Savings'
                            }}
                        </span>
                    </div>
                </div>

                <!-- Tab Buttons -->
                <div v-if="employee.totalSavings > 0" class="flex gap-2 mb-4">
                    <button @click.stop="setCardTab(employee.id, 'savings')"
                        :class="[
                            'flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all',
                            getCardTab(employee.id) === 'savings'
                                ? 'bg-green-600 text-white'
                                : 'bg-white/10 text-white/60 hover:bg-white/20'
                        ]">
                        Savings
                    </button>
                    <button @click.stop="setCardTab(employee.id, 'interest2')"
                        :class="[
                            'flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all',
                            getCardTab(employee.id) === 'interest2'
                                ? 'bg-yellow-600 text-white'
                                : 'bg-white/10 text-white/60 hover:bg-white/20'
                        ]">
                        2%
                    </button>
                    <button @click.stop="setCardTab(employee.id, 'interest4')"
                        :class="[
                            'flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all',
                            getCardTab(employee.id) === 'interest4'
                                ? 'bg-amber-600 text-white'
                                : 'bg-white/10 text-white/60 hover:bg-white/20'
                        ]">
                        4%
                    </button>
                </div>

                <!-- SAVINGS TAB -->
                <div v-if="employee.totalSavings > 0 && getCardTab(employee.id) === 'savings'" class="space-y-3">
                    <!-- Total Balance Hero -->
                    <div
                        class="bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-lg p-4 border border-green-500/30">
                        <div class="text-center">
                            <p class="text-green-300 text-sm font-medium mb-1">Current Balance</p>
                            <p class="text-white text-2xl font-bold">₱{{ employee.totalSavings.toLocaleString() }}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-white/60 block">Total Deposits:</span>
                            <span class="text-green-400 font-bold">₱{{ employee.totalDeposits.toLocaleString() }}</span>
                        </div>
                        <div>
                            <span class="text-white/60 block">Total Refunds:</span>
                            <span class="text-orange-400 font-bold">₱{{ Math.abs(employee.totalRefunds).toLocaleString()
                                }}</span>
                        </div>
                    </div>

                    <!-- Recent Transactions -->
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <h4 class="text-xs text-white/60 font-medium">Recent Transactions:</h4>
                            <div class="flex items-center gap-2">
                                <button @click.stop="downloadEmployeeLedger(employee)"
                                    class="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                                    title="Download Ledger">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    Ledger
                                </button>
                                <button @click.stop="openTransactionsModal(employee)"
                                    class="text-xs text-green-400 hover:text-green-300 transition-colors">
                                    View All
                                </button>
                            </div>
                        </div>
                        <div v-for="transaction in employee.recentTransactions.slice(0, 3)" :key="transaction.id"
                            class="flex justify-between items-center bg-white/5 rounded-lg p-2">
                            <div class="flex items-center gap-2">
                                <div :class="[
                                    'w-2 h-2 rounded-full',
                                    transaction.amount > 0 ? 'bg-green-400' : 'bg-orange-400'
                                ]"></div>
                                <span :class="[
                                    'text-sm font-medium',
                                    transaction.amount > 0 ? 'text-green-400' : 'text-orange-400'
                                ]">
                                    {{ transaction.amount > 0 ? '+' : '' }}₱{{ transaction.amount.toLocaleString() }}
                                </span>
                            </div>
                            <div class="text-right">
                                <span class="text-white/60 text-xs">{{ formatDate(getTransactionDate(transaction))
                                    }}</span>
                                <div class="text-white/40 text-xs">{{ getTransactionType(transaction) }}</div>
                            </div>
                        </div>
                        <div v-if="employee.recentTransactions.length > 3" class="text-center">
                            <button @click.stop="openTransactionsModal(employee)"
                                class="text-white/40 text-xs hover:text-green-400 transition-colors">
                                +{{ employee.recentTransactions.length - 3 }} more transactions
                            </button>
                        </div>
                    </div>
                </div>

                <!-- INTEREST 2% TAB -->
                <div v-if="employee.totalSavings > 0 && getCardTab(employee.id) === 'interest2'" class="space-y-3">
                    <!-- Interest Summary -->
                    <div class="bg-gradient-to-r from-yellow-600/20 to-amber-600/20 rounded-lg p-4 border border-yellow-500/30">
                        <div class="text-center">
                            <p class="text-yellow-300 text-sm font-medium mb-1">Interest @ 2%/period (12%/yr)</p>
                            <p class="text-white text-2xl font-bold">₱{{ calculateEmployeeInterest(employee, 0.02).totalInterest.toLocaleString() }}</p>
                        </div>
                    </div>

                    <!-- Bimonthly Breakdown -->
                    <div class="space-y-2">
                        <h4 class="text-xs text-white/60 font-medium">Bimonthly Breakdown:</h4>
                        <div v-for="period in calculateEmployeeInterest(employee, 0.02).periods.filter(p => p.deposits > 0 || p.deducted > 0)"
                            :key="period.name"
                            class="bg-white/5 rounded-lg p-2 text-xs">
                            <div class="flex justify-between items-center">
                                <div>
                                    <span class="text-white font-medium">{{ period.name }}</span>
                                    <span class="text-white/40 ml-2">({{ (period.rate * 100).toFixed(0) }}%)</span>
                                </div>
                                <div class="text-right">
                                    <span v-if="period.deducted > 0" class="text-orange-400 line-through mr-2">₱{{ period.deposits.toLocaleString() }}</span>
                                    <span class="text-white/60">₱{{ period.savings.toLocaleString() }}</span>
                                    <span class="text-yellow-400 font-medium ml-2">+₱{{ period.interest.toLocaleString() }}</span>
                                </div>
                            </div>
                            <div v-if="period.deducted > 0" class="text-orange-400/70 text-right mt-1">
                                -₱{{ period.deducted.toLocaleString() }} refund deducted
                            </div>
                        </div>
                    </div>

                    <!-- Overall Total -->
                    <div class="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div class="grid grid-cols-3 gap-2 text-xs text-center">
                            <div>
                                <p class="text-white/60">Savings</p>
                                <p class="text-green-400 font-bold">₱{{ calculateEmployeeInterest(employee, 0.02).totalSavings.toLocaleString() }}</p>
                            </div>
                            <div>
                                <p class="text-white/60">Interest</p>
                                <p class="text-yellow-400 font-bold">₱{{ calculateEmployeeInterest(employee, 0.02).totalInterest.toLocaleString() }}</p>
                            </div>
                            <div>
                                <p class="text-white/60">Total</p>
                                <p class="text-white font-bold">₱{{ calculateEmployeeInterest(employee, 0.02).overallTotal.toLocaleString() }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- INTEREST 4% TAB -->
                <div v-if="employee.totalSavings > 0 && getCardTab(employee.id) === 'interest4'" class="space-y-3">
                    <!-- Interest Summary -->
                    <div class="bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-lg p-4 border border-amber-500/30">
                        <div class="text-center">
                            <p class="text-amber-300 text-sm font-medium mb-1">Interest @ 4%/period (24%/yr)</p>
                            <p class="text-white text-2xl font-bold">₱{{ calculateEmployeeInterest(employee, 0.04).totalInterest.toLocaleString() }}</p>
                        </div>
                    </div>

                    <!-- Bimonthly Breakdown -->
                    <div class="space-y-2">
                        <h4 class="text-xs text-white/60 font-medium">Bimonthly Breakdown:</h4>
                        <div v-for="period in calculateEmployeeInterest(employee, 0.04).periods.filter(p => p.deposits > 0 || p.deducted > 0)"
                            :key="period.name"
                            class="bg-white/5 rounded-lg p-2 text-xs">
                            <div class="flex justify-between items-center">
                                <div>
                                    <span class="text-white font-medium">{{ period.name }}</span>
                                    <span class="text-white/40 ml-2">({{ (period.rate * 100).toFixed(0) }}%)</span>
                                </div>
                                <div class="text-right">
                                    <span v-if="period.deducted > 0" class="text-orange-400 line-through mr-2">₱{{ period.deposits.toLocaleString() }}</span>
                                    <span class="text-white/60">₱{{ period.savings.toLocaleString() }}</span>
                                    <span class="text-amber-400 font-medium ml-2">+₱{{ period.interest.toLocaleString() }}</span>
                                </div>
                            </div>
                            <div v-if="period.deducted > 0" class="text-orange-400/70 text-right mt-1">
                                -₱{{ period.deducted.toLocaleString() }} refund deducted
                            </div>
                        </div>
                    </div>

                    <!-- Overall Total -->
                    <div class="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div class="grid grid-cols-3 gap-2 text-xs text-center">
                            <div>
                                <p class="text-white/60">Savings</p>
                                <p class="text-green-400 font-bold">₱{{ calculateEmployeeInterest(employee, 0.04).totalSavings.toLocaleString() }}</p>
                            </div>
                            <div>
                                <p class="text-white/60">Interest</p>
                                <p class="text-amber-400 font-bold">₱{{ calculateEmployeeInterest(employee, 0.04).totalInterest.toLocaleString() }}</p>
                            </div>
                            <div>
                                <p class="text-white/60">Total</p>
                                <p class="text-white font-bold">₱{{ calculateEmployeeInterest(employee, 0.04).overallTotal.toLocaleString() }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- No Savings State -->
                <div v-if="employee.totalSavings === 0" class="text-center py-4">
                    <div class="text-white/40 text-sm mb-2">No savings yet</div>
                    <div class="text-green-400 text-xs group-hover:text-green-300 transition-colors">
                        Savings will appear after payroll deductions
                    </div>
                </div>

                <!-- Action Hint -->
                <div class="mt-4 pt-3 border-t border-white/10">
                    <div
                        class="flex items-center justify-center text-white/60 group-hover:text-green-400 transition-colors text-sm">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1">
                            </path>
                        </svg>
                        {{ employee.totalSavings > 0 ? 'Manage savings' : 'Add savings' }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Savings Management Modal -->
        <div v-if="showRefundModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div
                class="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/10">
                <!-- Modal Header -->
                <div class="flex justify-between items-center p-6 border-b border-white/10">
                    <div>
                        <h2 class="text-xl font-bold text-white">Manage Savings</h2>
                        <p class="text-white/60 text-sm mt-1">{{ selectedEmployee?.name }}</p>
                        <p class="text-green-400 text-sm font-medium">Current Balance: ₱{{
                            selectedEmployee?.totalSavings.toLocaleString() }}</p>
                    </div>
                    <button @click="closeRefundModal" class="text-white/60 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Mode Toggle Tabs -->
                <div class="flex border-b border-white/10">
                    <button @click="modalMode = 'add'" :class="[
                        'flex-1 px-6 py-3 text-sm font-medium transition-all',
                        modalMode === 'add'
                            ? 'text-green-400 border-b-2 border-green-500 bg-green-500/10'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                    ]">
                        <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Add Savings
                    </button>
                    <button @click="modalMode = 'refund'" :class="[
                        'flex-1 px-6 py-3 text-sm font-medium transition-all',
                        modalMode === 'refund'
                            ? 'text-orange-400 border-b-2 border-orange-500 bg-orange-500/10'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                    ]" :disabled="selectedEmployee?.totalSavings <= 0">
                        <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                        </svg>
                        Process Refund
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="p-6 space-y-6">
                    <!-- ADD SAVINGS MODE -->
                    <div v-if="modalMode === 'add'">
                        <!-- Add Amount -->
                        <div>
                            <label class="block text-sm font-medium text-white/70 mb-2">Savings Amount</label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">₱</span>
                                <input v-model="refundForm.amount" type="number" step="50" min="50"
                                    class="pl-8 pr-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all w-full"
                                    placeholder="0.00" />
                            </div>
                            <p class="text-white/40 text-xs mt-2">Minimum: ₱50 • This will be added to their current
                                balance</p>
                        </div>

                        <!-- Add Reason -->
                        <div>
                            <label class="block text-sm font-medium text-white/70 mb-3">Reason for Addition</label>
                            <div class="grid grid-cols-2 gap-3">
                                <button v-for="reason in addReasons" :key="reason" @click="refundForm.reason = reason"
                                    :class="[
                                        'p-3 rounded-lg text-sm font-medium transition-all border',
                                        refundForm.reason === reason
                                            ? 'bg-green-600 text-white border-green-500'
                                            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:border-white/20'
                                    ]">
                                    {{ reason }}
                                </button>
                            </div>
                        </div>

                        <!-- Additional Notes -->
                        <div>
                            <label class="block text-sm font-medium text-white/70 mb-2">Additional Notes</label>
                            <textarea v-model="refundForm.notes" rows="3"
                                class="w-full px-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                                placeholder="Optional notes about this savings addition..."></textarea>
                        </div>

                        <!-- Savings Date -->
                        <div>
                            <label class="block text-sm font-medium text-white/70 mb-2">Savings Date</label>
                            <input v-model="refundForm.date" type="date"
                                class="px-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all w-full"
                                :max="new Date().toISOString().split('T')[0]" />
                            <p class="text-white/40 text-xs mt-2">Select the Saturday this savings is for</p>
                        </div>

                        <!-- Add Preview -->
                        <div v-if="refundForm.amount && parseFloat(refundForm.amount) > 0"
                            class="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                            <h4 class="text-white font-medium mb-3">Addition Preview</h4>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-white/60">Current Balance:</span>
                                    <span class="text-green-400">₱{{ selectedEmployee?.totalSavings.toLocaleString()
                                    }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-white/60">Addition Amount:</span>
                                    <span class="text-green-400">+₱{{ parseFloat(refundForm.amount ||
                                        0).toLocaleString() }}</span>
                                </div>
                                <div class="flex justify-between border-t border-white/10 pt-2 font-medium">
                                    <span class="text-white/80">New Balance:</span>
                                    <span class="text-white">₱{{ (selectedEmployee?.totalSavings +
                                        parseFloat(refundForm.amount || 0)).toLocaleString() }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-white/60">Reason:</span>
                                    <span class="text-white">{{ refundForm.reason || 'Not specified' }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- REFUND MODE -->
                    <div v-else-if="modalMode === 'refund'">
                        <!-- Refund Amount -->
                        <div>
                            <label class="block text-sm font-medium text-white/70 mb-2">Refund Amount</label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">₱</span>
                                <input v-model="refundForm.amount" type="number" step="50" min="50"
                                    :max="selectedEmployee?.totalSavings"
                                    class="pl-8 pr-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all w-full"
                                    placeholder="0.00" />
                            </div>
                            <p class="text-white/40 text-xs mt-2">Maximum: ₱{{
                                selectedEmployee?.totalSavings.toLocaleString() || '0' }}</p>
                        </div>

                        <!-- Refund Date -->
                        <div>
                            <label class="block text-sm font-medium text-white/70 mb-2">Refund Date</label>
                            <input v-model="refundForm.date" type="date"
                                class="px-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all w-full"
                                :max="new Date().toISOString().split('T')[0]" />
                            <p class="text-white/40 text-xs mt-2">Select the date when this refund occurred (for past refunds)</p>
                        </div>

                        <!-- Refund Reason -->
                        <div>
                            <label class="block text-sm font-medium text-white/70 mb-3">Refund Reason</label>
                            <div class="grid grid-cols-2 gap-3">
                                <button v-for="reason in refundReasons" :key="reason"
                                    @click="refundForm.reason = reason" :class="[
                                        'p-3 rounded-lg text-sm font-medium transition-all border',
                                        refundForm.reason === reason
                                            ? 'bg-orange-600 text-white border-orange-500'
                                            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:border-white/20'
                                    ]">
                                    {{ reason }}
                                </button>
                            </div>
                        </div>

                        <!-- Additional Notes -->
                        <div>
                            <label class="block text-sm font-medium text-white/70 mb-2">Additional Notes</label>
                            <textarea v-model="refundForm.notes" rows="3"
                                class="w-full px-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                                placeholder="Optional notes about this refund..."></textarea>
                        </div>

                        <!-- Refund Preview -->
                        <div v-if="refundForm.amount && parseFloat(refundForm.amount) > 0"
                            class="bg-orange-500/10 rounded-lg p-4 border border-orange-500/20">
                            <h4 class="text-white font-medium mb-3">Refund Preview</h4>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-white/60">Current Balance:</span>
                                    <span class="text-green-400">₱{{ selectedEmployee?.totalSavings.toLocaleString()
                                    }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-white/60">Refund Amount:</span>
                                    <span class="text-orange-400">-₱{{ parseFloat(refundForm.amount ||
                                        0).toLocaleString() }}</span>
                                </div>
                                <div class="flex justify-between border-t border-white/10 pt-2 font-medium">
                                    <span class="text-white/80">Remaining Balance:</span>
                                    <span class="text-white">₱{{ (selectedEmployee?.totalSavings -
                                        parseFloat(refundForm.amount || 0)).toLocaleString() }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-white/60">Reason:</span>
                                    <span class="text-white">{{ refundForm.reason || 'Not specified' }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-white/60">Date:</span>
                                    <span class="text-white">{{ new Date(refundForm.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Warning -->
                        <div v-if="parseFloat(refundForm.amount || 0) > (selectedEmployee?.totalSavings || 0)"
                            class="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <div class="flex items-center gap-2 text-red-400 text-sm">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z">
                                    </path>
                                </svg>
                                Refund amount exceeds available balance
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="flex gap-3 p-6 border-t border-white/10">
                    <button @click="closeRefundModal"
                        class="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium">
                        Cancel
                    </button>
                    <button v-if="modalMode === 'add'" @click="addSavings" :disabled="!canAddSavings" :class="[
                        'flex-1 px-4 py-3 rounded-lg font-medium transition-all',
                        canAddSavings
                            ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                            : 'bg-white/10 text-white/40 cursor-not-allowed'
                    ]">
                        Add Savings
                    </button>
                    <button v-else @click="processRefund" :disabled="!canProcessRefund" :class="[
                        'flex-1 px-4 py-3 rounded-lg font-medium transition-all',
                        canProcessRefund
                            ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg'
                            : 'bg-white/10 text-white/40 cursor-not-allowed'
                    ]">
                        Process Refund
                    </button>
                </div>
            </div>
        </div>

        <!-- All Transactions Modal -->
        <div v-if="showTransactionsModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div
                class="bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/10 flex flex-col">
                <!-- Modal Header -->
                <div class="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
                    <div>
                        <h2 class="text-xl font-bold text-white">Transaction History</h2>
                        <p class="text-white/60 text-sm mt-1">{{ transactionsEmployee?.name }}</p>
                    </div>
                    <button @click="closeTransactionsModal" class="text-white/60 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Summary Stats -->
                <div class="grid grid-cols-3 gap-4 p-6 border-b border-white/10 shrink-0">
                    <div class="bg-green-600/20 rounded-lg p-3 border border-green-500/30 text-center">
                        <p class="text-green-300 text-xs font-medium mb-1">Current Balance</p>
                        <p class="text-white text-lg font-bold">₱{{ transactionsEmployee?.totalSavings?.toLocaleString() || 0 }}</p>
                    </div>
                    <div class="bg-blue-600/20 rounded-lg p-3 border border-blue-500/30 text-center">
                        <p class="text-blue-300 text-xs font-medium mb-1">Total Deposits</p>
                        <p class="text-white text-lg font-bold">₱{{ transactionsEmployee?.totalDeposits?.toLocaleString() || 0 }}</p>
                    </div>
                    <div class="bg-orange-600/20 rounded-lg p-3 border border-orange-500/30 text-center">
                        <p class="text-orange-300 text-xs font-medium mb-1">Total Refunds</p>
                        <p class="text-white text-lg font-bold">₱{{ Math.abs(transactionsEmployee?.totalRefunds || 0).toLocaleString() }}</p>
                    </div>
                </div>

                <!-- Transactions List -->
                <div class="flex-1 overflow-y-auto p-6">
                    <div class="space-y-3">
                        <div v-for="(transaction, index) in sortedTransactions" :key="transaction.id || index"
                            @click="openEditTransactionModal(transaction)"
                            class="flex justify-between items-center bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer group">
                            <div class="flex items-center gap-4">
                                <div :class="[
                                    'w-10 h-10 rounded-full flex items-center justify-center',
                                    transaction.amount > 0 ? 'bg-green-500/20' : 'bg-orange-500/20'
                                ]">
                                    <svg v-if="transaction.amount > 0" class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                    </svg>
                                    <svg v-else class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                                    </svg>
                                </div>
                                <div>
                                    <span :class="[
                                        'text-lg font-bold',
                                        transaction.amount > 0 ? 'text-green-400' : 'text-orange-400'
                                    ]">
                                        {{ transaction.amount > 0 ? '+' : '' }}₱{{ Math.abs(transaction.amount).toLocaleString() }}
                                    </span>
                                    <div class="text-white/60 text-sm">{{ getTransactionType(transaction) }}</div>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="text-right">
                                    <div class="text-white text-sm font-medium">{{ formatFullDate(getTransactionDate(transaction)) }}</div>
                                    <div v-if="transaction.remarks" class="text-white/40 text-xs max-w-[200px] truncate" :title="transaction.remarks">
                                        {{ transaction.remarks }}
                                    </div>
                                </div>
                                <svg class="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                                </svg>
                            </div>
                        </div>

                        <!-- Empty State -->
                        <div v-if="!sortedTransactions.length" class="text-center py-12">
                            <div class="text-white/40 text-sm">No transactions found</div>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="flex justify-between items-center p-6 border-t border-white/10 shrink-0">
                    <div class="text-white/60 text-sm">
                        {{ sortedTransactions.length }} transaction{{ sortedTransactions.length !== 1 ? 's' : '' }}
                    </div>
                    <button @click="closeTransactionsModal"
                        class="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium">
                        Close
                    </button>
                </div>
            </div>
        </div>

        <!-- Edit Transaction Modal -->
        <div v-if="showEditTransactionModal" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4">
            <div class="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
                <!-- Modal Header -->
                <div class="flex justify-between items-center p-6 border-b border-white/10">
                    <div>
                        <h2 class="text-xl font-bold text-white">Edit Transaction</h2>
                        <p class="text-white/60 text-sm mt-1">{{ transactionsEmployee?.name }}</p>
                    </div>
                    <button @click="closeEditTransactionModal" class="text-white/60 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="p-6 space-y-5">
                    <!-- Transaction Type (Read-only) -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-2">Transaction Type</label>
                        <div :class="[
                            'px-4 py-3 rounded-lg border text-sm font-medium',
                            editForm.amount >= 0
                                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                        ]">
                            {{ editForm.amount >= 0 ? 'Deposit / Savings' : 'Refund / Withdrawal' }}
                        </div>
                    </div>

                    <!-- Amount -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-2">Amount</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">₱</span>
                            <input v-model="editForm.absoluteAmount" type="number" step="50" min="0"
                                class="pl-8 pr-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-full"
                                placeholder="0.00" />
                        </div>
                    </div>

                    <!-- Date -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-2">Date</label>
                        <input v-model="editForm.date" type="date"
                            class="px-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-full" />
                    </div>

                    <!-- Type -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-2">Type</label>
                        <select v-model="editForm.type"
                            class="px-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-full">
                            <option value="auto">Auto (Payroll)</option>
                            <option value="manual">Manual</option>
                            <option value="refund">Refund</option>
                        </select>
                    </div>

                    <!-- Remarks -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-2">Remarks</label>
                        <textarea v-model="editForm.remarks" rows="2"
                            class="w-full px-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                            placeholder="Optional remarks..."></textarea>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="flex gap-3 p-6 border-t border-white/10">
                    <button @click="deleteTransaction"
                        class="px-4 py-3 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors font-medium border border-red-500/30">
                        Delete
                    </button>
                    <div class="flex-1"></div>
                    <button @click="closeEditTransactionModal"
                        class="px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium">
                        Cancel
                    </button>
                    <button @click="saveTransaction"
                        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                        Save
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

// State
const searchQuery = ref('')
const activeFilter = ref('all')
const showRefundModal = ref(false)
const selectedEmployee = ref(null)
const modalMode = ref('add') // 'add' or 'refund'

// Transactions modal state
const showTransactionsModal = ref(false)
const transactionsEmployee = ref(null)

// Edit transaction modal state
const showEditTransactionModal = ref(false)
const editingTransaction = ref(null)
const editForm = ref({
    id: null,
    amount: 0,
    absoluteAmount: 0,
    date: '',
    type: '',
    remarks: ''
})

// Refund form
const refundForm = ref({
    amount: '',
    reason: '',
    notes: '',
    date: new Date().toISOString().split('T')[0] // Default to today
})

// Card tab state (tracks which tab is active per employee)
const cardTabs = ref({}) // { [employeeId]: 'savings' | 'interest' }

function getCardTab(employeeId) {
    return cardTabs.value[employeeId] || 'savings'
}

function setCardTab(employeeId, tab) {
    cardTabs.value[employeeId] = tab
}

// Interest calculation: configurable rate per bimonthly period held
// Refunds are deducted from highest interest period first (Jan/Feb)
function calculateEmployeeInterest(employee, ratePerPeriod = 0.02) {
    const transactions = employee.savingsTransactions || []

    // Group by bimonthly period (highest interest first)
    const periods = [
        { name: 'Jan/Feb', months: [1, 2], periodsHeld: 6, rate: ratePerPeriod * 6 },
        { name: 'Mar/Apr', months: [3, 4], periodsHeld: 5, rate: ratePerPeriod * 5 },
        { name: 'May/Jun', months: [5, 6], periodsHeld: 4, rate: ratePerPeriod * 4 },
        { name: 'Jul/Aug', months: [7, 8], periodsHeld: 3, rate: ratePerPeriod * 3 },
        { name: 'Sep/Oct', months: [9, 10], periodsHeld: 2, rate: ratePerPeriod * 2 },
        { name: 'Nov/Dec', months: [11, 12], periodsHeld: 1, rate: ratePerPeriod * 1 }
    ]

    // Calculate deposits per period
    const periodData = periods.map(period => {
        const deposits = transactions
            .filter(t => {
                const month = new Date(t.week_start + 'T00:00:00').getMonth() + 1
                return period.months.includes(month) && t.amount > 0
            })
            .reduce((sum, t) => sum + parseFloat(t.amount), 0)

        return {
            ...period,
            deposits: deposits,
            adjustedSavings: deposits // Will be adjusted after refunds
        }
    })

    // Calculate total refunds (negative amounts)
    let totalRefunds = Math.abs(transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0))

    // Deduct refunds from highest interest period first
    for (let i = 0; i < periodData.length && totalRefunds > 0; i++) {
        const deduction = Math.min(periodData[i].adjustedSavings, totalRefunds)
        periodData[i].adjustedSavings -= deduction
        periodData[i].deducted = deduction
        totalRefunds -= deduction
    }

    // Calculate interest based on adjusted savings
    const result = periodData.map(period => ({
        ...period,
        savings: period.adjustedSavings,
        interest: period.adjustedSavings * period.rate
    }))

    const totalSavings = result.reduce((sum, p) => sum + p.savings, 0)
    const totalInterest = result.reduce((sum, p) => sum + p.interest, 0)
    const totalDeposits = result.reduce((sum, p) => sum + p.deposits, 0)

    return {
        periods: result,
        totalSavings,
        totalDeposits,
        totalInterest,
        overallTotal: totalSavings + totalInterest
    }
}

// Refund reasons
const refundReasons = ['Personal', 'Emergency', 'Medical', 'Family', 'Education', 'Other']

// Add savings reasons
const addReasons = ['Manual Adjustment', 'Missed Deduction', 'Bonus', 'Correction', 'Retroactive', 'Other']

// Real data from Supabase
const employees = ref([])
const loading = ref(true)

// Computed properties for employees with processed savings data
const processedEmployees = computed(() => {
    return employees.value.map(employee => {
        const deposits = employee.savingsTransactions?.filter(t => t.amount > 0) || []
        const refunds = employee.savingsTransactions?.filter(t => t.amount < 0) || []

        const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0)
        const totalRefunds = refunds.reduce((sum, t) => sum + t.amount, 0)
        const totalSavings = totalDeposits + totalRefunds // totalRefunds is already negative

        return {
            ...employee,
            totalSavings: Math.max(0, totalSavings), // Ensure non-negative
            totalDeposits: totalDeposits,
            totalRefunds: totalRefunds,
            recentTransactions: (employee.savingsTransactions || [])
                .sort((a, b) => new Date(b.week_start) - new Date(a.week_start))
                .slice(0, 5)
        }
    })
})

const savingsFilters = computed(() => [
    { key: 'all', label: 'All Employees', count: processedEmployees.value.length },
    { key: 'with-savings', label: 'With Savings', count: processedEmployees.value.filter(e => e.totalSavings > 0).length },
    { key: 'no-savings', label: 'No Savings', count: processedEmployees.value.filter(e => e.totalSavings === 0).length }
])

const filteredEmployees = computed(() => {
    let filtered = processedEmployees.value

    // Apply search filter
    if (searchQuery.value) {
        filtered = filtered.filter(employee =>
            employee.name.toLowerCase().includes(searchQuery.value.toLowerCase())
        )
    }

    // Apply savings status filter
    if (activeFilter.value === 'with-savings') {
        filtered = filtered.filter(employee => employee.totalSavings > 0)
    } else if (activeFilter.value === 'no-savings') {
        filtered = filtered.filter(employee => employee.totalSavings === 0)
    }

    return filtered
})

// Company-wide totals
const totalSavings = computed(() => {
    return processedEmployees.value.reduce((sum, employee) => sum + employee.totalSavings, 0)
})

const totalDeposits = computed(() => {
    return processedEmployees.value.reduce((sum, employee) => sum + employee.totalDeposits, 0)
})

const totalRefunds = computed(() => {
    return processedEmployees.value.reduce((sum, employee) => sum + employee.totalRefunds, 0)
})

const canProcessRefund = computed(() => {
    const amount = parseFloat(refundForm.value.amount || 0)
    return refundForm.value.reason &&
        amount > 0 &&
        amount <= (selectedEmployee.value?.totalSavings || 0)
})

const canAddSavings = computed(() => {
    const amount = parseFloat(refundForm.value.amount || 0)
    return refundForm.value.reason &&
        amount > 0 &&
        amount >= 50 // Minimum amount
})

// Sorted transactions for modal (newest first)
const sortedTransactions = computed(() => {
    if (!transactionsEmployee.value?.savingsTransactions) return []
    return [...transactionsEmployee.value.savingsTransactions]
        .sort((a, b) => new Date(b.week_start) - new Date(a.week_start))
})

// Methods
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00') // Add time to avoid timezone issues
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatFullDate(dateString) {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

function getTransactionDate(transaction) {
    // For auto transactions (payroll), confirmed date is week_start + 7 days
    if (transaction.type === 'auto') {
        const date = new Date(transaction.week_start + 'T00:00:00')
        date.setDate(date.getDate() + 7)
        return date.toISOString().split('T')[0]
    }
    // For manual transactions and refunds, use week_start (which is the actual transaction date)
    return transaction.week_start
}

function getTransactionType(transaction) {
    if (transaction.amount > 0) {
        return transaction.type === 'auto' ? 'Payroll' :
            transaction.type === 'manual' ? 'Manual Add' : 'Deposit'
    } else {
        return transaction.type === 'refund' ? 'Refund' : 'Withdrawal'
    }
}

function openRefundModal(employee) {
    selectedEmployee.value = employee
    showRefundModal.value = true
    // Set default mode - add if no savings, refund if has savings
    modalMode.value = employee.totalSavings > 0 ? 'refund' : 'add'
    // Reset form
    refundForm.value = {
        amount: '',
        reason: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
    }
}

function closeRefundModal() {
    showRefundModal.value = false
    selectedEmployee.value = null
}

function openTransactionsModal(employee) {
    transactionsEmployee.value = employee
    showTransactionsModal.value = true
}

function closeTransactionsModal() {
    showTransactionsModal.value = false
    transactionsEmployee.value = null
}

function openEditTransactionModal(transaction) {
    editingTransaction.value = transaction
    editForm.value = {
        id: transaction.id,
        amount: parseFloat(transaction.amount),
        absoluteAmount: Math.abs(parseFloat(transaction.amount)),
        date: transaction.week_start,
        type: transaction.type,
        remarks: transaction.remarks || ''
    }
    showEditTransactionModal.value = true
}

function closeEditTransactionModal() {
    showEditTransactionModal.value = false
    editingTransaction.value = null
}

async function saveTransaction() {
    if (!editForm.value.id) return

    try {
        // Determine sign based on type
        let finalAmount = parseFloat(editForm.value.absoluteAmount)
        if (editForm.value.type === 'refund') {
            finalAmount = -Math.abs(finalAmount)
        } else {
            finalAmount = Math.abs(finalAmount)
        }

        const { error } = await supabase
            .from('savings')
            .update({
                amount: finalAmount,
                week_start: editForm.value.date,
                type: editForm.value.type,
                remarks: editForm.value.remarks
            })
            .eq('id', editForm.value.id)

        if (error) {
            console.error('Error updating transaction:', error)
            alert('Error updating transaction. Please try again.')
            return
        }

        alert('Transaction updated successfully!')
        closeEditTransactionModal()

        // Refresh data
        await fetchEmployeesAndSavings()

        // Update the transactionsEmployee with fresh data
        if (transactionsEmployee.value) {
            const updated = processedEmployees.value.find(e => e.id === transactionsEmployee.value.id)
            if (updated) {
                transactionsEmployee.value = updated
            }
        }

    } catch (error) {
        console.error('Error saving transaction:', error)
        alert('Error saving transaction. Please try again.')
    }
}

async function deleteTransaction() {
    if (!editForm.value.id) return

    const confirmed = confirm('Are you sure you want to delete this transaction? This cannot be undone.')
    if (!confirmed) return

    try {
        const { error } = await supabase
            .from('savings')
            .delete()
            .eq('id', editForm.value.id)

        if (error) {
            console.error('Error deleting transaction:', error)
            alert('Error deleting transaction. Please try again.')
            return
        }

        alert('Transaction deleted successfully!')
        closeEditTransactionModal()

        // Refresh data
        await fetchEmployeesAndSavings()

        // Update the transactionsEmployee with fresh data
        if (transactionsEmployee.value) {
            const updated = processedEmployees.value.find(e => e.id === transactionsEmployee.value.id)
            if (updated) {
                transactionsEmployee.value = updated
            }
        }

    } catch (error) {
        console.error('Error deleting transaction:', error)
        alert('Error deleting transaction. Please try again.')
    }
}

async function addSavings() {
    if (!canAddSavings.value) return

    try {
        const addAmount = parseFloat(refundForm.value.amount)
        // Use selected date from form, fallback to today
        const savingsDate = refundForm.value.date || new Date().toISOString().split('T')[0]

        console.log('🔍 Adding savings for date:', savingsDate)

        // Check if there's already a manual entry for this date
        const { data: existingManual, error: checkError } = await supabase
            .from('savings')
            .select('*')
            .eq('worker_id', selectedEmployee.value.id)
            .eq('week_start', savingsDate)
            .eq('type', 'manual')
            .maybeSingle() // Use maybeSingle to avoid 406 error when no rows found

        if (checkError) {
            console.error('Error checking existing manual entry:', checkError)
            alert('Error checking existing entries. Please try again.')
            return
        }

        let data, error

        if (existingManual) {
            // Update existing manual entry by adding to it
            const newAmount = parseFloat(existingManual.amount) + addAmount
            const updatedRemarks = `${existingManual.remarks} + ${refundForm.value.reason} (₱${addAmount.toLocaleString()})`

            const result = await supabase
                .from('savings')
                .update({
                    amount: newAmount,
                    remarks: updatedRemarks
                })
                .eq('id', existingManual.id)
                .select()

            data = result.data
            error = result.error
            console.log('✅ Updated existing manual entry')
        } else {
            // Insert new manual entry
            const result = await supabase
                .from('savings')
                .insert({
                    worker_id: selectedEmployee.value.id,
                    amount: addAmount,
                    type: 'manual',
                    remarks: `${refundForm.value.reason}${refundForm.value.notes ? ` - ${refundForm.value.notes}` : ''}`,
                    week_start: savingsDate
                })
                .select()

            data = result.data
            error = result.error
            console.log('✅ Upserted manual entry')
        }

        if (error) {
            console.error('Error adding savings:', error)
            alert('Error adding savings. Please try again.')
            return
        }

        console.log('✅ Savings processed successfully:', data[0])

        alert(`₱${addAmount.toLocaleString()} added to savings successfully!`)
        closeRefundModal()

        // Refresh data to get updated totals
        await fetchEmployeesAndSavings()

    } catch (error) {
        console.error('Error adding savings:', error)
        alert('Error adding savings. Please try again.')
    }
}

async function processRefund() {
    if (!canProcessRefund.value) return

    try {
        const refundAmount = parseFloat(refundForm.value.amount)
        const refundDate = refundForm.value.date // Use selected date instead of today

        console.log('🔍 Processing refund for date:', refundDate)

        // Check if there's already a refund entry for this date
        const { data: existingRefund, error: checkError } = await supabase
            .from('savings')
            .select('*')
            .eq('worker_id', selectedEmployee.value.id)
            .eq('week_start', refundDate)
            .eq('type', 'refund')
            .maybeSingle() // Use maybeSingle to avoid 406 error when no rows found

        if (checkError) {
            console.error('Error checking existing refund:', checkError)
            alert('Error checking existing refunds. Please try again.')
            return
        }

        let data, error

        if (existingRefund) {
            // Update existing refund entry by adding to it (making it more negative)
            const newAmount = parseFloat(existingRefund.amount) - refundAmount
            const updatedRemarks = `${existingRefund.remarks} + ${refundForm.value.reason} (₱${refundAmount.toLocaleString()})`

            const result = await supabase
                .from('savings')
                .update({
                    amount: newAmount,
                    remarks: updatedRemarks
                })
                .eq('id', existingRefund.id)
                .select()

            data = result.data
            error = result.error
            console.log('✅ Updated existing refund entry')
        } else {
            // Create new refund entry
            const result = await supabase
                .from('savings')
                .insert({
                    worker_id: selectedEmployee.value.id,
                    amount: -refundAmount, // Negative for refund
                    type: 'refund',
                    remarks: `${refundForm.value.reason}${refundForm.value.notes ? ` - ${refundForm.value.notes}` : ''}`,
                    week_start: refundDate
                })
                .select()

            data = result.data
            error = result.error
            console.log('✅ Created new refund entry')
        }

        if (error) {
            console.error('Error processing refund:', error)
            alert('Error processing refund. Please try again.')
            return
        }

        console.log('✅ Refund processed successfully:', data[0])

        alert(`Refund of ₱${refundAmount.toLocaleString()} processed successfully!`)
        closeRefundModal()

        // Refresh data to get updated totals
        await fetchEmployeesAndSavings()

    } catch (error) {
        console.error('Error processing refund:', error)
        alert('Error processing refund. Please try again.')
    }
}

// Data fetching functions
async function fetchEmployeesAndSavings() {
    try {
        loading.value = true

        // Fetch all workers
        const { data: workers, error: workersError } = await supabase
            .from('workers')
            .select('id, name')
            .order('name')

        if (workersError) {
            console.error('Error fetching workers:', workersError)
            return
        }

        // Fetch all savings transactions
        const { data: savings, error: savingsError } = await supabase
            .from('savings')
            .select('*')
            .order('week_start', { ascending: false })

        if (savingsError) {
            console.error('Error fetching savings:', savingsError)
            return
        }

        // Fetch payout data to get confirmed_at dates for auto transactions
        const { data: payouts, error: payoutsError } = await supabase
            .from('payouts')
            .select('employee_id, week_start, confirmed_at')

        if (payoutsError) {
            console.error('Error fetching payouts:', payoutsError)
            // Continue without payout data
        }

        // Create a map of payouts for quick lookup
        const payoutMap = {}
        payouts?.forEach(payout => {
            const key = `${payout.employee_id}_${payout.week_start}`
            payoutMap[key] = payout
        })

        // Enhance savings data with payout information
        const enhancedSavings = savings?.map(saving => ({
            ...saving,
            payouts: payoutMap[`${saving.worker_id}_${saving.week_start}`] || null
        }))

        console.log('📊 Enhanced savings data:', enhancedSavings?.slice(0, 5)) // Log first 5 for debugging

        // Group enhanced savings by worker
        const savingsByWorker = {}
        enhancedSavings?.forEach(saving => {
            if (!savingsByWorker[saving.worker_id]) {
                savingsByWorker[saving.worker_id] = []
            }
            savingsByWorker[saving.worker_id].push(saving)
        })

        // Combine workers with their savings
        employees.value = workers?.map(worker => ({
            ...worker,
            position: 'RenewCo Employee', // Hardcoded position
            savingsTransactions: savingsByWorker[worker.id] || []
        })) || []

    } catch (error) {
        console.error('Error fetching data:', error)
    } finally {
        loading.value = false
    }
}

// PDF Download Function
function downloadPDF() {
    // Get all unique months from savings data (both deposits AND refunds)
    const allMonths = new Set()
    processedEmployees.value.forEach(emp => {
        emp.savingsTransactions?.forEach(t => {
            const date = new Date(t.week_start + 'T00:00:00')
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            allMonths.add(monthKey)
        })
    })

    // Sort months chronologically
    const sortedMonths = Array.from(allMonths).sort()

    // Format month names for headers
    const monthNames = sortedMonths.map(m => {
        const [year, month] = m.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1, 1)
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    })

    // Build table data
    const monthTotals = new Array(sortedMonths.length).fill(0)
    let grandTotal = 0

    // Get employees with any savings activity (deposits or refunds), sorted by name
    const employeesWithSavings = processedEmployees.value
        .filter(emp => emp.totalDeposits > 0 || emp.totalRefunds < 0)
        .sort((a, b) => a.name.localeCompare(b.name))

    const employeeRows = employeesWithSavings.map(emp => {
        let empDepositTotal = 0
        let empRefundTotal = 0

        const monthValues = sortedMonths.map((monthKey, idx) => {
            // Sum deposits for this month
            const depositSum = emp.savingsTransactions
                ?.filter(t => {
                    if (t.amount <= 0) return false
                    const date = new Date(t.week_start + 'T00:00:00')
                    const tMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                    return tMonthKey === monthKey
                })
                .reduce((sum, t) => sum + t.amount, 0) || 0

            // Sum refunds for this month (negative amounts)
            const refundSum = emp.savingsTransactions
                ?.filter(t => {
                    if (t.amount >= 0) return false
                    const date = new Date(t.week_start + 'T00:00:00')
                    const tMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                    return tMonthKey === monthKey
                })
                .reduce((sum, t) => sum + t.amount, 0) || 0

            empDepositTotal += depositSum
            empRefundTotal += refundSum
            monthTotals[idx] += depositSum + refundSum // Net amount
            return { deposit: depositSum, refund: refundSum, net: depositSum + refundSum }
        })

        const empNetTotal = empDepositTotal + empRefundTotal
        grandTotal += empNetTotal
        return {
            name: emp.name,
            months: monthValues,
            depositTotal: empDepositTotal,
            refundTotal: empRefundTotal,
            total: empNetTotal
        }
    })

    const generatedDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Company Savings Report</title>
        <style>
            @page { size: A4 landscape; margin: 0.5in; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; background: white; font-size: 11px; padding: 20px; }
            @media print {
                body { margin: 0; padding: 15px; }
                .no-print { display: none !important; }
            }
            .header { text-align: center; border-bottom: 3px solid #22c55e; padding-bottom: 15px; margin-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; color: #22c55e; margin-bottom: 5px; }
            .document-title { font-size: 18px; color: #374151; font-weight: 600; }
            .document-date { font-size: 12px; color: #6b7280; margin-top: 5px; }

            .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
            .summary-box { padding: 15px; border-radius: 8px; text-align: center; }
            .summary-box.green { background: #dcfce7; border: 1px solid #22c55e; }
            .summary-box.blue { background: #dbeafe; border: 1px solid #3b82f6; }
            .summary-box.orange { background: #ffedd5; border: 1px solid #f97316; }
            .summary-label { font-size: 11px; color: #6b7280; margin-bottom: 5px; }
            .summary-value { font-size: 20px; font-weight: bold; }
            .summary-box.green .summary-value { color: #16a34a; }
            .summary-box.blue .summary-value { color: #2563eb; }
            .summary-box.orange .summary-value { color: #ea580c; }

            .savings-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
            .savings-table th, .savings-table td { border: 1px solid #d1d5db; padding: 8px 6px; text-align: center; vertical-align: middle; }
            .savings-table th { background: #22c55e; color: white; font-weight: 600; font-size: 9px; }
            .savings-table th:first-child { text-align: left; }
            .savings-table td:first-child { text-align: left; font-weight: 600; }
            .savings-table tr:nth-child(even) { background: #f9fafb; }
            .savings-table tr.total-row { background: #22c55e; color: white; font-weight: bold; }
            .savings-table tr.total-row td { border-color: #16a34a; }
            .deposit { color: #16a34a; }
            .refund { color: #dc2626; font-size: 9px; }
            .cell-content { display: flex; flex-direction: column; align-items: center; gap: 2px; }
            .net-value { font-weight: 600; }

            .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 10px; }

            .no-print { margin-top: 30px; text-align: center; }
            .no-print button { padding: 12px 24px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; margin: 0 5px; }
            .btn-print { background: #22c55e; color: white; }
            .btn-close { background: #6b7280; color: white; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-name">💰 RenewCo Company Savings</div>
            <div class="document-title">Employee Savings Report</div>
            <div class="document-date">Generated: ${generatedDate}</div>
        </div>

        <div class="summary-grid">
            <div class="summary-box green">
                <div class="summary-label">Total Savings</div>
                <div class="summary-value">₱${totalSavings.value.toLocaleString()}</div>
            </div>
            <div class="summary-box blue">
                <div class="summary-label">Total Deposits</div>
                <div class="summary-value">₱${totalDeposits.value.toLocaleString()}</div>
            </div>
            <div class="summary-box orange">
                <div class="summary-label">Total Refunds</div>
                <div class="summary-value">₱${Math.abs(totalRefunds.value).toLocaleString()}</div>
            </div>
        </div>

        <table class="savings-table">
            <thead>
                <tr>
                    <th>Employee</th>
                    ${monthNames.map(m => `<th>${m}</th>`).join('')}
                    <th>Deposits</th>
                    <th>Refunds</th>
                    <th>Balance</th>
                </tr>
            </thead>
            <tbody>
                ${employeeRows.map(emp => `
                <tr>
                    <td>${emp.name}</td>
                    ${emp.months.map(v => {
                        if (v.deposit === 0 && v.refund === 0) return '<td>-</td>'
                        let content = ''
                        if (v.deposit > 0) content += `<span class="deposit">+₱${v.deposit.toLocaleString()}</span>`
                        if (v.refund < 0) content += `${v.deposit > 0 ? '<br>' : ''}<span class="refund">-₱${Math.abs(v.refund).toLocaleString()}</span>`
                        return `<td>${content}</td>`
                    }).join('')}
                    <td class="deposit">₱${emp.depositTotal.toLocaleString()}</td>
                    <td class="refund">${emp.refundTotal < 0 ? '-₱' + Math.abs(emp.refundTotal).toLocaleString() : '-'}</td>
                    <td class="net-value">₱${emp.total.toLocaleString()}</td>
                </tr>
                `).join('')}
                <tr class="total-row">
                    <td>TOTAL</td>
                    ${monthTotals.map(t => `<td>₱${t.toLocaleString()}</td>`).join('')}
                    <td>₱${totalDeposits.value.toLocaleString()}</td>
                    <td>-₱${Math.abs(totalRefunds.value).toLocaleString()}</td>
                    <td>₱${grandTotal.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>

        <div class="footer">
            <p><strong>RenewCo</strong> | Company Savings Report | Generated: ${new Date().toLocaleString()}</p>
        </div>

        <div class="no-print">
            <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
            <button class="btn-close" onclick="window.close()">❌ Close</button>
        </div>
    </body>
    </html>
    `

    // Open in new window and trigger print
    const newWindow = window.open('', '_blank')
    if (newWindow) {
        newWindow.document.write(htmlContent)
        newWindow.document.close()
        setTimeout(() => {
            newWindow.focus()
            newWindow.print()
        }, 500)
    }
}

// Individual Employee Ledger PDF Download
function downloadEmployeeLedger(employee) {
    // Get all transactions sorted by date (oldest first for ledger)
    const transactions = [...(employee.savingsTransactions || [])]
        .sort((a, b) => new Date(a.week_start) - new Date(b.week_start))

    if (transactions.length === 0) {
        alert('No transactions to generate ledger for.')
        return
    }

    const generatedDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })

    // Group transactions by month
    const transactionsByMonth = {}
    transactions.forEach(t => {
        const transactionDate = getTransactionDate(t)
        const date = new Date(transactionDate + 'T00:00:00')
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!transactionsByMonth[monthKey]) {
            transactionsByMonth[monthKey] = []
        }
        transactionsByMonth[monthKey].push(t)
    })

    // Sort months chronologically
    const sortedMonths = Object.keys(transactionsByMonth).sort()

    // Calculate running balance and build ledger rows grouped by month
    let runningBalance = 0
    let transactionIndex = 0
    const monthlyData = sortedMonths.map(monthKey => {
        const [year, month] = monthKey.split('-')
        const monthName = new Date(parseInt(year), parseInt(month) - 1, 1)
            .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

        let monthDeposits = 0
        let monthWithdrawals = 0

        const rows = transactionsByMonth[monthKey].map(t => {
            transactionIndex++
            runningBalance += t.amount
            const transactionDate = getTransactionDate(t)
            const formattedDate = new Date(transactionDate + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short', day: 'numeric'
            })

            const deposit = t.amount > 0 ? t.amount : 0
            const withdrawal = t.amount < 0 ? Math.abs(t.amount) : 0
            monthDeposits += deposit
            monthWithdrawals += withdrawal

            return {
                index: transactionIndex,
                date: formattedDate,
                type: getTransactionType(t),
                remarks: t.remarks || '-',
                deposit,
                withdrawal,
                balance: runningBalance
            }
        })

        return {
            monthKey,
            monthName,
            rows,
            monthDeposits,
            monthWithdrawals,
            monthNet: monthDeposits - monthWithdrawals,
            endingBalance: runningBalance
        }
    })

    // Build HTML with month groups - simple format
    const ledgerHTML = monthlyData.map(month => {
        const transactionsHTML = month.rows.map(row => `
            <div class="transaction-row">
                <span class="transaction-date">${row.date}</span>
                <span class="transaction-type">${row.type}</span>
                <span class="${row.deposit > 0 ? 'deposit' : 'withdrawal'}">${row.deposit > 0 ? '+₱' + row.deposit.toLocaleString() : '-₱' + row.withdrawal.toLocaleString()}</span>
            </div>
        `).join('')

        return `
            <div class="month-group">
                <div class="month-header">
                    <span class="month-name">${month.monthName}</span>
                    <span class="month-total ${month.monthNet >= 0 ? 'deposit' : 'withdrawal'}">₱${month.monthNet.toLocaleString()}</span>
                </div>
                <div class="transactions-list">
                    ${transactionsHTML}
                </div>
            </div>
        `
    }).join('')

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Savings Ledger - ${employee.name}</title>
        <style>
            @page { size: A4 portrait; margin: 0.5in; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; background: white; font-size: 11px; padding: 20px; }
            @media print {
                body { margin: 0; padding: 15px; }
                .no-print { display: none !important; }
            }

            .header { text-align: center; border-bottom: 3px solid #22c55e; padding-bottom: 15px; margin-bottom: 20px; }
            .company-name { font-size: 20px; font-weight: bold; color: #22c55e; margin-bottom: 5px; }
            .document-title { font-size: 16px; color: #374151; font-weight: 600; }
            .employee-name { font-size: 14px; color: #6b7280; margin-top: 8px; }
            .document-date { font-size: 10px; color: #9ca3af; margin-top: 5px; }

            .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 25px; }
            .summary-box { padding: 12px; border-radius: 8px; text-align: center; }
            .summary-box.green { background: #dcfce7; border: 1px solid #22c55e; }
            .summary-box.blue { background: #dbeafe; border: 1px solid #3b82f6; }
            .summary-box.orange { background: #ffedd5; border: 1px solid #f97316; }
            .summary-label { font-size: 10px; color: #6b7280; margin-bottom: 3px; }
            .summary-value { font-size: 16px; font-weight: bold; }
            .summary-box.green .summary-value { color: #16a34a; }
            .summary-box.blue .summary-value { color: #2563eb; }
            .summary-box.orange .summary-value { color: #ea580c; }

            .ledger-content { margin-bottom: 20px; }
            .month-group { margin-bottom: 16px; }
            .month-header { display: flex; justify-content: space-between; align-items: center; background: #f0fdf4; border: 1px solid #22c55e; border-radius: 6px; padding: 10px 14px; margin-bottom: 6px; }
            .month-name { font-weight: 700; font-size: 13px; color: #166534; }
            .month-total { font-weight: 700; font-size: 14px; }
            .transactions-list { padding-left: 20px; border-left: 2px solid #d1d5db; margin-left: 10px; }
            .transaction-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-bottom: 1px solid #f3f4f6; font-size: 11px; }
            .transaction-row:last-child { border-bottom: none; }
            .transaction-date { color: #6b7280; width: 70px; }
            .transaction-type { color: #374151; flex: 1; margin-left: 10px; }
            .deposit { color: #16a34a; font-weight: 600; }
            .withdrawal { color: #dc2626; font-weight: 600; }

            .grand-total { display: flex; justify-content: space-between; align-items: center; background: #22c55e; color: white; border-radius: 6px; padding: 12px 14px; margin-top: 20px; }
            .grand-total .label { font-weight: 700; font-size: 14px; }
            .grand-total .value { font-weight: 700; font-size: 16px; }

            .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 9px; }

            .no-print { margin-top: 30px; text-align: center; }
            .no-print button { padding: 12px 24px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; margin: 0 5px; }
            .btn-print { background: #22c55e; color: white; }
            .btn-close { background: #6b7280; color: white; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-name">💰 RenewCo Savings Ledger</div>
            <div class="document-title">Transaction History</div>
            <div class="employee-name">${employee.name}</div>
            <div class="document-date">Generated: ${generatedDate}</div>
        </div>

        <div class="summary-grid">
            <div class="summary-box green">
                <div class="summary-label">Current Balance</div>
                <div class="summary-value">₱${employee.totalSavings.toLocaleString()}</div>
            </div>
            <div class="summary-box blue">
                <div class="summary-label">Total Deposits</div>
                <div class="summary-value">₱${employee.totalDeposits.toLocaleString()}</div>
            </div>
            <div class="summary-box orange">
                <div class="summary-label">Total Withdrawals</div>
                <div class="summary-value">₱${Math.abs(employee.totalRefunds).toLocaleString()}</div>
            </div>
        </div>

        <div class="ledger-content">
            ${ledgerHTML}
        </div>

        <div class="grand-total">
            <span class="label">TOTAL BALANCE</span>
            <span class="value">₱${employee.totalSavings.toLocaleString()}</span>
        </div>

        <div class="footer">
            <p><strong>RenewCo</strong> | Savings Ledger for ${employee.name} | ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} | Generated: ${new Date().toLocaleString()}</p>
        </div>

        <div class="no-print">
            <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
            <button class="btn-close" onclick="window.close()">❌ Close</button>
        </div>
    </body>
    </html>
    `

    // Open in new window and trigger print
    const newWindow = window.open('', '_blank')
    if (newWindow) {
        newWindow.document.write(htmlContent)
        newWindow.document.close()
        setTimeout(() => {
            newWindow.focus()
            newWindow.print()
        }, 500)
    }
}

onMounted(() => {
    console.log('Company Savings page loaded')
    fetchEmployeesAndSavings()
})
</script>

<style scoped>
/* Custom Scrollbar Styling */
:deep(*) {
    /* Webkit browsers (Chrome, Safari, Edge) */
    scrollbar-width: thin;
    scrollbar-color: rgba(34, 197, 94, 0.5) rgba(255, 255, 255, 0.1);
}

:deep(*::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
}

:deep(*::-webkit-scrollbar-track) {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
}

:deep(*::-webkit-scrollbar-thumb) {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.6), rgba(5, 150, 105, 0.6));
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(*::-webkit-scrollbar-thumb:hover) {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(5, 150, 105, 0.8));
    border: 1px solid rgba(255, 255, 255, 0.2);
}

:deep(*::-webkit-scrollbar-corner) {
    background: rgba(255, 255, 255, 0.05);
}

/* Modal specific scrollbar for better contrast */
.fixed .overflow-y-auto::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.6), rgba(59, 130, 246, 0.6));
}

.fixed .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(59, 130, 246, 0.8));
}
</style>