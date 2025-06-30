<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-orange-900">
    <!-- Simple Header -->
    <div class="bg-black/20 border-b border-white/10 p-3 flex items-center justify-between">
      <h1 class="text-lg font-bold text-white">📱 Driver</h1>
      <button @click="logout" class="bg-red-600 text-white px-3 py-1 rounded text-sm">
        Logout
      </button>
    </div>

    <!-- GPS Permission Modal -->
    <div v-if="showGpsModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <div class="text-6xl mb-4">📍</div>
        <h2 class="text-2xl font-bold mb-4 text-gray-800">Enable GPS</h2>
        <p class="text-lg text-gray-600 mb-6">We need your location to track deliveries</p>
        <div class="space-y-3">
          <button @click="requestGps" class="w-full bg-blue-600 text-white py-4 rounded-xl text-xl font-medium">
            Enable GPS
          </button>
          <button @click="forceCloseModal" class="w-full bg-gray-300 text-gray-700 py-3 rounded-xl text-lg">
            Skip for Now
          </button>
        </div>
      </div>
    </div>

    <div class="p-4 max-w-md mx-auto space-y-4">
      <!-- COMBINED STATUS - Work + Delivery -->
      <div class="bg-white/10 rounded-xl p-4">
        <!-- Work Status Row -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="text-xl">{{ isWorkSessionActive ? '🟢' : '🔴' }}</div>
            <div>
              <div class="text-white font-bold">{{ isWorkSessionActive ? 'WORKING' : 'OFF WORK' }}</div>
              <div class="text-xs text-gray-300">
                {{ isWorkSessionActive ? getFormattedWorkTime() : 'Clock in to start' }}
              </div>
            </div>
          </div>
          
          <button @click="isWorkSessionActive ? clockOut : clockIn" 
                  :disabled="!canPerformActions && !isWorkSessionActive"
                  class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
            {{ isWorkSessionActive ? 'Clock Out' : 'Clock In' }}
          </button>
        </div>
        
        <!-- Delivery Status Row -->
        <div v-if="isWorkSessionActive" class="flex items-center justify-between pt-3 border-t border-white/10">
          <div class="flex items-center gap-2">
            <div class="text-xl">
              <span v-if="currentWorkflowState === 'IDLE'">😴</span>
              <span v-else-if="currentWorkflowState === 'ROUTE_STARTED'">🚗</span>
              <span v-else-if="currentWorkflowState === 'ARRIVED'">📍</span>
              <span v-else-if="currentWorkflowState === 'DELIVERED'">✅</span>
            </div>
            <div>
              <div class="text-white font-medium text-sm">
                <span v-if="currentWorkflowState === 'IDLE'">Ready</span>
                <span v-else-if="currentWorkflowState === 'ROUTE_STARTED'">Driving</span>
                <span v-else-if="currentWorkflowState === 'ARRIVED'">At Location</span>
                <span v-else-if="currentWorkflowState === 'DELIVERED'">Delivered</span>
              </div>
              <div class="text-xs text-gray-300">
                <span v-if="currentWorkflowState === 'IDLE' && currentTask">
                  {{ getDistanceToDestination() }} to {{ (currentTask.destination_name || 'destination').substring(0, 15) }}...
                </span>
                <span v-else-if="currentWorkflowState === 'ROUTE_STARTED' && currentTask">
                  {{ getDistanceToDestination() }} remaining
                </span>
                <span v-else-if="currentWorkflowState === 'ARRIVED'">Complete delivery</span>
                <span v-else-if="currentWorkflowState === 'DELIVERED'">Ready for next</span>
                <span v-else>No stops assigned</span>
              </div>
            </div>
          </div>
          
          <!-- Mini Progress Dots -->
          <div class="flex gap-1">
            <div class="w-2 h-2 rounded-full" :class="workflowProgress.step >= 1 ? 'bg-blue-500' : 'bg-gray-600'"></div>
            <div class="w-2 h-2 rounded-full" :class="workflowProgress.step >= 2 ? 'bg-blue-500' : 'bg-gray-600'"></div>
            <div class="w-2 h-2 rounded-full" :class="workflowProgress.step >= 3 ? 'bg-green-500' : 'bg-gray-600'"></div>
            <div class="w-2 h-2 rounded-full" :class="workflowProgress.step >= 4 ? 'bg-red-500' : 'bg-gray-600'"></div>
          </div>
        </div>
      </div>

      <!-- COMPACT STOPS (max 3) -->
      <div v-if="todayTasks.length > 0 && isWorkSessionActive" class="bg-white/10 rounded-xl p-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-white font-bold text-sm">📍 Today ({{ completedTasks.length }}/{{ todayTasks.length }})</h3>
          <button v-if="todayTasks.length > 3" 
                  @click="isTaskListExpanded = !isTaskListExpanded"
                  class="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            {{ isTaskListExpanded ? '▲ Less' : '▼ All' }}
          </button>
        </div>
        
        <div class="space-y-1">
          <transition-group name="task-list" tag="div" class="space-y-1">
            <div v-for="(task, index) in (isTaskListExpanded ? todayTasks : todayTasks.slice(0, 3))" 
                 :key="task.id" 
                 class="flex items-center gap-2 py-1 transition-all duration-300">
              <div class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                   :class="[
                     task.status === 'completed' ? 'bg-green-600 text-white' :
                     task.status === 'in_progress' ? 'bg-orange-600 text-white' :
                     'bg-gray-600 text-white'
                   ]">
                {{ index + 1 }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-white text-sm font-medium truncate">
                  {{ task.destination_name || 'Customer' }}
                </div>
              </div>
              <div class="text-lg">
                <span v-if="task.status === 'completed'">✅</span>
                <span v-else-if="task.status === 'in_progress'">🔄</span>
                <span v-else>⏳</span>
              </div>
            </div>
          </transition-group>
        </div>
        
        <!-- Clickable expand/collapse footer -->
        <div v-if="todayTasks.length > 3" class="text-center mt-2">
          <button @click="isTaskListExpanded = !isTaskListExpanded"
                  class="text-xs text-gray-400 hover:text-gray-300 transition-colors py-1 px-2 rounded">
            <span v-if="!isTaskListExpanded">
              +{{ todayTasks.length - 3 }} more stops ▼
            </span>
            <span v-else>
              ▲ Show less
            </span>
          </button>
        </div>
      </div>

      <!-- MAIN ACTION BUTTON - Medium Size -->
      <div v-if="isWorkSessionActive">
        <button
          :disabled="isActionDisabled"
          :class="[
            'w-full p-6 rounded-xl border transition-all duration-200 text-center',
            isActionDisabled
              ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
              : nextAction.variant === 'danger'
              ? 'bg-red-600 border-red-500 hover:bg-red-700 text-white'
              : 'bg-blue-600 border-blue-500 hover:bg-blue-700 text-white'
          ]"
          @click="() => performAction(nextAction.type)"
        >
          <div class="text-3xl mb-2">{{ isLoading && currentAction === nextAction.type ? '⏳' : nextAction.icon }}</div>
          <div class="text-lg font-bold">{{ nextAction.title }}</div>
          <div class="text-sm opacity-80">{{ nextAction.subtitle }}</div>
        </button>
        
        <!-- Warnings -->
        <div v-if="isActionDisabled" class="bg-yellow-600/20 border border-yellow-500 rounded-lg p-3 text-center mt-2">
          <div class="text-yellow-300 text-sm font-medium">
            <span v-if="!isGpsAvailable">📍 GPS Needed - Turn on location</span>
            <span v-else-if="!currentLocation">📍 Getting Location...</span>
            <span v-else-if="gpsAccuracy > 50">📍 GPS Inaccurate - Move to open area</span>
            <span v-else-if="!canStartNewRoute && nextAction.type === 'start_route' && isActiveRoute">
               🚫 Route Already Active - Check delivery status above
            </span>
            <span v-else-if="!canStartNewRoute && nextAction.type === 'start_route' && totalDistance > 0">
               🚫 GPS Tracking Active - {{ (totalDistance/1000).toFixed(1) }}km recorded
            </span>
            <span v-else-if="!canStartNewRoute && nextAction.type === 'start_route'">
               🚫 Route Already Started - Complete current delivery cycle
            </span>
          </div>
        </div>
      </div>

      <!-- Recent Activity (Compact) -->
      <div v-if="recentLogs.length > 0 && isWorkSessionActive" class="bg-white/5 rounded-lg p-3">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-white font-medium text-sm">Recent</h3>
          <span class="text-xs text-gray-400">{{ recentLogs.length }}</span>
        </div>
        <div class="space-y-1">
          <div v-for="log in recentLogs.slice(0, 2)" :key="log.timestamp" 
               class="flex items-center gap-2 text-sm">
            <span class="text-lg">{{ getActionIcon(log.action_type) }}</span>
            <span class="text-white text-xs">{{ getActionTitle(log.action_type) }}</span>
            <span class="text-gray-400 text-xs ml-auto">{{ formatTime(log.timestamp) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Modal -->
    <ActionModal
      v-if="showActionModal"
      :action-type="currentAction"
      :loading="isLoading"
      @confirm="handleActionConfirm"
      @cancel="showActionModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore'
import { useDriverTracking } from '@/composables/useDriverTracking'
import { useTaskManagement } from '@/composables/useTaskManagement'
import { useSyncManager } from '@/composables/useSyncManager'
import { supabase } from '@/lib/supabase'
import ActionButton from '@/components/driver/ActionButton.vue'
import ActionModal from '@/components/driver/ActionModal.vue'

const router = useRouter()
const userStore = useUserStore()

// Driver tracking composable
const {
  isGpsAvailable,
  currentLocation,
  gpsAccuracy,
  isOnline,
  unsyncedLogs,
  batteryLevel,
  signalStatus,
  appFocused,
  driverId,
  isLoading,
  isActiveRoute,
  currentSpeed,
  totalDistance,
  clients,
  requestGpsPermission,
  startLocationTracking,
  logDeliveryAction,
  syncPendingLogs,
  initializeDriverWithRouteCheck,
  // Work Session functionality
  isWorkSessionActive,
  currentWorkSession,
  sessionStartTime,
  totalWorkedMinutes,
  sessionStats,
  startWorkSession,
  endWorkSession,
  getFormattedWorkTime
} = useDriverTracking()

// Task management composable
const {
  loading: taskLoading,
  todayTasks,
  pendingTasks,
  completedTasks,
  inProgressTasks,
  fetchDriverTasks,
  startTask: startTaskAction,
  completeTask: completeTaskAction,
  navigateToTask,
  getCurrentTask,
  getRouteProgress,
  getTaskTypeIcon,
  isOnline: taskSyncOnline
} = useTaskManagement()

// Sync manager composable for robust offline sync
const {
  syncingStatus,
  pendingSyncCount,
  lastSyncTime,
  syncErrors,
  triggerSync,
  setupAutoSync,
  getSyncStatus
} = useSyncManager()

// Local state
const showGpsModal = ref(false)
const showActionModal = ref(false)
const currentAction = ref('')
const driverName = ref('')
const recentLogs = ref([])
const showAllTasks = ref(false)
const isTaskListExpanded = ref(false)

// Computed
const canPerformActions = computed(() => {
  return isGpsAvailable.value && currentLocation.value && gpsAccuracy.value <= 50
})

const currentTask = computed(() => {
  return getCurrentTask(todayTasks.value)
})

const taskProgress = computed(() => {
  return getRouteProgress(todayTasks.value)
})

// NEW: Simple workflow state machine for 60yo driver
const currentWorkflowState = computed(() => {
  // Get the most recent action from logs
  const latestLog = recentLogs.value[0]
  
  if (!latestLog) {
    return 'IDLE' // No actions yet
  }
  
  // Determine state based on most recent action
  switch (latestLog.action_type) {
    case 'start_route':
      return 'ROUTE_STARTED'
    case 'arrived':
      return 'ARRIVED'
    case 'delivered':
      return 'DELIVERED'
    case 'end_route':
      return 'IDLE'
    default:
      return 'IDLE'
  }
})

const nextAction = computed(() => {
  switch (currentWorkflowState.value) {
    case 'IDLE':
      return {
        type: 'start_route',
        icon: '🚀',
        title: 'Start Route',
        subtitle: 'Begin your delivery route',
        variant: 'default'
      }
    case 'ROUTE_STARTED':
      return {
        type: 'arrived',
        icon: '📍',
        title: 'Arrived at Drop-off',
        subtitle: 'Mark arrival at customer location',
        variant: 'default'
      }
    case 'ARRIVED':
      return {
        type: 'delivered',
        icon: '✅',
        title: 'Delivered',
        subtitle: 'Confirm successful delivery',
        variant: 'default'
      }
    case 'DELIVERED':
      return {
        type: 'end_route',
        icon: '🏁',
        title: 'End Route',
        subtitle: 'Finish route and stop tracking',
        variant: 'danger'
      }
    default:
      return {
        type: 'start_route',
        icon: '🚀',
        title: 'Start Route',
        subtitle: 'Begin your delivery route',
        variant: 'default'
      }
  }
})

// Prevent starting route multiple times - CHECK DATABASE STATE
const canStartNewRoute = computed(() => {
  // If there's already an active route in the database, can't start new one
  if (isActiveRoute.value) {
    console.log('🚫 Cannot start new route - active route exists in database')
    return false
  }
  
  // If we're already collecting GPS breadcrumbs, route is active
  if (currentLocation.value && gpsAccuracy.value <= 50 && totalDistance.value > 0) {
    console.log('🚫 Cannot start new route - GPS tracking active with distance:', totalDistance.value)
    return false
  }
  
  // Check if we have recent "start_route" action that hasn't been completed
  const recentStart = recentLogs.value.find(log => log.action_type === 'start_route')
  const recentEnd = recentLogs.value.find(log => log.action_type === 'end_route')
  
  if (recentStart && (!recentEnd || new Date(recentStart.timestamp) > new Date(recentEnd.timestamp))) {
    console.log('🚫 Cannot start new route - recent start_route without end_route')
    return false
  }
  
  // Only allow if truly IDLE
  return currentWorkflowState.value === 'IDLE'
})

const isActionDisabled = computed(() => {
  // Always require GPS for any action
  if (!canPerformActions.value) return true
  
  // Special check for start_route - check database state
  if (nextAction.value.type === 'start_route') {
    if (!canStartNewRoute.value) {
      return true
    }
  }
  
  return false
})

const workflowProgress = computed(() => {
  switch (currentWorkflowState.value) {
    case 'IDLE':
      return { step: 1, total: 4, text: 'Ready to start' }
    case 'ROUTE_STARTED':
      return { step: 2, total: 4, text: 'Route in progress' }
    case 'ARRIVED':
      return { step: 3, total: 4, text: 'At drop-off location' }
    case 'DELIVERED':
      return { step: 4, total: 4, text: 'Delivery complete' }
    default:
      return { step: 1, total: 4, text: 'Ready to start' }
  }
})

// Methods
const requestGps = async () => {
  console.log('🔍 Requesting GPS permission...')
  
  try {
    // Add timeout to prevent hanging
    const success = await Promise.race([
      requestGpsPermission(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('GPS request timeout after 20 seconds')), 20000)
      )
    ])
    
    console.log('📍 GPS permission result:', success)
    console.log('📍 isGpsAvailable:', isGpsAvailable.value)
    console.log('📍 currentLocation:', currentLocation.value)
    
    if (success) {
      console.log('✅ GPS permission granted, hiding modal')
      showGpsModal.value = false
      startLocationTracking()
    } else {
      console.log('❌ GPS permission denied')
      alert('❌ GPS permission denied. Please enable location services in your browser settings and try again.')
    }
  } catch (error) {
    console.error('GPS request error:', error)
    
    if (error.message.includes('timeout')) {
      alert('❌ GPS request timed out. Please check your location settings and try the "Skip GPS" option if needed.')
    } else {
      alert(`❌ GPS Error: ${error.message}. Use "Skip GPS" to continue without location.`)
    }
  }
}

