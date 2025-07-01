<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-orange-900">
    <!-- Simple Header -->
    <div class="bg-black/20 border-b border-white/10 p-4 flex items-center justify-between">
      <h1 class="text-xl font-bold text-white">📱 Driver App</h1>
      <button @click="logout" class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
        Emergency Logout
      </button>
    </div>

    <!-- GPS & Tracking Status Cards -->
    <div class="mx-4 mb-4 space-y-2">
      <!-- GPS Status -->
      <div v-if="!isGpsAvailable && isWorkSessionActive" class="bg-yellow-600/20 border border-yellow-500/30 rounded-lg p-3">
        <div class="flex items-center gap-2">
          <div class="animate-pulse">📍</div>
          <div class="text-sm text-yellow-200">Getting your location... This helps track your work accurately.</div>
        </div>
      </div>

      <!-- Movement Detection Status -->
      <div v-if="isWorkSessionActive" class="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="text-lg">{{ getTrackingIcon() }}</div>
            <div>
              <div class="text-sm font-medium text-blue-200">{{ getTrackingStatus() }}</div>
              <div class="text-xs text-blue-300">{{ getTrackingDetails() }}</div>
            </div>
          </div>
          <div v-if="currentSpeed > 0" class="text-right">
            <div class="text-sm font-bold text-blue-200">{{ Math.round(currentSpeed) }} km/h</div>
            <div class="text-xs text-blue-300">Current Speed</div>
          </div>
        </div>
      </div>
    </div>

    <div class="p-4 max-w-md mx-auto space-y-4">
      <!-- SIMPLIFIED MASTER STATUS CARD -->
      <div class="bg-white/10 rounded-2xl p-8 text-center">
        <!-- Status Icon & Text -->
        <div class="text-8xl mb-4">{{ getStatusIcon() }}</div>
        <div class="text-2xl font-bold text-white mb-2">{{ getStatusText() }}</div>
        <div class="text-gray-300 mb-6">{{ getStatusSubtext() }}</div>
        
        <!-- Work Time (when working) -->
        <div v-if="isWorkSessionActive" class="bg-white/10 rounded-lg p-3 mb-6">
          <div class="text-sm text-gray-300">Work Time Today</div>
          <div class="text-2xl font-bold text-orange-400">{{ getFormattedWorkTime() }}</div>
        </div>
        
        <!-- PRIMARY ACTION BUTTON -->
        <button @click="primaryAction" 
                :class="getPrimaryButtonClass()"
                class="w-full py-4 rounded-xl text-xl font-bold transition-colors">
          {{ getPrimaryButtonText() }}
        </button>
        
        <!-- Simple Progress (when working) -->
        <div v-if="isWorkSessionActive && todayTasks.length > 0" class="mt-4 text-sm text-gray-400">
          📦 {{ completedTasks.length }} of {{ todayTasks.length }} deliveries completed
        </div>
      </div>

      <!-- MAIN ACTION SECTION (when working) -->
      <div v-if="isWorkSessionActive">
        <!-- Welcome Message for New Shift -->
        <div v-if="todayTasks.length === 0" class="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-8 text-center">
          <div class="text-5xl mb-4">👋</div>
          <div class="text-2xl font-bold text-white mb-3">Welcome to Your Shift!</div>
          <div class="text-blue-200 mb-6 leading-relaxed">
            You're all clocked in and ready to go.<br/>
            New delivery tasks will appear here automatically.
          </div>
          <div class="bg-white/10 rounded-lg p-4 mb-4">
            <div class="text-sm text-gray-300 mb-2">🕐 Shift started at {{ formatShiftStartTime() }}</div>
            <div class="text-sm text-gray-300">📱 Keep this app open for task notifications</div>
          </div>
          <button @click="refreshTasks" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
            🔄 Check for Tasks
          </button>
        </div>

        <!-- SIMPLIFIED: No redundant task cards - main button handles everything -->
      </div>



      <!-- TASK LIST (when working and has tasks) -->
      <div v-if="todayTasks.length > 0 && isWorkSessionActive" class="bg-white/5 rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-white font-bold text-sm">📍 Today's Deliveries</h3>
          <button v-if="todayTasks.length > 3" 
                  @click="isTaskListExpanded = !isTaskListExpanded"
                  class="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            {{ isTaskListExpanded ? '▲ Less' : '▼ All' }}
          </button>
        </div>
        
        <div class="space-y-2">
          <div v-for="(task, index) in getVisibleTasks()" :key="task.id" 
               class="flex items-center gap-3 p-3 rounded-lg"
               :class="getTaskRowClass(task)">
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                 :class="getTaskIconClass(task)">
              {{ index + 1 }}
            </div>
            <div class="flex-1">
              <div class="text-white text-sm font-medium">{{ task.destination_name || 'Customer' }}</div>
              <div class="text-xs text-gray-400">{{ task.destination_address || task.task_title }}</div>
            </div>
            <div class="text-lg">{{ getTaskStatusIcon(task) }}</div>
          </div>
        </div>
        
        <div v-if="todayTasks.length > 3 && !isTaskListExpanded" class="text-center mt-2">
          <button @click="isTaskListExpanded = true" class="text-xs text-gray-400">
            +{{ todayTasks.length - 3 }} more deliveries
          </button>
        </div>
      </div>
    </div>
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

