<template>
  <div class="bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 min-h-screen text-white">
    <!-- Header -->
    <div class="bg-black/30 border-b border-white/10 p-6">
      <h1 class="text-3xl font-bold mb-2">👻 Ghost Control Center</h1>
      <p class="text-gray-300">Remote driver monitoring and control system</p>
    </div>

    <div class="p-6">
      <!-- Real-time Notifications -->
      <div v-if="recentNotifications.length > 0" class="mb-6">
        <div class="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 mb-4">
          <h3 class="text-lg font-bold text-yellow-300 mb-3">🔔 Live Alerts</h3>
          <div class="space-y-2">
            <div v-for="notification in recentNotifications.slice(0, 3)" :key="notification.id"
                 class="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
              <div class="text-2xl">{{ getNotificationIcon(notification.type) }}</div>
              <div class="flex-1">
                <div class="font-medium">{{ notification.driver_name }}</div>
                <div class="text-sm text-gray-300">{{ getNotificationMessage(notification) }}</div>
              </div>
              <div class="text-xs text-gray-400">{{ formatTime(notification.created_at) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Driver Status Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        <div v-for="driver in driversWithStatus" :key="driver.id" 
             class="bg-white/10 rounded-2xl p-6 border-2"
             :class="getDriverCardClass(driver)">
          
          <!-- Driver Header -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="text-2xl">{{ getDriverStatusIcon(driver) }}</div>
              <div>
                <h3 class="text-xl font-bold">{{ driver.name }}</h3>
                <div class="text-sm text-gray-300">{{ driver.phone }}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs text-gray-400">Last seen</div>
              <div class="text-sm">{{ formatTime(driver.status?.last_activity) }}</div>
            </div>
          </div>

          <!-- Status Indicators -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-black/20 rounded-lg p-3">
              <div class="text-xs text-gray-400">Work Status</div>
              <div class="font-medium">
                {{ driver.status?.work_session_active ? '🟢 Working' : '🔴 Off Work' }}
              </div>
            </div>
            <div class="bg-black/20 rounded-lg p-3">
              <div class="text-xs text-gray-400">Movement</div>
              <div class="font-medium">
                {{ driver.status?.is_moving ? `🚗 ${driver.status.current_speed}km/h` : '🅿️ Stationary' }}
              </div>
            </div>
          </div>

          <!-- Auto-Tracking Status -->
          <div v-if="driver.status?.auto_tracking_active" class="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mb-4">
            <div class="flex items-center gap-2 mb-2">
              <div class="text-sm font-bold text-blue-300">🔄 Auto-Tracking Active</div>
            </div>
            <div class="text-xs text-gray-300">
              Started: {{ formatTime(driver.current_session?.start_time) }}
            </div>
          </div>

          <!-- Ghost Control Status -->
          <div v-if="driver.status?.ghost_control_active" class="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3 mb-4">
            <div class="text-sm font-bold text-purple-300">👻 Ghost Control Active</div>
            <div class="text-xs text-gray-300">Remote control enabled</div>
          </div>

          <!-- Location Info -->
          <div v-if="driver.status?.last_location_lat" class="bg-black/20 rounded-lg p-3 mb-4">
            <div class="text-xs text-gray-400 mb-1">Last Location</div>
            <div class="text-xs font-mono">
              {{ driver.status.last_location_lat.toFixed(6) }}, {{ driver.status.last_location_lng.toFixed(6) }}
            </div>
            <button @click="showOnMap(driver)" class="text-xs text-blue-400 hover:text-blue-300 mt-1">
              🗺️ View on Map
            </button>
          </div>

          <!-- Ghost Control Actions -->
          <div class="space-y-2">
            <div class="text-sm font-bold text-gray-300 mb-2">👻 Ghost Controls</div>
            
            <!-- Primary Actions -->
            <div class="grid grid-cols-2 gap-2">
              <button @click="sendGhostCommand(driver.id, 'FORCE_CLOCK_IN')"
                      :disabled="driver.status?.work_session_active"
                      class="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-3 rounded text-xs font-medium transition-colors">
                🕐 Clock In
              </button>
              
              <button @click="sendGhostCommand(driver.id, 'FORCE_CLOCK_OUT')"
                      :disabled="!driver.status?.work_session_active"
                      class="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-2 px-3 rounded text-xs font-medium transition-colors">
                🕐 Clock Out
              </button>
              
              <button @click="startManualTracking(driver.id)"
                      :disabled="driver.status?.auto_tracking_active"
                      class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-3 rounded text-xs font-medium transition-colors">
                📍 Start Tracking
              </button>
              
              <button @click="showMessageModal(driver)"
                      class="bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded text-xs font-medium transition-colors">
                💬 Send Message
              </button>
            </div>

            <!-- Advanced Actions -->
            <div class="grid grid-cols-3 gap-2 mt-2">
              <button @click="sendGhostCommand(driver.id, 'FORCE_START_ROUTE')"
                      class="bg-orange-600 hover:bg-orange-700 text-white py-2 px-2 rounded text-xs transition-colors">
                🚀 Start Route
              </button>
              
              <button @click="sendGhostCommand(driver.id, 'FORCE_MARK_DELIVERED')"
                      class="bg-green-600 hover:bg-green-700 text-white py-2 px-2 rounded text-xs transition-colors">
                ✅ Mark Delivered
              </button>
              
              <button @click="initiateCall(driver)"
                      class="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-2 rounded text-xs transition-colors">
                📞 Call
              </button>
            </div>

            <!-- Emergency Actions -->
            <div class="border-t border-white/10 pt-2 mt-2">
              <button @click="emergencyOverride(driver)"
                      class="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded text-xs font-medium transition-colors">
                🚨 EMERGENCY OVERRIDE
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Auto-Tracking Sessions -->
      <div class="bg-white/5 rounded-2xl p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-bold">🔄 Active Auto-Tracking Sessions</h2>
          <button @click="refreshData" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
            🔄 Refresh
          </button>
        </div>
        
        <div v-if="activeTrackingSessions.length === 0" class="text-center py-8 text-gray-400">
          No active auto-tracking sessions
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="border-b border-white/10">
              <tr>
                <th class="text-left p-3">Driver</th>
                <th class="text-left p-3">Trigger</th>
                <th class="text-left p-3">Started</th>
                <th class="text-left p-3">Duration</th>
                <th class="text-left p-3">Distance</th>
                <th class="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="session in activeTrackingSessions" :key="session.id"
                  class="border-b border-white/5 hover:bg-white/5">
                <td class="p-3">
                  <div class="font-medium">{{ session.driver_name }}</div>
                </td>
                <td class="p-3">
                  <span class="px-2 py-1 rounded text-xs"
                        :class="getTriggerClass(session.trigger)">
                    {{ session.trigger }}
                  </span>
                </td>
                <td class="p-3">{{ formatTime(session.start_time) }}</td>
                <td class="p-3">{{ getDuration(session.start_time) }}</td>
                <td class="p-3">{{ session.total_distance || 0 }}m</td>
                <td class="p-3">
                  <button @click="stopAutoTracking(session.id)"
                          class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs">
                    🛑 Stop
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Ghost Commands -->
      <div class="bg-white/5 rounded-2xl p-6">
        <h2 class="text-2xl font-bold mb-4">👻 Recent Ghost Commands</h2>
        
        <div v-if="recentGhostCommands.length === 0" class="text-center py-8 text-gray-400">
          No recent ghost commands
        </div>
        
        <div v-else class="space-y-3">
          <div v-for="command in recentGhostCommands.slice(0, 10)" :key="command.id"
               class="flex items-center gap-4 p-4 bg-black/20 rounded-lg">
            <div class="text-2xl">{{ getCommandIcon(command.action) }}</div>
            <div class="flex-1">
              <div class="font-medium">{{ command.driver_name }}</div>
              <div class="text-sm text-gray-300">{{ getCommandDescription(command) }}</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-gray-400">{{ formatTime(command.created_at) }}</div>
              <div class="text-xs">
                <span v-if="command.executed" class="text-green-400">✅ Executed</span>
                <span v-else class="text-yellow-400">⏳ Pending</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Message Modal -->
    <div v-if="showingMessageModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-800 rounded-2xl p-6 max-w-md w-full">
        <h3 class="text-xl font-bold mb-4">💬 Send Message to {{ selectedDriver?.name }}</h3>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Message Type</label>
          <select v-model="messageType" class="w-full bg-gray-700 text-white p-3 rounded-lg">
            <option value="general">General Message</option>
            <option value="instruction">Instruction</option>
            <option value="warning">Warning</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Message</label>
          <textarea v-model="messageText" 
                    class="w-full bg-gray-700 text-white p-3 rounded-lg h-24"
                    placeholder="Type your message to the driver..."></textarea>
        </div>
        
        <div class="flex gap-3">
          <button @click="sendMessage" 
                  :disabled="!messageText.trim()"
                  class="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-2 rounded-lg">
            Send Message
          </button>
          <button @click="closeMessageModal" class="px-6 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'

// Reactive state
const driversWithStatus = ref([])
const recentNotifications = ref([])
const activeTrackingSessions = ref([])
const recentGhostCommands = ref([])
const loading = ref(false)

// Modal state
const showingMessageModal = ref(false)
const selectedDriver = ref(null)
const messageType = ref('general')
const messageText = ref('')

// Real-time subscriptions
let notificationsSubscription = null
let driverStatusSubscription = null
let ghostCommandsSubscription = null

// Methods
const fetchDriversWithStatus = async () => {
  try {
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select(`
        *,
        status:driver_status(*),
        current_session:auto_tracking_sessions(*)
      `)
      .eq('is_active', true)
    
    if (driversError) throw driversError
    
    driversWithStatus.value = drivers.map(driver => ({
      ...driver,
      status: driver.status?.[0] || null,
      current_session: driver.current_session?.find(s => !s.end_time) || null
    }))
  } catch (error) {
    console.error('Error fetching drivers:', error)
  }
}

const fetchRecentNotifications = async () => {
  try {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select(`
        *,
        driver:drivers(name)
      `)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) throw error
    
    recentNotifications.value = data.map(n => ({
      ...n,
      driver_name: n.driver?.name || 'Unknown'
    }))
  } catch (error) {
    console.error('Error fetching notifications:', error)
  }
}

const fetchActiveTrackingSessions = async () => {
  try {
    const { data, error } = await supabase
      .from('auto_tracking_sessions')
      .select(`
        *,
        driver:drivers(name)
      `)
      .is('end_time', null)
      .order('start_time', { ascending: false })
    
    if (error) throw error
    
    activeTrackingSessions.value = data.map(s => ({
      ...s,
      driver_name: s.driver?.name || 'Unknown'
    }))
  } catch (error) {
    console.error('Error fetching tracking sessions:', error)
  }
}

const fetchRecentGhostCommands = async () => {
  try {
    const { data, error } = await supabase
      .from('ghost_commands')
      .select(`
        *,
        driver:drivers(name)
      `)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error) throw error
    
    recentGhostCommands.value = data.map(c => ({
      ...c,
      driver_name: c.driver?.name || 'Unknown'
    }))
  } catch (error) {
    console.error('Error fetching ghost commands:', error)
  }
}

