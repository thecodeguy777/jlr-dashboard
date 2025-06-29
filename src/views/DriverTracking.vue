<template>
  <div class="min-h-screen text-white p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">🚚 Driver Tracking</h1>
        <p class="text-sm text-white/60">Monitor driver activities and delivery logs</p>
      </div>
      <div class="flex gap-4">
        <button @click="refreshData" :disabled="loading"
          class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50">
          🔄 {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
        <button @click="exportCsv"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
          📊 Export CSV
        </button>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      <div class="bg-white/10 rounded-xl p-4 shadow">
        <h3 class="text-sm font-medium text-white/70">Active Drivers</h3>
        <p class="text-3xl font-bold text-green-400 mt-2">{{ stats.activeDrivers }}</p>
        <p class="text-xs text-white/50 mt-1">Last 24h</p>
      </div>
      <div class="bg-white/10 rounded-xl p-4 shadow">
        <h3 class="text-sm font-medium text-white/70">Action Logs Today</h3>
        <p class="text-3xl font-bold text-blue-400 mt-2">{{ stats.logsToday }}</p>
      </div>
      <div class="bg-white/10 rounded-xl p-4 shadow">
        <h3 class="text-sm font-medium text-white/70">📍 Breadcrumbs Today</h3>
        <p class="text-3xl font-bold text-orange-400 mt-2">{{ stats.breadcrumbsToday }}</p>
      </div>
      <div class="bg-white/10 rounded-xl p-4 shadow">
        <h3 class="text-sm font-medium text-white/70">🏢 Geofence Events</h3>
        <p class="text-3xl font-bold text-purple-400 mt-2">{{ stats.geofenceEventsToday }}</p>
      </div>
      <div class="bg-white/10 rounded-xl p-4 shadow">
        <h3 class="text-sm font-medium text-white/70">⚠️ Red Flags</h3>
        <p class="text-3xl font-bold text-red-400 mt-2">{{ stats.redFlags }}</p>
      </div>
    </div>

    <!-- Red Flags Section -->
    <div v-if="redFlags.length > 0" class="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6">
      <h3 class="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
        ⚠️ Red Flags & Warnings
      </h3>
      <div class="space-y-3">
        <div v-for="flag in redFlags.slice(0, 10)" :key="flag.id" 
          class="bg-red-900/30 border border-red-500/20 rounded-lg p-3">
          <div class="flex justify-between items-start">
            <div>
              <div class="font-medium text-red-300">{{ flag.type }}</div>
              <div class="text-sm text-red-200 mt-1">{{ flag.description }}</div>
              <div class="text-xs text-red-400 mt-2">
                {{ flag.driver_name }} • {{ formatDateTime(flag.timestamp) }}
              </div>
            </div>
            <div class="text-red-400 text-xl">{{ flag.icon }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex gap-4 mb-6">
      <button 
        v-for="tab in [
          { key: 'logs', name: '📋 Action Logs', count: stats.logsToday },
          { key: 'breadcrumbs', name: '📍 Breadcrumbs', count: stats.breadcrumbsToday },
          { key: 'geofences', name: '🏢 Geofence Events', count: stats.geofenceEventsToday }
        ]" 
        :key="tab.key"
        @click="selectedTab = tab.key"
        :class="[
          'px-4 py-2 rounded-lg transition font-medium',
          selectedTab === tab.key 
            ? 'bg-orange-600 text-white' 
            : 'bg-white/10 text-white/70 hover:bg-white/20'
        ]"
      >
        {{ tab.name }} ({{ tab.count }})
      </button>
    </div>

    <!-- Data Tables -->
    <div class="bg-white/5 rounded-xl border border-white/10">
      <div class="p-4 border-b border-white/10">
        <h3 class="text-lg font-semibold">
          <span v-if="selectedTab === 'logs'">📋 Recent Action Logs</span>
          <span v-else-if="selectedTab === 'breadcrumbs'">📍 GPS Breadcrumbs (30s intervals)</span>
          <span v-else-if="selectedTab === 'geofences'">🏢 Geofence Entry/Exit Events</span>
        </h3>
        <div v-if="stats.unsyncedLogs > 0" class="text-sm text-yellow-400 mt-1">
          {{ stats.unsyncedLogs }} items pending sync
        </div>
      </div>
      
             <!-- Action Logs Table -->
       <div v-if="selectedTab === 'logs'" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-white/10 bg-white/5">
            <tr>
              <th class="text-left p-4">Driver</th>
              <th class="text-left p-4">Action</th>
              <th class="text-left p-4">Timestamp</th>
              <th class="text-left p-4">Location</th>
              <th class="text-left p-4">GPS Accuracy</th>
              <th class="text-left p-4">Status</th>
              <th class="text-left p-4">Flags</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in deliveryLogs.slice(0, 50)" :key="log.id" 
              class="border-b border-white/5 hover:bg-white/5">
              <td class="p-4">
                <div class="font-medium">{{ log.drivers?.name || 'Unknown' }}</div>
                <div class="text-xs text-gray-400">{{ log.drivers?.phone || '' }}</div>
              </td>
              <td class="p-4">
                <div class="flex items-center gap-2">
                  <span>{{ getActionIcon(log.action_type) }}</span>
                  <span>{{ getActionTitle(log.action_type) }}</span>
                </div>
                <div v-if="log.note" class="text-xs text-gray-400 mt-1">{{ log.note }}</div>
              </td>
              <td class="p-4">
                <div>{{ formatDateTime(log.timestamp) }}</div>
              </td>
              <td class="p-4">
                <div class="text-xs font-mono">
                  {{ log.latitude?.toFixed(6) || 'N/A' }}<br>
                  {{ log.longitude?.toFixed(6) || 'N/A' }}
                </div>
                <button v-if="log.latitude && log.longitude" @click="showOnMap(log)" 
                  class="text-blue-400 hover:text-blue-300 text-xs mt-1">
                  🗺️ View on Map
                </button>
              </td>
              <td class="p-4">
                <span v-if="log.gps_accuracy" :class="['px-2 py-1 rounded text-xs',
                  log.gps_accuracy <= 10 ? 'bg-green-900 text-green-300' :
                  log.gps_accuracy <= 50 ? 'bg-yellow-900 text-yellow-300' :
                  'bg-red-900 text-red-300'
                ]">
                  {{ Math.round(log.gps_accuracy) }}m
                </span>
                <span v-else class="text-gray-500 text-xs">No GPS</span>
              </td>
              <td class="p-4">
                <div class="flex items-center gap-3">
                  <div :class="['w-2 h-2 rounded-full', log.synced ? 'bg-green-400' : 'bg-yellow-400']"
                    :title="log.synced ? 'Synced' : 'Pending sync'"></div>
                  <div class="text-xs">
                    <div>🔋 {{ log.battery_level || 'N/A' }}%</div>
                    <div>📶 {{ log.signal_status || 'Unknown' }}</div>
                  </div>
                </div>
              </td>
              <td class="p-4">
                <div v-if="getLogWarnings(log).length > 0" class="space-y-1">
                  <div v-for="warning in getLogWarnings(log)" :key="warning"
                    class="text-red-400 text-xs flex items-center gap-1">
                    <span>⚠️</span>
                    <span>{{ warning }}</span>
                  </div>
                </div>
                <span v-else class="text-green-400 text-xs">✅ OK</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Breadcrumbs Table -->
      <div v-else-if="selectedTab === 'breadcrumbs'" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-white/10 bg-white/5">
            <tr>
              <th class="text-left p-4">Driver</th>
              <th class="text-left p-4">Timestamp</th>
              <th class="text-left p-4">Location</th>
              <th class="text-left p-4">Speed</th>
              <th class="text-left p-4">Distance</th>
              <th class="text-left p-4">GPS Accuracy</th>
              <th class="text-left p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="breadcrumb in breadcrumbs.slice(0, 100)" :key="breadcrumb.id" 
              class="border-b border-white/5 hover:bg-white/5">
              <td class="p-4">
                <div class="font-medium">{{ breadcrumb.drivers?.name || 'Unknown' }}</div>
              </td>
              <td class="p-4">
                <div>{{ formatDateTime(breadcrumb.timestamp) }}</div>
              </td>
              <td class="p-4">
                <div class="text-xs font-mono">
                  {{ breadcrumb.latitude?.toFixed(6) || 'N/A' }}<br>
                  {{ breadcrumb.longitude?.toFixed(6) || 'N/A' }}
                </div>
                <button v-if="breadcrumb.latitude && breadcrumb.longitude" @click="showOnMap(breadcrumb)" 
                  class="text-blue-400 hover:text-blue-300 text-xs mt-1">
                  🗺️ View on Map
                </button>
              </td>
              <td class="p-4">
                <span v-if="breadcrumb.speed_kmh" :class="['px-2 py-1 rounded text-xs',
                  breadcrumb.speed_kmh <= 30 ? 'bg-green-900 text-green-300' :
                  breadcrumb.speed_kmh <= 60 ? 'bg-yellow-900 text-yellow-300' :
                  'bg-red-900 text-red-300'
                ]">
                  {{ Math.round(breadcrumb.speed_kmh) }} km/h
                </span>
                <span v-else class="text-gray-500 text-xs">—</span>
              </td>
              <td class="p-4">
                <span v-if="breadcrumb.distance_from_last" class="text-xs">
                  {{ Math.round(breadcrumb.distance_from_last) }}m
                </span>
                <span v-else class="text-gray-500 text-xs">—</span>
              </td>
              <td class="p-4">
                <span v-if="breadcrumb.gps_accuracy" :class="['px-2 py-1 rounded text-xs',
                  breadcrumb.gps_accuracy <= 10 ? 'bg-green-900 text-green-300' :
                  breadcrumb.gps_accuracy <= 50 ? 'bg-yellow-900 text-yellow-300' :
                  'bg-red-900 text-red-300'
                ]">
                  {{ Math.round(breadcrumb.gps_accuracy) }}m
                </span>
              </td>
              <td class="p-4">
                <div class="flex items-center gap-2">
                  <div :class="['w-2 h-2 rounded-full', breadcrumb.synced ? 'bg-green-400' : 'bg-yellow-400']"
                    :title="breadcrumb.synced ? 'Synced' : 'Pending sync'"></div>
                  <div :class="['w-2 h-2 rounded-full', breadcrumb.is_active_route ? 'bg-orange-400' : 'bg-gray-400']"
                    :title="breadcrumb.is_active_route ? 'Active route' : 'Route ended'"></div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Geofence Events Table -->
      <div v-else-if="selectedTab === 'geofences'" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-white/10 bg-white/5">
            <tr>
              <th class="text-left p-4">Driver</th>
              <th class="text-left p-4">Client</th>
              <th class="text-left p-4">Event</th>
              <th class="text-left p-4">Timestamp</th>
              <th class="text-left p-4">Location</th>
              <th class="text-left p-4">Distance from Center</th>
              <th class="text-left p-4">Radius</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="event in geofenceEvents.slice(0, 50)" :key="event.id" 
              class="border-b border-white/5 hover:bg-white/5">
              <td class="p-4">
                <div class="font-medium">{{ event.drivers?.name || 'Unknown' }}</div>
              </td>
              <td class="p-4">
                <div class="font-medium">{{ event.clients?.name || 'Unknown Client' }}</div>
                <div class="text-xs text-gray-400">{{ event.clients?.address || '' }}</div>
              </td>
              <td class="p-4">
                <span :class="['px-2 py-1 rounded text-xs font-medium',
                  event.event_type === 'entered' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                ]">
                  {{ event.event_type === 'entered' ? '🏢 Entered' : '🚪 Exited' }}
                </span>
              </td>
              <td class="p-4">
                <div>{{ formatDateTime(event.timestamp) }}</div>
              </td>
              <td class="p-4">
                <div class="text-xs font-mono">
                  {{ event.latitude?.toFixed(6) || 'N/A' }}<br>
                  {{ event.longitude?.toFixed(6) || 'N/A' }}
                </div>
                <button v-if="event.latitude && event.longitude" @click="showOnMap(event)" 
                  class="text-blue-400 hover:text-blue-300 text-xs mt-1">
                  🗺️ View on Map
                </button>
              </td>
              <td class="p-4">
                <span class="text-xs">{{ Math.round(event.distance_from_center || 0) }}m</span>
              </td>
              <td class="p-4">
                <span class="text-xs">{{ event.geofence_radius }}m</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

