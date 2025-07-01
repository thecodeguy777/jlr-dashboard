<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-orange-900">
    <!-- Simple Header -->
    <div class="bg-black/20 border-b border-white/10 p-4 flex items-center justify-between">
      <h1 class="text-xl font-bold text-white">📱 Driver App</h1>
      <button @click="logout" class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
        Emergency Logout
      </button>
    </div>

    <!-- GPS Permission Modal -->
    <div v-if="showGpsModal" class="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <div class="text-6xl mb-4">📍</div>
        <h2 class="text-2xl font-bold mb-4 text-gray-800">Enable GPS</h2>
        <p class="text-lg text-gray-600 mb-6">We need your location for accurate tracking</p>
        <div class="space-y-3">
          <button @click="requestGps" class="w-full bg-blue-600 text-white py-4 rounded-xl text-xl font-medium">
            Enable GPS
          </button>
          <button @click="forceCloseModal" class="w-full bg-gray-300 text-gray-700 py-3 rounded-xl text-lg">
            Continue Without GPS
          </button>
        </div>
      </div>
    </div>

    <div class="p-4 max-w-md mx-auto space-y-4">
      <!-- MASTER STATUS CARD -->
      <div class="bg-white/10 rounded-2xl p-6 text-center">
        <!-- Work Status -->
        <div class="flex items-center justify-center gap-3 mb-4">
          <div class="text-3xl">{{ isWorkSessionActive ? '🟢' : '🔴' }}</div>
          <div>
            <div class="text-white text-xl font-bold">{{ isWorkSessionActive ? 'WORKING' : 'OFF WORK' }}</div>
            <div class="text-gray-300">
              {{ isWorkSessionActive ? getFormattedWorkTime() : 'Tap Clock In to start' }}
            </div>
          </div>
        </div>
        
        <!-- Clock In/Out Button -->
        <button v-if="!isWorkSessionActive"
                @click="clockIn" 
                class="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl text-xl font-bold mb-4">
          🕐 CLOCK IN - START WORK
        </button>
        
        <!-- Current Status (when working) -->
        <div v-if="isWorkSessionActive" class="border-t border-white/10 pt-4">
          <div class="text-lg font-bold text-white mb-2">{{ getCurrentStatusText() }}</div>
          <div class="text-gray-300 mb-3">{{ getCurrentSubStatusText() }}</div>
          
          <!-- Task Progress -->
          <div v-if="todayTasks.length > 0" class="text-sm text-gray-400">
            {{ completedTasks.length }} of {{ todayTasks.length }} deliveries completed
          </div>
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

        <!-- Task Management -->
        <div v-else class="space-y-3">
          <!-- Current Task Card -->
          <div v-if="currentTask" class="bg-blue-600/20 border border-blue-500/30 rounded-2xl p-6">
            <div class="text-center mb-4">
              <div class="text-3xl mb-2">🎯</div>
              <div class="text-xl font-bold text-white">Current Delivery</div>
              <div class="text-blue-300">{{ currentTask.destination_name || 'Customer' }}</div>
              <div class="text-sm text-gray-300">{{ currentTask.destination_address || currentTask.task_title }}</div>
            </div>
            
            <!-- Task Actions -->
            <div class="space-y-2">
              <button v-if="currentTask.status === 'pending'"
                      @click="startTask(currentTask)"
                      :disabled="!canPerformActions"
                      class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors">
                🚀 Start Delivery
              </button>
              
              <button v-if="currentTask.status === 'in_progress'"
                      @click="completeTask(currentTask)"
                      :disabled="!canPerformActions"
                      class="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors">
                ✅ Mark as Delivered
              </button>
              
              <button v-if="currentTask.status === 'in_progress'"
                      @click="navigateToTask(currentTask)"
                      class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors">
                🗺️ Open in Maps
              </button>
            </div>
          </div>

          <!-- All Tasks Completed -->
          <div v-if="!currentTask && completedTasks.length === todayTasks.length" class="bg-green-600/20 border border-green-500/30 rounded-2xl p-6 text-center">
            <div class="text-4xl mb-3">🎉</div>
            <div class="text-xl font-bold text-white mb-2">All Deliveries Complete!</div>
            <div class="text-green-300 mb-4">Great work today!</div>
            <button @click="clockOut" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              🕐 Clock Out
            </button>
          </div>
        </div>

        <!-- End Work Day Button -->
        <button v-if="canEndWorkDay()" @click="clockOut"
                class="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors">
          🕐 Clock Out - End Work Day
        </button>
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

