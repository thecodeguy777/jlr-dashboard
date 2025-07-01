<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 text-white">
    <!-- Header -->
    <div class="bg-black/30 border-b border-white/10 p-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold mb-2">👻 Ghost Control Center</h1>
          <p class="text-gray-300">Remote driver monitoring and control system</p>
        </div>
        <button @click="refreshData" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
          🔄 Refresh All
        </button>
      </div>
    </div>

    <div class="p-6">
      <!-- Live Alerts -->
      <div v-if="recentNotifications.length > 0" class="mb-6">
        <div class="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4">
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

      <!-- Driver Cards Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div v-for="driver in drivers" :key="driver.id" 
             class="bg-white/10 rounded-2xl p-6 border-2 border-gray-500/50">
          
          <!-- Driver Header -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="text-2xl">👤</div>
              <div>
                <h3 class="text-xl font-bold">{{ driver.name }}</h3>
                <div class="text-sm text-gray-300">{{ driver.phone }}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs text-gray-400">Status</div>
              <div class="text-sm font-medium text-green-400">● Online</div>
            </div>
          </div>

          <!-- Status Grid -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-black/20 rounded-lg p-3">
              <div class="text-xs text-gray-400">Work Status</div>
              <div class="font-medium text-green-400">🟢 Working</div>
            </div>
            <div class="bg-black/20 rounded-lg p-3">
              <div class="text-xs text-gray-400">Movement</div>
              <div class="font-medium">🅿️ Stationary</div>
            </div>
          </div>

          <!-- Ghost Control Actions -->
          <div class="space-y-3">
            <div class="text-sm font-bold text-purple-300 mb-2">👻 Ghost Controls</div>
            
            <!-- Primary Actions -->
            <div class="grid grid-cols-2 gap-2">
              <button @click="sendGhostCommand(driver.id, 'FORCE_CLOCK_IN')"
                      class="bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-xs font-medium">
                🕐 Clock In
              </button>
              
              <button @click="sendGhostCommand(driver.id, 'FORCE_CLOCK_OUT')"
                      class="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-xs font-medium">
                🕐 Clock Out
              </button>
              
              <button @click="startManualTracking(driver.id)"
                      class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-xs font-medium">
                📍 Start Tracking
              </button>
              
              <button @click="showMessageModal(driver)"
                      class="bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded text-xs font-medium">
                💬 Message
              </button>
            </div>

            <!-- Quick Actions -->
            <div class="grid grid-cols-3 gap-2">
              <button @click="sendGhostCommand(driver.id, 'FORCE_START_ROUTE')"
                      class="bg-orange-600 hover:bg-orange-700 text-white py-2 px-2 rounded text-xs">
                🚀 Route
              </button>
              
              <button @click="sendGhostCommand(driver.id, 'FORCE_MARK_DELIVERED')"
                      class="bg-green-600 hover:bg-green-700 text-white py-2 px-2 rounded text-xs">
                ✅ Delivered
              </button>
              
              <button @click="initiateCall(driver)"
                      class="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-2 rounded text-xs">
                📞 Call
              </button>
            </div>

            <!-- Emergency Override -->
            <button @click="emergencyOverride(driver)"
                    class="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded text-xs font-medium">
              🚨 EMERGENCY OVERRIDE
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Message Modal -->
    <div v-if="showingMessageModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-800 rounded-2xl p-6 max-w-md w-full">
        <h3 class="text-xl font-bold mb-4">💬 Send Message to {{ selectedDriver?.name }}</h3>
        
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
            Send
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
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

// State
const drivers = ref([])
const recentNotifications = ref([])
const loading = ref(false)

// Modal state
const showingMessageModal = ref(false)
const selectedDriver = ref(null)
const messageText = ref('')

// Methods
const fetchDrivers = async () => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('is_active', true)
    
    if (error) throw error
    drivers.value = data || []
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
      .limit(5)
    
    if (error) throw error
    
    recentNotifications.value = data?.map(n => ({
      ...n,
      driver_name: n.driver?.name || 'Unknown'
    })) || []
  } catch (error) {
    console.error('Error fetching notifications:', error)
  }
}

