<template>
  <div class="min-h-screen text-white p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">📋 Today's Tasks</h1>
        <p class="text-sm text-white/60">{{ formatDate(today) }} • {{ todayTasks.length }} tasks assigned</p>
      </div>
      <div class="flex gap-3">
        <button @click="refreshTasks" :disabled="loading"
          class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50">
          🔄 {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
        <button @click="startDailyRoute" v-if="canStartRoute" :disabled="isRouteActive"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50">
          🚀 Start Daily Route
        </button>
      </div>
    </div>

    <!-- Route Progress Summary -->
    <div v-if="routePlan" class="bg-white/10 rounded-xl p-4 mb-6 border border-orange-500/20">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold text-orange-300">{{ routePlan.plan_name || 'Daily Route' }}</h3>
        <span :class="[
          'px-3 py-1 rounded-full text-xs font-medium',
          routePlan.status === 'started' ? 'bg-green-900 text-green-300' :
          routePlan.status === 'completed' ? 'bg-blue-900 text-blue-300' :
          'bg-gray-900 text-gray-300'
        ]">
          {{ routePlan.status.toUpperCase() }}
        </span>
      </div>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div class="text-center">
          <div class="text-2xl font-bold text-green-400">{{ completedTasks.length }}</div>
          <div class="text-white/60">Completed</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-orange-400">{{ pendingTasks.length }}</div>
          <div class="text-white/60">Remaining</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-400">{{ totalEstimatedTime }}min</div>
          <div class="text-white/60">Est. Time</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-purple-400">{{ progressPercentage }}%</div>
          <div class="text-white/60">Progress</div>
        </div>
      </div>
      
      <!-- Progress Bar -->
      <div class="mt-4">
        <div class="bg-white/20 rounded-full h-2">
          <div class="bg-gradient-to-r from-orange-500 to-green-500 h-2 rounded-full transition-all duration-500" 
               :style="{ width: progressPercentage + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- Current/Next Task Highlight -->
    <div v-if="currentTask" class="bg-gradient-to-r from-orange-600/20 to-red-600/20 rounded-xl p-4 mb-6 border border-orange-500">
      <div class="flex items-center gap-3 mb-3">
        <div class="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
        <h3 class="text-lg font-semibold">{{ currentTask.status === 'pending' ? 'Next Task' : 'Current Task' }}</h3>
      </div>
      
      <div class="grid md:grid-cols-2 gap-4">
        <div>
          <h4 class="font-medium text-lg">{{ currentTask.task_title }}</h4>
          <p class="text-white/70 text-sm mb-2">{{ currentTask.task_description }}</p>
          <div class="flex items-center gap-2 text-sm text-orange-300">
            <span>📍</span>
            <span>{{ currentTask.destination_name }}</span>
          </div>
          <div class="text-xs text-white/60 mt-1">{{ currentTask.destination_address }}</div>
        </div>
        
        <div class="space-y-3">
          <button @click="navigateToTask(currentTask)" 
            class="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition flex items-center justify-center gap-2">
            🗺️ Navigate Here
          </button>
          
          <button v-if="currentTask.status === 'pending'" @click="startTask(currentTask)"
            class="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition flex items-center justify-center gap-2">
            ▶️ Start Task
          </button>
          
          <button v-if="currentTask.status === 'in_progress'" @click="completeTask(currentTask)"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition flex items-center justify-center gap-2">
            ✅ Mark Complete
          </button>
        </div>
      </div>
    </div>

    <!-- Task List -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold mb-4">All Tasks for Today</h3>
      
      <div v-if="todayTasks.length === 0" class="text-center py-12 text-white/60">
        <div class="text-6xl mb-4">📋</div>
        <h3 class="text-xl font-medium mb-2">No Tasks Assigned</h3>
        <p>Check with your supervisor or refresh to see if new tasks are available.</p>
      </div>
      
      <div v-for="task in todayTasks" :key="task.id" 
           :class="[
             'bg-white/5 rounded-xl p-4 border transition-all',
             task.status === 'completed' ? 'border-green-500/30 bg-green-900/10' :
             task.status === 'in_progress' ? 'border-orange-500/50 bg-orange-900/10' :
             task.status === 'pending' ? 'border-white/10' :
             'border-red-500/30 bg-red-900/10'
           ]">
        
        <!-- Task Header -->
        <div class="flex justify-between items-start mb-3">
          <div class="flex items-center gap-3">
            <div :class="[
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
              task.status === 'completed' ? 'bg-green-600' :
              task.status === 'in_progress' ? 'bg-orange-600' :
              task.status === 'pending' ? 'bg-gray-600' :
              'bg-red-600'
            ]">
              {{ task.task_order }}
            </div>
            <div>
              <h4 class="font-medium">{{ task.task_title }}</h4>
              <div class="flex items-center gap-2 text-sm text-white/70">
                <span>{{ getTaskTypeIcon(task.task_type) }}</span>
                <span class="capitalize">{{ task.task_type }}</span>
                <span v-if="task.priority !== 'normal'" :class="[
                  'px-2 py-0.5 rounded text-xs',
                  task.priority === 'urgent' ? 'bg-red-600' :
                  task.priority === 'high' ? 'bg-orange-600' :
                  'bg-blue-600'
                ]">
                  {{ task.priority.toUpperCase() }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="text-right">
            <div :class="[
              'px-2 py-1 rounded text-xs font-medium mb-1',
              task.status === 'completed' ? 'bg-green-900 text-green-300' :
              task.status === 'in_progress' ? 'bg-orange-900 text-orange-300' :
              task.status === 'pending' ? 'bg-gray-900 text-gray-300' :
              'bg-red-900 text-red-300'
            ]">
              {{ task.status.replace('_', ' ').toUpperCase() }}
            </div>
            <div v-if="task.estimated_duration" class="text-xs text-white/60">
              ~{{ task.estimated_duration }}min
            </div>
          </div>
        </div>
        
        <!-- Task Details -->
        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <p v-if="task.task_description" class="text-sm text-white/80 mb-2">{{ task.task_description }}</p>
            
            <div class="space-y-1 text-sm">
              <div class="flex items-center gap-2">
                <span>📍</span>
                <span class="font-medium">{{ task.destination_name }}</span>
              </div>
              <div class="text-white/60 text-xs ml-6">{{ task.destination_address }}</div>
              
              <div v-if="task.instructions && Object.keys(task.instructions).length > 0" class="mt-2">
                <div class="text-xs text-orange-300 mb-1">📝 Special Instructions:</div>
                <div class="text-xs text-white/70 bg-white/5 p-2 rounded">
                  <div v-for="(value, key) in task.instructions" :key="key">
                    <strong>{{ key }}:</strong> {{ value }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <!-- Timing Info -->
            <div v-if="task.estimated_arrival" class="text-sm mb-2">
              <div class="text-white/60">Estimated Arrival:</div>
              <div class="font-medium">{{ formatTime(task.estimated_arrival) }}</div>
            </div>
            
            <!-- Completion Info -->
            <div v-if="task.completed_at" class="text-sm">
              <div class="text-green-400">✅ Completed:</div>
              <div class="font-medium">{{ formatTime(task.completed_at) }}</div>
              <div v-if="task.completion_notes" class="text-xs text-white/70 mt-1">
                "{{ task.completion_notes }}"
              </div>
            </div>
            
            <!-- Started Info -->
            <div v-else-if="task.started_at" class="text-sm">
              <div class="text-orange-400">▶️ Started:</div>
              <div class="font-medium">{{ formatTime(task.started_at) }}</div>
            </div>
          </div>
        </div>
        
        <!-- Task Actions -->
        <div class="flex gap-2 pt-3 border-t border-white/10">
          <button @click="navigateToTask(task)" 
            class="flex-1 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 py-2 px-3 rounded-lg transition text-sm flex items-center justify-center gap-2">
            🗺️ Navigate
          </button>
          
          <button v-if="task.status === 'pending'" @click="startTask(task)"
            class="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-300 py-2 px-3 rounded-lg transition text-sm flex items-center justify-center gap-2">
            ▶️ Start
          </button>
          
          <button v-if="task.status === 'in_progress'" @click="completeTask(task)"
            class="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 py-2 px-3 rounded-lg transition text-sm flex items-center justify-center gap-2">
            ✅ Complete
          </button>
          
          <button v-if="task.status === 'pending'" @click="skipTask(task)"
            class="bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 py-2 px-3 rounded-lg transition text-sm">
            ⏭️ Skip
          </button>
        </div>
      </div>
    </div>

    <!-- Task Completion Modal -->
    <TaskCompletionModal
      v-if="showCompletionModal"
      :task="taskToComplete"
      @complete="handleTaskCompletion"
      @cancel="showCompletionModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useDriverTracking } from '@/composables/useDriverTracking'
import TaskCompletionModal from './TaskCompletionModal.vue'

// Composables
const { driverId, isActiveRoute, startBreadcrumbTracking } = useDriverTracking()

// State
const loading = ref(false)
const todayTasks = ref([])
const routePlan = ref(null)
const showCompletionModal = ref(false)
const taskToComplete = ref(null)

// Computed
const today = new Date().toISOString().split('T')[0]

const pendingTasks = computed(() => todayTasks.value.filter(t => t.status === 'pending'))
const completedTasks = computed(() => todayTasks.value.filter(t => t.status === 'completed'))
const inProgressTasks = computed(() => todayTasks.value.filter(t => t.status === 'in_progress'))

const currentTask = computed(() => {
  // Return in-progress task or next pending task
  return inProgressTasks.value[0] || pendingTasks.value[0] || null
})

const canStartRoute = computed(() => {
  return pendingTasks.value.length > 0 && !isActiveRoute.value
})

const totalEstimatedTime = computed(() => {
  return todayTasks.value.reduce((total, task) => total + (task.estimated_duration || 0), 0)
})

const progressPercentage = computed(() => {
  if (todayTasks.value.length === 0) return 0
  return Math.round((completedTasks.value.length / todayTasks.value.length) * 100)
})

// Methods
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
    
    // Fetch today's route plan
    const { data: plan, error: planError } = await supabase
      .from('daily_route_plans')
      .select('*')
      .eq('driver_id', driverId.value)
      .eq('plan_date', today)
      .single()
    
    // Don't throw error if no plan exists
    if (!planError) {
      routePlan.value = plan
    }
    
    todayTasks.value = tasks || []
    
  } catch (error) {
    console.error('Error fetching tasks:', error)
    alert('Failed to load tasks')
  } finally {
    loading.value = false
  }
}

