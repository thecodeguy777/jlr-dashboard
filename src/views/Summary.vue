<script setup>
import { ref } from 'vue'
import InHouseTab from './InHouseTab.vue'
import SubcontractorTab from './SubcontractorTab.vue'
import SummaryTab from './SummaryTab.vue' // optional


const tabs = ['Summary', 'In-house', 'Subcon'] // add 'Summary' if you want a merged overview
const activeTab = ref('Summary')
</script>

<template>
  <div class="px-6 pt-6 pb-24 space-y-8 xl:space-y-12">
    <!-- Tabs -->
    <div class="flex justify-around border-b border-white/20 text-sm text-white/70">
      <button v-for="tab in tabs" :key="tab" @click="activeTab = tab" :class="[
        'flex-1 py-4 text-center font-semibold transition',
        activeTab === tab
          ? tab === 'In-house' ? 'border-b-2 border-blue-400 text-blue-400'
            : tab === 'Subcon' ? 'border-b-2 border-green-400 text-green-400'
              : 'border-b-2 border-yellow-400 text-yellow-400'
          : ''
      ]">
        {{ tab }}
      </button>
    </div>

    <!-- Tab Contents -->
    <div v-if="activeTab === 'In-house'">
      <InHouseTab />
    </div>
    <div v-else-if="activeTab === 'Subcon'">
      <SubcontractorTab />
    </div>
    <div v-else-if="activeTab === 'Summary'">
      <SummaryTab />
    </div>
  </div>
</template>
