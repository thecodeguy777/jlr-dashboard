<template>
  <div class="bg-gray-800 rounded-xl border border-orange-500/20 overflow-hidden">
    <!-- Header -->
    <div class="flex justify-between items-center p-4 border-b border-white/10">
      <div>
        <h3 class="text-lg font-semibold text-white flex items-center gap-2">
          🗺️ Live Driver Tracking
          <div v-if="isUpdating" class="animate-pulse w-2 h-2 bg-green-400 rounded-full"></div>
        </h3>
        <p class="text-sm text-gray-300">Real-time GPS positions • Updates every 30s</p>
      </div>
      
      <div class="flex items-center gap-3">
        <!-- Auto-refresh toggle -->
        <button @click="toggleAutoRefresh" 
          :class="['px-3 py-1 rounded text-sm transition', 
            autoRefresh ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300']">
          {{ autoRefresh ? '🔄 Live' : '⏸️ Paused' }}
        </button>
        
        <!-- Refresh button -->
        <button @click="refreshNow" :disabled="isUpdating"
          class="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-3 py-1 rounded text-sm transition">
          🔄 Refresh
        </button>
        
        <!-- View controls -->
        <button @click="fitAllDrivers"
          class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition">
          🎯 Fit All
        </button>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="flex gap-4 p-3 bg-white/5 border-b border-white/10 text-sm">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        <span>{{ activeDrivers.length }} Active</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 bg-orange-400 rounded-full"></div>
        <span>{{ recentBreadcrumbs.length }} Recent Points</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 bg-blue-400 rounded-full"></div>
        <span>Last update: {{ lastUpdateTime }}</span>
      </div>
    </div>

    <!-- Map Container -->
    <div class="relative" style="height: 600px;">
      <div ref="mapContainer" class="absolute inset-0"></div>
      
      <!-- Loading Overlay -->
      <div v-if="loading" class="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
        <div class="text-white text-center">
          <div class="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <div>Loading live positions...</div>
        </div>
      </div>

      <!-- No Data Overlay -->
      <div v-else-if="!loading && activeDrivers.length === 0" class="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
        <div class="text-white text-center">
          <div class="text-6xl mb-4">🚛</div>
          <div class="text-xl font-semibold mb-2">No Active Drivers</div>
          <div class="text-sm text-gray-300 mb-4">
            No drivers are currently active or have GPS positions.<br>
            Drivers need to start a route to appear on this map.
          </div>
          <button @click="refreshNow" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition">
            🔄 Refresh
          </button>
        </div>
      </div>

      <!-- Controls -->
      <div class="absolute top-4 right-4 space-y-2 z-[1000] pointer-events-auto">
        <button @click="toggleTrails" 
          :class="['p-2 rounded shadow-lg transition text-white text-sm font-medium border border-white/20', 
            showTrails ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-800 hover:bg-gray-700']">
          {{ showTrails ? '👁️ Hide Trails' : '📍 Show Trails' }}
        </button>
        <button @click="toggleSpeed" 
          :class="['p-2 rounded shadow-lg transition text-white text-sm font-medium border border-white/20', 
            showSpeed ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-800 hover:bg-gray-700']">
          {{ showSpeed ? '🚗 Hide Speed' : '🚗 Show Speed' }}
        </button>
      </div>

      <!-- Legend -->
      <div class="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 text-xs text-white space-y-1 z-[1000] pointer-events-auto border border-white/20 shadow-lg">
        <div class="font-semibold mb-2">🗺️ Live Legend</div>
        <div class="flex items-center gap-2">
          <span style="font-size: 12px;">🚛</span>
          <span>Active Driver</span>
        </div>
        <div class="flex items-center gap-2">
          <span style="font-size: 12px;">🚗</span>
          <span>Idle Driver</span>
        </div>
        <div v-if="showTrails" class="flex items-center gap-2">
          <div class="w-3 h-1 bg-orange-400 rounded"></div>
          <span>Breadcrumb Trail</span>
        </div>
        <div v-if="showSpeed" class="flex items-center gap-2">
          <div class="w-3 h-3 bg-green-400 rounded-full"></div>
          <span>Speed: Green=Slow, Red=Fast</span>
        </div>
      </div>

      <!-- Driver Status Panel -->
      <div v-if="selectedDriver" class="absolute top-4 left-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 text-white max-w-sm z-[1000] pointer-events-auto border border-white/20 shadow-lg">
        <div class="font-semibold mb-2">📱 {{ selectedDriver.name }}</div>
        <div class="text-sm space-y-1">
          <div>📍 Last seen: {{ formatTime(selectedDriver.lastUpdate) }}</div>
          <div>🚗 Speed: {{ selectedDriver.currentSpeed?.toFixed(1) || '0' }} km/h</div>
          <div>🎯 GPS: {{ selectedDriver.gpsAccuracy?.toFixed(1) || 'N/A' }}m</div>
          <div>🔋 Battery: {{ selectedDriver.batteryLevel || 'N/A' }}%</div>
          <div>📶 Signal: {{ selectedDriver.signalStatus || 'Unknown' }}</div>
          <div :class="['px-2 py-1 rounded text-xs inline-block mt-2',
            selectedDriver.isActive ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300']">
            {{ selectedDriver.isActive ? '🟢 Active Route' : '⚪ Idle' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { supabase } from '../lib/supabase.js'

// State
const loading = ref(true)
const isUpdating = ref(false)
const mapContainer = ref(null)
const autoRefresh = ref(true)
const showTrails = ref(true)
const showSpeed = ref(false)
const selectedDriver = ref(null)

// Data
const activeDrivers = ref([])
const recentBreadcrumbs = ref([])
const lastUpdateTime = ref('')

// Map
let map = null
let driverMarkers = new Map()
let trailPolylines = new Map()
let updateInterval = null

// Computed
const allDriversWithPositions = computed(() => {
  return activeDrivers.value.filter(d => d.latitude && d.longitude)
})

// Methods
const initializeMap = () => {
  if (!mapContainer.value) return

  // Initialize Leaflet map - Manila center
  map = L.map(mapContainer.value).setView([14.5995, 120.9842], 11)

  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map)

  // Load initial data
  fetchLiveData()
}

const fetchLiveData = async () => {
  if (!autoRefresh.value && !isUpdating.value) return
  
  isUpdating.value = true
  
  try {
    console.log('🔄 Fetching live driver data...')
    
    // Get active drivers 
    const { data: driversData, error: driversError } = await supabase
      .from('drivers')
      .select('id, name, phone, is_active')
      .eq('is_active', true)

    if (driversError) {
      console.error('Error fetching drivers:', driversError)
      return
    }

    console.log('👥 Active drivers found:', driversData?.length || 0)

    // Get recent breadcrumbs for trails (last 30 minutes)
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: breadcrumbsData, error: breadcrumbsError } = await supabase
      .from('gps_breadcrumbs')
      .select(`
        *, 
        drivers(name, phone)
      `)
      .gte('timestamp', thirtyMinsAgo)
      .order('timestamp', { ascending: true })

    if (breadcrumbsError) {
      console.error('Error fetching breadcrumbs:', breadcrumbsError)
    }

    console.log('📍 Recent breadcrumbs found:', breadcrumbsData?.length || 0)

    // Get latest breadcrumb for each driver
    const driverPositions = new Map()
    
    if (breadcrumbsData) {
      breadcrumbsData.forEach(breadcrumb => {
        const driverId = breadcrumb.driver_id
        const existing = driverPositions.get(driverId)
        
        if (!existing || new Date(breadcrumb.timestamp) > new Date(existing.timestamp)) {
          driverPositions.set(driverId, breadcrumb)
        }
      })
    }

    // Process drivers data with latest positions
    activeDrivers.value = (driversData || []).map(driver => {
      const latestBreadcrumb = driverPositions.get(driver.id)
      return {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        isActive: latestBreadcrumb?.is_active_route || false,
        latitude: latestBreadcrumb?.latitude,
        longitude: latestBreadcrumb?.longitude,
        lastUpdate: latestBreadcrumb?.timestamp,
        currentSpeed: latestBreadcrumb?.speed_kmh,
        gpsAccuracy: latestBreadcrumb?.gps_accuracy,
        batteryLevel: latestBreadcrumb?.battery_level,
        signalStatus: latestBreadcrumb?.signal_status
      }
    }).filter(driver => driver.latitude && driver.longitude)

    console.log('🚛 Drivers with positions:', activeDrivers.value.length)

    recentBreadcrumbs.value = breadcrumbsData || []
    lastUpdateTime.value = new Date().toLocaleTimeString()

    // Update map
    if (map) {
      updateDriverMarkers()
      if (showTrails.value) {
        updateTrails()
      }
    }

  } catch (error) {
    console.error('Error fetching live data:', error)
  } finally {
    isUpdating.value = false
    loading.value = false
  }
}