// Simplified UX methods
const getCurrentStatusText = () => {
  if (!isWorkSessionActive.value) return 'Not Working'
  if (todayTasks.value.length === 0) return 'Waiting for Tasks'
  if (currentTask.value) {
    if (currentTask.value.status === 'pending') return 'Ready for Next Delivery'
    if (currentTask.value.status === 'in_progress') return 'Delivery in Progress'
  }
  if (completedTasks.value.length === todayTasks.value.length) return 'All Deliveries Complete'
  return 'Working'
}

const getCurrentSubStatusText = () => {
  if (!isWorkSessionActive.value) return 'Clock in to start your shift'
  if (todayTasks.value.length === 0) return 'Check back for new assignments'
  if (currentTask.value) {
    if (currentTask.value.status === 'pending') {
      return `Next: ${currentTask.value.destination_name || 'Customer delivery'}`
    }
    if (currentTask.value.status === 'in_progress') {
      return `Delivering to ${currentTask.value.destination_name || 'customer'}`
    }
  }
  if (completedTasks.value.length === todayTasks.value.length) return 'Ready to clock out'
  return 'Keep up the great work!'
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

// Methods
const requestGps = async () => {
  try {
    const success = await Promise.race([
      requestGpsPermission(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('GPS request timeout after 20 seconds')), 20000)
      )
    ])
    
    if (success) {
      showGpsModal.value = false
      startLocationTracking()
    } else {
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
  showGpsModal.value = false
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

// Work Session Methods
const clockIn = async () => {
  // Clock in only needs basic GPS availability, not perfect accuracy
  if (!isGpsAvailable.value) {
    const proceed = confirm('⚠️ GPS not available. Clock in anyway?\n\nNote: You\'ll need GPS for deliveries later.')
    if (!proceed) {
      return
    }
  }

  try {
    const result = await startWorkSession()
    if (result.success) {
      alert(`✅ Work session started! Your time is being tracked.`)
    } else {
      alert(`❌ Failed to start work session: ${result.error || 'Unknown error'}`)
    }
  } catch (error) {
    console.error('Clock in error:', error)
    alert(`❌ Failed to clock in: ${error.message}`)
  }
}

const clockOut = async () => {
  // Clock out only needs basic GPS availability, not perfect accuracy
  if (!isGpsAvailable.value) {
    const proceed = confirm('⚠️ GPS not available. Clock out anyway?\n\nNote: Location will not be recorded.')
    if (!proceed) return
  }

  // Confirm before clocking out
  const confirmClockOut = confirm(`Are you sure you want to clock out?\n\nYour current work time: ${getFormattedWorkTime()}\nThis will end your work session.`)
  
  if (!confirmClockOut) return

  try {
    const result = await endWorkSession()
    if (result.success) {
      alert(`✅ Work session ended!\n\nTotal time worked: ${result.totalHours} hours\n\nGreat job today! 🎉`)
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
    // Use the database function for proper upsert
    const { data: functionData, error: functionError } = await supabase
      .rpc('upsert_driver_presence', {
        p_driver_id: driverId.value,
        p_is_online: true,
        p_device_id: 'web'
      })
    
    if (functionError) {
      // Fallback to direct upsert
      await supabase
        .from('driver_presence')
        .upsert({
          driver_id: driverId.value,
          is_online: true,
          last_seen: new Date().toISOString(),
          device_id: 'web'
        })
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