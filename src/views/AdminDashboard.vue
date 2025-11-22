<template>
  <Suspense>
    <template #default>
      <div class="min-h-screen text-white p-6">
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
          <div class="text-2xl font-bold tracking-tight">👑 Admin Panel</div>
          <p class="text-sm text-white/60">Welcome back, Admin Jayson</p>
        </div>
        <!-- View Type and Date Navigation -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-6">
          <!-- View Type Selector -->
          <div class="flex gap-2 mb-4">
            <button v-for="view in ['weekly', 'monthly']" :key="view" :class="[
              'px-4 py-2 rounded-full text-sm font-medium transition-all',
              viewType === view
                ? 'bg-orange-500 text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            ]" @click="viewType = view">
              {{ view === 'weekly' ? '📅 Weekly' : '📊 Monthly' }}
            </button>
          </div>

          <div class="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <label class="text-sm text-white/60">
              {{ viewType === 'weekly' ? '📅 Select Week Ending (Saturday):' : '📊 Select Month:' }}
            </label>
            <input v-if="viewType === 'weekly'" type="date" v-model="selectedSaturday"
              class="bg-gray-800 text-white text-sm p-2 rounded border border-white/10" @change="snapToSaturday" />
            <input v-else type="month" v-model="selectedMonth"
              class="bg-gray-800 text-white text-sm p-2 rounded border border-white/10" />
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap gap-4 mt-4 mb-10">
            <router-link to="/summary"
              class="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow transition">
              📊 View Summary
            </router-link>
            <router-link to="/deliveries"
              class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow transition">
              📦 Manage Deliveries
            </router-link>
            <router-link to="/driver-tracking"
              class="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow transition">
              🚚 Driver Tracking
            </router-link>
            <router-link to="/task-management"
              class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow transition">
              📋 Task Management
            </router-link>
            <router-link to="/clients"
              class="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow transition">
              📍 Client Locations
            </router-link>
          </div>
        </div>
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          <div class="bg-white/10 rounded-xl p-4 shadow space-y-3">
            <div class="flex justify-between items-center">
              <h2 class="text-sm font-medium text-white/70">💰 Financial Overview</h2>

              <!-- Segmented Buttons -->
              <div class="flex gap-1 text-xs">
                <button v-for="type in ['all', 'inhouse', 'subcon']" :key="type" @click="salesView = type" :class="[
                  'px-2 py-1 rounded-full font-semibold transition',
                  salesView === type
                    ? 'bg-green-600 text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                ]">
                  {{ type === 'all' ? 'All' : type === 'inhouse' ? 'In-House' : 'Subcon' }}
                </button>
              </div>
            </div>

            <!-- Financial Metrics -->
            <div class="grid grid-cols-3 gap-2 text-center">
              <div>
                <p class="text-xs text-white/60 uppercase">Sales</p>
                <p class="font-bold text-green-400 break-words" :class="{
                  'text-lg': (grossSalesTotal[salesView] || 0).toLocaleString().length <= 8,
                  'text-base': (grossSalesTotal[salesView] || 0).toLocaleString().length > 8 && (grossSalesTotal[salesView] || 0).toLocaleString().length <= 11,
                  'text-sm': (grossSalesTotal[salesView] || 0).toLocaleString().length > 11
                }">
                  ₱{{ (grossSalesTotal[salesView] || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-white/60 uppercase">Cost</p>
                <p class="font-bold text-red-400 break-words" :class="{
                  'text-lg': (((grossCostTotal[salesView] || 0) + computedTotalPayroll).toLocaleString().length <= 8),
                  'text-base': (((grossCostTotal[salesView] || 0) + computedTotalPayroll).toLocaleString().length > 8 && ((grossCostTotal[salesView] || 0) + computedTotalPayroll).toLocaleString().length <= 11),
                  'text-sm': (((grossCostTotal[salesView] || 0) + computedTotalPayroll).toLocaleString().length > 11)
                }">
                  ₱{{ ((grossCostTotal[salesView] || 0) + computedTotalPayroll).toLocaleString(undefined, { maximumFractionDigits: 0 }) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-white/60 uppercase">Profit</p>
                <p class="font-bold break-words whitespace-nowrap" :class="[
                  ((profitTotal[salesView] || 0) - computedTotalPayroll) >= 0 ? 'text-green-400' : 'text-red-400',
                  {
                    'text-lg': (((profitTotal[salesView] || 0) - computedTotalPayroll).toLocaleString().length <= 7),
                    'text-base': (((profitTotal[salesView] || 0) - computedTotalPayroll).toLocaleString().length > 7 && ((profitTotal[salesView] || 0) - computedTotalPayroll).toLocaleString().length <= 10),
                    'text-sm': (((profitTotal[salesView] || 0) - computedTotalPayroll).toLocaleString().length > 10)
                  }
                ]">
                  {{ ((profitTotal[salesView] || 0) - computedTotalPayroll) >= 0 ? '+' : '' }}₱{{ ((profitTotal[salesView] || 0) - computedTotalPayroll).toLocaleString(undefined, { maximumFractionDigits: 0 }) }}
                </p>
              </div>
            </div>

            <!-- Sales Breakdown -->
            <div v-if="salesView === 'all'" class="text-xs text-white/50 space-y-1 border-t border-white/10 pt-2">
              <div class="flex justify-between">
                <span>Product Sales:</span>
                <span>₱{{ ((grossSalesTotal.all || 0) - (weeklyScrapRevenue || 0)).toLocaleString() }}</span>
              </div>
              <div class="flex justify-between">
                <span>Scrap Revenue:</span>
                <span>₱{{ (weeklyScrapRevenue || 0).toLocaleString() }}</span>
              </div>
              <div class="flex justify-between">
                <span>Payroll:</span>
                <span>₱{{ computedTotalPayroll.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between">
                <span>Raw Materials:</span>
                <span>₱{{ rawMaterialsExpenses.toLocaleString() }}</span>
              </div>
            </div>
            <p class="text-xs text-white/40 text-center">Based on deliveries & transactions this {{ viewType === 'weekly' ? 'week' : 'month' }}</p>
          </div>
          <div class="bg-white/10 rounded-xl p-4 shadow">
            <h2 class="text-sm font-medium text-white/70">Deliveries This {{ viewType === 'weekly' ? 'Week' : 'Month' }}</h2>
            <p class="text-3xl font-bold text-green-400 mt-2">{{ deliveriesCount }} pcs</p>
            <p class="text-xs mt-1" :class="{
              'text-green-400': deliveriesPercentChange > 0,
              'text-red-400': deliveriesPercentChange < 0,
              'text-white/40': deliveriesPercentChange === 0
            }">
              <span v-if="deliveriesPercentChange > 0">↑ {{ deliveriesPercentChange }}% from last {{ viewType === 'weekly' ? 'week' : 'month' }}</span>
              <span v-else-if="deliveriesPercentChange < 0">↓ {{ Math.abs(deliveriesPercentChange) }}% from last {{ viewType === 'weekly' ? 'week' : 'month' }}</span>
              <span v-else>— 0% change</span>
            </p>
            <div class="grid grid-cols-2 gap-2 mt-2 text-sm text-white/60">
              <div><span class="font-medium text-white/80">Single Wall:</span> {{ deliveriesByCategory.singleWall }} pcs
              </div>
              <div><span class="font-medium text-white/80">Double Wall:</span> {{ deliveriesByCategory.doubleWall }} pcs
              </div>
            </div>
          </div>

          <div class="bg-white/10 rounded-xl p-4 shadow">
            <h2 class="text-sm font-medium text-white/70">Total Savings of Employees</h2>
            <p class="text-3xl font-bold text-blue-400 mt-2">₱{{ activeEmployees }}</p>
            <p class="text-xs text-white/40 mt-1">Accumulated from savings table</p>
          </div>

          <div class="bg-white/10 rounded-xl p-4 shadow">
            <h2 class="text-sm font-medium text-white/70">Payroll to be Paid This {{ viewType === 'weekly' ? 'Week' : 'Month' }}</h2>
            <p class="text-3xl font-bold text-red-400 mt-2">₱{{ computedTotalPayroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
            <p class="text-xs text-white/40 mt-1">From payout breakdown below</p>
          </div>



          <!-- Operational Expenses Card -->
          <div class="bg-white/10 rounded-xl p-4 shadow space-y-3">
            <h2 class="text-sm font-medium text-white/70">💸 {{ viewType === 'weekly' ? 'Weekly' : 'Monthly' }} Operational Expenses</h2>

            <div class="text-center">
              <p class="text-3xl font-bold text-red-400">
                ₱{{ (operationalExpenses || 0).toLocaleString() }}
              </p>
              <p class="text-xs text-white/40 mt-1">
                From petty cash fund
              </p>
            </div>

            <!-- Top 3 Operational Expense Categories -->
            <div class="space-y-1 border-t border-white/10 pt-2">
              <div v-for="[name, category] in Object.entries(operationalByCategory)
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 3)" :key="name" class="flex justify-between text-xs">
                <span class="text-white/60 truncate">{{ name }}</span>
                <span class="text-red-400 font-medium">₱{{ (category.total || 0).toLocaleString() }}</span>
              </div>
              <div v-if="Object.keys(operationalByCategory).length === 0" class="text-xs text-white/40 text-center">
                No operational expenses
              </div>
            </div>
          </div>

          <!-- Raw Materials Card -->
          <div class="bg-white/10 rounded-xl p-4 shadow space-y-3">
            <h2 class="text-sm font-medium text-white/70">🏗️ {{ viewType === 'weekly' ? 'Weekly' : 'Monthly' }} Raw Materials</h2>

            <div class="text-center">
              <p class="text-3xl font-bold text-blue-400">
                ₱{{ (rawMaterialsExpenses || 0).toLocaleString() }}
              </p>
              <p class="text-xs text-white/40 mt-1">
                Tracked separately
              </p>
            </div>

            <!-- Top Raw Materials Transactions -->
            <div class="space-y-1 border-t border-white/10 pt-2">
              <div v-for="[name, category] in Object.entries(rawMaterialsByCategory)
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 3)" :key="name" class="flex justify-between text-xs">
                <span class="text-white/60 truncate">{{ name }}</span>
                <span class="text-blue-400 font-medium">₱{{ (category.total || 0).toLocaleString() }}</span>
              </div>
              <div v-if="Object.keys(rawMaterialsByCategory).length === 0" class="text-xs text-white/40 text-center">
                No raw materials recorded
              </div>
            </div>
          </div>

          <!-- Scrap Revenue Card -->
          <div class="bg-white/10 rounded-xl p-4 shadow space-y-2">
            <h2 class="text-sm font-medium text-white/70">♻️ Scrap Revenue</h2>

            <div class="text-center">
              <p class="text-3xl font-bold text-green-400">
                ₱{{ (weeklyScrapRevenue || 0).toLocaleString() }}
              </p>
              <p class="text-xs mt-1" :class="{
                'text-green-400': scrapPercentChange > 0,
                'text-red-400': scrapPercentChange < 0,
                'text-white/40': scrapPercentChange === 0
              }">
                <span v-if="scrapPercentChange > 0">↑ {{ scrapPercentChange }}% from last {{ viewType === 'weekly' ? 'week' : 'month' }}</span>
                <span v-else-if="scrapPercentChange < 0">↓ {{ Math.abs(scrapPercentChange) }}% from last {{ viewType === 'weekly' ? 'week' : 'month' }}</span>
                <span v-else>— 0% change from last {{ viewType === 'weekly' ? 'week' : 'month' }}</span>
              </p>
            </div>

            <div class="text-xs text-white/50 text-center">
              Added to In-House sales
            </div>
          </div>




        </div>


        <!-- Operational Expense Breakdown Section -->
        <div v-if="Object.keys(operationalByCategory).length > 0" class="bg-white/5 rounded-xl p-6 mb-8">
          <h3 class="text-lg font-semibold text-red-300 mb-4">💸 {{ viewType === 'weekly' ? 'Weekly' : 'Monthly' }} Operational Expense Breakdown</h3>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="[name, category] in Object.entries(operationalByCategory)" :key="name"
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
                <span class="text-red-400 font-bold">₱{{ (category.total || 0).toLocaleString() }}</span>
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
                  <span class="text-red-300 font-medium whitespace-nowrap">₱{{
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

          <!-- Total Summary -->
          <div class="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
            <span class="text-white/80 font-medium">Total Operational Expenses:</span>
            <span class="text-2xl font-bold text-red-400">₱{{ operationalExpenses.toLocaleString() }}</span>
          </div>
        </div>

        <!-- Raw Materials Breakdown Section -->
        <div v-if="Object.keys(rawMaterialsByCategory).length > 0" class="bg-white/5 rounded-xl p-6 mb-8">
          <h3 class="text-lg font-semibold text-blue-300 mb-4">🏗️ {{ viewType === 'weekly' ? 'Weekly' : 'Monthly' }} Raw Materials Breakdown</h3>
          <p class="text-xs text-white/50 mb-4">Grouped by supplier/material description</p>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="[description, group] in Object.entries(rawMaterialsByCategory)" :key="description"
              @click="toggleCategoryExpansion(description)"
              class="bg-white/5 rounded-lg p-4 border border-blue-500/20 cursor-pointer hover:bg-white/10 transition-colors">
              <div class="flex justify-between items-center mb-2">
                <h4 class="font-medium text-white/90 flex items-center gap-2">
                  {{ description }}
                  <svg v-if="group.items.length > 1" :class="['w-4 h-4 text-white/50 transition-transform',
                    expandedCategories.has(description) ? 'rotate-180' : '']" fill="none" stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </h4>
                <span class="text-blue-400 font-bold">₱{{ (group.total || 0).toLocaleString() }}</span>
              </div>

              <div class="text-xs text-white/60 mb-3">
                {{ group.count }} purchase{{ group.count !== 1 ? 's' : '' }}
              </div>

              <!-- Individual purchases with dates -->
              <div class="space-y-1" :class="expandedCategories.has(description) ? 'max-h-none' : 'max-h-24 overflow-hidden'">
                <div v-for="expense in (expandedCategories.has(description) ? group.items : group.items.slice(0, 3))"
                  :key="expense.id" class="flex justify-between items-center text-xs gap-2 bg-white/5 rounded px-2 py-1">
                  <div class="flex-1">
                    <div class="text-white/40">{{ formatExpenseDate(expense.date) }}</div>
                  </div>
                  <span class="text-blue-300 font-medium whitespace-nowrap">₱{{
                    parseFloat(expense.amount).toLocaleString() }}</span>
                </div>
                <div v-if="group.items.length > 3 && !expandedCategories.has(description)"
                  class="text-xs text-white/40 text-center hover:text-white/60 transition-colors">
                  +{{ group.items.length - 3 }} more... (click to expand)
                </div>
                <div v-if="group.items.length > 3 && expandedCategories.has(description)"
                  class="text-xs text-white/40 text-center hover:text-white/60 transition-colors">
                  Click to collapse
                </div>
              </div>
            </div>
          </div>

          <!-- Total Summary -->
          <div class="mt-6 pt-4 border-t border-blue-500/20 flex justify-between items-center">
            <span class="text-white/80 font-medium">Total Raw Materials:</span>
            <span class="text-2xl font-bold text-blue-400">₱{{ rawMaterialsExpenses.toLocaleString() }}</span>
          </div>
        </div>

        <!-- Payout Breakdown Table -->
        <!-- Mobile View (shown when screen is small) -->
        <!-- Mobile Payout Cards -->
        <div class="space-y-4 md:hidden">
          <router-link v-for="person in payoutBreakdown" :key="person.id"
            :to="`/payout/${person.id}?week=${selectedSaturday}`"
            class="block bg-white/5 p-4 rounded-xl shadow-lg ring-1 ring-white/10 transition hover:ring-green-500 hover:shadow-green-500/10">
            <div class="flex justify-between items-center mb-3">
              <div class="text-lg font-bold text-white">{{ person.name }}</div>
              <div class="text-sm text-white/60 italic">Total: ₱{{ person.total }}</div>
            </div>

            <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-white/80">
              <template v-if="parseFloat(person.gross)">
                <div><span class="block text-white/50">Gross</span>₱{{ person.gross }}</div>
              </template>
              <template v-if="parseFloat(person.cashAdvance)">
                <div><span class="block text-white/50">Cash Advance</span>₱{{ person.cashAdvance }}</div>
              </template>
              <template v-if="parseFloat(person.savings)">
                <div><span class="block text-white/50">Savings</span>₱{{ person.savings }}</div>
              </template>
              <template v-if="parseFloat(person.contributions)">
                <div><span class="block text-white/50">Contributions</span>₱{{ person.contributions }}</div>
              </template>
              <template v-if="parseFloat(person.deductibles)">
                <div><span class="block text-white/50">Loan Deductibles</span>₱{{ person.deductibles }}</div>
              </template>
              <template v-if="parseFloat(person.commission)">
                <div><span class="block text-white/50">Commission</span>₱{{ person.commission }}</div>
              </template>
              <template v-if="parseFloat(person.allowance)">
                <div><span class="block text-white/50">Allowance</span>₱{{ person.allowance }}</div>
              </template>
              <template v-if="parseFloat(person.refund)">
                <div><span class="block text-white/50">Refund</span>₱{{ person.refund }}</div>
              </template>
            </div>
          </router-link>
        </div>




        <!-- Desktop Table (only visible on md and up) -->
        <div class="hidden md:block overflow-x-auto">
          <table class="min-w-full text-sm text-white/80 table-auto">
            <thead class="border-b border-white/10">
              <tr>
                <th class="text-left py-2 pr-4">Name</th>
                <th class="text-left py-2 pr-4">Gross</th>
                <th class="text-left py-2 pr-4">Cash Advance</th>
                <th class="text-left py-2 pr-4">Savings</th>
                <th class="text-left py-2 pr-4">Contributions</th>
                <th class="text-left py-2 pr-4">Deductibles (Loan)</th>
                <th class="text-left py-2 pr-4">Commission</th>
                <th class="text-left py-2 pr-4">Allowance</th>
                <th class="text-left py-2 pr-4">Refund</th>
                <th class="text-left py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="person in payoutBreakdown" :key="person.name"
                @click="$router.push(`/payout/${person.id}?week=${selectedSaturday}`)"
                class="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors">
                <td class="py-2 pr-4 font-medium">{{ person.name }}</td>
                <td class="py-2 pr-4">{{ person.gross || '' }}</td>
                <td class="py-2 pr-4">{{ person.cashAdvance || '' }}</td>
                <td class="py-2 pr-4">{{ person.savings || '' }}</td>
                <td class="py-2 pr-4">{{ person.contributions || '' }}</td>
                <td class="py-2 pr-4">{{ person.deductibles || '' }}</td>
                <td class="py-2 pr-4">{{ person.commission || '' }}</td>
                <td class="py-2 pr-4">{{ person.allowance || '' }}</td>
                <td class="py-2 pr-4">{{ person.refund || '' }}</td>
                <td class="py-2">{{ person.total || '' }}</td>
              </tr>
            </tbody>
            <tfoot class="border-t border-white/10 text-white/80">
              <tr>
                <th class="text-left py-2 pr-4">Total</th>
                <th class="text-left py-2 pr-4">₱{{ totalColumn('gross') }}</th>
                <th class="text-left py-2 pr-4 text-red-400">₱{{ totalColumn('cashAdvance') }}</th>
                <th class="text-left py-2 pr-4 text-red-400">₱{{ totalColumn('savings') }}</th>
                <th class="text-left py-2 pr-4 text-red-400">₱{{ totalColumn('contributions') }}</th>
                <th class="text-left py-2 pr-4 text-red-400">₱{{ totalColumn('deductibles') }}</th>
                <th class="text-left py-2 pr-4 text-green-400">₱{{ totalColumn('commission') }}</th>
                <th class="text-left py-2 pr-4 text-green-400">₱{{ totalColumn('allowance') }}</th>
                <th class="text-left py-2 pr-4 text-green-400">₱{{ totalColumn('refund') }}</th>
                <th class="text-left py-2 text-white/80">₱{{ totalColumn('total') }}</th>
              </tr>
            </tfoot>


          </table>
        </div>

      </div>
    </template>
    <template #fallback>
      <div class="text-white text-center py-20">Loading dashboard...</div>
    </template>
  </Suspense>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

const selectedSaturday = ref(new Date().toISOString().split('T')[0])
const selectedMonth = ref(new Date().toISOString().slice(0, 7)) // YYYY-MM format
const viewType = ref('weekly') // 'weekly' or 'monthly'
const loading = ref(false)
const deliveriesCount = ref(0)
const activeEmployees = ref(0)
const totalSalaries = ref(0)
const deliveriesByCategory = ref({ singleWall: 0, doubleWall: 0 })
const deliveriesPercentChange = ref(0)
const payoutBreakdown = ref([])
const grossSalesTotal = ref({ all: 0, inhouse: 0, subcon: 0 })
const grossCostTotal = ref({ all: 0, inhouse: 0, subcon: 0 })
const profitTotal = ref({ all: 0, inhouse: 0, subcon: 0 })
const salesView = ref('all') // 'all', 'inhouse', 'subcon'

// Computed: Total payroll from breakdown
const computedTotalPayroll = computed(() => {
  return payoutBreakdown.value.reduce((sum, person) => {
    const total = parseFloat(person.total) || 0
    return sum + total
  }, 0)
})

// Computed: Separate operational and raw materials expenses
const operationalExpenses = computed(() => {
  return weeklyExpenses.value
    .filter(e => e.category !== 'Raw Materials')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
})

const rawMaterialsExpenses = computed(() => {
  return weeklyExpenses.value
    .filter(e => e.category === 'Raw Materials')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
})

const operationalByCategory = computed(() => {
  const categoryMap = {}
  weeklyExpenses.value
    .filter(e => e.category !== 'Raw Materials')
    .forEach(expense => {
      const category = expense.category || 'Uncategorized'
      if (!categoryMap[category]) {
        categoryMap[category] = { total: 0, count: 0, items: [] }
      }
      categoryMap[category].total += parseFloat(expense.amount) || 0
      categoryMap[category].count += 1
      categoryMap[category].items.push(expense)
    })
  return categoryMap
})

const rawMaterialsByCategory = computed(() => {
  const descriptionMap = {}
  weeklyExpenses.value
    .filter(e => e.category === 'Raw Materials')
    .forEach(expense => {
      const description = expense.note || 'No description'
      if (!descriptionMap[description]) {
        descriptionMap[description] = { total: 0, count: 0, items: [] }
      }
      descriptionMap[description].total += parseFloat(expense.amount) || 0
      descriptionMap[description].count += 1
      descriptionMap[description].items.push(expense)
    })
  return descriptionMap
})

// CashTracker integration
const weeklyExpenses = ref([])
const weeklyScrapRevenue = ref(0)
const totalWeeklyExpenses = ref(0)
const expensesByCategory = ref({})

// Last week comparisons
const lastWeekExpenses = ref(0)
const lastWeekScrapRevenue = ref(0)
const expensesPercentChange = ref(0)
const scrapPercentChange = ref(0)

// Expense card expansion
const expandedCategories = ref(new Set())

function snapToSaturday() {
  const selected = new Date(selectedSaturday.value)
  const offset = (6 - selected.getDay() + 7) % 7
  selected.setDate(selected.getDate() + offset)
  selectedSaturday.value = formatDate(selected)
}

function getRange() {
  if (viewType.value === 'monthly') {
    // Monthly range calculation
    const [year, month] = selectedMonth.value.split('-').map(Number);
    const currentMonthStart = new Date(year, month - 1, 1);
    const currentMonthEnd = new Date(year, month, 0); // Last day of current month
    
    // Previous month for comparison
    const prevMonthStart = new Date(year, month - 2, 1);
    const prevMonthEnd = new Date(year, month - 1, 0); // Last day of previous month

    return {
      start: formatDate(currentMonthStart),
      end: formatDate(currentMonthEnd),
      lastStart: formatDate(prevMonthStart),
      lastEnd: formatDate(prevMonthEnd)
    };
  } else {
    // Weekly range calculation (existing logic)
    const today = new Date(selectedSaturday.value);
    today.setHours(0, 0, 0, 0);

    if (isNaN(today.getTime())) {
      console.error('Invalid date:', selectedSaturday.value);
      return {
        start: '',
        end: '',
        lastStart: '',
        lastEnd: ''
      };
    }

    const saturday = calculateSaturday(today);
    const startOfWeek = calculateStartOfWeek(saturday);
    const lastSaturday = calculateLastSaturday(saturday);
    const lastStartOfWeek = calculateStartOfWeek(lastSaturday);

    return {
      start: formatDate(startOfWeek),
      end: formatDate(saturday),
      lastStart: formatDate(lastStartOfWeek),
      lastEnd: formatDate(lastSaturday)
    };
  }
}

// Returns the Saturday of the week for a given date
function calculateSaturday(date) {
  const d = new Date(date);
  const day = d.getDay();
  // Saturday is 6
  const diff = 6 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function calculateStartOfWeek(saturday) {
  const startOfWeek = new Date(saturday);
  startOfWeek.setDate(saturday.getDate() - 6);
  return startOfWeek;
}

function calculateLastSaturday(saturday) {
  const lastSaturday = new Date(saturday);
  lastSaturday.setDate(saturday.getDate() - 7);
  return lastSaturday;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function totalColumn(key) {
  const sum = payoutBreakdown.value.reduce((total, p) => {
    const num = parseFloat(p[key])
    return total + (isNaN(num) ? 0 : num)
  }, 0)
  return sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function toggleCategoryExpansion(categoryName) {
  const expanded = expandedCategories.value
  if (expanded.has(categoryName)) {
    expanded.delete(categoryName)
  } else {
    expanded.add(categoryName)
  }
  expandedCategories.value = new Set(expanded)
}

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

  // Check if it's within this week (Sunday to Saturday)
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())

  if (date >= startOfWeek && date < today) {
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }

  // For older dates, show month and day
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
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

async function fetchCashTrackerData(start, end, lastStart, lastEnd) {
  try {
    console.log('🔄 Fetching cash tracker data for:', { start, end, lastStart, lastEnd })

    // Fetch current week transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        user_profiles:user_id (
          full_name,
          role
        )
      `)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })

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

    // Filter current week expenses and scrap topups
    const expenses = transactions?.filter(t => t.type === 'expense') || []
    const scrapTopups = transactions?.filter(t => t.type === 'topup' && t.category === 'Scrap') || []

    weeklyExpenses.value = expenses
    weeklyScrapRevenue.value = scrapTopups.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
    totalWeeklyExpenses.value = expenses.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)

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

    // Group expenses by category
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
    weeklyScrapRevenue.value = 0
    totalWeeklyExpenses.value = 0
    expensesByCategory.value = {}
    lastWeekExpenses.value = 0
    lastWeekScrapRevenue.value = 0
    expensesPercentChange.value = 0
    scrapPercentChange.value = 0
  }
}

async function fetchKPIs() {
  loading.value = true
  const { start, end, lastStart, lastEnd } = getRange()

  // Fetch cash tracker data with last week for comparisons
  await fetchCashTrackerData(start, end, lastStart, lastEnd)

  const { data: deliveries } = await supabase.from('deliveries').select('quantity, product_id, delivery_date')
  const { data: products } = await supabase.from('products').select('id, category')
  const productMap = Object.fromEntries(products?.map(p => [p.id, p.category]) || [])

  const filteredDeliveries = deliveries?.filter(d => {
    const date = new Date(d.delivery_date)
    return date >= new Date(start) && date <= new Date(end) && productMap[d.product_id]
  }) || []

  let singleWall = 0, doubleWall = 0
  for (const d of filteredDeliveries) {
    const qty = d.quantity || 0
    const category = productMap[d.product_id]
    if (category === 'Single Walled') singleWall += qty
    if (category === 'Double Walled') doubleWall += qty
  }

  deliveriesCount.value = singleWall + doubleWall
  deliveriesByCategory.value = { singleWall, doubleWall }

  const lastDeliveries = deliveries?.filter(d => {
    const date = new Date(d.delivery_date)
    return date >= new Date(lastStart) && date <= new Date(lastEnd) && productMap[d.product_id]
  }) || []

  // Apply same category filtering as current week (Single Walled + Double Walled only)
  let lastSingleWall = 0, lastDoubleWall = 0
  for (const d of lastDeliveries) {
    const qty = d.quantity || 0
    const category = productMap[d.product_id]
    if (category === 'Single Walled') lastSingleWall += qty
    if (category === 'Double Walled') lastDoubleWall += qty
  }
  const lastTotal = lastSingleWall + lastDoubleWall
  if (lastTotal > 0) {
    deliveriesPercentChange.value = Math.round(((deliveriesCount.value - lastTotal) / lastTotal) * 100)
    console.log('📊 Delivery Change Calculation:', {
      thisWeek: deliveriesCount.value,
      lastWeek: lastTotal,
      difference: deliveriesCount.value - lastTotal,
      percentage: deliveriesPercentChange.value
    })
  }

  const { data: savingsSum } = await supabase.from('savings').select('amount')
  activeEmployees.value = savingsSum
    ? savingsSum.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
      .toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : '0.00'

  const { data: payouts } = await supabase.from('payouts')
    .select('net_total')
    .gte('week_start', start)
    .lte('week_start', end)

  totalSalaries.value = payouts?.reduce((sum, p) => sum + (p.net_total || 0), 0) || 0

  const confirmedDay = selectedSaturday.value

  const { data: payoutsThisWeek, error } = await supabase
    .from('payouts')
    .select(`
      employee_id,
      gross_income,
      paid_by_hours,
      deductions,
      allowances,
      commissions,
      net_total,
      confirmed_at,
      workers:workers!payouts_employee_id_fkey (
        name
      )
    `)
    .gte('week_start', start)
    .lte('week_start', end)
    .not('confirmed_at', 'is', null)

  if (error) console.error('Supabase error:', error)

  const { data: savingsData } = await supabase
    .from('savings')
    .select('worker_id, amount')
    .gte('week_start', start)
    .lte('week_start', end)

  const savingsMap = {}
  savingsData?.forEach(s => {
    const amount = parseFloat(s.amount) || 0
    savingsMap[s.worker_id] = (savingsMap[s.worker_id] || 0) + amount
  })

  // Group payouts by employee to handle multiple payouts in the same week
  const employeePayouts = {}
  payoutsThisWeek?.forEach(p => {
    if (!employeePayouts[p.employee_id]) {
      employeePayouts[p.employee_id] = {
        employee_id: p.employee_id,
        name: p.workers?.name || '—',
        gross: 0,
        cashAdvance: 0,
        savings: savingsMap[p.employee_id] || 0,
        contributions: 0,
        deductibles: 0,
        commission: 0,
        allowance: 0,
        refund: 0,
        total: 0
      }
    }

    const d = p.deductions || {}
    const a = p.allowances || {}
    const c = p.commissions || {}

    employeePayouts[p.employee_id].gross += (p.gross_income || 0)
    employeePayouts[p.employee_id].cashAdvance += parseFloat(d.cash_advance || 0)
    employeePayouts[p.employee_id].contributions += parseFloat(d.sss || 0)
    employeePayouts[p.employee_id].deductibles += parseFloat(d.loan || 0)
    employeePayouts[p.employee_id].commission += Object.values(c).reduce((sum, val) => {
      const num = parseFloat(val)
      return sum + (isNaN(num) ? 0 : num)
    }, 0)
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
    gross: p.gross.toFixed(2),
    cashAdvance: p.cashAdvance ? p.cashAdvance.toFixed(2) : '',
    savings: p.savings ? p.savings.toFixed(2) : '',
    contributions: p.contributions ? p.contributions.toFixed(2) : '',
    deductibles: p.deductibles ? p.deductibles.toFixed(2) : '',
    commission: p.commission ? p.commission.toFixed(2) : '',
    allowance: p.allowance ? p.allowance.toFixed(2) : '',
    refund: p.refund ? p.refund.toFixed(2) : '',
    total: p.total ? p.total.toFixed(2) : ''
  }))

  const { data: clientPrices, error: priceErr } = await supabase
    .from('client_product_prices')
    .select('product_id, price')

  if (priceErr) {
    console.error('Price fetch error:', priceErr)
    grossSalesTotal.value = { all: 0, inhouse: 0, subcon: 0 }
    grossCostTotal.value = { all: 0, inhouse: 0, subcon: 0 }
    profitTotal.value = { all: 0, inhouse: 0, subcon: 0 }
  } else {
    const clientPriceMap = {}
    for (const entry of clientPrices) {
      if (!clientPriceMap[entry.product_id]) {
        clientPriceMap[entry.product_id] = parseFloat(entry.price)
      }
    }

    // Fetch deliveries with product cost information
    const { data: inhouse, error: inErr } = await supabase
      .from('deliveries')
      .select('product_id, quantity, delivery_date, products(price_per_unit)')
      .gte('delivery_date', start)
      .lte('delivery_date', end)

    const { data: subcon, error: subErr } = await supabase
      .from('subcon_deliveries')
      .select('product_id, quantity, delivery_date, price_snapshot, products(subcon_price)')
      .gte('delivery_date', start)
      .lte('delivery_date', end)

    if (inErr || subErr) {
      console.error('Delivery fetch error:', inErr || subErr)
      grossSalesTotal.value = { all: 0, inhouse: 0, subcon: 0 }
      grossCostTotal.value = { all: 0, inhouse: 0, subcon: 0 }
      profitTotal.value = { all: 0, inhouse: 0, subcon: 0 }
    } else {
      // Calculate gross sales (using client prices) + scrap revenue
      const inhouseSales = sumSales(inhouse, clientPriceMap)
      const subconSales = sumSales(subcon, clientPriceMap)

      grossSalesTotal.value = {
        all: inhouseSales + subconSales + (weeklyScrapRevenue.value || 0),
        inhouse: inhouseSales + (weeklyScrapRevenue.value || 0), // Add scrap to in-house
        subcon: subconSales
      }

      // Calculate gross costs (using cost prices) + expenses
      const inhouseCosts = sumCosts(inhouse, 'inhouse')
      const subconCosts = sumCosts(subcon, 'subcon')
      const expenses = totalWeeklyExpenses.value || 0

      grossCostTotal.value = {
        all: inhouseCosts + subconCosts + expenses,
        inhouse: inhouseCosts + expenses,
        subcon: subconCosts
      }

      // Calculate profit (sales - costs which now includes expenses)
      profitTotal.value = {
        all: grossSalesTotal.value.all - grossCostTotal.value.all,
        inhouse: grossSalesTotal.value.inhouse - grossCostTotal.value.inhouse,
        subcon: grossSalesTotal.value.subcon - grossCostTotal.value.subcon
      }

      console.log('💰 Financial data calculated:', {
        sales: grossSalesTotal.value,
        costs: grossCostTotal.value,
        profit: profitTotal.value
      })
    }
  }

  loading.value = false
}


watch(selectedSaturday, async () => {
  if (viewType.value === 'weekly') {
    snapToSaturday()
    await fetchKPIs()
  }
})

watch(selectedMonth, async () => {
  if (viewType.value === 'monthly') {
    await fetchKPIs()
  }
})

watch(viewType, async () => {
  await fetchKPIs()
})

onMounted(() => {
  snapToSaturday()
  fetchKPIs()
})
</script>