const sendGhostCommand = async (driverId, action, additionalData = {}) => {
  try {
    const { error } = await supabase
      .from('ghost_commands')
      .insert({
        driver_id: driverId,
        action: action,
        reason: `admin_manual_${action.toLowerCase()}`,
        ...additionalData
      })
    
    if (error) throw error
    
    console.log(`👻 Ghost command sent: ${action}`)
    
    // Refresh data
    await Promise.all([
      fetchRecentGhostCommands(),
      fetchRecentNotifications()
    ])
    
  } catch (error) {
    console.error('Error sending ghost command:', error)
    alert(`Failed to send ghost command: ${error.message}`)
  }
}

const startManualTracking = async (driverId) => {
  try {
    // Start auto-tracking session
    const { error: sessionError } = await supabase
      .from('auto_tracking_sessions')
      .insert({
        driver_id: driverId,
        trigger: 'admin_activated',
        metadata: {
          admin_initiated: true,
          reason: 'Manual monitoring'
        }
      })
    
    if (sessionError) throw sessionError
    
    // Send ghost command to enable tracking
    await sendGhostCommand(driverId, 'FORCE_START_ROUTE', {
      reason: 'admin_manual_tracking'
    })
    
    console.log('📍 Manual tracking started')
    await refreshData()
    
  } catch (error) {
    console.error('Error starting manual tracking:', error)
    alert(`Failed to start tracking: ${error.message}`)
  }
}

