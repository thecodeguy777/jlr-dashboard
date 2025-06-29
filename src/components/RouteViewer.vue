<template>
  <div class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
    <div class="bg-gray-800 rounded-xl w-full max-w-6xl h-[90vh] flex flex-col border border-orange-500/20">
      <!-- Header -->
      <div class="flex justify-between items-center p-4 border-b border-white/10">
        <div>
          <h2 class="text-xl font-bold text-white">🗺️ Route Viewer</h2>
          <p class="text-sm text-gray-300">{{ routeInfo.driverName }} • {{ formatDate(routeInfo.date) }}</p>
        </div>
        <button @click="$emit('close')" class="text-gray-400 hover:text-white text-2xl">&times;</button>
      </div>

      <!-- Route Stats -->
      <div class="flex gap-4 p-4 bg-white/5 border-b border-white/10 text-sm">
        <div class="text-center">
          <div class="text-orange-400 font-bold">{{ routeStats.totalDistance }}</div>
          <div class="text-gray-400">Total Distance</div>
        </div>
        <div class="text-center">
          <div class="text-blue-400 font-bold">{{ routeStats.duration }}</div>
          <div class="text-gray-400">Duration</div>
        </div>
        <div class="text-center">
          <div class="text-green-400 font-bold">{{ routeStats.avgSpeed }}</div>
          <div class="text-gray-400">Avg Speed</div>
        </div>
        <div class="text-center">
          <div class="text-purple-400 font-bold">{{ routeStats.maxSpeed }}</div>
          <div class="text-gray-400">Max Speed</div>
        </div>
        <div class="text-center">
          <div class="text-yellow-400 font-bold">{{ routeStats.breadcrumbs }}</div>
          <div class="text-gray-400">GPS Points</div>
        </div>
        <div class="text-center">
          <div class="text-red-400 font-bold">{{ routeStats.geofenceEvents }}</div>
          <div class="text-gray-400">Geofence Events</div>
        </div>
      </div>

      <!-- Map Container -->
      <div class="flex-1 relative">
        <div ref="mapContainer" class="absolute inset-0"></div>
        
        <!-- Loading State -->
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-gray-900/50">
          <div class="text-white text-center">
            <div class="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <div>Loading route data...</div>
          </div>
        </div>

        <!-- Map Controls -->
        <div class="absolute top-4 right-4 space-y-2 z-[1000] pointer-events-auto">
          <button @click="fitRoute" 
            class="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded shadow-lg transition text-sm font-medium border border-white/20">
            🎯 Fit Route
          </button>
          <button @click="toggleSpeed" 
            :class="['p-2 rounded shadow-lg transition text-white text-sm font-medium border border-white/20', showSpeed ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-800 hover:bg-gray-700']">
            🚗 {{ showSpeed ? 'Hide' : 'Show' }} Speed
          </button>
          <button @click="toggleGeofences" 
            :class="['p-2 rounded shadow-lg transition text-white text-sm font-medium border border-white/20', showGeofences ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-800 hover:bg-gray-700']">
            🏢 {{ showGeofences ? 'Hide' : 'Show' }} Geofences
          </button>
        </div>

        <!-- Legend -->
        <div class="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 text-xs text-white space-y-1 z-[1000] pointer-events-auto border border-white/20 shadow-lg">
          <div class="font-semibold mb-2">🗺️ Legend</div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Start Route</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>Arrived</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Delivered</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Breadcrumbs</span>
          </div>
          <div class="flex items-center gap-2">
            <span style="font-size: 10px;">🚛</span>
            <span>Truck Position</span>
          </div>
          <div v-if="showGeofences" class="flex items-center gap-2">
            <div class="w-3 h-3 border-2 border-purple-400 rounded-full"></div>
            <span>Client Areas</span>
          </div>
        </div>

        <!-- Speed Indicator -->
        <div v-if="showSpeed && hoveredPoint" class="absolute top-4 left-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 text-white z-[1000] pointer-events-auto border border-white/20 shadow-lg">
          <div class="font-semibold">📍 Point Details</div>
          <div class="text-sm space-y-1 mt-2">
            <div>🕐 {{ formatTime(hoveredPoint.timestamp) }}</div>
            <div>🚗 {{ hoveredPoint.speed_kmh?.toFixed(1) || '0' }} km/h</div>
            <div>🎯 {{ hoveredPoint.gps_accuracy?.toFixed(1) || '0' }}m accuracy</div>
            <div v-if="hoveredPoint.distance_from_last">📏 {{ hoveredPoint.distance_from_last?.toFixed(1) }}m from last</div>
          </div>
        </div>
      </div>

      <!-- Timeline Slider -->
      <div class="p-4 border-t border-white/10">
        <div class="flex items-center gap-4">
          <button @click="playRoute" 
            :class="['px-3 py-1 rounded text-white transition', 
              isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700']">
            {{ isPlaying ? '⏸️ Pause' : '▶️ Play Route' }}
          </button>
          <div class="flex-1">
            <input 
              type="range" 
              :min="0" 
              :max="breadcrumbs.length - 1" 
              v-model="currentFrame"
              @input="updateMapToFrame"
              class="w-full"
            />
          </div>
          <div class="text-sm text-gray-300 whitespace-nowrap">
            {{ currentFrame + 1 }} / {{ breadcrumbs.length }}
          </div>
        </div>
        <div class="text-xs text-gray-400 mt-1">
          {{ currentFrame < breadcrumbs.length ? formatTime(breadcrumbs[currentFrame]?.timestamp) : '' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { supabase } from '../lib/supabase.js'

const props = defineProps({
  driverId: String,
  date: String, // YYYY-MM-DD format
  routeId: String
})

const emit = defineEmits(['close'])

// State
const loading = ref(true)
const mapContainer = ref(null)
const breadcrumbs = ref([])
const deliveryLogs = ref([])
const geofenceEvents = ref([])
const clients = ref([])
const showSpeed = ref(false)
const showGeofences = ref(true)
const hoveredPoint = ref(null)
const currentFrame = ref(0)
const isPlaying = ref(false)

// Map instance
let map = null
let playInterval = null
let truckMarker = null

// Computed
const routeInfo = computed(() => ({
  driverName: deliveryLogs.value[0]?.drivers?.name || 'Unknown Driver',
  date: props.date
}))

const routeStats = computed(() => {
  if (!breadcrumbs.value.length) return {
    totalDistance: '0 km',
    duration: '0 min',
    avgSpeed: '0 km/h', 
    maxSpeed: '0 km/h',
    breadcrumbs: 0,
    geofenceEvents: 0
  }

  const totalDistance = breadcrumbs.value.reduce((sum, b) => sum + (b.distance_from_last || 0), 0)
  const speeds = breadcrumbs.value.filter(b => b.speed_kmh).map(b => b.speed_kmh)
  const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0
  const maxSpeed = speeds.length ? Math.max(...speeds) : 0
  
  const startTime = new Date(breadcrumbs.value[0]?.timestamp)
  const endTime = new Date(breadcrumbs.value[breadcrumbs.value.length - 1]?.timestamp)
  const duration = Math.round((endTime - startTime) / (1000 * 60)) // minutes

  return {
    totalDistance: `${(totalDistance / 1000).toFixed(1)} km`,
    duration: `${duration} min`,
    avgSpeed: `${avgSpeed.toFixed(1)} km/h`,
    maxSpeed: `${maxSpeed.toFixed(1)} km/h`,
    breadcrumbs: breadcrumbs.value.length,
    geofenceEvents: geofenceEvents.value.length
  }
})

// Methods
const fetchRouteData = async () => {
  loading.value = true
  try {
    const startDate = `${props.date} 00:00:00`
    const endDate = `${props.date} 23:59:59`

    // Fetch breadcrumbs
    const { data: breadcrumbData } = await supabase
      .from('gps_breadcrumbs')
      .select('*')
      .eq('driver_id', props.driverId)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: true })

    // Fetch delivery logs
    const { data: logData } = await supabase
      .from('delivery_logs')
      .select(`*, drivers(name)`)
      .eq('driver_id', props.driverId)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: true })

    // Fetch geofence events
    const { data: geofenceData } = await supabase
      .from('geofence_events')
      .select(`*, clients(name, address, location_lat, location_lng, geofence_radius)`)
      .eq('driver_id', props.driverId)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: true })

    // Fetch clients for geofence visualization
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('is_active', true)

    breadcrumbs.value = breadcrumbData || []
    deliveryLogs.value = logData || []
    geofenceEvents.value = geofenceData || []
    clients.value = clientData || []

  } catch (error) {
    console.error('Error fetching route data:', error)
  } finally {
    loading.value = false
  }
}

