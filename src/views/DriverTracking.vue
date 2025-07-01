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

    <!-- System Health Banner -->
    <div class="mb-6 p-4 rounded-lg border" :class="systemHealthClass">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl">{{ systemHealthIcon }}</span>
          <div>
            <h3 class="font-semibold">{{ systemHealthStatus }}</h3>
            <p class="text-sm opacity-80">{{ systemHealthMessage }}</p>
          </div>
        </div>
        <div class="text-right text-sm">
          <div>Last Updated: {{ formatTimeAgo(new Date().toISOString()) }}</div>
          <div class="flex items-center gap-2 mt-1">
            <div :class="['w-2 h-2 rounded-full', onlineDrivers.length > 0 ? 'bg-green-400' : 'bg-red-400']"></div>
            <span>{{ onlineDrivers.length }} drivers online</span>
          </div>
        </div>
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

    <!-- Navigation Tabs - Mobile Optimized -->
    <div class="mb-6">
      <!-- Mobile: Horizontal Scroll -->
      <div class="md:hidden overflow-x-auto pb-2">
        <div class="flex gap-2 min-w-max">
          <button 
            v-for="tab in [
              { key: 'live', name: '🗺️ Live', count: stats.activeDrivers },
              { key: 'logs', name: '📋 Logs', count: stats.logsToday },
              { key: 'breadcrumbs', name: '📍 GPS', count: stats.breadcrumbsToday },
              { key: 'geofences', name: '🏢 Zones', count: stats.geofenceEventsToday }
            ]" 
            :key="tab.key"
            @click="selectedTab = tab.key"
            :class="[
              'px-4 py-3 rounded-lg transition font-medium whitespace-nowrap min-w-0 flex-shrink-0',
              selectedTab === tab.key 
                ? 'bg-orange-600 text-white shadow-lg' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            ]"
          >
            <div class="text-sm">{{ tab.name }}</div>
            <div class="text-xs opacity-80">({{ tab.count }})</div>
          </button>
        </div>
      </div>

      <!-- Desktop: Regular Grid -->
      <div class="hidden md:flex gap-4">
        <button 
          v-for="tab in [
            { key: 'live', name: '🗺️ Live Map', count: stats.activeDrivers },
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
    </div>

    <!-- Live Map with Enhanced Driver Status -->
    <div v-if="selectedTab === 'live'">
      <!-- Driver Status Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div class="lg:col-span-2">
          <LiveDriverMap />
        </div>
        
        <!-- Enhanced Driver Status Panel -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            📊 Driver Status Dashboard
          </h3>
          
          <div v-for="driver in onlineDrivers" :key="driver.driver_id" class="bg-white/10 rounded-lg border border-white/20 p-4">
            <!-- Driver Header -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3">
                <div :class="getDriverStatusIndicator(driver)" class="w-3 h-3 rounded-full"></div>
                <div>
                  <div class="font-medium text-white">{{ driver.drivers?.name || 'Unknown Driver' }}</div>
                  <div class="text-xs text-gray-400">{{ driver.drivers?.phone || 'No phone' }}</div>
                </div>
              </div>
              <div class="text-xs text-gray-400">
                {{ formatTimeAgo(driver.last_seen) }}
              </div>
            </div>

            <!-- Status Grid -->
            <div class="grid grid-cols-2 gap-2 text-xs">
              <!-- Connection Status -->
              <div class="bg-black/20 rounded p-2">
                <div class="flex items-center gap-1 mb-1">
                  <span>{{ getConnectionStatusIcon(driver) }}</span>
                  <span class="text-gray-300">Connection</span>
                </div>
                <div :class="getConnectionStatusClass(driver)">
                  {{ getConnectionStatusText(driver) }}
                </div>
              </div>

              <!-- GPS Status -->
              <div class="bg-black/20 rounded p-2">
                <div class="flex items-center gap-1 mb-1">
                  <span>📍</span>
                  <span class="text-gray-300">GPS</span>
                </div>
                <div :class="getGpsStatusClass(driver)">
                  {{ getGpsStatusText(driver) }}
                </div>
                <div v-if="driver.gps_accuracy" class="text-gray-400 mt-1">
                  ±{{ Math.round(driver.gps_accuracy) }}m
                </div>
              </div>

              <!-- Battery Status -->
              <div class="bg-black/20 rounded p-2">
                <div class="flex items-center gap-1 mb-1">
                  <span>{{ getBatteryIcon(driver) }}</span>
                  <span class="text-gray-300">Battery</span>
                </div>
                <div :class="getBatteryStatusClass(driver)">
                  {{ getBatteryStatusText(driver) }}
                </div>
              </div>

              <!-- Activity Status -->
              <div class="bg-black/20 rounded p-2">
                <div class="flex items-center gap-1 mb-1">
                  <span>🚚</span>
                  <span class="text-gray-300">Activity</span>
                </div>
                <div class="text-blue-200">
                  {{ getActivityStatusText(driver) }}
                </div>
              </div>
            </div>

            <!-- Recent Activity Summary -->
            <div class="mt-3 pt-3 border-t border-white/10">
              <div class="flex justify-between text-xs">
                <span class="text-gray-400">Today's Activity:</span>
                <span class="text-white">{{ getDriverActivitySummary(driver) }}</span>
              </div>
            </div>

            <!-- Warning Indicators -->
            <div v-if="getDriverWarnings(driver).length > 0" class="mt-2 p-2 bg-yellow-600/20 border border-yellow-500/30 rounded">
              <div class="flex items-center gap-1 mb-1">
                <span>⚠️</span>
                <span class="text-xs text-yellow-200">Alerts</span>
              </div>
              <div class="space-y-1">
                <div v-for="warning in getDriverWarnings(driver)" :key="warning" class="text-xs text-yellow-300">
                  • {{ warning }}
                </div>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="mt-3 flex gap-2">
              <button @click="viewDriverRoute(driver.driver_id, 'today')" 
                class="flex-1 bg-orange-600/80 hover:bg-orange-600 text-white text-xs px-2 py-1 rounded transition">
                🗺️ Route
              </button>
              <button @click="sendGhostMessage(driver.driver_id)" 
                class="flex-1 bg-blue-600/80 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded transition">
                💬 Message
              </button>
            </div>
          </div>

          <!-- Offline Drivers Summary -->
          <div v-if="offlineDrivers.length > 0" class="bg-gray-800/50 rounded-lg border border-gray-600/50 p-4">
            <h4 class="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              😴 Offline Drivers ({{ offlineDrivers.length }})
            </h4>
            <div class="space-y-1">
              <div v-for="driver in offlineDrivers.slice(0, 5)" :key="driver.id" 
                class="flex justify-between text-xs text-gray-400">
                <span>{{ driver.name }}</span>
                <span>{{ formatTimeAgo(driver.last_seen) }}</span>
              </div>
            </div>
            <div v-if="offlineDrivers.length > 5" class="text-xs text-gray-500 mt-2">
              +{{ offlineDrivers.length - 5 }} more offline
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Data Display - Mobile Optimized -->
    <div v-else class="bg-white/5 rounded-xl border border-white/10">
      <div class="p-4 border-b border-white/10">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 class="text-lg font-semibold">
            <span v-if="selectedTab === 'logs'">📋 Recent Action Logs</span>
            <span v-else-if="selectedTab === 'breadcrumbs'">📍 GPS Breadcrumbs (30s intervals)</span>
            <span v-else-if="selectedTab === 'geofences'">🏢 Geofence Entry/Exit Events</span>
          </h3>
          <div class="flex items-center gap-3">
            <div v-if="stats.unsyncedLogs > 0" class="text-sm text-yellow-400">
              {{ stats.unsyncedLogs }} pending sync
            </div>
            <!-- Mobile filter/sort options could go here -->
          </div>
        </div>
      </div>
      
      <!-- Action Logs - Mobile Cards + Desktop Table -->
      <div v-if="selectedTab === 'logs'">
        <!-- Mobile: Card Layout -->
        <div class="md:hidden space-y-3 p-4">
          <div v-for="log in deliveryLogs.slice(0, 20)" :key="log.id" 
            class="bg-white/5 rounded-lg p-4 border border-white/10">
            <!-- Header -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ getActionIcon(log.action_type) }}</span>
                <div>
                  <div class="font-medium text-white">{{ log.drivers?.name || 'Unknown Driver' }}</div>
                  <div class="text-sm text-orange-300">{{ getActionTitle(log.action_type) }}</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs text-gray-400">{{ formatDateTime(log.timestamp) }}</div>
                <div :class="['w-2 h-2 rounded-full mt-1 ml-auto', log.synced ? 'bg-green-400' : 'bg-yellow-400']"
                  :title="log.synced ? 'Synced' : 'Pending sync'"></div>
              </div>
            </div>

            <!-- Details Grid -->
            <div class="grid grid-cols-2 gap-3 text-xs">
              <!-- GPS Info -->
              <div class="space-y-1">
                <div class="text-gray-400">📍 Location</div>
                <div v-if="log.latitude && log.longitude" class="font-mono text-white">
                  {{ log.latitude.toFixed(4) }}, {{ log.longitude.toFixed(4) }}
                </div>
                <div v-else class="text-red-400">No GPS data</div>
                <button v-if="log.latitude && log.longitude" @click="showOnMap(log)" 
                  class="text-blue-400 hover:text-blue-300 text-xs">
                  🗺️ View on Map
                </button>
              </div>

              <!-- Accuracy & Status -->
              <div class="space-y-1">
                <div class="text-gray-400">🎯 Accuracy</div>
                <span v-if="log.gps_accuracy" :class="['px-2 py-1 rounded text-xs inline-block',
                  log.gps_accuracy <= 10 ? 'bg-green-900 text-green-300' :
                  log.gps_accuracy <= 50 ? 'bg-yellow-900 text-yellow-300' :
                  'bg-red-900 text-red-300'
                ]">
                  {{ Math.round(log.gps_accuracy) }}m
                </span>
                <span v-else class="text-gray-500 text-xs">No GPS</span>
              </div>

              <!-- Device Info -->
              <div class="space-y-1">
                <div class="text-gray-400">📱 Device</div>
                <div class="text-white">🔋 {{ log.battery_level || 'N/A' }}%</div>
                <div class="text-white">📶 {{ log.signal_status || 'Unknown' }}</div>
              </div>

              <!-- Warnings -->
              <div class="space-y-1">
                <div class="text-gray-400">⚠️ Status</div>
                <div v-if="getLogWarnings(log).length > 0" class="space-y-1">
                  <div v-for="warning in getLogWarnings(log)" :key="warning"
                    class="text-red-400 text-xs">
                    {{ warning }}
                  </div>
                </div>
                <span v-else class="text-green-400 text-xs">✅ OK</span>
              </div>
            </div>

            <!-- Note -->
            <div v-if="log.note" class="mt-3 pt-3 border-t border-white/10">
              <div class="text-gray-400 text-xs mb-1">📝 Note</div>
              <div class="text-sm text-white">{{ log.note }}</div>
            </div>
          </div>

          <!-- Load More Button -->
          <div v-if="deliveryLogs.length > 20" class="text-center pt-4">
            <button @click="showAllLogs = !showAllLogs" 
              class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm transition">
              {{ showAllLogs ? 'Show Less' : `Show All ${deliveryLogs.length} Logs` }}
            </button>
          </div>
        </div>

        <!-- Desktop: Table Layout -->
        <div class="hidden md:block overflow-x-auto">
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

    <!-- Driver Selection for Route Viewer -->
    <div v-if="selectedTab === 'logs'" class="mt-6 bg-white/5 rounded-xl border border-white/10 p-4">
      <h3 class="text-lg font-semibold mb-4">🗺️ View Full Driver Routes</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="driver in uniqueDrivers" :key="driver.id" 
          class="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition">
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-medium text-white">{{ driver.name }}</h4>
              <p class="text-sm text-gray-400">{{ driver.phone }}</p>
              <div class="text-xs text-gray-400 mt-1">
                Last active: {{ formatDateTime(driver.lastActivity) }}
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm text-blue-400">{{ driver.todayLogs }} logs today</div>
              <div class="text-xs text-orange-400">{{ driver.todayBreadcrumbs }} GPS points</div>
            </div>
          </div>
          <div class="mt-3 flex gap-2">
            <button @click="viewDriverRoute(driver.id, 'today')"
              class="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-2 rounded transition">
              🗺️ Today's Route
            </button>
            <button @click="selectDateForDriver(driver.id)"
              class="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-2 rounded transition">
              📅 Pick Date
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Date Picker Modal -->
    <div v-if="showDatePicker" class="fixed inset-0 bg-black/75 flex items-center justify-center z-40 p-4">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-orange-500/20">
        <h3 class="text-lg font-semibold text-white mb-4">📅 Select Date for Route View</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-300 mb-2">Driver</label>
            <div class="text-white font-medium">{{ selectedDriverForDate?.name || 'Unknown Driver' }}</div>
          </div>
          <div>
            <label class="block text-sm text-gray-300 mb-2">Date</label>
            <input 
              type="date" 
              v-model="selectedDate"
              :max="new Date().toISOString().split('T')[0]"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div class="flex gap-3 pt-4">
            <button @click="confirmDateSelection"
              class="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition">
              🗺️ View Route
            </button>
            <button @click="showDatePicker = false"
              class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Route Viewer Modal -->
    <RouteViewer 
      v-if="showRouteViewer"
      :driver-id="routeViewerDriverId"
      :date="routeViewerDate"
      @close="closeRouteViewer"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import RouteViewer from '../components/RouteViewer.vue'