const showMessageModal = (driver) => {
  selectedDriver.value = driver
  showingMessageModal.value = true
  messageText.value = ''
  messageType.value = 'general'
}

const closeMessageModal = () => {
  showingMessageModal.value = false
  selectedDriver.value = null
  messageText.value = ''
}

const sendMessage = async () => {
  if (!messageText.value.trim() || !selectedDriver.value) return
  
  try {
    await sendGhostCommand(selectedDriver.value.id, 'SEND_MESSAGE', {
      message: messageText.value,
      message_type: messageType.value
    })
    
    closeMessageModal()
    
  } catch (error) {
    console.error('Error sending message:', error)
    alert(`Failed to send message: ${error.message}`)
  }
}

const emergencyOverride = async (driver) => {
  const confirm = window.confirm(
    `🚨 EMERGENCY OVERRIDE for ${driver.name}\n\nThis will:\n- Force activate GPS tracking\n- Enable full ghost control\n- Send emergency alert\n\nContinue?`
  )
  
  if (!confirm) return
  
  try {
    // Start emergency tracking
    await startManualTracking(driver.id)
    
    // Send emergency message
    await sendGhostCommand(driver.id, 'SEND_MESSAGE', {
      message: '🚨 EMERGENCY: Admin has activated emergency override. Please call the office immediately.',
      message_type: 'emergency'
    })
    
    console.log('🚨 Emergency override activated')
    
  } catch (error) {
    console.error('Error activating emergency override:', error)
    alert(`Failed to activate emergency override: ${error.message}`)
  }
}