const initializeMap = () => {
  if (!mapContainer.value || !breadcrumbs.value.length) return

  // Initialize Leaflet map
  map = L.map(mapContainer.value).setView([14.5995, 120.9842], 13)

  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map)

  drawRoute()
}

const drawRoute = () => {
  if (!map || !breadcrumbs.value.length) return

  // Clear existing layers (except truck marker)
  map.eachLayer(layer => {
    if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.Circle) {
      if (layer !== truckMarker) {
        map.removeLayer(layer)
      }
    }
  })

  // Draw route line
  const routeCoords = breadcrumbs.value.map(b => [b.latitude, b.longitude])
  L.polyline(routeCoords, { 
    color: '#f97316', 
    weight: 3, 
    opacity: 0.7 
  }).addTo(map)

  // Add delivery action markers
  deliveryLogs.value.forEach(log => {
    if (!log.latitude || !log.longitude) return

    const colors = {
      start_route: '#22c55e',
      arrived: '#f97316', 
      delivered: '#ef4444'
    }

    const marker = L.circleMarker([log.latitude, log.longitude], {
      radius: 8,
      fillColor: colors[log.action_type] || '#6b7280',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(map)

    marker.bindPopup(`
      <strong>${getActionTitle(log.action_type)}</strong><br>
      ${formatTime(log.timestamp)}<br>
      ${log.note || 'No notes'}
    `)
  })

  // Add breadcrumb markers (optional, for detailed view)
  if (showSpeed.value) {
    breadcrumbs.value.forEach((breadcrumb, index) => {
      const speed = breadcrumb.speed_kmh || 0
      const color = speed <= 30 ? '#22c55e' : speed <= 60 ? '#f59e0b' : '#ef4444'
      
      const marker = L.circleMarker([breadcrumb.latitude, breadcrumb.longitude], {
        radius: 3,
        fillColor: color,
        color: color,
        weight: 1,
        opacity: 0.6,
        fillOpacity: 0.4
      }).addTo(map)

      marker.on('mouseover', () => {
        hoveredPoint.value = breadcrumb
      })

      marker.on('mouseout', () => {
        hoveredPoint.value = null
      })
    })
  }

  // Add geofence circles
  if (showGeofences.value) {
    clients.value.forEach(client => {
      if (!client.location_lat || !client.location_lng) return

      L.circle([client.location_lat, client.location_lng], {
        radius: client.geofence_radius || 100,
        color: '#a855f7',
        weight: 2,
        opacity: 0.6,
        fillOpacity: 0.1
      }).addTo(map).bindPopup(`
        <strong>${client.name}</strong><br>
        ${client.address}<br>
        Radius: ${client.geofence_radius || 100}m
      `)
    })
  }

  // Create truck marker for playback
  createTruckMarker()
  
  fitRoute()
}

const createTruckMarker = () => {
  if (!map || !breadcrumbs.value.length) return

  // Remove existing truck marker
  if (truckMarker) {
    map.removeLayer(truckMarker)
  }

  // Create custom truck icon
  const truckIcon = L.divIcon({
    html: `
      <div class="truck-icon" style="
        background: linear-gradient(45deg, #f97316, #ea580c);
        border: 3px solid white;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        position: relative;
        z-index: 1000;
        transition: all 0.3s ease;
      ">
        🚛
        <div style="
          position: absolute;
          top: -3px;
          left: -3px;
          right: -3px;
          bottom: -3px;
          border: 2px solid #f97316;
          border-radius: 50%;
          opacity: 0.6;
          animation: pulse 2s infinite;
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 0.3; }
          100% { transform: scale(1); opacity: 0.6; }
        }
        .truck-icon:hover {
          transform: scale(1.1);
        }
      </style>
    `,
    className: 'truck-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  })

  // Initially position at first breadcrumb
  const firstPoint = breadcrumbs.value[0]
  truckMarker = L.marker([firstPoint.latitude, firstPoint.longitude], {
    icon: truckIcon,
    zIndexOffset: 1000
  }).addTo(map)

  // Add popup with truck info
  truckMarker.bindPopup(`
    <div style="text-align: center;">
      <strong>🚛 Delivery Truck</strong><br>
      <small>Click play to watch the route!</small>
    </div>
  `)

  // Hide truck initially
  truckMarker.setOpacity(isPlaying.value ? 1 : 0.3)
}

const fitRoute = () => {
  if (!map || !breadcrumbs.value.length) return

  const bounds = L.latLngBounds(
    breadcrumbs.value.map(b => [b.latitude, b.longitude])
  )
  map.fitBounds(bounds, { padding: [20, 20] })
}

const toggleSpeed = () => {
  showSpeed.value = !showSpeed.value
  drawRoute()
}

const toggleGeofences = () => {
  showGeofences.value = !showGeofences.value
  drawRoute()
}

const playRoute = () => {
  if (isPlaying.value) {
    clearInterval(playInterval)
    isPlaying.value = false
    // Fade truck when paused
    if (truckMarker) {
      truckMarker.setOpacity(0.3)
    }
  } else {
    isPlaying.value = true
    // Show truck prominently when playing
    if (truckMarker) {
      truckMarker.setOpacity(1)
    }
    playInterval = setInterval(() => {
      if (currentFrame.value < breadcrumbs.value.length - 1) {
        currentFrame.value++
        updateMapToFrame()
      } else {
        clearInterval(playInterval)
        isPlaying.value = false
        // Fade truck when playback ends
        if (truckMarker) {
          truckMarker.setOpacity(0.3)
        }
      }
    }, 200) // 200ms per frame
  }
}

const updateMapToFrame = () => {
  if (!map || !breadcrumbs.value[currentFrame.value]) return

  const point = breadcrumbs.value[currentFrame.value]
  
  // Move truck marker to current position
  if (truckMarker) {
    truckMarker.setLatLng([point.latitude, point.longitude])
    
    // Update truck popup with current info
    const speed = point.speed_kmh ? `${point.speed_kmh.toFixed(1)} km/h` : 'Unknown'
    const time = formatTime(point.timestamp)
    truckMarker.setPopupContent(`
      <div style="text-align: center;">
        <strong>🚛 Delivery Truck</strong><br>
        <div style="font-size: 12px; margin-top: 4px;">
          🕐 ${time}<br>
          🚗 ${speed}<br>
          📍 Point ${currentFrame.value + 1} of ${breadcrumbs.value.length}
        </div>
      </div>
    `)
  }
  
  // Center map on truck during playback
  if (isPlaying.value) {
    map.setView([point.latitude, point.longitude], Math.max(map.getZoom(), 15))
  }
  
  // Highlight current point
  hoveredPoint.value = point
}

const getActionTitle = (actionType) => {
  const titles = {
    start_route: 'Started Route',
    arrived: 'Arrived at Drop-off', 
    delivered: 'Delivered'
  }
  return titles[actionType] || actionType
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(async () => {
  await fetchRouteData()
  
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
})

onUnmounted(() => {
  if (playInterval) clearInterval(playInterval)
  if (truckMarker && map) {
    map.removeLayer(truckMarker)
    truckMarker = null
  }
  if (map) map.remove()
})

// Watch for data changes
watch([showSpeed, showGeofences], drawRoute)

// Watch for timeline changes to move truck
watch(currentFrame, (newFrame) => {
  if (!isPlaying.value && truckMarker && breadcrumbs.value[newFrame]) {
    const point = breadcrumbs.value[newFrame]
    truckMarker.setLatLng([point.latitude, point.longitude])
    
    // Update opacity based on whether we're playing
    truckMarker.setOpacity(isPlaying.value ? 1 : 0.5)
  }
})
</script>

<style scoped>
/* Ensure map container has proper sizing */
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