// State
const loading = ref(false)
const deliveryLogs = ref([])
const drivers = ref([])
const breadcrumbs = ref([])
const geofenceEvents = ref([])
const selectedTab = ref('logs') // 'logs', 'breadcrumbs', 'geofences'

// Computed
const stats = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  const logsToday = deliveryLogs.value.filter(log => 
    log.timestamp && log.timestamp.startsWith(today)
  ).length

  const activeDrivers = new Set([
    ...deliveryLogs.value
      .filter(log => log.timestamp && new Date(log.timestamp) > new Date(Date.now() - 24*60*60*1000))
      .map(log => log.driver_id),
    ...breadcrumbs.value
      .filter(b => b.timestamp && new Date(b.timestamp) > new Date(Date.now() - 60*60*1000)) // Active in last hour
      .map(b => b.driver_id)
  ]).size

  const unsyncedLogs = deliveryLogs.value.filter(log => !log.synced).length +
                      breadcrumbs.value.filter(b => !b.synced).length
  const redFlagsCount = redFlags.value.length

  const breadcrumbsToday = breadcrumbs.value.filter(b => 
    b.timestamp && b.timestamp.startsWith(today)
  ).length

  const geofenceEventsToday = geofenceEvents.value.filter(e => 
    e.timestamp && e.timestamp.startsWith(today)
  ).length

  return {
    activeDrivers,
    logsToday,
    redFlags: redFlagsCount,
    unsyncedLogs,
    breadcrumbsToday,
    geofenceEventsToday
  }
})

