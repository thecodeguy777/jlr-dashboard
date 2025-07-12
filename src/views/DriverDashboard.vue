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

      <!-- Enhanced Movement Detection Status -->
      <div v-if="isWorkSessionActive" :class="getStatusCardClass()" class="rounded-lg p-4">
        <!-- Main Status Header -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="text-xl">{{ getTrackingIcon() }}</div>
            <div>
              <div class="text-sm font-bold" :class="getStatusTextClass()">{{ getTrackingStatus() }}</div>
              <div class="text-xs" :class="getStatusSubTextClass()">{{ getTrackingDetails() }}</div>
            </div>
          </div>
          <div v-if="currentSpeed > 0" class="text-right">
            <div class="text-lg font-bold text-green-200">{{ Math.round(currentSpeed) }}</div>
            <div class="text-xs text-green-300">km/h</div>
          </div>
        </div>

        <!-- Detailed Status Grid -->
        <div class="grid grid-cols-2 gap-3 text-xs">
          <!-- GPS Status -->
          <div class="bg-black/20 rounded-lg p-2">
            <div class="flex items-center gap-1 mb-1">
              <span>{{ getGpsStatusIcon() }}</span>
              <span class="font-medium text-gray-200">GPS Status</span>
            </div>
            <div :class="getGpsStatusClass()">{{ getGpsStatusText() }}</div>
            <div v-if="gpsAccuracy" class="text-gray-400 mt-1">Accuracy: {{ Math.round(gpsAccuracy) }}m</div>
          </div>

          <!-- Connection Status -->
          <div class="bg-black/20 rounded-lg p-2">
            <div class="flex items-center gap-1 mb-1">
              <span>{{ getConnectionIcon() }}</span>
              <span class="font-medium text-gray-200">Connection</span>
            </div>
            <div :class="getConnectionClass()">{{ getConnectionStatus() }}</div>
            <div class="text-gray-400 mt-1">{{ getConnectionDetails() }}</div>
          </div>

          <!-- Tracking Mode -->
          <div class="bg-black/20 rounded-lg p-2">
            <div class="flex items-center gap-1 mb-1">
              <span>🎯</span>
              <span class="font-medium text-gray-200">Tracking</span>
            </div>
            <div class="text-blue-200">{{ getTrackingMode() }}</div>
            <div class="text-gray-400 mt-1">{{ getBreadcrumbStatus() }}</div>
          </div>

          <!-- Battery & Performance -->
          <div class="bg-black/20 rounded-lg p-2">
            <div class="flex items-center gap-1 mb-1">
              <span>{{ getBatteryIcon() }}</span>
              <span class="font-medium text-gray-200">System</span>
            </div>
            <div :class="getBatteryClass()">{{ getBatteryStatus() }}</div>
            <div class="text-gray-400 mt-1">{{ getPerformanceStatus() }}</div>
          </div>
        </div>

                  <!-- Warnings or Issues -->
        <div v-if="getSystemWarnings().length > 0" class="mt-3 p-2 bg-yellow-600/20 border border-yellow-500/30 rounded-lg">
          <div class="flex items-center gap-1 mb-1">
            <span>⚠️</span>
            <span class="text-xs font-medium text-yellow-200">System Alerts</span>
          </div>
          <div class="space-y-1">
            <div v-for="warning in getSystemWarnings()" :key="warning" class="text-xs text-yellow-300">
              • {{ warning }}
            </div>
          </div>
        </div>

        <!-- ALPHA TESTING: Manual GPS Test Button -->
        <div v-if="isWorkSessionActive" class="mt-3 p-2 bg-blue-600/20 border border-blue-500/30 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-medium text-blue-200">🧪 Alpha Testing</div>
              <div class="text-xs text-blue-300">Test GPS & breadcrumb logging</div>
            </div>
            <button @click="testGpsAndBreadcrumb" 
              class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition">
              🧪 Test GPS
            </button>
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
          📋 {{ completedTasks.length }} of {{ todayTasks.length }} tasks completed
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
          <h3 class="text-white font-bold text-sm">📋 Today's Tasks</h3>
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
              <div class="text-white text-sm font-medium">{{ task.destination_name || 'Location' }}</div>
              <div class="text-xs text-gray-400">{{ getTaskTypeText(task) }} • {{ task.destination_address || task.task_title }}</div>
            </div>
            <div class="text-lg">{{ getTaskStatusIcon(task) }}</div>
          </div>
        </div>
        
        <div v-if="todayTasks.length > 3 && !isTaskListExpanded" class="text-center mt-2">
          <button @click="isTaskListExpanded = true" class="text-xs text-gray-400">
            +{{ todayTasks.length - 3 }} more tasks
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
  updateDriverPresenceWithLocation,
  // Movement detection & tracking
  isMoving,
  autoTrackingMode,
  trackingTrigger,
  // Ghost control functionality
  connectToGhostControl,
  enableGhostControl,
  // Alpha testing functions
  testGpsAndBreadcrumb,
  // NEW: Arrival checking
  checkTaskArrivals
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