const stopAutoTracking = async (sessionId) => {
  try {
    const { error } = await supabase
      .from('auto_tracking_sessions')
      .update({
        end_time: new Date().toISOString()
      })
      .eq('id', sessionId)
    
    if (error) throw error
    
    console.log('🛑 Auto-tracking stopped')
    await refreshData()
    
  } catch (error) {
    console.error('Error stopping auto-tracking:', error)
  }
}

const showOnMap = (driver) => {
  if (driver.status?.last_location_lat && driver.status?.last_location_lng) {
    const url = `https://www.google.com/maps?q=${driver.status.last_location_lat},${driver.status.last_location_lng}`
    window.open(url, '_blank')
  }
}

const initiateCall = (driver) => {
  if (driver.phone) {
    window.open(`tel:${driver.phone}`)
  }
}

const refreshData = async () => {
  loading.value = true
  try {
    await Promise.all([
      fetchDriversWithStatus(),
      fetchRecentNotifications(),
      fetchActiveTrackingSessions(),
      fetchRecentGhostCommands()
    ])
  } finally {
    loading.value = false
  }
}

// Helper functions
const getDriverStatusIcon = (driver) => {
  if (driver.status?.auto_tracking_active) return '🔄'
  if (driver.status?.ghost_control_active) return '👻'
  if (driver.status?.is_moving) return '🚗'
  if (driver.status?.work_session_active) return '🟢'
  return '🔴'
}

const getDriverCardClass = (driver) => {
  if (driver.status?.auto_tracking_active) return 'border-blue-500/50 bg-blue-500/10'
  if (driver.status?.ghost_control_active) return 'border-purple-500/50 bg-purple-500/10'
  if (driver.status?.is_moving) return 'border-orange-500/50 bg-orange-500/10'
  if (driver.status?.work_session_active) return 'border-green-500/50 bg-green-500/10'
  return 'border-gray-500/50'
}

