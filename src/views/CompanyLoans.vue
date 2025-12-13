<template>
    <div class="min-h-screen text-white p-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
                <h1 class="text-3xl font-bold text-white">🏦 Company Loans</h1>
                <p class="text-white/60 mt-2">Manage employee loans and payment tracking</p>
            </div>
            <div class="flex gap-4">
                <div class="bg-white/10 rounded-lg px-4 py-2">
                    <span class="text-white/60 text-sm">Total Outstanding:</span>
                    <span class="text-red-400 font-bold text-lg ml-2">₱{{ totalOutstanding.toLocaleString() }}</span>
                </div>
                <div class="bg-white/10 rounded-lg px-4 py-2">
                    <span class="text-white/60 text-sm">Total Paid:</span>
                    <span class="text-green-400 font-bold text-lg ml-2">₱{{ totalPaid.toLocaleString() }}</span>
                </div>
            </div>
        </div>

        <!-- Loan Type Tabs -->
        <div class="flex gap-2 mb-6">
            <button @click="activeLoanTab = 'cash'" :class="[
                'px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2',
                activeLoanTab === 'cash'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            ]">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z">
                    </path>
                </svg>
                Cash Loans
                <span class="text-xs bg-white/20 px-2 py-0.5 rounded-full">{{ cashLoanCount }}</span>
            </button>
            <button @click="activeLoanTab = 'asset'" :class="[
                'px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2',
                activeLoanTab === 'asset'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            ]">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                </svg>
                Asset Loans
                <span class="text-xs bg-white/20 px-2 py-0.5 rounded-full">{{ assetLoanCount }}</span>
            </button>
        </div>

        <!-- Filter Controls -->
        <div class="bg-white/5 rounded-xl p-4 mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center gap-4">
                <div class="relative flex-1">
                    <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" fill="none"
                        stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <input v-model="searchQuery" type="text" placeholder="Search employees..."
                        class="pl-10 pr-4 py-2 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-full" />
                </div>

                <div class="flex gap-2">
                    <button v-for="filter in loanFilters" :key="filter.key" @click="activeFilter = filter.key" :class="[
                        'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        activeFilter === filter.key
                            ? 'bg-blue-600 text-white shadow-lg'
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
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p>Loading employees and loan data...</p>
            </div>
        </div>

        <!-- Employee Loan Cards - Cash Loans Tab -->
        <div v-else-if="activeLoanTab === 'cash'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div v-for="employee in filteredEmployees" :key="employee.id" @click="openLoanModal(employee)"
                class="bg-white/10 rounded-xl p-6 border border-white/10 hover:border-blue-500/50 transition-all cursor-pointer group hover:bg-white/15">

                <!-- Employee Info -->
                <div class="flex items-center gap-3 mb-4">
                    <div
                        class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {{ employee.name.charAt(0) }}
                    </div>
                    <div class="flex-1">
                        <h3 class="font-semibold text-white group-hover:text-blue-300 transition-colors">{{
                            employee.name }}</h3>
                        <p class="text-white/60 text-sm">{{ employee.position }}</p>
                    </div>
                    <div class="text-right">
                        <span :class="[
                            'text-xs px-2 py-1 rounded-full font-medium',
                            employee.cashLoans.length > 0
                                ? 'bg-orange-500/20 text-orange-300'
                                : 'bg-green-500/20 text-green-300'
                        ]">
                            {{ employee.cashLoans.length > 0 ? `${employee.cashLoans.length} Active` : 'No Loans' }}
                        </span>
                    </div>
                </div>

                <!-- Cash Loan Summary -->
                <div v-if="employee.cashLoans.length > 0" class="space-y-3">
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-white/60 block">Outstanding:</span>
                            <span class="text-red-400 font-bold">₱{{ employee.cashOutstanding.toLocaleString() }}</span>
                        </div>
                        <div>
                            <span class="text-white/60 block">Paid:</span>
                            <span class="text-green-400 font-bold">₱{{ employee.cashPaid.toLocaleString() }}</span>
                        </div>
                    </div>

                    <!-- Progress Bar -->
                    <div class="space-y-2">
                        <div class="flex justify-between text-xs text-white/60">
                            <span>Payment Progress</span>
                            <span>{{ Math.round(Math.max(0, (employee.cashPaid / (employee.cashPaid + employee.cashOutstanding)) * 100)) || 0 }}%</span>
                        </div>
                        <div class="w-full bg-white/10 rounded-full h-2">
                            <div class="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                                :style="{ width: `${Math.max(0, (employee.cashPaid / (employee.cashPaid + employee.cashOutstanding)) * 100) || 0}%` }"></div>
                        </div>
                    </div>

                    <!-- Active Cash Loans List -->
                    <div class="space-y-2">
                        <h4 class="text-xs text-white/60 font-medium">Active Cash Loans:</h4>
                        <div v-for="loan in employee.cashLoans" :key="loan.id"
                            class="flex justify-between items-center bg-white/5 rounded-lg p-2 group/loan">
                            <div class="flex-1 min-w-0">
                                <span class="text-white text-sm font-medium">₱{{ loan.balance.toLocaleString() }}</span>
                                <span class="text-white/40 text-xs"> / ₱{{ loan.amount.toLocaleString() }}</span>
                                <span class="text-white/60 text-xs ml-2 truncate">{{ loan.remarks || 'Loan' }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-white/60 text-xs hidden sm:inline">{{ formatDate(loan.start_date) }}</span>
                                <button @click.stop="openEditLoanModal(loan, employee)"
                                    class="p-1.5 rounded-lg bg-white/10 hover:bg-blue-500/30 text-white/60 hover:text-blue-300 transition-all opacity-0 group-hover/loan:opacity-100"
                                    title="Edit loan">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- No Cash Loans State -->
                <div v-else class="text-center py-4">
                    <div class="text-white/40 text-sm mb-2">No active cash loans</div>
                    <div class="text-blue-400 text-xs group-hover:text-blue-300 transition-colors">
                        Click to apply for a cash loan
                    </div>
                </div>

                <!-- Action Hint -->
                <div class="mt-4 pt-3 border-t border-white/10">
                    <div
                        class="flex items-center justify-center text-white/60 group-hover:text-blue-400 transition-colors text-sm">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        {{ employee.cashLoans.length > 0 ? 'Apply for new cash loan' : 'Apply for cash loan' }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Employee Loan Cards - Asset Loans Tab -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div v-for="employee in filteredEmployees" :key="employee.id" @click="openAssetLoanModal(employee)"
                class="bg-white/10 rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer group hover:bg-white/15">

                <!-- Employee Info -->
                <div class="flex items-center gap-3 mb-4">
                    <div
                        class="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-lg">
                        {{ employee.name.charAt(0) }}
                    </div>
                    <div class="flex-1">
                        <h3 class="font-semibold text-white group-hover:text-purple-300 transition-colors">{{
                            employee.name }}</h3>
                        <p class="text-white/60 text-sm">{{ employee.position }}</p>
                    </div>
                    <div class="text-right">
                        <span :class="[
                            'text-xs px-2 py-1 rounded-full font-medium',
                            employee.assetLoans.length > 0
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-green-500/20 text-green-300'
                        ]">
                            {{ employee.assetLoans.length > 0 ? `${employee.assetLoans.length} Active` : 'No Assets' }}
                        </span>
                    </div>
                </div>

                <!-- Asset Loan Summary -->
                <div v-if="employee.assetLoans.length > 0" class="space-y-3">
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-white/60 block">Outstanding:</span>
                            <span class="text-red-400 font-bold">₱{{ employee.assetOutstanding.toLocaleString() }}</span>
                        </div>
                        <div>
                            <span class="text-white/60 block">Paid:</span>
                            <span class="text-green-400 font-bold">₱{{ employee.assetPaid.toLocaleString() }}</span>
                        </div>
                    </div>

                    <!-- Progress Bar -->
                    <div class="space-y-2">
                        <div class="flex justify-between text-xs text-white/60">
                            <span>Payment Progress</span>
                            <span>{{ Math.round(Math.max(0, (employee.assetPaid / (employee.assetPaid + employee.assetOutstanding)) * 100)) || 0 }}%</span>
                        </div>
                        <div class="w-full bg-white/10 rounded-full h-2">
                            <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                                :style="{ width: `${Math.max(0, (employee.assetPaid / (employee.assetPaid + employee.assetOutstanding)) * 100) || 0}%` }"></div>
                        </div>
                    </div>

                    <!-- Active Asset Loans List -->
                    <div class="space-y-2">
                        <h4 class="text-xs text-white/60 font-medium">Active Asset Loans:</h4>
                        <div v-for="loan in employee.assetLoans" :key="loan.id"
                            class="flex justify-between items-center bg-white/5 rounded-lg p-2 group/loan">
                            <div class="flex-1 min-w-0">
                                <span class="text-white text-sm font-medium">₱{{ loan.balance.toLocaleString() }}</span>
                                <span class="text-white/40 text-xs"> / ₱{{ loan.amount.toLocaleString() }}</span>
                                <span class="text-purple-300 text-xs ml-2">{{ loan.asset_type || 'Asset' }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-white/60 text-xs hidden sm:inline">₱{{ (loan.weekly_deduction || 0).toLocaleString() }}/wk</span>
                                <button @click.stop="openEditLoanModal(loan, employee)"
                                    class="p-1.5 rounded-lg bg-white/10 hover:bg-purple-500/30 text-white/60 hover:text-purple-300 transition-all opacity-0 group-hover/loan:opacity-100"
                                    title="Edit loan">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- No Asset Loans State -->
                <div v-else class="text-center py-4">
                    <div class="text-white/40 text-sm mb-2">No active asset loans</div>
                    <div class="text-purple-400 text-xs group-hover:text-purple-300 transition-colors">
                        Click to add an asset loan
                    </div>
                </div>

                <!-- Action Hint -->
                <div class="mt-4 pt-3 border-t border-white/10">
                    <div
                        class="flex items-center justify-center text-white/60 group-hover:text-purple-400 transition-colors text-sm">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        {{ employee.assetLoans.length > 0 ? 'Add another asset loan' : 'Add asset loan' }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Loan Application Modal -->
        <div v-if="showLoanModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div class="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <!-- Modal Header -->
                <div class="flex justify-between items-center p-6 border-b border-white/10">
                    <div>
                        <h2 class="text-xl font-bold text-white">New Loan Application</h2>
                        <p class="text-white/60 text-sm mt-1">{{ selectedEmployee?.name }}</p>
                    </div>
                    <button @click="closeLoanModal" class="text-white/60 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="p-6 space-y-6">
                    <!-- Loan Type -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-3">Loan Type</label>
                        <div class="grid grid-cols-2 gap-3">
                            <button v-for="type in loanTypes" :key="type" @click="loanForm.type = type" :class="[
                                'p-3 rounded-lg text-sm font-medium transition-all border',
                                loanForm.type === type
                                    ? 'bg-blue-600 text-white border-blue-500'
                                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:border-white/20'
                            ]">
                                {{ type }}
                            </button>
                        </div>
                    </div>

                    <!-- Loan Amount -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-2">Loan Amount</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">₱</span>
                            <input v-model="loanForm.amount" type="number" step="100" min="1000" max="100000"
                                class="pl-8 pr-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-full"
                                placeholder="0.00" />
                        </div>
                        <p class="text-white/40 text-xs mt-2">Minimum: ₱1,000 | Maximum: ₱100,000</p>
                    </div>

                    <!-- Payment Terms (Fixed) -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-2">Payment Terms</label>
                        <div class="w-full px-4 py-3 bg-white/5 text-white rounded-lg border border-white/10">
                            <span class="text-white/90">8 weeks (Fixed)</span>
                            <span class="text-white/60 text-sm ml-2">• 1% interest per week</span>
                        </div>
                        <p class="text-white/40 text-xs mt-2">All company loans have standardized 8-week payment terms
                            at 1% interest per week (8% total)</p>
                    </div>

                    <!-- Purpose -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-2">Purpose</label>
                        <textarea v-model="loanForm.purpose" rows="3"
                            class="w-full px-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                            placeholder="Briefly describe the purpose of this loan..."></textarea>
                    </div>

                    <!-- Loan Summary -->
                    <div v-if="loanForm.amount" class="bg-white/5 rounded-lg p-4 border border-white/10">
                        <h4 class="text-white font-medium mb-3">Loan Summary</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-white/60">Principal Amount:</span>
                                <span class="text-white">₱{{ parseFloat(loanForm.amount || 0).toLocaleString() }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-white/60">Interest Rate:</span>
                                <span class="text-white">1% per week (8% total)</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-white/60">Payment Period:</span>
                                <span class="text-white">8 weeks</span>
                            </div>
                            <div class="flex justify-between border-t border-white/10 pt-2 font-medium">
                                <span class="text-white/80">Weekly Payment:</span>
                                <span class="text-green-400">₱{{ calculateWeeklyPayment().toLocaleString() }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-white/80">Total Amount:</span>
                                <span class="text-white">₱{{ calculateTotalAmount().toLocaleString() }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="flex gap-3 p-6 border-t border-white/10">
                    <button @click="closeLoanModal"
                        class="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium">
                        Cancel
                    </button>
                    <button @click="submitLoanApplication" :disabled="!canSubmitLoan" :class="[
                        'flex-1 px-4 py-3 rounded-lg font-medium transition-all',
                        canSubmitLoan
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                            : 'bg-white/10 text-white/40 cursor-not-allowed'
                    ]">
                        Submit Application
                    </button>
                </div>
            </div>
        </div>

        <!-- Asset Loan Modal -->
        <div v-if="showAssetLoanModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div class="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <!-- Modal Header -->
                <div class="flex justify-between items-center p-6 border-b border-white/10">
                    <div>
                        <h2 class="text-xl font-bold text-white">New Asset Loan</h2>
                        <p class="text-white/60 text-sm mt-1">{{ selectedEmployee?.name }}</p>
                    </div>
                    <button @click="closeAssetLoanModal" class="text-white/60 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="p-6 space-y-6">
                    <!-- Asset Type -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-3">Asset Type</label>
                        <div class="grid grid-cols-2 gap-3">
                            <button v-for="type in assetTypes" :key="type" @click="assetLoanForm.assetType = type" :class="[
                                'p-3 rounded-lg text-sm font-medium transition-all border',
                                assetLoanForm.assetType === type
                                    ? 'bg-purple-600 text-white border-purple-500'
                                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:border-white/20'
                            ]">
                                {{ type }}
                            </button>
                        </div>
                    </div>

                    <!-- Asset Description -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-2">Asset Description</label>
                        <input v-model="assetLoanForm.assetDescription" type="text"
                            class="w-full px-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            placeholder="e.g., Honda Click 125i, Model 2024" />
                    </div>

                    <!-- Total Loan Amount -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-2">Total Loan Amount</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">₱</span>
                            <input v-model="assetLoanForm.totalAmount" type="number" step="100" min="1000"
                                class="pl-8 pr-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all w-full"
                                placeholder="0.00" />
                        </div>
                        <p class="text-white/40 text-xs mt-2">Total amount to be paid for the asset</p>
                    </div>

                    <!-- Weekly Deduction -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-2">Fixed Weekly Deduction</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">₱</span>
                            <input v-model="assetLoanForm.weeklyDeduction" type="number" step="50" min="100"
                                class="pl-8 pr-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all w-full"
                                placeholder="0.00" />
                        </div>
                        <p class="text-white/40 text-xs mt-2">Amount deducted every Saturday</p>
                    </div>

                    <!-- Additional Remarks -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-2">Additional Remarks</label>
                        <textarea v-model="assetLoanForm.remarks" rows="2"
                            class="w-full px-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                            placeholder="Any additional notes..."></textarea>
                    </div>

                    <!-- Loan Summary -->
                    <div v-if="assetLoanForm.totalAmount && assetLoanForm.weeklyDeduction" class="bg-white/5 rounded-lg p-4 border border-white/10">
                        <h4 class="text-white font-medium mb-3">Asset Loan Summary</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-white/60">Asset:</span>
                                <span class="text-purple-300">{{ assetLoanForm.assetType }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-white/60">Total Amount:</span>
                                <span class="text-white">₱{{ parseFloat(assetLoanForm.totalAmount || 0).toLocaleString() }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-white/60">Weekly Deduction:</span>
                                <span class="text-white">₱{{ parseFloat(assetLoanForm.weeklyDeduction || 0).toLocaleString() }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-white/60">Deduction Day:</span>
                                <span class="text-white">Every Saturday</span>
                            </div>
                            <div class="flex justify-between border-t border-white/10 pt-2 font-medium">
                                <span class="text-white/80">Est. Weeks to Pay:</span>
                                <span class="text-green-400">{{ calculateWeeksToPay() }} weeks</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="flex gap-3 p-6 border-t border-white/10">
                    <button @click="closeAssetLoanModal"
                        class="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium">
                        Cancel
                    </button>
                    <button @click="submitAssetLoan" :disabled="!canSubmitAssetLoan" :class="[
                        'flex-1 px-4 py-3 rounded-lg font-medium transition-all',
                        canSubmitAssetLoan
                            ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'
                            : 'bg-white/10 text-white/40 cursor-not-allowed'
                    ]">
                        Add Asset Loan
                    </button>
                </div>
            </div>
        </div>

        <!-- Edit Loan Modal -->
        <div v-if="showEditLoanModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div class="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <!-- Modal Header -->
                <div class="flex justify-between items-center p-6 border-b border-white/10">
                    <div>
                        <h2 class="text-xl font-bold text-white">Edit Loan</h2>
                        <p class="text-white/60 text-sm mt-1">{{ selectedEmployee?.name }}</p>
                    </div>
                    <button @click="closeEditLoanModal" class="text-white/60 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="p-6 space-y-6">
                    <!-- Loan Info -->
                    <div class="bg-white/5 rounded-lg p-4 border border-white/10">
                        <h4 class="text-white font-medium mb-3">Loan Details</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-white/60">Type:</span>
                                <span :class="selectedLoan?.loan_category === 'asset' ? 'text-purple-300' : 'text-blue-300'">
                                    {{ selectedLoan?.loan_category === 'asset' ? (selectedLoan?.asset_type || 'Asset Loan') : 'Cash Loan' }}
                                </span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-white/60">Original Amount:</span>
                                <span class="text-white">₱{{ selectedLoan?.amount?.toLocaleString() }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-white/60">Current Balance:</span>
                                <span class="text-red-400 font-medium">₱{{ selectedLoan?.balance?.toLocaleString() }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-white/60">Total Paid:</span>
                                <span class="text-green-400">₱{{ ((selectedLoan?.amount || 0) - (selectedLoan?.balance || 0)).toLocaleString() }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-white/60">Start Date:</span>
                                <span class="text-white">{{ selectedLoan?.start_date ? formatDate(selectedLoan.start_date) : '-' }}</span>
                            </div>
                            <div v-if="selectedLoan?.weekly_deduction" class="flex justify-between">
                                <span class="text-white/60">Weekly Deduction:</span>
                                <span class="text-white">₱{{ selectedLoan?.weekly_deduction?.toLocaleString() }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Edit Balance -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-2">Adjust Balance</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">₱</span>
                            <input v-model="editLoanForm.balance" type="number" step="1" min="0"
                                class="pl-8 pr-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-full"
                                :placeholder="selectedLoan?.balance?.toString()" />
                        </div>
                        <p class="text-white/40 text-xs mt-2">Set to 0 to mark as fully paid, or adjust if payment wasn't recorded properly</p>
                    </div>

                    <!-- Remarks -->
                    <div>
                        <label class="block text-sm font-medium text-white/70 mb-2">Remarks</label>
                        <textarea v-model="editLoanForm.remarks" rows="2"
                            class="w-full px-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                            :placeholder="selectedLoan?.remarks || 'Add notes about this adjustment...'"></textarea>
                    </div>

                    <!-- Quick Actions -->
                    <div class="space-y-3">
                        <h4 class="text-sm font-medium text-white/70">Quick Actions</h4>
                        <div class="grid grid-cols-2 gap-3">
                            <button @click="editLoanForm.balance = 0"
                                class="p-3 rounded-lg bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 transition-all text-sm font-medium">
                                Mark as Fully Paid
                            </button>
                            <button @click="editLoanForm.balance = selectedLoan?.balance"
                                class="p-3 rounded-lg bg-white/10 text-white/70 border border-white/20 hover:bg-white/20 transition-all text-sm font-medium">
                                Reset to Current
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="flex gap-3 p-6 border-t border-white/10">
                    <button @click="closeEditLoanModal"
                        class="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium">
                        Cancel
                    </button>
                    <button @click="updateLoan" :class="[
                        'flex-1 px-4 py-3 rounded-lg font-medium transition-all',
                        editLoanForm.balance !== '' && editLoanForm.balance !== selectedLoan?.balance
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                            : 'bg-white/10 text-white/40 cursor-not-allowed'
                    ]" :disabled="editLoanForm.balance === '' || editLoanForm.balance === selectedLoan?.balance">
                        Save Changes
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
const activeLoanTab = ref('cash') // 'cash' or 'asset'
const showLoanModal = ref(false)
const showAssetLoanModal = ref(false)
const showEditLoanModal = ref(false)
const selectedEmployee = ref(null)
const selectedLoan = ref(null)

// Edit loan form
const editLoanForm = ref({
    balance: '',
    remarks: ''
})

// Loan form (cash loans)
const loanForm = ref({
    type: 'Personal',
    amount: '',
    purpose: ''
})

// Asset loan form
const assetLoanForm = ref({
    assetType: 'Motorcycle',
    assetDescription: '',
    totalAmount: '',
    weeklyDeduction: '',
    remarks: ''
})

// Loan types
const loanTypes = ['Personal', 'Emergency', 'Educational', 'Medical']
const assetTypes = ['Motorcycle', 'Equipment', 'Vehicle', 'Other']

// Real data from Supabase
const employees = ref([])
const loading = ref(true)

// Computed properties
const processedEmployees = computed(() => {
    return employees.value.map(employee => {
        // Separate cash and asset loans
        const cashLoans = employee.activeLoans.filter(loan => loan.loan_category !== 'asset')
        const assetLoans = employee.activeLoans.filter(loan => loan.loan_category === 'asset')

        // Cash loan totals
        const cashOutstanding = cashLoans.reduce((sum, loan) => sum + (loan.balance || 0), 0)
        const cashPaid = cashLoans.reduce((sum, loan) => sum + (loan.amount - loan.balance), 0)
        const cashTotal = cashLoans.reduce((sum, loan) => sum + (loan.amount || 0), 0)

        // Asset loan totals
        const assetOutstanding = assetLoans.reduce((sum, loan) => sum + (loan.balance || 0), 0)
        const assetPaid = assetLoans.reduce((sum, loan) => sum + (loan.amount - loan.balance), 0)
        const assetTotal = assetLoans.reduce((sum, loan) => sum + (loan.amount || 0), 0)

        // Combined totals
        const totalOutstanding = cashOutstanding + assetOutstanding
        const totalPaid = cashPaid + assetPaid
        const totalLoanAmount = cashTotal + assetTotal
        const paymentProgress = totalLoanAmount > 0 ? (totalPaid / totalLoanAmount) * 100 : 0

        return {
            ...employee,
            cashLoans,
            assetLoans,
            cashOutstanding,
            cashPaid,
            assetOutstanding,
            assetPaid,
            totalOutstanding,
            totalPaid,
            paymentProgress
        }
    })
})

// Loan counts for tabs
const cashLoanCount = computed(() => {
    return processedEmployees.value.reduce((sum, emp) => sum + emp.cashLoans.length, 0)
})

const assetLoanCount = computed(() => {
    return processedEmployees.value.reduce((sum, emp) => sum + emp.assetLoans.length, 0)
})

const loanFilters = computed(() => {
    if (activeLoanTab.value === 'cash') {
        return [
            { key: 'all', label: 'All Employees', count: processedEmployees.value.length },
            { key: 'active', label: 'With Cash Loans', count: processedEmployees.value.filter(e => e.cashLoans.length > 0).length },
            { key: 'no-loans', label: 'No Cash Loans', count: processedEmployees.value.filter(e => e.cashLoans.length === 0).length }
        ]
    } else {
        return [
            { key: 'all', label: 'All Employees', count: processedEmployees.value.length },
            { key: 'active', label: 'With Asset Loans', count: processedEmployees.value.filter(e => e.assetLoans.length > 0).length },
            { key: 'no-loans', label: 'No Asset Loans', count: processedEmployees.value.filter(e => e.assetLoans.length === 0).length }
        ]
    }
})

const filteredEmployees = computed(() => {
    let filtered = processedEmployees.value

    // Apply search filter
    if (searchQuery.value) {
        filtered = filtered.filter(employee =>
            employee.name.toLowerCase().includes(searchQuery.value.toLowerCase())
        )
    }

    // Apply loan status filter based on active tab
    if (activeLoanTab.value === 'cash') {
        if (activeFilter.value === 'active') {
            filtered = filtered.filter(employee => employee.cashLoans.length > 0)
        } else if (activeFilter.value === 'no-loans') {
            filtered = filtered.filter(employee => employee.cashLoans.length === 0)
        }
    } else {
        if (activeFilter.value === 'active') {
            filtered = filtered.filter(employee => employee.assetLoans.length > 0)
        } else if (activeFilter.value === 'no-loans') {
            filtered = filtered.filter(employee => employee.assetLoans.length === 0)
        }
    }

    return filtered
})

const totalOutstanding = computed(() => {
    return processedEmployees.value.reduce((sum, employee) => sum + employee.totalOutstanding, 0)
})

const totalPaid = computed(() => {
    return processedEmployees.value.reduce((sum, employee) => sum + employee.totalPaid, 0)
})

const canSubmitLoan = computed(() => {
    return loanForm.value.type &&
        loanForm.value.amount &&
        loanForm.value.purpose &&
        parseFloat(loanForm.value.amount) >= 1000 &&
        parseFloat(loanForm.value.amount) <= 100000
})

const canSubmitAssetLoan = computed(() => {
    return assetLoanForm.value.assetType &&
        assetLoanForm.value.assetDescription &&
        assetLoanForm.value.totalAmount &&
        assetLoanForm.value.weeklyDeduction &&
        parseFloat(assetLoanForm.value.totalAmount) >= 1000 &&
        parseFloat(assetLoanForm.value.weeklyDeduction) >= 100
})

// Methods
function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function openLoanModal(employee) {
    selectedEmployee.value = employee
    showLoanModal.value = true
    // Reset form
    loanForm.value = {
        type: 'Personal',
        amount: '',
        purpose: ''
    }
}

function closeLoanModal() {
    showLoanModal.value = false
    selectedEmployee.value = null
}

function openAssetLoanModal(employee) {
    selectedEmployee.value = employee
    showAssetLoanModal.value = true
    // Reset form
    assetLoanForm.value = {
        assetType: 'Motorcycle',
        assetDescription: '',
        totalAmount: '',
        weeklyDeduction: '',
        remarks: ''
    }
}

function closeAssetLoanModal() {
    showAssetLoanModal.value = false
    selectedEmployee.value = null
}

function openEditLoanModal(loan, employee) {
    selectedLoan.value = loan
    selectedEmployee.value = employee
    editLoanForm.value = {
        balance: loan.balance,
        remarks: loan.remarks || ''
    }
    showEditLoanModal.value = true
}

function closeEditLoanModal() {
    showEditLoanModal.value = false
    selectedLoan.value = null
    selectedEmployee.value = null
}

async function updateLoan() {
    if (editLoanForm.value.balance === '' || editLoanForm.value.balance === selectedLoan.value?.balance) return

    try {
        const newBalance = parseFloat(editLoanForm.value.balance)
        const newStatus = newBalance <= 0 ? 'paid' : 'active'

        // Update loan in database
        const { error } = await supabase
            .from('loans')
            .update({
                balance: Math.max(0, newBalance),
                status: newStatus,
                remarks: editLoanForm.value.remarks || selectedLoan.value.remarks
            })
            .eq('id', selectedLoan.value.id)

        if (error) {
            console.error('Error updating loan:', error)
            alert('Error updating loan. Please try again.')
            return
        }

        alert(newBalance <= 0 ? 'Loan marked as fully paid!' : 'Loan balance updated successfully!')
        closeEditLoanModal()

        // Refresh data to get updated totals
        await fetchEmployeesAndLoans()

    } catch (error) {
        console.error('Error updating loan:', error)
        alert('Error updating loan. Please try again.')
    }
}

function calculateWeeksToPay() {
    if (!assetLoanForm.value.totalAmount || !assetLoanForm.value.weeklyDeduction) return 0
    const total = parseFloat(assetLoanForm.value.totalAmount)
    const weekly = parseFloat(assetLoanForm.value.weeklyDeduction)
    return Math.ceil(total / weekly)
}

function calculateWeeklyPayment() {
    if (!loanForm.value.amount) return 0

    const principal = parseFloat(loanForm.value.amount)
    const totalInterest = principal * 0.08 // 1% per week × 8 weeks = 8% total
    const totalAmount = principal + totalInterest

    return Math.round(totalAmount / 8) // 8 weeks
}

function calculateTotalAmount() {
    if (!loanForm.value.amount) return 0

    const principal = parseFloat(loanForm.value.amount)
    const totalInterest = principal * 0.08 // 1% per week × 8 weeks = 8% total

    return Math.round(principal + totalInterest)
}

async function submitLoanApplication() {
    if (!canSubmitLoan.value) return

    try {
        const loanAmount = parseFloat(loanForm.value.amount)

        // Calculate total amount including interest
        const totalWithInterest = calculateTotalAmount()

        // Insert new loan into database
        const { data, error } = await supabase
            .from('loans')
            .insert({
                worker_id: selectedEmployee.value.id,
                amount: totalWithInterest, // Total amount to be repaid (including interest)
                balance: totalWithInterest, // Current remaining balance
                status: 'active',
                start_date: new Date().toISOString().split('T')[0],
                remarks: `${loanForm.value.type} - ${loanForm.value.purpose} (Principal: ₱${loanAmount.toLocaleString()})`
            })
            .select()

        if (error) {
            console.error('Error submitting loan:', error)
            alert('Error submitting loan application. Please try again.')
            return
        }

        // Add to local state immediately for UI update
        const newLoan = {
            id: data[0].id,
            worker_id: selectedEmployee.value.id,
            amount: totalWithInterest,
            balance: totalWithInterest,
            start_date: new Date().toISOString().split('T')[0],
            status: 'active',
            remarks: `${loanForm.value.type} - ${loanForm.value.purpose} (Principal: ₱${loanAmount.toLocaleString()})`
        }

        selectedEmployee.value.activeLoans.push(newLoan)

        alert('Loan application submitted successfully!')
        closeLoanModal()

        // Refresh data to get updated totals
        await fetchEmployeesAndLoans()

    } catch (error) {
        console.error('Error submitting loan application:', error)
        alert('Error submitting loan application. Please try again.')
    }
}

async function submitAssetLoan() {
    if (!canSubmitAssetLoan.value) return

    try {
        const totalAmount = parseFloat(assetLoanForm.value.totalAmount)
        const weeklyDeduction = parseFloat(assetLoanForm.value.weeklyDeduction)

        // Build remarks with asset info
        const remarks = `${assetLoanForm.value.assetType} - ${assetLoanForm.value.assetDescription}${assetLoanForm.value.remarks ? ' | ' + assetLoanForm.value.remarks : ''}`

        // Insert new asset loan into database
        const { data, error } = await supabase
            .from('loans')
            .insert({
                worker_id: selectedEmployee.value.id,
                amount: totalAmount,
                balance: totalAmount,
                status: 'active',
                start_date: new Date().toISOString().split('T')[0],
                remarks: remarks,
                loan_category: 'asset',
                asset_type: assetLoanForm.value.assetType,
                weekly_deduction: weeklyDeduction
            })
            .select()

        if (error) {
            console.error('Error submitting asset loan:', error)
            alert('Error submitting asset loan. Please try again.')
            return
        }

        // Add to local state immediately for UI update
        const newLoan = {
            id: data[0].id,
            worker_id: selectedEmployee.value.id,
            amount: totalAmount,
            balance: totalAmount,
            start_date: new Date().toISOString().split('T')[0],
            status: 'active',
            remarks: remarks,
            loan_category: 'asset',
            asset_type: assetLoanForm.value.assetType,
            weekly_deduction: weeklyDeduction
        }

        selectedEmployee.value.activeLoans.push(newLoan)

        alert('Asset loan added successfully!')
        closeAssetLoanModal()

        // Refresh data to get updated totals
        await fetchEmployeesAndLoans()

    } catch (error) {
        console.error('Error submitting asset loan:', error)
        alert('Error submitting asset loan. Please try again.')
    }
}

// Data fetching functions
async function fetchEmployeesAndLoans() {
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

        // Fetch all active loans
        const { data: loans, error: loansError } = await supabase
            .from('loans')
            .select('*')
            .eq('status', 'active')
            .order('start_date', { ascending: false })

        if (loansError) {
            console.error('Error fetching loans:', loansError)
            return
        }

        // Group loans by worker
        const loansByWorker = {}
        loans?.forEach(loan => {
            if (!loansByWorker[loan.worker_id]) {
                loansByWorker[loan.worker_id] = []
            }
            loansByWorker[loan.worker_id].push(loan)
        })

        // Combine workers with their loans
        employees.value = workers?.map(worker => ({
            ...worker,
            position: 'RenewCo Employee', // Hardcoded position
            activeLoans: loansByWorker[worker.id] || []
        })) || []

    } catch (error) {
        console.error('Error fetching data:', error)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    console.log('Company Loans page loaded')
    fetchEmployeesAndLoans()
})
</script>

<style scoped>
/* Custom Scrollbar Styling */
:deep(*) {
    /* Webkit browsers (Chrome, Safari, Edge) */
    scrollbar-width: thin;
    scrollbar-color: rgba(59, 130, 246, 0.5) rgba(255, 255, 255, 0.1);
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
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.6), rgba(147, 51, 234, 0.6));
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(*::-webkit-scrollbar-thumb:hover) {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(147, 51, 234, 0.8));
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