const startDailyRoute = async () => {
  try {
    // Start GPS tracking
    startBreadcrumbTracking()
    
    // Update route plan status
    if (routePlan.value) {
      await supabase
        .from('daily_route_plans')
        .update({ 
          status: 'started',
          started_at: new Date().toISOString()
        })
        .eq('id', routePlan.value.id)
      
      routePlan.value.status = 'started'
      routePlan.value.started_at = new Date().toISOString()
    }
    
    console.log('🚀 Daily route started with GPS tracking')
    
  } catch (error) {
    console.error('Error starting daily route:', error)
    alert('Failed to start daily route')
  }
}

const navigateToTask = (task) => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${task.destination_lat},${task.destination_lng}&travelmode=driving`
  window.open(url, '_blank')
}

const startTask = async (task) => {
  try {
    await supabase
      .from('driver_tasks')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .eq('id', task.id)
    
    task.status = 'in_progress'
    task.started_at = new Date().toISOString()
    
    console.log(`✅ Started task: ${task.task_title}`)
    
  } catch (error) {
    console.error('Error starting task:', error)
    alert('Failed to start task')
  }
}

const completeTask = (task) => {
  taskToComplete.value = task
  showCompletionModal.value = true
}

const handleTaskCompletion = async (completionData) => {
  try {
    const now = new Date().toISOString()
    const startTime = new Date(taskToComplete.value.started_at)
    const actualDuration = Math.round((Date.now() - startTime.getTime()) / (1000 * 60))
    
    await supabase
      .from('driver_tasks')
      .update({
        status: 'completed',
        completed_at: now,
        actual_duration: actualDuration,
        completion_notes: completionData.notes,
        completion_location: completionData.location,
        completion_photo_url: completionData.photoUrl
      })
      .eq('id', taskToComplete.value.id)
    
    // Update local state
    const task = todayTasks.value.find(t => t.id === taskToComplete.value.id)
    if (task) {
      task.status = 'completed'
      task.completed_at = now
      task.actual_duration = actualDuration
      task.completion_notes = completionData.notes
      task.completion_location = completionData.location
      task.completion_photo_url = completionData.photoUrl
    }
    
    showCompletionModal.value = false
    taskToComplete.value = null
    
    console.log(`✅ Completed task: ${task.task_title}`)
    
    // Check if all tasks are completed
    if (pendingTasks.value.length === 0 && inProgressTasks.value.length === 0) {
      await completeRoutePlan()
    }
    
  } catch (error) {
    console.error('Error completing task:', error)
    alert('Failed to complete task')
  }
}

const skipTask = async (task) => {
  if (confirm(`Skip task "${task.task_title}"? You can come back to it later.`)) {
    try {
      await supabase
        .from('driver_tasks')
        .update({ status: 'skipped' })
        .eq('id', task.id)
      
      task.status = 'skipped'
      
    } catch (error) {
      console.error('Error skipping task:', error)
      alert('Failed to skip task')
    }
  }
}

const completeRoutePlan = async () => {
  if (routePlan.value) {
    try {
      await supabase
        .from('daily_route_plans')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', routePlan.value.id)
      
      routePlan.value.status = 'completed'
      routePlan.value.completed_at = new Date().toISOString()
      
      alert('🎉 All tasks completed! Great work today!')
      
    } catch (error) {
      console.error('Error completing route plan:', error)
    }
  }
}

// Utility functions
const getTaskTypeIcon = (type) => {
  const icons = {
    delivery: '📦',
    pickup: '📋',
    service: '🔧',
    inspection: '🔍',
    other: '📝'
  }
  return icons[type] || '📝'
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Initialize
onMounted(() => {
  refreshTasks()
})
</script> 