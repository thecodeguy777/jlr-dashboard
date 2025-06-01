
<template>
  <div class="min-h-screen bg-gray-900 text-white p-6 text-gray-900">
    <h1 class="text-2xl font-bold mb-6">🧾 Employee Admin Dashboard</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-gray-100 rounded-xl p-4 shadow">
        <h2 class="font-semibold text-gray-700">Input Deliveries</h2>
        <p class="text-sm text-gray-500 mt-1">Record deliveries from workers.</p>
      </div>
      <div class="bg-gray-100 rounded-xl p-4 shadow">
        <h2 class="font-semibold text-gray-700">Log Weekly Payouts</h2>
        <p class="text-sm text-gray-500 mt-1">Confirm cash given to employees.</p>
      </div>
    </div>

    <div class="mt-8">
      <button class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow">
        ➕ Add New Delivery
      </button>
    </div>
  </div>
</template>

<script setup></script>
