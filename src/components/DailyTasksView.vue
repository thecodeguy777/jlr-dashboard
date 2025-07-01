<template>
  <div class="min-h-screen text-white p-4">
    <!-- Simple Header -->
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold mb-2">📋 Today's Work</h1>
      <p class="text-xl text-white/80">{{ formatDate(today) }}</p>
      
          <!-- Real-time Status Indicator -->
    <div class="flex items-center justify-center gap-2 mt-2">
      <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
      <span class="text-sm text-green-400 font-medium">Live Updates Active</span>
    </div>

    <!-- Notification Permission Prompt -->
    <div v-if="notificationsSupported && !notificationPermission" 
      class="bg-orange-900/30 border border-orange-500/40 rounded-xl p-4 mt-3">
      <div class="flex items-center gap-3">
        <div class="text-2xl">🔔</div>
        <div class="flex-1">
          <h3 class="text-sm font-medium text-orange-300">Enable Notifications</h3>
          <p class="text-xs text-orange-200/80">Get instant alerts for new tasks</p>
        </div>
        <button @click="requestNotificationPermission" 
          class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          Enable
        </button>
      </div>
    </div>
    </div>

    <!-- Clock In/Out Section -->
    <div class="bg-white/10 rounded-2xl p-6 mb-8 text-center">
      <h2 class="text-2xl font-bold mb-4">⏰ Work Status</h2>
      
      <div v-if="!isClockedIn" class="space-y-4">
        <p class="text-xl text-white/80">Ready to start your day?</p>
        <button @click="clockIn" 
          class="w-full bg-green-600 hover:bg-green-700 text-white text-2xl font-bold py-6 rounded-xl transition shadow-lg">
          🕐 CLOCK IN & START
        </button>
      </div>
      
      <div v-else class="space-y-4">
        <p class="text-xl text-green-400">✅ You're clocked in!</p>
        <p class="text-lg text-white/60">Started at {{ clockInTime }}</p>
        <button @click="clockOut" 
          class="w-full bg-red-600 hover:bg-red-700 text-white text-xl font-bold py-4 rounded-xl transition">
          🕐 CLOCK OUT
        </button>
      </div>
    </div>

    <!-- Current Task - Big and Obvious -->
    <div v-if="isClockedIn && currentTask" class="bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl p-6 mb-8 shadow-xl">
      <h2 class="text-2xl font-bold mb-4 text-center">
        {{ currentTask.status === 'pending' ? '👉 NEXT TASK' : '🎯 CURRENT TASK' }}
      </h2>
      
      <div class="bg-white/20 rounded-xl p-4 mb-6">
        <h3 class="text-2xl font-bold mb-2">{{ currentTask.task_title }}</h3>
        <div class="flex items-center gap-2 text-xl mb-2">
          <span>📍</span>
          <span class="font-medium">{{ currentTask.destination_name }}</span>
        </div>
        <p class="text-lg text-white/90">{{ currentTask.destination_address }}</p>
        
        <div v-if="currentTask.task_description" class="mt-3 p-3 bg-white/10 rounded-lg">
          <p class="text-lg">📝 {{ currentTask.task_description }}</p>
        </div>
      </div>
      
      <!-- Big Action Buttons -->
      <div class="space-y-3">
        <button @click="navigateToTask(currentTask)" 
          class="w-full bg-blue-600 hover:bg-blue-700 text-white text-2xl font-bold py-6 rounded-xl transition shadow-lg flex items-center justify-center gap-3">
          🗺️ GET DIRECTIONS
        </button>
        
        <div v-if="currentTask.status === 'pending'" class="grid grid-cols-2 gap-3">
          <button @click="startTask(currentTask)"
            class="bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-4 rounded-xl transition">
            ▶️ START
          </button>
          <button @click="skipTask(currentTask)"
            class="bg-gray-600 hover:bg-gray-700 text-white text-xl font-bold py-4 rounded-xl transition">
            ⏭️ SKIP
          </button>
        </div>
        
        <button v-if="currentTask.status === 'in_progress'" @click="showArrivalConfirm = true"
          class="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-2xl font-bold py-6 rounded-xl transition shadow-lg">
          📍 I'VE ARRIVED
        </button>
      </div>
    </div>

    <!-- No Tasks State -->
    <div v-if="isClockedIn && !currentTask" class="text-center py-12">
      <div class="text-8xl mb-6">🎉</div>
      <h2 class="text-3xl font-bold mb-4">All Done!</h2>
      <p class="text-xl text-white/80 mb-6">You've completed all your tasks for today.</p>
      <button @click="clockOut" 
        class="bg-green-600 hover:bg-green-700 text-white text-2xl font-bold py-6 px-12 rounded-xl transition shadow-lg">
        🕐 CLOCK OUT
      </button>
    </div>

    <!-- Progress Summary - Simple -->
    <div v-if="isClockedIn && todayTasks.length > 0" class="bg-white/5 rounded-xl p-4 mb-6">
      <h3 class="text-xl font-bold mb-3 text-center">📊 Today's Progress</h3>
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <div class="text-3xl font-bold text-green-400">{{ completedTasks.length }}</div>
          <div class="text-white/60">Done</div>
        </div>
        <div>
          <div class="text-3xl font-bold text-orange-400">{{ inProgressTasks.length }}</div>
          <div class="text-white/60">Working</div>
        </div>
        <div>
          <div class="text-3xl font-bold text-gray-400">{{ pendingTasks.length }}</div>
          <div class="text-white/60">Waiting</div>
        </div>
      </div>
      
      <!-- Simple Progress Bar -->
      <div class="mt-4">
        <div class="bg-white/20 rounded-full h-4">
          <div class="bg-green-500 h-4 rounded-full transition-all duration-500" 
               :style="{ width: progressPercentage + '%' }"></div>
        </div>
        <p class="text-center mt-2 text-lg font-bold">{{ progressPercentage }}% Complete</p>
      </div>
    </div>

    <!-- Arrival Confirmation Modal -->
    <div v-if="showArrivalConfirm" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
        <h3 class="text-2xl font-bold mb-4 text-center">📍 Confirm Arrival</h3>
        <p class="text-lg text-center mb-6">Are you at the correct location?</p>
        <p class="text-center text-white/70 mb-6">{{ currentTask?.destination_name }}</p>
        
        <div class="space-y-3">
          <button @click="confirmArrival" 
            class="w-full bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-4 rounded-xl transition">
            ✅ YES, I'M HERE
          </button>
          <button @click="showArrivalConfirm = false" 
            class="w-full bg-gray-600 hover:bg-gray-700 text-white text-xl font-bold py-4 rounded-xl transition">
            ❌ NOT YET
          </button>
        </div>
      </div>
    </div>

    <!-- Task Completion Modal -->
    <div v-if="showCompletionModal" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
        <h3 class="text-2xl font-bold mb-4 text-center">✅ Complete Task</h3>
        <p class="text-lg text-center mb-6">{{ taskToComplete?.task_title }}</p>
        
        <div class="mb-4">
          <label class="block text-lg font-medium mb-2">Any notes? (Optional)</label>
          <textarea v-model="completionNotes" rows="3" 
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-lg"
            placeholder="Everything went well..."></textarea>
        </div>
        
        <div class="space-y-3">
          <button @click="completeCurrentTask" 
            class="w-full bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-4 rounded-xl transition">
            ✅ TASK COMPLETE
          </button>
          <button @click="showCompletionModal = false" 
            class="w-full bg-gray-600 hover:bg-gray-700 text-white text-xl font-bold py-4 rounded-xl transition">
            ❌ CANCEL
          </button>
        </div>
      </div>
    </div>

    <!-- Action Buttons - Always Available -->
    <div class="fixed bottom-4 right-4 flex flex-col gap-3">
      <!-- Notification Test (only if enabled) -->
      <button v-if="notificationPermission" @click="testNotification"
        class="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition">
        <span class="text-xl">🔔</span>
      </button>
      
      <!-- Refresh Button -->
      <button @click="refreshTasks" :disabled="loading"
        class="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-full shadow-lg transition disabled:opacity-50">
        <span class="text-2xl">{{ loading ? '⏳' : '🔄' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { useDriverTracking } from '@/composables/useDriverTracking'
import { useSyncManager } from '@/composables/useSyncManager'
import { usePWANotifications } from '@/composables/usePWANotifications'

// Composables
const { driverId, isActiveRoute, startBreadcrumbTracking, stopBreadcrumbTracking } = useDriverTracking()
const { syncData } = useSyncManager()
const { 
  isSupported: notificationsSupported,
  isPermissionGranted: notificationPermission,
  requestPermission: requestNotificationPermission,
  notifyNewTask,
  notifyTaskUpdate,
  testNotification
} = usePWANotifications()

// State
const loading = ref(false)
const todayTasks = ref([])
const isClockedIn = ref(false)
const clockInTime = ref('')
const showArrivalConfirm = ref(false)
const showCompletionModal = ref(false)
const taskToComplete = ref(null)
const completionNotes = ref('')

// Computed
const today = new Date().toISOString().split('T')[0]

const pendingTasks = computed(() => todayTasks.value.filter(t => t.status === 'pending'))
const completedTasks = computed(() => todayTasks.value.filter(t => t.status === 'completed'))
const inProgressTasks = computed(() => todayTasks.value.filter(t => t.status === 'in_progress'))

const currentTask = computed(() => {
  // Return in-progress task or next pending task
  return inProgressTasks.value[0] || pendingTasks.value[0] || null
})

const progressPercentage = computed(() => {
  if (todayTasks.value.length === 0) return 0
  return Math.round((completedTasks.value.length / todayTasks.value.length) * 100)
})

// Methods
const clockIn = async () => {
  try {
    const now = new Date()
    isClockedIn.value = true
    clockInTime.value = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    
    // Start GPS tracking
    startBreadcrumbTracking()
    
    // Log the clock in
    await syncData('delivery_logs', {
      driver_id: driverId.value,
      action_type: 'clock_in',
      timestamp: now.toISOString(),
      note: 'Clocked in for daily shift'
    })
    
    console.log('🕐 Clocked in successfully')
    
  } catch (error) {
    console.error('Error clocking in:', error)
    alert('Failed to clock in. Please try again.')
  }
}

const clockOut = async () => {
  if (confirm('Are you sure you want to clock out?')) {
    try {
      isClockedIn.value = false
      clockInTime.value = ''
      
      // Stop GPS tracking
      stopBreadcrumbTracking()
      
      // Log the clock out
      await syncData('delivery_logs', {
        driver_id: driverId.value,
        action_type: 'clock_out',
        timestamp: new Date().toISOString(),
        note: 'Clocked out - end of shift'
      })
      
      console.log('🕐 Clocked out successfully')
      
    } catch (error) {
      console.error('Error clocking out:', error)
      alert('Failed to clock out. Please try again.')
    }
  }
}

const refreshTasks = async () => {
  if (!driverId.value) return
  
  loading.value = true
  try {
    // Fetch today's tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('driver_tasks')
      .select('*')
      .eq('driver_id', driverId.value)
      .eq('task_date', today)
      .order('task_order', { ascending: true })
    
    if (tasksError) throw tasksError
    todayTasks.value = tasks || []
    
  } catch (error) {
    console.error('Error fetching tasks:', error)
  } finally {
    loading.value = false
  }
}

const navigateToTask = (task) => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${task.destination_lat},${task.destination_lng}&travelmode=driving`
  window.open(url, '_blank')
}

const startTask = async (task) => {
  try {
    const updateData = {
      status: 'in_progress',
      started_at: new Date().toISOString()
    }
    
    await syncData('driver_tasks', updateData, task.id)
    
    // Update local state
    const localTask = todayTasks.value.find(t => t.id === task.id)
    if (localTask) {
      Object.assign(localTask, updateData)
    }
    
  } catch (error) {
    console.error('Error starting task:', error)
    alert('Failed to start task')
  }
}

const confirmArrival = () => {
  showArrivalConfirm.value = false
  showCompletionModal.value = true
  taskToComplete.value = currentTask.value
}

const completeCurrentTask = async () => {
  try {
    const now = new Date().toISOString()
    const startTime = new Date(taskToComplete.value.started_at)
    const actualDuration = Math.round((Date.now() - startTime.getTime()) / (1000 * 60))
    
    const updateData = {
      status: 'completed',
      completed_at: now,
      actual_duration: actualDuration,
      completion_notes: completionNotes.value || 'Task completed successfully'
    }
    
    await syncData('driver_tasks', updateData, taskToComplete.value.id)
    
    // Update local state
    const localTask = todayTasks.value.find(t => t.id === taskToComplete.value.id)
    if (localTask) {
      Object.assign(localTask, updateData)
    }
    
    // Reset modal state
    showCompletionModal.value = false
    taskToComplete.value = null
    completionNotes.value = ''
    
    // Check if all tasks are completed
    setTimeout(() => {
      if (pendingTasks.value.length === 0 && inProgressTasks.value.length === 0) {
        alert('🎉 All tasks completed! Great work today!')
      }
    }, 500)
    
  } catch (error) {
    console.error('Error completing task:', error)
    alert('Failed to complete task')
  }
}

const skipTask = async (task) => {
  if (confirm(`Skip "${task.task_title}"?\nYou can come back to it later.`)) {
    try {
      await syncData('driver_tasks', { status: 'skipped' }, task.id)
      
      const localTask = todayTasks.value.find(t => t.id === task.id)
      if (localTask) {
        localTask.status = 'skipped'
      }
      
    } catch (error) {
      console.error('Error skipping task:', error)
      alert('Failed to skip task')
    }
  }
}

// Utility functions
const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })
}

// Real-time subscriptions for driver tasks
let driverTasksSubscription = null
let presenceInterval = null

const setupDriverRealTime = () => {
  if (!driverId.value) return
  
  console.log('🔄 Setting up real-time subscriptions for driver:', driverId.value)
  
  // Subscribe to driver_tasks changes for this specific driver
  driverTasksSubscription = supabase
    .channel(`driver_${driverId.value}_tasks`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'driver_tasks',
      filter: `driver_id=eq.${driverId.value}`
    }, (payload) => {
      console.log('🔄 Real-time driver task update:', payload)
      handleDriverTaskUpdate(payload)
    })
    .subscribe()

  // Start reporting online presence
  startPresenceReporting()

  console.log('✅ Driver real-time subscriptions active')
}

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

const handleDriverTaskUpdate = async (payload) => {
  const { eventType, new: newRecord, old: oldRecord } = payload
  
  // Show mobile-friendly notification
  showMobileNotification(`📋 Task ${eventType}`)
  
  // Show PWA notification for specific events
  if (notificationPermission.value && newRecord) {
    if (eventType === 'INSERT') {
      // New task assigned
      notifyNewTask({
        id: newRecord.id,
        title: newRecord.task_title,
        type: newRecord.task_type
      })
    } else if (eventType === 'UPDATE' && oldRecord?.status !== newRecord.status) {
      // Task status changed
      notifyTaskUpdate({
        id: newRecord.id,
        title: newRecord.task_title,
        status: newRecord.status
      })
    }
  }
  
  // Refresh tasks to get latest state
  await refreshTasks()
}

const showMobileNotification = (message) => {
  // Create mobile-optimized floating notification
  const notification = document.createElement('div')
  notification.className = 'fixed top-20 left-4 right-4 bg-orange-600 text-white px-4 py-3 rounded-xl shadow-xl z-50 transform transition-all duration-300 text-center text-lg font-medium'
  notification.textContent = message
  notification.style.transform = 'translateY(-100px)'
  document.body.appendChild(notification)
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateY(0)'
  }, 100)
  
  // Remove after 4 seconds (longer for mobile)
  setTimeout(() => {
    notification.style.transform = 'translateY(-100px)'
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
    }, 300)
  }, 4000)
}

const cleanupDriverSubscriptions = () => {
  if (driverTasksSubscription) {
    supabase.removeChannel(driverTasksSubscription)
    driverTasksSubscription = null
  }
  
  if (presenceInterval) {
    clearInterval(presenceInterval)
    presenceInterval = null
  }
  
  // Mark driver as offline when leaving
  markDriverOffline()
  
  console.log('🔌 Driver real-time subscriptions cleaned up')
}

const markDriverOffline = async () => {
  if (!driverId.value) return
  
  try {
    // Try to update driver_presence table
    const { error: updateError } = await supabase
      .from('driver_presence')
      .update({
        is_online: false,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('driver_id', driverId.value)
    
    if (!updateError) {
      console.log('👋 Driver marked as offline')
      return
    }
    
    // Fallback: Log offline activity
    await supabase
      .from('delivery_logs')
      .insert({
        driver_id: driverId.value,
        action_type: 'presence_offline',
        timestamp: new Date().toISOString(),
        note: 'Driver went offline'
      })
    
  } catch (error) {
    console.error('❌ Error marking driver offline:', error)
  }
}

// Initialize
onMounted(() => {
  console.log('🚀 DailyTasksView mounted, driver ID:', driverId.value)
  
  refreshTasks()
  
  // Set up real-time once we have driver ID
  if (driverId.value) {
    setupDriverRealTime()
  } else {
    console.warn('⚠️ No driver ID available for real-time setup')
  }
  
  // Check if already clocked in (could persist this in localStorage)
  const savedClockIn = localStorage.getItem('driver_clocked_in')
  if (savedClockIn) {
    isClockedIn.value = true
    clockInTime.value = localStorage.getItem('driver_clock_time') || ''
  }
  
  // Add event listeners for browser/page events
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('beforeunload', handleBeforeUnload)
})

// Watch for driver ID changes and set up real-time
watch(driverId, (newDriverId, oldDriverId) => {
  console.log('🔄 Driver ID changed:', { old: oldDriverId, new: newDriverId })
  
  if (oldDriverId && oldDriverId !== newDriverId) {
    console.log('👋 Previous driver logging out')
    cleanupDriverSubscriptions()
  }
  
  if (newDriverId) {
    console.log('👋 New driver logging in:', newDriverId)
    cleanupDriverSubscriptions()
    setupDriverRealTime()
  }
}, { immediate: true })

// Watch for clock in/out state changes
watch(isClockedIn, (newValue) => {
  if (newValue) {
    localStorage.setItem('driver_clocked_in', 'true')
    localStorage.setItem('driver_clock_time', clockInTime.value)
  } else {
    localStorage.removeItem('driver_clocked_in')
    localStorage.removeItem('driver_clock_time')
  }
})

// Handle page visibility and unload events
const handleVisibilityChange = () => {
  if (document.hidden) {
    console.log('📱 Page hidden - driver going background')
  } else {
    console.log('📱 Page visible - driver back online')
    if (driverId.value) {
      updateDriverPresence()
    }
  }
}

const handleBeforeUnload = () => {
  console.log('👋 Page unloading - marking driver offline')
  markDriverOffline()
}

// Cleanup on unmount
onUnmounted(() => {
  console.log('🧹 DailyTasksView unmounting')
  cleanupDriverSubscriptions()
  
  // Remove event listeners
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})


</script> 