import LiveDriverMap from '../components/LiveDriverMap.vue'

// State
const loading = ref(false)
const deliveryLogs = ref([])
const drivers = ref([])
const breadcrumbs = ref([])
const geofenceEvents = ref([])
const onlineDrivers = ref([]) // NEW: Online drivers from presence table
const selectedTab = ref('live') // 'live', 'logs', 'breadcrumbs', 'geofences'

// Route Viewer State
const showRouteViewer = ref(false)
const routeViewerDriverId = ref(null)
const routeViewerDate = ref(null)
const showDatePicker = ref(false)
const selectedDriverForDate = ref(null)
const selectedDate = ref(new Date().toISOString().split('T')[0])

// Computed
const stats = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  const logsToday = deliveryLogs.value.filter(log => 
    log.timestamp && log.timestamp.startsWith(today)
  ).length

  // FIXED: Include driver_presence for online drivers
  const activeDrivers = new Set([
    ...deliveryLogs.value
      .filter(log => log.timestamp && new Date(log.timestamp) > new Date(Date.now() - 24*60*60*1000))
      .map(log => log.driver_id),
    ...breadcrumbs.value
      .filter(b => b.timestamp && new Date(b.timestamp) > new Date(Date.now() - 60*60*1000)) // Active in last hour
      .map(b => b.driver_id),
    ...onlineDrivers.value.map(d => d.driver_id) // NEW: Include online drivers from presence
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

const uniqueDrivers = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  const driverMap = new Map()

  // Process delivery logs
  deliveryLogs.value.forEach(log => {
    if (!log.drivers || !log.driver_id) return
    
    const driver = driverMap.get(log.driver_id) || {
      id: log.driver_id,
      name: log.drivers.name,
      phone: log.drivers.phone,
      lastActivity: log.timestamp,
      todayLogs: 0,
      todayBreadcrumbs: 0
    }

    if (log.timestamp && log.timestamp.startsWith(today)) {
      driver.todayLogs++
    }

    if (new Date(log.timestamp) > new Date(driver.lastActivity)) {
      driver.lastActivity = log.timestamp
    }

    driverMap.set(log.driver_id, driver)
  })

  // Process breadcrumbs
  breadcrumbs.value.forEach(breadcrumb => {
    if (!breadcrumb.drivers || !breadcrumb.driver_id) return
    
    const driver = driverMap.get(breadcrumb.driver_id)
    if (driver && breadcrumb.timestamp && breadcrumb.timestamp.startsWith(today)) {
      driver.todayBreadcrumbs++
    }
  })

  return Array.from(driverMap.values()).sort((a, b) => 
    new Date(b.lastActivity) - new Date(a.lastActivity)
  )
})

