<template>
  <div class="min-h-screen bg-gradient-to-br from-orange-900 via-orange-950 to-gray-900 text-white">
    <!-- GPS Permission Modal -->
    <div v-if="showGpsModal" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-800 rounded-xl p-6 max-w-sm w-full border border-orange-500/20">
        <div class="text-center">
          <div class="text-4xl mb-4">📍</div>
          <h2 class="text-xl font-bold mb-2">GPS Required</h2>
          <p class="text-gray-300 text-sm mb-6">
            This app requires GPS location to track deliveries accurately. Please enable location services.
          </p>
          <div class="space-y-3">
            <button @click="requestGps" 
              class="w-full bg-orange-600 hover:bg-orange-700 py-3 rounded-lg font-semibold transition">
              Enable GPS
            </button>
            <button @click="forceCloseModal" 
              class="w-full bg-yellow-600 hover:bg-yellow-700 py-2 rounded-lg text-sm transition">
              Skip GPS (Testing)
            </button>
            <button @click="logout" 
              class="w-full bg-gray-600 hover:bg-gray-700 py-2 rounded-lg text-sm transition">
              Exit App
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="p-6">
      <!-- Header -->
      <div class="flex justify-between items-start mb-8">
        <div>
          <h1 class="text-2xl font-bold">🚚 Driver App</h1>
          <p class="text-orange-200 text-sm">{{ driverName || 'Driver' }}</p>
        </div>
        
        <!-- Status Indicators -->
        <div class="text-right space-y-1">
          <div class="flex items-center gap-2 text-xs">
            <div :class="['w-2 h-2 rounded-full', isOnline ? 'bg-green-400' : 'bg-red-400']"></div>
            <span>{{ isOnline ? 'Online' : 'Offline' }}</span>
          </div>
          
          <!-- Enhanced Sync Status -->
          <div v-if="pendingSyncCount > 0" class="flex items-center gap-2 text-xs">
            <div :class="['w-2 h-2 rounded-full', syncingStatus ? 'bg-orange-400 animate-pulse' : 'bg-yellow-400']"></div>
            <span class="text-yellow-400">
              {{ pendingSyncCount }} {{ syncingStatus ? 'syncing...' : 'pending' }}
            </span>
          </div>
          
          <!-- Legacy sync indicator (fallback) -->
          <div v-else-if="unsyncedLogs.length > 0" class="flex items-center gap-2 text-xs text-yellow-400">
            <div class="w-2 h-2 rounded-full bg-yellow-400"></div>
            <span>{{ unsyncedLogs.length }} legacy sync</span>
          </div>
          
          <!-- Sync success indicator -->
          <div v-else-if="lastSyncTime && isOnline" class="flex items-center gap-2 text-xs text-green-400">
            <div class="w-2 h-2 rounded-full bg-green-400"></div>
            <span>✅ Synced</span>
          </div>
          
          <div class="flex items-center gap-2 text-xs">
            <span>📶 {{ signalStatus }}</span>
          </div>
          <div v-if="batteryLevel" class="flex items-center gap-2 text-xs">
            <span>🔋 {{ batteryLevel }}%</span>
          </div>
          
          <!-- Sync errors indicator -->
          <div v-if="syncErrors.length > 0" class="flex items-center gap-2 text-xs text-red-400">
            <span>⚠️ {{ syncErrors.length }} sync errors</span>
          </div>
        </div>
      </div>

      <!-- GPS Status -->
      <div class="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div :class="['w-3 h-3 rounded-full', isGpsAvailable ? 'bg-green-400' : 'bg-red-400']"></div>
            <div>
              <div class="font-medium">GPS Status</div>
              <div class="text-sm text-gray-300">
                <span v-if="!isGpsAvailable">GPS Unavailable</span>
                <span v-else-if="!currentLocation">Getting location...</span>
                <span v-else>Accuracy: {{ Math.round(gpsAccuracy) }}m</span>
              </div>
            </div>
          </div>
          <button v-if="!isGpsAvailable" @click="requestGps" 
            class="bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded text-sm transition">
            Retry GPS
          </button>
        </div>
      </div>

      <!-- Work Session Status -->
      <div class="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
        <div v-if="!isWorkSessionActive" class="text-center">
          <h3 class="text-lg font-semibold mb-3">👋 Ready to Start Work?</h3>
          <button @click="clockIn" :disabled="!canPerformActions || isLoading"
            class="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition w-full">
            🕐 {{ isLoading ? 'Clocking In...' : 'CLOCK IN - Start Work Day' }}
          </button>
          <p class="text-sm text-gray-400 mt-2">GPS location required to clock in</p>
        </div>
        
        <div v-else class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
              <div class="font-medium text-green-300">🕐 Work Session Active</div>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold text-green-400">{{ getFormattedWorkTime() }}</div>
              <div class="text-xs text-gray-400">Total worked time</div>
            </div>
          </div>
          
          <!-- Work Session Stats -->
          <div class="grid grid-cols-3 gap-4 text-sm bg-white/5 rounded-lg p-3">
            <div class="text-center">
              <div class="text-white font-medium">{{ sessionStats.totalRoutes }}</div>
              <div class="text-gray-400 text-xs">Routes</div>
            </div>
            <div class="text-center">
              <div class="text-white font-medium">{{ sessionStats.totalDeliveries }}</div>
              <div class="text-gray-400 text-xs">Deliveries</div>
            </div>
            <div class="text-center">
              <div class="text-white font-medium">{{ (sessionStats.totalDistance / 1000).toFixed(1) }}</div>
              <div class="text-gray-400 text-xs">km driven</div>
            </div>
          </div>

          <!-- Clock Out Button -->
          <button @click="clockOut" :disabled="!canPerformActions || isLoading"
            class="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition w-full">
            🕐 {{ isLoading ? 'Clocking Out...' : 'CLOCK OUT - End Work Day' }}
          </button>
        </div>
      </div>

      <!-- Enhanced Tracking Status -->
      <div v-if="isActiveRoute" class="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4 mb-6">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-3 h-3 rounded-full bg-orange-400 animate-pulse"></div>
          <div class="font-medium text-orange-300">🚗 Route Active - Tracking Every 30s</div>
        </div>
        
        <div class="grid grid-cols-3 gap-4 text-sm">
          <div class="text-center">
            <div class="text-orange-200 font-medium">{{ currentSpeed.toFixed(1) }}</div>
            <div class="text-orange-400 text-xs">km/h</div>
          </div>
          <div class="text-center">
            <div class="text-orange-200 font-medium">{{ (totalDistance / 1000).toFixed(2) }}</div>
            <div class="text-orange-400 text-xs">km total</div>
          </div>
          <div class="text-center">
            <div class="text-orange-200 font-medium">{{ clients.length }}</div>
            <div class="text-orange-400 text-xs">geofences</div>
          </div>
        </div>
      </div>

      <!-- Today's Tasks -->
      <div v-if="todayTasks.length > 0" class="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-semibold flex items-center gap-2">
            📋 Today's Tasks
            <span class="bg-orange-600 text-white text-xs px-2 py-1 rounded-full">{{ todayTasks.length }}</span>
          </h3>
          <button @click="refreshTasks" :disabled="taskLoading"
            class="text-orange-400 hover:text-orange-300 text-sm">
            {{ taskLoading ? '🔄' : '🔄 Refresh' }}
          </button>
        </div>

        <!-- Task Progress Bar -->
        <div v-if="todayTasks.length > 0" class="mb-4">
          <div class="flex justify-between items-center text-xs text-gray-400 mb-1">
            <span>Progress</span>
            <span>{{ completedTasks.length }}/{{ todayTasks.length }} completed</span>
          </div>
          <div class="bg-white/20 rounded-full h-2">
            <div class="bg-gradient-to-r from-orange-500 to-green-500 h-2 rounded-full transition-all duration-500" 
                 :style="{ width: taskProgress + '%' }"></div>
          </div>
        </div>

        <!-- Current Task Highlight -->
        <div v-if="currentTask" class="bg-orange-900/30 border border-orange-500/50 rounded-lg p-3 mb-4">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span class="text-xs text-orange-300 font-medium">{{ currentTask.status === 'pending' ? 'NEXT TASK' : 'CURRENT TASK' }}</span>
          </div>
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h4 class="font-medium">{{ currentTask.task_title }}</h4>
              <div class="flex items-center gap-2 text-sm text-orange-300 mt-1">
                <span>{{ getTaskTypeIcon(currentTask.task_type) }}</span>
                <span>{{ currentTask.destination_name }}</span>
              </div>
              <div class="text-xs text-gray-400 mt-1">{{ currentTask.destination_address }}</div>
            </div>
            <div class="text-right">
              <div :class="[
                'px-2 py-1 rounded text-xs font-medium',
                currentTask.status === 'in_progress' ? 'bg-orange-900 text-orange-300' : 'bg-gray-900 text-gray-300'
              ]">
                {{ currentTask.status.replace('_', ' ').toUpperCase() }}
              </div>
              <div v-if="currentTask.estimated_duration" class="text-xs text-gray-400 mt-1">
                ~{{ currentTask.estimated_duration }}min
              </div>
            </div>
          </div>
          <div class="flex gap-2 mt-3">
            <button @click="navigateToTask(currentTask)" 
              class="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-3 rounded-lg transition text-sm flex items-center justify-center gap-2">
              🗺️ Navigate
            </button>
            <button v-if="currentTask.status === 'pending'" @click="startTask(currentTask)"
              class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg transition text-sm flex items-center justify-center gap-2">
              ▶️ Start
            </button>
            <button v-if="currentTask.status === 'in_progress'" @click="completeTask(currentTask)"
              class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg transition text-sm flex items-center justify-center gap-2">
              ✅ Complete
            </button>
          </div>
        </div>

        <!-- Compact Task List -->
        <div class="space-y-2">
          <div v-for="task in todayTasks.slice(0, 3)" :key="task.id" 
               class="flex items-center justify-between p-2 bg-white/5 rounded-lg">
            <div class="flex items-center gap-3">
              <div :class="[
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                task.status === 'completed' ? 'bg-green-600' :
                task.status === 'in_progress' ? 'bg-orange-600' :
                'bg-gray-600'
              ]">
                {{ task.task_order }}
              </div>
              <div>
                <div class="font-medium text-sm">{{ task.task_title }}</div>
                <div class="text-xs text-gray-400">{{ task.destination_name }}</div>
              </div>
            </div>
            <div class="text-right">
              <div :class="[
                'px-2 py-1 rounded text-xs',
                task.status === 'completed' ? 'bg-green-900 text-green-300' :
                task.status === 'in_progress' ? 'bg-orange-900 text-orange-300' :
                'bg-gray-900 text-gray-300'
              ]">
                {{ task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🔄' : '⏳' }}
              </div>
            </div>
          </div>
        </div>

        <!-- View All Tasks Link -->
        <div v-if="todayTasks.length > 3" class="text-center mt-3">
          <button @click="showAllTasks = true" class="text-orange-400 hover:text-orange-300 text-sm">
            View All {{ todayTasks.length }} Tasks →
          </button>
        </div>
      </div>

      <!-- No Tasks Message -->
      <div v-else-if="!taskLoading && todayTasks.length === 0" class="bg-white/5 rounded-xl p-4 mb-6 border border-white/10 text-center">
        <div class="text-4xl mb-2">📋</div>
        <h3 class="font-medium mb-1">No Tasks Assigned</h3>
        <p class="text-gray-400 text-sm">Check with your supervisor for today's assignments</p>
      </div>

      <!-- Main Action Buttons -->
      <div class="space-y-4 mb-8">
        <ActionButton
          icon="🚀"
          title="Start Route"
          subtitle="Begin delivery route"
          :disabled="!canPerformActions"
          :loading="isLoading && currentAction === 'start_route'"
          @click="() => performAction('start_route')"
        />
        
        <ActionButton
          icon="📍"
          title="Arrived at Drop-off"
          subtitle="Mark arrival at client location"
          :disabled="!canPerformActions"
          :loading="isLoading && currentAction === 'arrived'"
          @click="() => performAction('arrived')"
        />
        
        <ActionButton
          icon="✅"
          title="Delivered"
          subtitle="Confirm successful delivery"
          :disabled="!canPerformActions"
          :loading="isLoading && currentAction === 'delivered'"
          @click="() => performAction('delivered')"
        />
        
        <ActionButton
          v-if="isActiveRoute"
          icon="🏁"
          title="End Route"
          subtitle="Finish route and stop GPS tracking"
          :disabled="!canPerformActions"
          :loading="isLoading && currentAction === 'end_route'"
          @click="() => performAction('end_route')"
          variant="danger"
        />
      </div>

      <!-- Recent Activity -->
      <div v-if="recentLogs.length > 0" class="bg-white/5 rounded-xl p-4 border border-white/10">
        <h3 class="font-semibold mb-3 flex items-center gap-2">
          📋 Recent Activity
          <span v-if="unsyncedLogs.length > 0" class="bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full">
            {{ unsyncedLogs.length }} pending
          </span>
        </h3>
        <div class="space-y-2">
          <div v-for="log in recentLogs.slice(0, 5)" :key="log.timestamp" 
            class="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
            <div class="flex items-center gap-3">
              <span>{{ getActionIcon(log.action_type) }}</span>
              <div>
                <div class="text-sm font-medium">{{ getActionTitle(log.action_type) }}</div>
                <div class="text-xs text-gray-400">{{ formatTime(log.timestamp) }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div v-if="!log.synced" class="w-2 h-2 rounded-full bg-yellow-400" title="Pending sync"></div>
              <div v-else class="w-2 h-2 rounded-full bg-green-400" title="Synced"></div>
              <span class="text-xs text-gray-400">{{ Math.round(log.gps_accuracy) }}m</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Actions -->
      <div class="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 to-transparent">
        <div class="flex gap-2">
          <button @click="logout" 
            class="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-medium transition">
            🚪 Logout
          </button>
          
          <!-- Enhanced Sync Button -->
          <button v-if="pendingSyncCount > 0" @click="triggerSync" :disabled="syncingStatus || !isOnline"
            class="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 py-3 rounded-lg font-medium transition">
            {{ syncingStatus ? '🔄 Syncing...' : `🔄 Sync (${pendingSyncCount})` }}
          </button>
          
          <!-- Legacy sync fallback -->
          <button v-else-if="unsyncedLogs.length > 0" @click="syncPendingLogs" 
            class="flex-1 bg-yellow-600 hover:bg-yellow-700 py-3 rounded-lg font-medium transition">
            🔄 Legacy ({{ unsyncedLogs.length }})
          </button>
          
          <!-- Force sync when online with no pending items -->
          <button v-else-if="isOnline && !syncingStatus" @click="triggerSync"
            class="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg font-medium transition">
            🔄
          </button>
          
          <!-- Sync status when offline -->
          <button v-if="!isOnline" disabled
            class="bg-gray-600 opacity-50 px-4 py-3 rounded-lg font-medium">
            📱 Offline
          </button>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore'
import { useDriverTracking } from '@/composables/useDriverTracking'
import { useTaskManagement } from '@/composables/useTaskManagement'
import { useSyncManager } from '@/composables/useSyncManager'
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
      
      // Show success feedback
      const actionTitle = getActionTitle(currentAction.value)
      alert(`✅ ${actionTitle} logged successfully!`)
    }
  } catch (error) {
    alert(`❌ Error: ${error.message}`)
  }
}

const logout = () => {
  userStore.logout()
  router.push('/login')
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

const loadRecentLogs = () => {
  // Load from localStorage for now (could be from Supabase for synced logs)
  const stored = JSON.parse(localStorage.getItem('unsynced_logs') || '[]')
  recentLogs.value = stored.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
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

// Initialize
onMounted(async () => {
  try {
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
    
    // Check GPS permission
    const hasGps = await requestGpsPermission()
    if (!hasGps) {
      showGpsModal.value = true
    } else {
      startLocationTracking()
    }
  } catch (error) {
    console.error('Driver initialization error:', error)
    alert('❌ Driver profile not found. Please contact admin.')
    logout()
  }
})
</script> 