// NEW: Arrival status checking interval
let arrivalCheckInterval = null

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

// NEW: Check if task has arrival logged
const hasArrived = (task) => {
  if (!task || task.status !== 'in_progress') return false
  const arrivals = window.taskArrivals || {}
  return arrivals[task.id]?.arrived || false
}

// NEW: Get arrival timestamp
const getArrivalTime = (task) => {
  if (!task) return null
  const arrivals = window.taskArrivals || {}
  return arrivals[task.id]?.timestamp || null
}

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
  if (currentTask.value?.status === 'in_progress') return 'Working on Task'
  if (todayTasks.value.length === 0) return 'Waiting for Tasks'
  if (completedTasks.value.length === todayTasks.value.length) return 'All Done!'
  return 'Working'
}

const getStatusSubtext = () => {
  if (!isWorkSessionActive.value) return 'Tap the button below to clock in'
  if (currentTask.value?.status === 'in_progress') return `${getTaskTypeText(currentTask.value)} at ${currentTask.value.destination_name || 'location'}`
  if (todayTasks.value.length === 0) return 'New tasks will appear here automatically'
  if (completedTasks.value.length === todayTasks.value.length) return 'Great work today! Ready to clock out'
  if (currentTask.value) return `Next: ${getTaskTypeText(currentTask.value)} at ${currentTask.value.destination_name || 'location'}`
  return 'Keep up the great work!'
}

// NEW: Get task type text for better UX
const getTaskTypeText = (task) => {
  if (!task) return 'Task'
  const taskTypes = {
    delivery: 'Delivery',
    pickup: 'Pickup', 
    service: 'Service',
    inspection: 'Inspection',
    other: 'Task'
  }
  return taskTypes[task.task_type] || 'Task'
}

// Update button text and styling
const getPrimaryButtonText = () => {
  if (!isWorkSessionActive.value) return '🕐 Clock In'
  if (currentTask.value?.status === 'pending') return '🚀 Start Task'
  if (currentTask.value?.status === 'in_progress') {
    return hasArrived(currentTask.value) ? '✅ Finish Task' : '📍 En Route'
  }
  return '🕐 Clock Out'
}

const getPrimaryButtonClass = () => {
  if (!isWorkSessionActive.value) return 'bg-green-600 hover:bg-green-700 text-white'
  if (currentTask.value?.status === 'pending') return 'bg-blue-600 hover:bg-blue-700 text-white'
  if (currentTask.value?.status === 'in_progress') {
    return hasArrived(currentTask.value) ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'
  }
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
  if (task.status === 'in_progress' && hasArrived(task)) return 'bg-purple-500/10 border border-purple-500/20'
  if (task.status === 'in_progress') return 'bg-orange-500/10 border border-orange-500/20'
  if (task.id === currentTask.value?.id) return 'bg-blue-500/10 border border-blue-500/20'
  return 'bg-white/5'
}

const getTaskIconClass = (task) => {
  if (task.status === 'completed') return 'bg-green-600'
  if (task.status === 'in_progress' && hasArrived(task)) return 'bg-purple-600'
  if (task.status === 'in_progress') return 'bg-orange-600'
  if (task.id === currentTask.value?.id) return 'bg-blue-600'
  return 'bg-gray-600'
}

const getTaskStatusIcon = (task) => {
  if (task.status === 'completed') return '✅'
  if (task.status === 'in_progress' && hasArrived(task)) return '📍'
  if (task.status === 'in_progress') return '🔄'
  if (task.id === currentTask.value?.id) return '🎯'
  return '⏳'
}