const forceCloseModal = () => {
  console.log('⚠️ Force closing GPS modal for testing')
  showGpsModal.value = false
  alert('⚠️ GPS disabled - Actions will be disabled until GPS is enabled')
}

const performAction = (actionType) => {
  if (!canPerformActions.value) {
    alert('GPS location required with accuracy ≤ 50 meters')
    return
  }
  
  currentAction.value = actionType
  showActionModal.value = true
}

const handleActionConfirm = async (data) => {
  try {
    const result = await logDeliveryAction(
      currentAction.value,
      data.note,
      data.photo
    )
    
    if (result.success) {
      // Add to recent logs
      recentLogs.value.unshift(result.data)
      if (recentLogs.value.length > 10) {
        recentLogs.value = recentLogs.value.slice(0, 10)
      }
      
      showActionModal.value = false
      
      // Enhanced success feedback for 60yo driver
      const actionTitle = getActionTitle(currentAction.value)
      const nextStep = getNextStepMessage(currentAction.value)
      
      alert(`✅ ${actionTitle} logged successfully!\n\n${nextStep}`)
      
      // Immediately refresh logs to update workflow state
      loadRecentLogs()
    }
  } catch (error) {
    alert(`❌ Error: ${error.message}`)
  }
}

// Helper function to provide clear next step guidance
const getNextStepMessage = (actionType) => {
  switch (actionType) {
    case 'start_route':
      return '🚗 Drive safely to your first delivery location.\nTap "Arrived at Drop-off" when you reach the customer.'
    case 'arrived':
      return '📦 Complete the delivery process.\nTap "Delivered" when the customer has received their order.'
    case 'delivered':
      return '🎉 Great job! \nTap "End Route" when all deliveries are complete.'
    case 'end_route':
      return '✅ Route completed! You can start a new route when ready.'
    default:
      return 'Continue with your next step.'
  }
}