const router = useRouter()
const userStore = useUserStore()

// Driver tracking composable
const {
  isGpsAvailable,
  currentLocation,
  gpsAccuracy,
  isOnline,
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
  getQuickGpsLocation,
  startLocationTracking,
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
  loadActiveWorkSession,
  getFormattedWorkTime,
  // Movement detection & tracking
  isMoving,
  autoTrackingMode,
  trackingTrigger,
  // Ghost control functionality
  connectToGhostControl,
  enableGhostControl
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
const driverName = ref('')
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

// SIMPLIFIED UX - Single Action Logic
const getStatusIcon = () => {
  if (!isWorkSessionActive.value) return '🔴'
  if (currentTask.value?.status === 'in_progress') return '🚚'
  if (todayTasks.value.length === 0) return '⏳'
  if (completedTasks.value.length === todayTasks.value.length) return '🎉'
  return '🟢'
}

const getStatusText = () => {
  if (!isWorkSessionActive.value) return 'Ready to Start Work'
  if (currentTask.value?.status === 'in_progress') return 'On Delivery'
  if (todayTasks.value.length === 0) return 'Waiting for Tasks'
  if (completedTasks.value.length === todayTasks.value.length) return 'All Done!'
  return 'Working'
}

const getStatusSubtext = () => {
  if (!isWorkSessionActive.value) return 'Tap the button below to clock in'
  if (currentTask.value?.status === 'in_progress') return `Delivering to ${currentTask.value.destination_name || 'customer'}`
  if (todayTasks.value.length === 0) return 'New tasks will appear here automatically'
  if (completedTasks.value.length === todayTasks.value.length) return 'Great work today! Ready to clock out'
  if (currentTask.value) return `Next: ${currentTask.value.destination_name || 'delivery'}`
  return 'Keep up the great work!'
}

const getPrimaryButtonText = () => {
  if (!isWorkSessionActive.value) return '🕐 START WORK'
  if (currentTask.value?.status === 'pending') return '🚀 START DELIVERY'
  if (currentTask.value?.status === 'in_progress') return '✅ MARK DELIVERED'
  if (completedTasks.value.length === todayTasks.value.length) return '🕐 END WORK'
  return '🕐 END WORK'
}

const getPrimaryButtonClass = () => {
  if (!isWorkSessionActive.value) return 'bg-green-600 hover:bg-green-700 text-white'
  if (currentTask.value?.status === 'pending') return 'bg-blue-600 hover:bg-blue-700 text-white'
  if (currentTask.value?.status === 'in_progress') return 'bg-orange-600 hover:bg-orange-700 text-white'
  return 'bg-red-600 hover:bg-red-700 text-white'
}

const primaryAction = async () => {
  if (!isWorkSessionActive.value) {
    await clockIn()
  } else if (currentTask.value?.status === 'pending') {
    await startTask(currentTask.value)
  } else if (currentTask.value?.status === 'in_progress') {
    await completeTask(currentTask.value)
  } else {
    await clockOut()
  }
}

// Movement Detection Status Display
const getTrackingIcon = () => {
  if (isMoving.value) return '🚶‍♂️'
  if (isActiveRoute.value) return '📍'
  if (autoTrackingMode.value) return '🎯'
  return '⏸️'
}

const getTrackingStatus = () => {
  if (isMoving.value) return 'Movement Detected'
  if (isActiveRoute.value) return 'GPS Tracking Active'
  if (autoTrackingMode.value) return 'Auto-Tracking On'
  return 'Tracking Standby'
}

const getTrackingDetails = () => {
  if (isMoving.value) return `Speed: ${Math.round(currentSpeed.value || 0)} km/h • Logging every 30s`
  if (isActiveRoute.value) return 'Location logged every 30 seconds'
  if (trackingTrigger.value) return `Triggered by: ${trackingTrigger.value}`
  return 'Ready to track movement'
}

const canEndWorkDay = () => {
  return isWorkSessionActive.value && (todayTasks.value.length === 0 || completedTasks.value.length === todayTasks.value.length)
}

const formatShiftStartTime = () => {
  if (!sessionStartTime.value) return ''
  const date = new Date(sessionStartTime.value)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const getTaskRowClass = (task) => {
  if (task.status === 'completed') return 'bg-green-500/10 border border-green-500/20'
  if (task.status === 'in_progress') return 'bg-orange-500/10 border border-orange-500/20'
  if (task.id === currentTask.value?.id) return 'bg-blue-500/10 border border-blue-500/20'
  return 'bg-white/5'
}

const getTaskIconClass = (task) => {
  if (task.status === 'completed') return 'bg-green-600'
  if (task.status === 'in_progress') return 'bg-orange-600'
  if (task.id === currentTask.value?.id) return 'bg-blue-600'
  return 'bg-gray-600'
}

const getTaskStatusIcon = (task) => {
  if (task.status === 'completed') return '✅'
  if (task.status === 'in_progress') return '🔄'
  if (task.id === currentTask.value?.id) return '🎯'
  return '⏳'
}

const getVisibleTasks = () => {
  if (isTaskListExpanded.value) {
    return todayTasks.value
  }
  return todayTasks.value.slice(0, 3)
}

// SIMPLIFIED GPS - No blocking modals
const initializeGPS = async () => {
  try {
    console.log('📍 Requesting GPS permission...')
    const hasGps = await requestGpsPermission()
    if (hasGps) {
      startLocationTracking()
      console.log('✅ GPS enabled successfully')
    } else {
      console.log('⚠️ GPS not available - continuing without location')
    }
  } catch (error) {
    console.warn('📍 GPS initialization failed:', error.message)
    console.log('⚠️ Continuing without GPS - location features limited')
  }
}

const logout = async () => {
  try {
    // Save driver ID before clearing user store
    const currentDriverId = driverId.value
    
    // Stop presence reporting first
    stopPresenceReporting()
    
    // Mark driver as offline BEFORE clearing user
    if (currentDriverId) {
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
          console.warn('Could not update driver presence:', presenceError)
        }
      } catch (presenceError) {
        console.warn('Could not update driver presence:', presenceError)
      }
    }
    
    // CLEAR ALL LOCALSTORAGE - Fix PWA bugs
    localStorage.clear()
    
    // Proceed with normal logout
    userStore.logout()
    router.push('/login')
    
  } catch (error) {
    console.error('Error during logout cleanup:', error)
    // Still proceed with logout even if cleanup fails
    
    // Always clear localStorage even if there's an error
    try {
      localStorage.clear()
    } catch (storageError) {
      console.warn('Could not clear localStorage:', storageError)
    }
    
    userStore.logout()
    router.push('/login')
  }
}