const getNotificationIcon = (type) => {
  const icons = {
    'MOVEMENT_DETECTED': '🚗',
    'MOVEMENT_STOPPED': '🅿️',
    'AUTO_TRACKING_STARTED': '🔄',
    'AUTO_TRACKING_STOPPED': '🛑',
    'AUTO_TIMEOUT_TRIGGERED': '⏰',
    'GHOST_COMMAND_EXECUTED': '👻'
  }
  return icons[type] || '📢'
}

const getNotificationMessage = (notification) => {
  const messages = {
    'MOVEMENT_DETECTED': 'Started moving',
    'MOVEMENT_STOPPED': 'Stopped moving',
    'AUTO_TRACKING_STARTED': 'Auto-tracking activated',
    'AUTO_TRACKING_STOPPED': 'Auto-tracking ended',
    'AUTO_TIMEOUT_TRIGGERED': 'Auto-timeout triggered',
    'GHOST_COMMAND_EXECUTED': 'Ghost command executed'
  }
  return messages[notification.type] || 'Unknown notification'
}

const getTriggerClass = (trigger) => {
  const classes = {
    'movement_detected': 'bg-orange-500/20 text-orange-300',
    'admin_activated': 'bg-blue-500/20 text-blue-300',
    'emergency_route': 'bg-red-500/20 text-red-300',
    'timeout_triggered': 'bg-yellow-500/20 text-yellow-300'
  }
  return classes[trigger] || 'bg-gray-500/20 text-gray-300'
}

const getCommandIcon = (action) => {
  const icons = {
    'FORCE_CLOCK_IN': '🕐',
    'FORCE_CLOCK_OUT': '🕐',
    'FORCE_START_ROUTE': '🚀',
    'FORCE_MARK_DELIVERED': '✅',
    'SEND_MESSAGE': '💬',
    'OPEN_MAPS': '🗺️',
    'CALL_ADMIN': '📞'
  }
  return icons[action] || '👻'
}

const getCommandDescription = (command) => {
  const descriptions = {
    'FORCE_CLOCK_IN': 'Forced clock in',
    'FORCE_CLOCK_OUT': 'Forced clock out',
    'FORCE_START_ROUTE': 'Forced route start',
    'FORCE_MARK_DELIVERED': 'Forced delivery completion',
    'SEND_MESSAGE': `Sent message: "${command.message}"`,
    'OPEN_MAPS': 'Opened maps',
    'CALL_ADMIN': 'Requested admin call'
  }
  return descriptions[command.action] || command.action
}

const formatTime = (timestamp) => {
  if (!timestamp) return 'Never'
  
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  return date.toLocaleDateString()
}

const getDuration = (startTime) => {
  if (!startTime) return '0m'
  
  const start = new Date(startTime)
  const now = new Date()
  const diffMins = Math.floor((now - start) / (1000 * 60))
  
  if (diffMins < 60) return `${diffMins}m`
  return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`
}

// Setup real-time subscriptions
const setupRealtimeSubscriptions = () => {
  // Subscribe to driver status changes
  driverStatusSubscription = supabase
    .channel('driver-status-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'driver_status'
    }, () => {
      fetchDriversWithStatus()
    })
    .subscribe()
  
  // Subscribe to new notifications
  notificationsSubscription = supabase
    .channel('admin-notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'admin_notifications'
    }, () => {
      fetchRecentNotifications()
    })
    .subscribe()
  
  // Subscribe to ghost commands
  ghostCommandsSubscription = supabase
    .channel('ghost-commands')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'ghost_commands'
    }, () => {
      fetchRecentGhostCommands()
    })
    .subscribe()
}

// Initialize
onMounted(() => {
  refreshData()
  setupRealtimeSubscriptions()
  
  // Auto-refresh every 30 seconds
  setInterval(refreshData, 30000)
})

onUnmounted(() => {
  if (notificationsSubscription) supabase.removeChannel(notificationsSubscription)
  if (driverStatusSubscription) supabase.removeChannel(driverStatusSubscription)
  if (ghostCommandsSubscription) supabase.removeChannel(ghostCommandsSubscription)
})
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
</style> 