// Calculate distance to destination
const getDistanceToDestination = () => {
  if (!currentLocation.value || !currentTask.value) {
    return 'Distance unknown'
  }
  
  const task = currentTask.value
  if (!task.destination_lat || !task.destination_lng) {
    return 'Distance unknown'
  }
  
  // Calculate distance using Haversine formula
  const R = 6371 // Earth's radius in kilometers
  const dLat = (task.destination_lat - currentLocation.value.latitude) * Math.PI / 180
  const dLng = (task.destination_lng - currentLocation.value.longitude) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(currentLocation.value.latitude * Math.PI / 180) * 
            Math.cos(task.destination_lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const distance = R * c
  
  // Format distance appropriately
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`
  } else {
    return `${distance.toFixed(1)}km`
  }
}

const logout = async () => {
  try {
    // CRITICAL: Save driver ID before clearing user store
    const currentDriverId = driverId.value
    console.log('🔄 Starting logout for driver:', currentDriverId)
    
    // Stop presence reporting first
    stopPresenceReporting()
    
    // Mark driver as offline BEFORE clearing user
    if (currentDriverId) {
      console.log('👋 Marking driver as offline before logout')
      
      try {
        // Try to update driver_presence table
        const { error: presenceError } = await supabase
          .from('driver_presence')
          .update({
            is_online: false,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('driver_id', currentDriverId)
        
        if (presenceError) {
          console.warn('⚠️ Could not update presence table:', presenceError)
          
          // Fallback: Log offline activity
          await supabase
            .from('delivery_logs')
            .insert({
              driver_id: currentDriverId,
              action_type: 'logout',
              timestamp: new Date().toISOString(),
              note: 'Driver logged out'
            })
          
          console.log('📝 Logged logout activity as fallback')
        } else {
          console.log('✅ Driver marked as offline in presence table')
        }
      } catch (presenceError) {
        console.warn('⚠️ Failed to update presence:', presenceError)
        
        // Fallback: Try logging activity
        try {
          await supabase
            .from('delivery_logs')
            .insert({
              driver_id: currentDriverId,
              action_type: 'logout',
              timestamp: new Date().toISOString(),
              note: 'Driver logged out - presence update failed'
            })
          console.log('📝 Fallback logout activity logged')
        } catch (logError) {
          console.warn('⚠️ Could not log logout activity:', logError)
        }
      }
    } else {
      console.warn('⚠️ No driver ID available for logout cleanup')
    }
    
    // Clean up any tracking intervals or GPS monitoring
    console.log('🧹 Cleaning up tracking resources')
    
    // NOW proceed with normal logout (this clears the user)
    userStore.logout()
    router.push('/login')
    
    console.log('✅ Logout complete')
    
  } catch (error) {
    console.error('❌ Error during logout cleanup:', error)
    // Still proceed with logout even if cleanup fails
    userStore.logout()
    router.push('/login')
  }
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

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  if (diffMins === 0) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  return date.toLocaleDateString()
}

// Format clock time for work session start
const formatClockTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const loadRecentLogs = () => {
  // Load from localStorage for now (could be from Supabase for synced logs)
  const stored = JSON.parse(localStorage.getItem('unsynced_logs') || '[]')
  recentLogs.value = stored.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  
  console.log('📋 Loaded recent logs:', recentLogs.value.length, 'entries')
  console.log('🔄 Current workflow state:', currentWorkflowState.value)
}

// Task Management Methods
const refreshTasks = async () => {
  if (!driverId.value) return
  
  try {
    const today = new Date().toISOString().split('T')[0]
    await fetchDriverTasks(driverId.value, today)
    console.log('📋 Tasks refreshed:', todayTasks.value.length)
  } catch (error) {
    console.error('Error refreshing tasks:', error)
    // Don't show alert for task errors, just log them
  }
}

const startTask = async (task) => {
  if (!canPerformActions.value) {
    alert('GPS location required with accuracy ≤ 50 meters to start task')
    return
  }

  try {
    await startTaskAction(task.id)
    console.log(`✅ Started task: ${task.task_title}`)
  } catch (error) {
    console.error('Error starting task:', error)
    alert(`❌ Failed to start task: ${error.message}`)
  }
}

const completeTask = async (task) => {
  if (!canPerformActions.value) {
    alert('GPS location required with accuracy ≤ 50 meters to complete task')
    return
  }

  const notes = prompt(`Complete task: ${task.task_title}\n\nAdd completion notes (optional):`)
  if (notes === null) return // User cancelled

  try {
    await completeTaskAction(task.id, {
      completion_notes: notes || null,
      completion_location: {
        lat: currentLocation.value.latitude,
        lng: currentLocation.value.longitude,
        accuracy: gpsAccuracy.value
      }
    })
    
    console.log(`✅ Completed task: ${task.task_title}`)
    
    // Check if all tasks are done
    if (completedTasks.value.length === todayTasks.value.length) {
      alert('🎉 All tasks completed! Great work today!')
    }
  } catch (error) {
    console.error('Error completing task:', error)
    alert(`❌ Failed to complete task: ${error.message}`)
  }
}

// Work Session Methods
const clockIn = async () => {
  if (!canPerformActions.value) {
    alert('GPS location required with accuracy ≤ 50 meters to clock in')
    return
  }

  try {
    const result = await startWorkSession()
    if (result.success) {
      alert(`✅ Work session started! Your time is being tracked.`)
      console.log('🕐 Clocked in successfully:', result.sessionId)
    }
  } catch (error) {
    console.error('Clock in error:', error)
    alert(`❌ Failed to clock in: ${error.message}`)
  }
}

const clockOut = async () => {
  if (!canPerformActions.value) {
    alert('GPS location required with accuracy ≤ 50 meters to clock out')
    return
  }

  // Confirm before clocking out
  const confirmClockOut = confirm(`Are you sure you want to clock out?\n\nYour current work time: ${getFormattedWorkTime()}\nThis will end your work session.`)
  
  if (!confirmClockOut) return

  try {
    const result = await endWorkSession()
    if (result.success) {
      alert(`✅ Work session ended!\n\nTotal time worked: ${result.totalHours} hours\n\nGreat job today! 🎉`)
      console.log('🕐 Clocked out successfully:', result.sessionData)
    }
  } catch (error) {
    console.error('Clock out error:', error)
    alert(`❌ Failed to clock out: ${error.message}`)
  }
}

// Driver Presence Reporting
let presenceInterval = null

const startPresenceReporting = async () => {
  if (!driverId.value) {
    console.warn('⚠️ Cannot start presence reporting - no driver ID')
    return
  }
  
  console.log('🟢 Starting presence reporting for driver:', driverId.value)
  
  // Clear any existing interval
  if (presenceInterval) {
    clearInterval(presenceInterval)
  }
  
  // Update presence immediately
  await updateDriverPresence()
  
  // Update presence every 30 seconds
  presenceInterval = setInterval(async () => {
    await updateDriverPresence()
  }, 30000)
  
  console.log('✅ Driver presence reporting started with 30s interval')
}

const updateDriverPresence = async () => {
  if (!driverId.value) {
    console.error('❌ No driver ID available for presence update')
    return
  }
  
  console.log('📡 Updating driver presence for driver:', driverId.value)
  
  try {
    // Use the database function for proper upsert
    const { data: functionData, error: functionError } = await supabase
      .rpc('upsert_driver_presence', {
        p_driver_id: driverId.value,
        p_is_online: true,
        p_device_id: 'web'
      })
    
    if (!functionError) {
      console.log('✅ Driver presence updated via function')
      return
    }
    
    console.warn('⚠️ Database function failed:', functionError.message)
    console.log('Trying direct upsert...')
    
    // Fallback to direct upsert
    const { data: upsertData, error: upsertError } = await supabase
      .from('driver_presence')
      .upsert({
        driver_id: driverId.value,
        is_online: true,
        last_seen: new Date().toISOString(),
        device_id: 'web'
      })
      .select()
    
    if (!upsertError) {
      console.log('✅ Driver presence updated via direct upsert:', upsertData)
      return
    }
    
    console.error('❌ Direct upsert failed:', upsertError.message)
    console.log('Using activity fallback...')
    await updateDriverActivity()
    
  } catch (error) {
    console.error('❌ Unexpected error updating driver presence:', error)
    await updateDriverActivity()
  }
}

const updateDriverActivity = async () => {
  try {
    // Simple activity ping - we can use delivery_logs for this
    await supabase
      .from('delivery_logs')
      .insert({
        driver_id: driverId.value,
        action_type: 'presence_ping',
        timestamp: new Date().toISOString(),
        note: 'Driver online - presence update'
      })
    
    console.log('📡 Driver activity logged (presence ping)')
  } catch (error) {
    console.error('❌ Error logging driver activity:', error)
  }
}

const stopPresenceReporting = () => {
  if (presenceInterval) {
    clearInterval(presenceInterval)
    presenceInterval = null
    console.log('🛑 Driver presence reporting stopped')
  }
}

// Initialize
onMounted(async () => {
  try {
    // Check if user is still authenticated before initializing
    if (!userStore.user || !userStore.user.id) {
      console.log('📍 No authenticated user found during mount - redirecting to login')
      router.push('/login')
      return
    }

    // Initialize driver profile
    await initializeDriverWithRouteCheck(userStore.user.id)
    
    // Get driver name
    driverName.value = userStore.user.email
    
    // Load recent logs
    loadRecentLogs()
    
    // Load today's tasks
    await refreshTasks()
    
    // Setup robust sync manager
    setupAutoSync()
    console.log('🔄 Sync manager initialized')
    
    // Start presence reporting (KEY ADDITION!)
    await startPresenceReporting()
    
    // Check GPS permission
    const hasGps = await requestGpsPermission()
    if (!hasGps) {
      showGpsModal.value = true
    } else {
      startLocationTracking()
    }
  } catch (error) {
    console.error('Driver initialization error:', error)
    
    // Only show error if user is still logged in (avoid showing during logout)
    if (userStore.user && userStore.user.id) {
      alert('❌ Driver profile not found. Please contact admin.')
      logout()
    } else {
      console.log('📍 User logged out during initialization - skipping error alert')
      router.push('/login')
    }
  }
})

// Cleanup when component unmounts
onUnmounted(() => {
  console.log('🧹 DriverDashboard unmounting - cleaning up presence reporting')
  stopPresenceReporting()
})
</script>

<style scoped>
/* Task list transition animations */
.task-list-enter-active,
.task-list-leave-active {
  transition: all 0.3s ease;
}

.task-list-enter-from,
.task-list-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.task-list-enter-to,
.task-list-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* Smooth expand/collapse button hover */
.transition-colors {
  transition: color 0.2s ease;
}
</style> 