const systemHealthClass = computed(() => {
  const criticalIssues = redFlags.value.filter(flag => 
    ['Missing GPS', 'Low Battery', 'Poor connection'].includes(flag.type)
  ).length
  
  if (onlineDrivers.value.length === 0) {
    return 'bg-red-900/30 border-red-500/50 text-red-200'
  }
  if (criticalIssues > 0) {
    return 'bg-yellow-900/30 border-yellow-500/50 text-yellow-200'
  }
  return 'bg-green-900/30 border-green-500/50 text-green-200'
})

const systemHealthIcon = computed(() => {
  const criticalIssues = redFlags.value.filter(flag => 
    ['Missing GPS', 'Low Battery', 'Poor connection'].includes(flag.type)
  ).length
  
  if (onlineDrivers.value.length === 0) return '🔴'
  if (criticalIssues > 0) return '⚠️'
  return '✅'
})

const systemHealthStatus = computed(() => {
  const criticalIssues = redFlags.value.filter(flag => 
    ['Missing GPS', 'Low Battery', 'Poor connection'].includes(flag.type)
  ).length
  
  if (onlineDrivers.value.length === 0) return 'System Offline'
  if (criticalIssues > 0) return 'System Warning'
  return 'All Systems Operational'
})

const systemHealthMessage = computed(() => {
  const criticalIssues = redFlags.value.filter(flag => 
    ['Missing GPS', 'Low Battery', 'Poor connection'].includes(flag.type)
  ).length
  
  if (onlineDrivers.value.length === 0) {
    return 'No drivers currently online or tracking'
  }
  if (criticalIssues > 0) {
    return `${criticalIssues} critical issue${criticalIssues === 1 ? '' : 's'} require attention`
  }
  return 'All drivers connected with good GPS and battery levels'
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
    end_route: '🏁',
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
    end_route: 'Ended Route',
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
      fetchGeofenceEvents(),
      fetchOnlineDrivers() // NEW: Fetch online drivers
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

// NEW: Fetch online drivers from presence table
const fetchOnlineDrivers = async () => {
  try {
    console.log('🔄 Fetching online drivers from presence table...')
    
    const { data, error } = await supabase
      .from('driver_presence')
      .select(`
        *,
        drivers (
          id,
          name,
          phone
        )
      `)
      .eq('is_online', true)
      .order('last_seen', { ascending: false })

    if (error) throw error
    
    onlineDrivers.value = data || []
    console.log('✅ Online drivers found:', onlineDrivers.value.length)
    
    // Log driver details for debugging
    onlineDrivers.value.forEach(driver => {
      console.log(`📱 ${driver.drivers?.name || 'Unknown'} - Last seen: ${driver.last_seen}`)
    })
    
  } catch (error) {
    console.error('Error fetching online drivers:', error)
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

// Route Viewer Methods
const viewDriverRoute = (driverId, dateOption) => {
  const date = dateOption === 'today' 
    ? new Date().toISOString().split('T')[0] 
    : dateOption
  
  routeViewerDriverId.value = driverId
  routeViewerDate.value = date
  showRouteViewer.value = true
}

const selectDateForDriver = (driverId) => {
  const driver = uniqueDrivers.value.find(d => d.id === driverId)
  selectedDriverForDate.value = driver
  showDatePicker.value = true
}

const confirmDateSelection = () => {
  if (selectedDriverForDate.value && selectedDate.value) {
    viewDriverRoute(selectedDriverForDate.value.id, selectedDate.value)
    showDatePicker.value = false
  }
}

const closeRouteViewer = () => {
  showRouteViewer.value = false
  routeViewerDriverId.value = null
  routeViewerDate.value = null
}

// ROBUST DRIVER STATUS METHODS
const offlineDrivers = computed(() => {
  // This would come from a drivers table query
  // For now, return empty array - you could enhance this
  return []
})

const getDriverStatusIndicator = (driver) => {
  const lastSeen = new Date(driver.last_seen)
  const now = new Date()
  const minutesAgo = (now - lastSeen) / (1000 * 60)
  
  if (minutesAgo < 2) return 'bg-green-400 animate-pulse' // Very recent
  if (minutesAgo < 5) return 'bg-green-400'              // Recent
  if (minutesAgo < 15) return 'bg-yellow-400'            // Moderate
  return 'bg-red-400'                                     // Stale
}

const getConnectionStatusIcon = (driver) => {
  const lastSeen = new Date(driver.last_seen)
  const now = new Date()
  const minutesAgo = (now - lastSeen) / (1000 * 60)
  
  if (minutesAgo < 2) return '🟢'
  if (minutesAgo < 5) return '🟡' 
  return '🔴'
}

const getConnectionStatusClass = (driver) => {
  const lastSeen = new Date(driver.last_seen)
  const now = new Date()
  const minutesAgo = (now - lastSeen) / (1000 * 60)
  
  if (minutesAgo < 2) return 'text-green-300'
  if (minutesAgo < 5) return 'text-yellow-300'
  return 'text-red-300'
}

const getConnectionStatusText = (driver) => {
  const lastSeen = new Date(driver.last_seen)
  const now = new Date()
  const minutesAgo = (now - lastSeen) / (1000 * 60)
  
  if (minutesAgo < 1) return 'Live'
  if (minutesAgo < 2) return 'Active'
  if (minutesAgo < 5) return 'Recent'
  if (minutesAgo < 15) return 'Delayed'
  return 'Stale'
}

const getGpsStatusClass = (driver) => {
  if (!driver.location_lat || !driver.location_lng) return 'text-red-300'
  if (!driver.gps_accuracy) return 'text-yellow-300'
  if (driver.gps_accuracy <= 10) return 'text-green-300'
  if (driver.gps_accuracy <= 50) return 'text-yellow-300'
  return 'text-red-300'
}

const getGpsStatusText = (driver) => {
  if (!driver.location_lat || !driver.location_lng) return 'No GPS'
  if (!driver.gps_accuracy) return 'GPS Only'
  if (driver.gps_accuracy <= 10) return 'Excellent'
  if (driver.gps_accuracy <= 50) return 'Good'
  return 'Poor'
}

const getBatteryIcon = (driver) => {
  if (!driver.battery_level) return '🔋'
  if (driver.battery_level > 80) return '🔋'
  if (driver.battery_level > 50) return '🔋'
  if (driver.battery_level > 20) return '🪫'
  return '🔋'
}

const getBatteryStatusClass = (driver) => {
  if (!driver.battery_level) return 'text-gray-300'
  if (driver.battery_level > 50) return 'text-green-300'
  if (driver.battery_level > 20) return 'text-yellow-300'
  return 'text-red-300'
}

const getBatteryStatusText = (driver) => {
  if (!driver.battery_level) return 'Unknown'
  return `${driver.battery_level}%`
}

const getActivityStatusText = (driver) => {
  // Determine activity based on recent logs/breadcrumbs
  const recentLogs = deliveryLogs.value.filter(log => 
    log.driver_id === driver.driver_id && 
    new Date(log.timestamp) > new Date(Date.now() - 30*60*1000) // Last 30 minutes
  )
  
  const recentBreadcrumbs = breadcrumbs.value.filter(b => 
    b.driver_id === driver.driver_id && 
    new Date(b.timestamp) > new Date(Date.now() - 5*60*1000) // Last 5 minutes
  )
  
  if (recentLogs.length > 0) {
    const lastAction = recentLogs[0].action_type
    return getActionTitle(lastAction)
  }
  
  if (recentBreadcrumbs.length > 0) {
    const avgSpeed = recentBreadcrumbs.reduce((sum, b) => sum + (b.speed_kmh || 0), 0) / recentBreadcrumbs.length
    if (avgSpeed > 5) return 'Moving'
    return 'Stationary'
  }
  
  return 'Idle'
}

const getDriverActivitySummary = (driver) => {
  const today = new Date().toISOString().split('T')[0]
  
  const todayLogs = deliveryLogs.value.filter(log => 
    log.driver_id === driver.driver_id && 
    log.timestamp?.startsWith(today)
  ).length
  
  const todayBreadcrumbs = breadcrumbs.value.filter(b => 
    b.driver_id === driver.driver_id && 
    b.timestamp?.startsWith(today)
  ).length
  
  return `${todayLogs} actions, ${todayBreadcrumbs} GPS points`
}

const getDriverWarnings = (driver) => {
  const warnings = []
  const lastSeen = new Date(driver.last_seen)
  const now = new Date()
  const minutesAgo = (now - lastSeen) / (1000 * 60)
  
  // Connection warnings
  if (minutesAgo > 15) {
    warnings.push('Poor connection')
  }
  
  // GPS warnings
  if (!driver.location_lat || !driver.location_lng) {
    warnings.push('Missing GPS coordinates')
  } else if (driver.gps_accuracy && driver.gps_accuracy > 100) {
    warnings.push('Poor GPS accuracy')
  }
  
  // Battery warnings
  if (driver.battery_level && driver.battery_level < 20) {
    warnings.push('Low battery')
  }
  
  // Activity warnings
  const recentActivity = deliveryLogs.value.filter(log => 
    log.driver_id === driver.driver_id && 
    new Date(log.timestamp) > new Date(Date.now() - 2*60*60*1000) // Last 2 hours
  ).length
  
  if (recentActivity === 0 && minutesAgo < 30) {
    warnings.push('Online but inactive')
  }
  
  return warnings
}

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Never'
  
  const now = new Date()
  const time = new Date(timestamp)
  const diffMs = now - time
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

const sendGhostMessage = async (driverId) => {
  const message = prompt('Send message to driver:')
  if (!message) return
  
  try {
    await supabase
      .from('ghost_commands')
      .insert({
        driver_id: driverId,
        action: 'SEND_MESSAGE',
        message: message,
        auto_triggered: false,
        created_at: new Date().toISOString()
      })
    
    alert('✅ Message sent to driver!')
  } catch (error) {
    console.error('Error sending ghost message:', error)
    alert('❌ Failed to send message')
  }
}

// Initialize with auto-refresh
onMounted(() => {
  refreshData()
  
  // Auto-refresh every 30 seconds for live tracking
  const interval = setInterval(async () => {
    if (selectedTab.value === 'live') {
      console.log('🔄 Auto-refreshing driver status...')
      await fetchOnlineDrivers()
    }
  }, 30000)
  
  // Cleanup interval on unmount
  onUnmounted(() => {
    clearInterval(interval)
  })
})
</script> 