// Task Management Methods
const refreshTasks = async () => {
  if (!driverId.value) return
  
  try {
    const today = new Date().toISOString().split('T')[0]
    await fetchDriverTasks(driverId.value, today)
  } catch (error) {
    console.error('Error refreshing tasks:', error)
    alert('❌ Failed to refresh tasks. Please try again.')
  }
}

const startTask = async (task) => {
  if (!canPerformActions.value) {
    alert('GPS location required with accuracy ≤ 50 meters to start task')
    return
  }

  try {
    await startTaskAction(task.id)
    alert(`✅ Started delivery to ${task.destination_name || 'customer'}`)
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

  const notes = prompt(`Complete delivery to ${task.destination_name || 'customer'}\n\nAdd delivery notes (optional):`)
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
    
    alert(`✅ Delivery completed successfully!`)
    
    // Check if all tasks are done
    if (completedTasks.value.length === todayTasks.value.length) {
      alert('🎉 All deliveries completed! Great work today!')
    }
  } catch (error) {
    console.error('Error completing task:', error)
    alert(`❌ Failed to complete task: ${error.message}`)
  }
}

// SIMPLIFIED Work Session Methods
const clockIn = async () => {
  try {
    console.log('🕐 Starting work session...')
    
    // Try to get GPS quickly but don't block on it
    if (!currentLocation.value) {
      await getQuickGpsLocation().catch(() => {
        console.log('📍 GPS not available for clock-in, continuing anyway')
      })
    }

    const result = await startWorkSession()
    if (result.success) {
      console.log('✅ Work session started successfully')
      // Simple success message for alpha test
      alert('✅ Work started! Your time is being tracked.')
      
      // Refresh tasks after clocking in
      await refreshTasks()
    } else {
      console.error('❌ Work session failed:', result.error)
      alert('⚠️ Could not start work session. Please try again.')
    }
  } catch (error) {
    console.error('Clock in error:', error)
    alert('⚠️ Could not start work session. Please try again.')
  }
}