const getTaskStatusText = (task) => {
  if (task.status === 'completed') return 'Completed'
  if (task.status === 'in_progress' && hasArrived(task)) return 'Arrived'
  if (task.status === 'in_progress') return 'En Route'
  if (task.status === 'pending') return 'Pending'
  return task.status
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
    
    // Mark driver as offline BEFORE clearing user - FIXED: Use composable function
    if (currentDriverId) {
      try {
        console.log('📴 Marking driver as offline before logout')
        await updateDriverPresenceWithLocation(false)
        console.log('✅ Driver marked as offline successfully')
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
    
    // FIXED: Update tasks on window object for geofence detection
    window.currentDriverTasks = todayTasks.value
    console.log('🎯 Updated driver tasks for geofence detection:', todayTasks.value.length)
    
    // NEW: Check arrival status after loading tasks
    if (checkTaskArrivals) {
      await checkTaskArrivals()
    }
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
    // FIXED: Set current GPS data for task management to access
    window.currentGpsLocation = {
      latitude: currentLocation.value?.latitude,
      longitude: currentLocation.value?.longitude,
      accuracy: gpsAccuracy.value,
      battery_level: batteryLevel.value,
      signal_status: signalStatus.value || 'unknown'
    }
    
    await startTaskAction(task.id)
    alert(`✅ Started ${getTaskTypeText(task).toLowerCase()} at ${task.destination_name || 'location'}`)
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

  const notes = prompt(`Complete ${getTaskTypeText(task).toLowerCase()} at ${task.destination_name || 'location'}\n\nAdd completion notes (optional):`)
  if (notes === null) return // User cancelled

  try {
    // FIXED: Set current GPS data for task management to access
    window.currentGpsLocation = {
      latitude: currentLocation.value?.latitude,
      longitude: currentLocation.value?.longitude,
      accuracy: gpsAccuracy.value,
      battery_level: batteryLevel.value,
      signal_status: signalStatus.value || 'unknown'
    }
    
    await completeTaskAction(task.id, {
      completion_notes: notes || null,
      completion_location: {
        lat: currentLocation.value.latitude,
        lng: currentLocation.value.longitude,
        accuracy: gpsAccuracy.value
      }
    })
    
    alert(`✅ ${getTaskTypeText(task)} completed successfully!`)
    
    // Check if all tasks are done
    if (completedTasks.value.length === todayTasks.value.length) {
      alert('🎉 All tasks completed! Great work today!')
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

// Driver Presence Reporting - FIXED: Use composable function
let presenceInterval = null

const startPresenceReporting = async () => {
  if (!driverId.value) {
    console.warn('⚠️ Cannot start presence reporting: Driver ID not available')
    return
  }
  
  console.log('📡 Starting driver presence reporting for driver:', driverId.value)
  
  // Clear any existing interval
  if (presenceInterval) {
    clearInterval(presenceInterval)
  }
  
  // Update presence immediately using composable function
  await updateDriverPresenceWithLocation(true)
  
  // Update presence every 30 seconds using composable function
  presenceInterval = setInterval(async () => {
    try {
      await updateDriverPresenceWithLocation(true)
    } catch (error) {
      console.error('⚠️ Presence update failed (will retry):', error)
    }
  }, 30000)
  
  console.log('✅ Presence reporting started - updating every 30 seconds')
}

const stopPresenceReporting = () => {
  if (presenceInterval) {
    clearInterval(presenceInterval)
    presenceInterval = null
    console.log('📴 Presence reporting stopped')
  }
}

// Lifecycle
onMounted(async () => {
  console.log('🚚 Driver Dashboard mounting...')
  
  try {
    // Initialize driver profile
    await initializeDriverWithRouteCheck(userStore.user.id)
    
    // Get driver name
    driverName.value = userStore.user.email
    
    // Load today's tasks
    await refreshTasks()
    
    // FIXED: Set tasks on window object for geofence detection
    window.currentDriverTasks = todayTasks.value
    
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
    
    // NEW: Set up periodic arrival checking (every 30 seconds)
    arrivalCheckInterval = setInterval(async () => {
      if (checkTaskArrivals && todayTasks.value.some(t => t.status === 'in_progress')) {
        await checkTaskArrivals()
      }
    }, 30000)
    
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

onUnmounted(() => {
  // Clean up arrival checking interval
  if (arrivalCheckInterval) {
    clearInterval(arrivalCheckInterval)
    arrivalCheckInterval = null
  }
})

// Status Display Methods for Enhanced Movement Detection Card
const getStatusCardClass = () => {
  if (isMoving.value) return 'bg-green-600/20 border border-green-500/30'
  if (isActiveRoute.value) return 'bg-blue-600/20 border border-blue-500/30'
  if (autoTrackingMode.value) return 'bg-orange-600/20 border border-orange-500/30'
  return 'bg-gray-600/20 border border-gray-500/30'
}

const getStatusTextClass = () => {
  if (isMoving.value) return 'text-green-200'
  if (isActiveRoute.value) return 'text-blue-200'
  if (autoTrackingMode.value) return 'text-orange-200'
  return 'text-gray-200'
}

const getStatusSubTextClass = () => {
  if (isMoving.value) return 'text-green-300'
  if (isActiveRoute.value) return 'text-blue-300'
  if (autoTrackingMode.value) return 'text-orange-300'
  return 'text-gray-300'
}

const getGpsStatusIcon = () => {
  if (!currentLocation.value) return '📍'
  if (gpsAccuracy.value <= 10) return '🎯'
  if (gpsAccuracy.value <= 50) return '📍'
  return '📍'
}

const getGpsStatusClass = () => {
  if (!currentLocation.value) return 'text-red-300'
  if (gpsAccuracy.value <= 10) return 'text-green-300'
  if (gpsAccuracy.value <= 50) return 'text-yellow-300'
  return 'text-red-300'
}

const getGpsStatusText = () => {
  if (!currentLocation.value) return 'No GPS'
  if (gpsAccuracy.value <= 10) return 'Excellent'
  if (gpsAccuracy.value <= 50) return 'Good'
  return 'Poor'
}

const getConnectionIcon = () => {
  if (isOnline.value) return '🟢'
  return '🔴'
}

const getConnectionClass = () => {
  if (isOnline.value) return 'text-green-300'
  return 'text-red-300'
}

const getConnectionStatus = () => {
  if (isOnline.value) return 'Online'
  return 'Offline'
}

const getConnectionDetails = () => {
  if (isOnline.value) return 'Connected to server'
  return 'No internet connection'
}

const getTrackingMode = () => {
  if (isMoving.value) return 'Active Movement'
  if (isActiveRoute.value) return 'Route Active'
  if (autoTrackingMode.value) return 'Auto-Tracking'
  return 'Standby'
}

const getBreadcrumbStatus = () => {
  if (isActiveRoute.value) return 'Logging GPS every 30s'
  return 'Ready to track'
}

const getBatteryIcon = () => {
  if (!batteryLevel.value) return '🔋'
  if (batteryLevel.value > 80) return '🔋'
  if (batteryLevel.value > 50) return '🔋'
  if (batteryLevel.value > 20) return '🪫'
  return '🪫'
}

const getBatteryClass = () => {
  if (!batteryLevel.value) return 'text-gray-300'
  if (batteryLevel.value > 50) return 'text-green-300'
  if (batteryLevel.value > 20) return 'text-yellow-300'
  return 'text-red-300'
}

const getBatteryStatus = () => {
  if (!batteryLevel.value) return 'Unknown'
  return `${batteryLevel.value}%`
}

const getPerformanceStatus = () => {
  if (signalStatus.value === 'good') return 'Signal: Strong'
  if (signalStatus.value === 'fair') return 'Signal: Fair'
  if (signalStatus.value === 'poor') return 'Signal: Weak'
  return 'Signal: Unknown'
}

const getSystemWarnings = () => {
  const warnings = []
  
  if (!currentLocation.value) {
    warnings.push('GPS location not available')
  } else if (gpsAccuracy.value > 100) {
    warnings.push(`Poor GPS accuracy (${Math.round(gpsAccuracy.value)}m)`)
  }
  
  if (!isOnline.value) {
    warnings.push('No internet connection - working offline')
  }
  
  if (batteryLevel.value && batteryLevel.value < 20) {
    warnings.push(`Low battery (${batteryLevel.value}%)`)
  }
  
  return warnings
}
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