const redFlags = computed(() => {
  const flags = []
  
  deliveryLogs.value.forEach(log => {
    const warnings = getLogWarnings(log)
    warnings.forEach(warning => {
      flags.push({
        id: `${log.id}-${warning}`,
        type: warning,
        description: getWarningDescription(warning, log),
        driver_name: log.drivers?.name || 'Unknown Driver',
        timestamp: log.timestamp,
        icon: getWarningIcon(warning)
      })
    })
  })

  return flags
})

// Methods
const getLogWarnings = (log) => {
  const warnings = []
  
  if (!log.latitude || !log.longitude) {
    warnings.push('Missing GPS')
  }
  
  if (log.gps_accuracy && log.gps_accuracy > 100) {
    warnings.push('Poor GPS Accuracy')
  }
  
  if (log.battery_level && log.battery_level < 10) {
    warnings.push('Low Battery')
  }
  
  if (log.gps_accuracy && log.gps_accuracy < 1) {
    warnings.push('Potential GPS Spoofing')
  }
  
  return warnings
}

const getWarningDescription = (warning, log) => {
  const descriptions = {
    'Missing GPS': 'Log recorded without GPS coordinates',
    'Poor GPS Accuracy': `GPS accuracy: ${Math.round(log.gps_accuracy || 0)}m (>100m)`,
    'Low Battery': `Battery level: ${log.battery_level}%`,
    'Potential GPS Spoofing': `Unusually precise GPS accuracy: ${log.gps_accuracy}m`
  }
  return descriptions[warning] || warning
}