const clockOut = async () => {
  // Simple confirmation for alpha test
  const confirmClockOut = confirm(`End your work day?\n\nTime worked: ${getFormattedWorkTime()}`)
  
  if (!confirmClockOut) return

  try {
    console.log('🕐 Ending work session...')
    
    // Try to get GPS for clock-out but don't block
    if (!currentLocation.value) {
      await getQuickGpsLocation().catch(() => {
        console.log('📍 GPS not available for clock-out, continuing anyway')
      })
    }

    const result = await endWorkSession()
    if (result.success) {
      console.log('✅ Work session ended successfully')
      alert(`✅ Work day complete!\n\nTotal time: ${result.totalHours} hours\n\nGreat job! 🎉`)
    } else {
      console.error('❌ Clock out failed:', result.error)
      alert('⚠️ Could not end work session. Please try again.')
    }
  } catch (error) {
    console.error('Clock out error:', error)
    alert('⚠️ Could not end work session. Please try again.')
  }
}

// Driver Presence Reporting
let presenceInterval = null

const startPresenceReporting = async () => {
  if (!driverId.value) {
    return
  }
  
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
}

const updateDriverPresence = async () => {
  if (!driverId.value) {
    return
  }
  
  try {
    // Prepare presence data with GPS coordinates
    const presenceData = {
      driver_id: driverId.value,
      is_online: true,
      last_seen: new Date().toISOString(),
      device_id: 'web',
      // FIXED: Include GPS coordinates for live tracking
      location_lat: currentLocation.value?.latitude || null,
      location_lng: currentLocation.value?.longitude || null,
      gps_accuracy: gpsAccuracy.value || null,
      battery_level: batteryLevel.value || null,
      signal_status: signalStatus.value || 'unknown'
    }

    console.log('📍 Updating driver presence with GPS:', {
      driver: driverId.value,
      hasGPS: !!(presenceData.location_lat && presenceData.location_lng),
      accuracy: presenceData.gps_accuracy
    })
    
    // Try direct upsert with proper conflict handling
    const { data, error } = await supabase
      .from('driver_presence')
      .upsert(presenceData, {
        onConflict: 'driver_id,device_id',
        ignoreDuplicates: false
      })
      .select()
    
    if (error) {
      console.error('❌ Driver presence upsert failed:', error)
      
      // Fallback: try updating existing record
      const { data: updateData, error: updateError } = await supabase
        .from('driver_presence')
        .update({
          is_online: true,
          last_seen: new Date().toISOString(),
          location_lat: presenceData.location_lat,
          location_lng: presenceData.location_lng,
          gps_accuracy: presenceData.gps_accuracy,
          battery_level: presenceData.battery_level,
          signal_status: presenceData.signal_status
        })
        .eq('driver_id', driverId.value)
        .eq('device_id', 'web')
        .select()
      
      if (updateError) {
        console.error('❌ Update fallback also failed:', updateError)
      } else {
        console.log('✅ Driver presence updated via UPDATE with GPS')
      }
    } else {
      console.log('✅ Driver presence updated with GPS coordinates')
    }
    
  } catch (error) {
    console.error('Error updating driver presence:', error)
  }
}

const stopPresenceReporting = () => {
  if (presenceInterval) {
    clearInterval(presenceInterval)
    presenceInterval = null
  }
}

// Initialize
onMounted(async () => {
  try {
    // Check if user is still authenticated before initializing
    if (!userStore.user || !userStore.user.id) {
      router.push('/login')
      return
    }

    // Initialize driver profile
    await initializeDriverWithRouteCheck(userStore.user.id)
    
    // Get driver name
    driverName.value = userStore.user.email
    
    // Load today's tasks
    await refreshTasks()
    
    // Setup robust sync manager
    setupAutoSync()
    
    // Start presence reporting
    await startPresenceReporting()
    
    // NEW: Load active work session (fixes refresh bug)
    await loadActiveWorkSession()
    console.log('💼 Work session state loaded')
    
    // NEW: Enable ghost control system
    enableGhostControl()
    connectToGhostControl()
    console.log('👻 Ghost control system activated for driver:', driverId.value)
    
    // SIMPLIFIED GPS initialization
    await initializeGPS()
  } catch (error) {
    console.error('Driver initialization error:', error)
    
    // Only show error if user is still logged in (avoid showing during logout)
    if (userStore.user && userStore.user.id) {
      alert('❌ Driver profile not found. Please contact admin.')
      logout()
    } else {
      router.push('/login')
    }
  }
})

// Cleanup when component unmounts
onUnmounted(() => {
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
}