const updateDriverMarkers = () => {
  if (!map) return

  // Clear existing markers
  driverMarkers.forEach(marker => map.removeLayer(marker))
  driverMarkers.clear()

  // Add driver markers
  activeDrivers.value.forEach(driver => {
    const isActive = driver.isActive
    const speed = driver.currentSpeed || 0
    
    // Create driver icon
    const icon = L.divIcon({
      html: `
        <div style="
          background: ${isActive ? 'linear-gradient(45deg, #f97316, #ea580c)' : 'linear-gradient(45deg, #6b7280, #4b5563)'};
          border: 3px solid white;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          position: relative;
          ${isActive ? 'animation: pulse 2s infinite;' : ''}
        ">
          ${isActive ? '🚛' : '🚗'}
          ${showSpeed && speed > 0 ? `
            <div style="
              position: absolute;
              top: -8px;
              right: -8px;
              background: ${speed <= 30 ? '#22c55e' : speed <= 60 ? '#f59e0b' : '#ef4444'};
              color: white;
              border-radius: 50%;
              width: 18px;
              height: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: bold;
            ">
              ${Math.round(speed)}
            </div>
          ` : ''}
        </div>
        <style>
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
            100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
          }
        </style>
      `,
      className: 'driver-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    })

    const marker = L.marker([driver.latitude, driver.longitude], { icon })
      .addTo(map)

    // Add popup
    marker.bindPopup(`
      <div style="min-width: 200px;">
        <strong>${driver.name}</strong><br>
        <div style="font-size: 12px; margin-top: 4px;">
          📞 ${driver.phone || 'N/A'}<br>
          🕐 ${formatTime(driver.lastUpdate)}<br>
          🚗 ${driver.currentSpeed?.toFixed(1) || '0'} km/h<br>
          🎯 ${driver.gpsAccuracy?.toFixed(1) || 'N/A'}m GPS<br>
          🔋 ${driver.batteryLevel || 'N/A'}%<br>
          📶 ${driver.signalStatus || 'Unknown'}<br>
          <span style="
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            margin-top: 4px;
            background: ${driver.isActive ? '#22c55e' : '#6b7280'};
            color: white;
          ">
            ${driver.isActive ? '🟢 Active Route' : '⚪ Idle'}
          </span>
        </div>
      </div>
    `)

    // Click handler
    marker.on('click', () => {
      selectedDriver.value = driver
      map.setView([driver.latitude, driver.longitude], Math.max(map.getZoom(), 15))
    })

    driverMarkers.set(driver.id, marker)
  })
}

const updateTrails = () => {
  if (!map || !showTrails.value) return

  // Clear existing trails
  trailPolylines.forEach(polyline => map.removeLayer(polyline))
  trailPolylines.clear()

  // Group breadcrumbs by driver
  const trailsByDriver = new Map()
  recentBreadcrumbs.value.forEach(breadcrumb => {
    const driverId = breadcrumb.driver_id
    if (!trailsByDriver.has(driverId)) {
      trailsByDriver.set(driverId, [])
    }
    trailsByDriver.get(driverId).push(breadcrumb)
  })

  // Create trail polylines
  trailsByDriver.forEach((breadcrumbs, driverId) => {
    if (breadcrumbs.length < 2) return

    const coordinates = breadcrumbs.map(b => [b.latitude, b.longitude])
    const driver = activeDrivers.value.find(d => d.id === driverId)
    const isActive = driver?.isActive || false

    const polyline = L.polyline(coordinates, {
      color: isActive ? '#f97316' : '#6b7280',
      weight: isActive ? 4 : 2,
      opacity: isActive ? 0.8 : 0.5,
      dashArray: isActive ? '' : '5, 5'
    }).addTo(map)

    trailPolylines.set(driverId, polyline)
  })
}

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

const refreshNow = () => {
  fetchLiveData()
}

const toggleTrails = () => {
  showTrails.value = !showTrails.value
  if (showTrails.value) {
    updateTrails()
  } else {
    trailPolylines.forEach(polyline => map.removeLayer(polyline))
    trailPolylines.clear()
  }
}

const toggleSpeed = () => {
  showSpeed.value = !showSpeed.value
  updateDriverMarkers()
}

const fitAllDrivers = () => {
  if (!map || !allDriversWithPositions.value.length) return

  const bounds = L.latLngBounds(
    allDriversWithPositions.value.map(d => [d.latitude, d.longitude])
  )
  map.fitBounds(bounds, { padding: [20, 20] })
}

const startAutoRefresh = () => {
  if (updateInterval) clearInterval(updateInterval)
  updateInterval = setInterval(fetchLiveData, 30000) // 30 seconds
}

const stopAutoRefresh = () => {
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }
}

const formatTime = (timestamp) => {
  if (!timestamp) return 'Never'
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  if (diffMins === 0) return 'Just now'
  if (diffMins === 1) return '1 min ago'
  if (diffMins < 60) return `${diffMins} mins ago`
  return date.toLocaleTimeString()
}

// Lifecycle
onMounted(async () => {
  // Load Leaflet dynamically
  if (!window.L) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = initializeMap
    document.head.appendChild(script)
  } else {
    initializeMap()
  }

  // Start auto-refresh
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
  if (map) map.remove()
})
</script>

<style scoped>
.leaflet-container {
  height: 100%;
  width: 100%;
}

/* Ensure map controls are always visible and clickable */
.z-\[1000\] {
  z-index: 1000 !important;
}

/* Prevent map interactions from interfering with controls */
.pointer-events-auto {
  pointer-events: auto !important;
}
</style> 