const getWarningIcon = (warning) => {
  const icons = {
    'Missing GPS': '📍',
    'Poor GPS Accuracy': '🎯',
    'Low Battery': '🔋',
    'Potential GPS Spoofing': '🚨'
  }
  return icons[warning] || '⚠️'
}

const getActionIcon = (actionType) => {
  const icons = {
    start_route: '🚀',
    arrived: '📍',
    delivered: '✅',
    break_start: '☕',
    break_end: '🏃'
  }
  return icons[actionType] || '📝'
}

const getActionTitle = (actionType) => {
  const titles = {
    start_route: 'Started Route',
    arrived: 'Arrived at Drop-off',
    delivered: 'Delivered',
    break_start: 'Break Started',
    break_end: 'Break Ended'
  }
  return titles[actionType] || actionType
}

const formatDateTime = (timestamp) => {
  if (!timestamp) return 'N/A'
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const showOnMap = (log) => {
  const url = `https://www.google.com/maps?q=${log.latitude},${log.longitude}`
  window.open(url, '_blank')
}

const refreshData = async () => {
  loading.value = true
  try {
    await Promise.all([
      fetchDeliveryLogs(),
      fetchBreadcrumbs(),
      fetchGeofenceEvents()
    ])
  } finally {
    loading.value = false
  }
}

const fetchDeliveryLogs = async () => {
  try {
    const { data, error } = await supabase
      .from('delivery_logs')
      .select(`
        *,
        drivers (
          id,
          name,
          phone
        )
      `)
      .order('timestamp', { ascending: false })
      .limit(200)

    if (error) throw error
    deliveryLogs.value = data || []
  } catch (error) {
    console.error('Error fetching delivery logs:', error)
    alert('Failed to fetch delivery logs')
  }
}

const fetchBreadcrumbs = async () => {
  try {
    const { data, error } = await supabase
      .from('gps_breadcrumbs')
      .select(`
        *,
        drivers (
          id,
          name,
          phone
        )
      `)
      .order('timestamp', { ascending: false })
      .limit(500)

    if (error) throw error
    breadcrumbs.value = data || []
  } catch (error) {
    console.error('Error fetching breadcrumbs:', error)
  }
}

const fetchGeofenceEvents = async () => {
  try {
    const { data, error } = await supabase
      .from('geofence_events')
      .select(`
        *,
        drivers (
          id,
          name,
          phone
        ),
        clients (
          id,
          name,
          address
        )
      `)
      .order('timestamp', { ascending: false })
      .limit(200)

    if (error) throw error
    geofenceEvents.value = data || []
  } catch (error) {
    console.error('Error fetching geofence events:', error)
  }
}

const exportCsv = () => {
  const headers = [
    'Driver Name',
    'Action Type',
    'Timestamp',
    'Latitude',
    'Longitude',
    'GPS Accuracy',
    'Note',
    'Battery Level',
    'Signal Status',
    'Synced',
    'Warnings'
  ]

  const csvData = deliveryLogs.value.map(log => [
    log.drivers?.name || 'Unknown',
    log.action_type,
    log.timestamp,
    log.latitude || '',
    log.longitude || '',
    log.gps_accuracy || '',
    log.note || '',
    log.battery_level || '',
    log.signal_status || '',
    log.synced ? 'Yes' : 'No',
    getLogWarnings(log).join('; ')
  ])

  const csvContent = [headers, ...csvData]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `driver-logs-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Initialize
onMounted(() => {
  refreshData()
})
</script> 