const sendGhostCommand = async (driverId, action) => {
  try {
    console.log(`👻 Sending ghost command: ${action} to driver ${driverId}`)
    
    const { error } = await supabase
      .from('ghost_commands')
      .insert({
        driver_id: driverId,
        action: action,
        reason: `admin_manual_${action.toLowerCase()}`,
        created_at: new Date().toISOString()
      })
    
    if (error) throw error
    
    alert(`✅ Ghost command sent: ${action}`)
    
  } catch (error) {
    console.error('Error sending ghost command:', error)
    alert(`❌ Failed to send command: ${error.message}`)
  }
}

const startManualTracking = async (driverId) => {
  try {
    // Insert auto-tracking session
    const { error: sessionError } = await supabase
      .from('auto_tracking_sessions')
      .insert({
        driver_id: driverId,
        trigger: 'admin_activated',
        metadata: { admin_initiated: true },
        start_time: new Date().toISOString()
      })
    
    if (sessionError) throw sessionError
    
    // Send ghost command to start tracking
    await sendGhostCommand(driverId, 'FORCE_START_ROUTE')
    
  } catch (error) {
    console.error('Error starting manual tracking:', error)
    alert(`❌ Failed to start tracking: ${error.message}`)
  }
}

const showMessageModal = (driver) => {
  selectedDriver.value = driver
  showingMessageModal.value = true
  messageText.value = ''
}

const closeMessageModal = () => {
  showingMessageModal.value = false
  selectedDriver.value = null
  messageText.value = ''
}

const sendMessage = async () => {
  if (!messageText.value.trim() || !selectedDriver.value) return
  
  try {
    await sendGhostCommand(selectedDriver.value.id, 'SEND_MESSAGE')
    
    // Also store message in ghost_commands
    await supabase
      .from('ghost_commands')
      .update({ message: messageText.value })
      .eq('driver_id', selectedDriver.value.id)
      .eq('action', 'SEND_MESSAGE')
      .order('created_at', { ascending: false })
      .limit(1)
    
    closeMessageModal()
    
  } catch (error) {
    console.error('Error sending message:', error)
    alert(`❌ Failed to send message: ${error.message}`)
  }
}

const emergencyOverride = async (driver) => {
  const confirm = window.confirm(
    `🚨 EMERGENCY OVERRIDE for ${driver.name}\n\nThis will activate full remote control.\n\nContinue?`
  )
  
  if (!confirm) return
  
  try {
    await startManualTracking(driver.id)
    await sendGhostCommand(driver.id, 'SEND_MESSAGE')
    
    alert('🚨 Emergency override activated!')
    
  } catch (error) {
    console.error('Error activating emergency override:', error)
    alert(`❌ Failed to activate override: ${error.message}`)
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
      fetchDrivers(),
      fetchRecentNotifications()
    ])
  } finally {
    loading.value = false
  }
}

// Helper functions
const getNotificationIcon = (type) => {
  const icons = {
    'MOVEMENT_DETECTED': '🚗',
    'MOVEMENT_STOPPED': '🅿️',
    'AUTO_TRACKING_STARTED': '🔄',
    'AUTO_TRACKING_STOPPED': '🛑',
    'AUTO_TIMEOUT_TRIGGERED': '⏰'
  }
  return icons[type] || '📢'
}

const getNotificationMessage = (notification) => {
  const messages = {
    'MOVEMENT_DETECTED': 'Started moving',
    'MOVEMENT_STOPPED': 'Stopped moving',
    'AUTO_TRACKING_STARTED': 'Auto-tracking activated',
    'AUTO_TRACKING_STOPPED': 'Auto-tracking ended',
    'AUTO_TIMEOUT_TRIGGERED': 'Auto-timeout triggered'
  }
  return messages[notification.type] || 'New notification'
}

const formatTime = (timestamp) => {
  if (!timestamp) return 'Never'
  
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  return `${Math.floor(diffMins / 60)}h ago`
}

// Initialize
onMounted(() => {
  refreshData()
  
  // Auto-refresh every 30 seconds
  setInterval(refreshData, 30000)
})
</script> 