<template>
  <div class="min-h-screen text-white p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">🎯 Task Management</h1>
        <p class="text-sm text-white/60">Create and assign daily tasks for drivers</p>
      </div>
      <div class="flex gap-3">
        <button @click="showCreateTemplate = true"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
          ➕ New Template
        </button>
        <button @click="showAssignTasks = true"
          class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition">
          📋 Assign Tasks
        </button>
        <button @click="refreshData" :disabled="loading"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50">
          {{ loading ? '🔄 Loading...' : '🔄 Refresh' }}
        </button>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white/10 rounded-xl p-4">
        <h3 class="text-sm font-medium text-white/70">Active Templates</h3>
        <p class="text-2xl font-bold text-green-400 mt-1">{{ activeTemplates.length }}</p>
      </div>
      <div class="bg-white/10 rounded-xl p-4">
        <h3 class="text-sm font-medium text-white/70">Today's Routes</h3>
        <p class="text-2xl font-bold text-orange-400 mt-1">{{ todayRoutes.length }}</p>
      </div>
      <div class="bg-white/10 rounded-xl p-4">
        <h3 class="text-sm font-medium text-white/70">Pending Tasks</h3>
        <p class="text-2xl font-bold text-yellow-400 mt-1">{{ pendingTasksCount }}</p>
      </div>
      <div class="bg-white/10 rounded-xl p-4">
        <h3 class="text-sm font-medium text-white/70">Completed Tasks</h3>
        <p class="text-2xl font-bold text-blue-400 mt-1">{{ completedTasksCount }}</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="mb-6">
      <div class="flex gap-4">
        <button v-for="tab in tabs" :key="tab.key"
          @click="activeTab = tab.key"
          :class="[
            'px-4 py-2 rounded-lg transition font-medium',
            activeTab === tab.key 
              ? 'bg-orange-600 text-white' 
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          ]">
          {{ tab.name }}
        </button>
      </div>
    </div>

    <!-- Templates Tab -->
    <div v-if="activeTab === 'templates'" class="space-y-4">
      <h3 class="text-lg font-semibold">Task Templates</h3>
      
      <div v-if="templates.length === 0" class="text-center py-12 text-white/60">
        <div class="text-6xl mb-4">📝</div>
        <h3 class="text-xl font-medium mb-2">No Templates Created</h3>
        <p>Create reusable task templates to quickly assign daily routes.</p>
      </div>
      
      <div class="grid gap-4">
        <div v-for="template in templates" :key="template.id" 
          class="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-orange-500/30 transition">
          
          <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-3">
              <span class="text-2xl">{{ getTaskTypeIcon(template.task_type) }}</span>
              <div>
                <h4 class="font-medium text-lg">{{ template.template_name }}</h4>
                <p class="text-sm text-white/70">{{ template.task_title }}</p>
              </div>
            </div>
            
            <div class="flex gap-2">
              <button @click="editTemplate(template)"
                class="text-orange-400 hover:text-orange-300 p-1">
                ✏️
              </button>
              <button @click="toggleTemplate(template)"
                :class="[
                  'px-2 py-1 rounded text-xs',
                  template.is_active ? 'bg-green-900 text-green-300' : 'bg-gray-900 text-gray-300'
                ]">
                {{ template.is_active ? 'Active' : 'Disabled' }}
              </button>
            </div>
          </div>
          
          <div class="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <div class="text-white/60 mb-1">📍 Location</div>
              <div class="font-medium">{{ template.destination_name }}</div>
              <div class="text-xs text-white/60">{{ template.destination_address }}</div>
            </div>
            
            <div>
              <div class="text-white/60 mb-1">⏱️ Details</div>
              <div>Est. {{ template.estimated_duration || 30 }} minutes</div>
              <div class="text-xs text-white/60 capitalize">{{ template.task_type }}</div>
            </div>
          </div>
          
          <div v-if="template.description" class="mt-3 pt-3 border-t border-white/10">
            <div class="text-xs text-white/60 mb-1">📝 Description</div>
            <p class="text-sm">{{ template.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Today's Routes Tab -->
    <div v-if="activeTab === 'routes'" class="space-y-4">
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-semibold">Today's Routes ({{ todayRoutes.length }})</h3>
        <button @click="showBulkAssign = true"
          class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition text-sm">
          🎯 Bulk Assign
        </button>
      </div>
      
      <div v-if="todayRoutes.length === 0" class="text-center py-12 text-white/60">
        <div class="text-6xl mb-4">📅</div>
        <h3 class="text-xl font-medium mb-2">No Routes for Today</h3>
        <p>Assign tasks to drivers to get started.</p>
      </div>
      
      <div class="space-y-4">
        <div v-for="route in todayRoutes" :key="route.id" 
          class="bg-white/5 rounded-xl border border-white/10">
          
          <!-- Route Header -->
          <div class="p-4 border-b border-white/10">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-medium text-lg">{{ route.plan_name || 'Daily Route' }}</h4>
                <p class="text-sm text-white/70">{{ route.drivers?.name || 'Unknown Driver' }}</p>
              </div>
              
              <div class="text-right">
                <span :class="[
                  'px-3 py-1 rounded-full text-xs font-medium',
                  route.status === 'started' ? 'bg-green-900 text-green-300' :
                  route.status === 'completed' ? 'bg-blue-900 text-blue-300' :
                  'bg-gray-900 text-gray-300'
                ]">
                  {{ route.status.toUpperCase() }}
                </span>
                <div class="text-xs text-white/60 mt-1">
                  {{ route.tasks?.length || 0 }} tasks
                </div>
              </div>
            </div>
          </div>
          
          <!-- Route Tasks -->
          <div class="p-4">
            <div class="space-y-2">
              <div v-for="task in route.tasks" :key="task.id" 
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
                    <div class="text-xs text-white/60">{{ task.destination_name }}</div>
                  </div>
                </div>
                
                <div class="text-right">
                  <div :class="[
                    'px-2 py-1 rounded text-xs',
                    task.status === 'completed' ? 'bg-green-900 text-green-300' :
                    task.status === 'in_progress' ? 'bg-orange-900 text-orange-300' :
                    'bg-gray-900 text-gray-300'
                  ]">
                    {{ task.status.replace('_', ' ').toUpperCase() }}
                  </div>
                  <div v-if="task.completed_at" class="text-xs text-white/60 mt-1">
                    {{ formatTime(task.completed_at) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- All Tasks Tab -->
    <div v-if="activeTab === 'tasks'" class="space-y-4">
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-semibold">All Tasks</h3>
        <div class="flex gap-2">
          <select v-model="taskFilter" class="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="skipped">Skipped</option>
          </select>
          <input v-model="dateFilter" type="date" 
            class="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
            :value="new Date().toISOString().split('T')[0]">
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full text-sm bg-white/5 rounded-xl border border-white/10">
          <thead class="border-b border-white/10">
            <tr>
              <th class="text-left p-4">Task</th>
              <th class="text-left p-4">Driver</th>
              <th class="text-left p-4">Status</th>
              <th class="text-left p-4">Location</th>
              <th class="text-left p-4">Times</th>
              <th class="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in filteredTasks" :key="task.id" 
              class="border-b border-white/5 hover:bg-white/5">
              
              <td class="p-4">
                <div class="flex items-center gap-2">
                  <span>{{ getTaskTypeIcon(task.task_type) }}</span>
                  <div>
                    <div class="font-medium">{{ task.task_title }}</div>
                    <div class="text-xs text-white/60">Order: {{ task.task_order }}</div>
                  </div>
                </div>
              </td>
              
              <td class="p-4">
                <div class="font-medium">{{ task.drivers?.name || 'Unknown' }}</div>
                <div class="text-xs text-white/60">{{ formatDate(task.task_date) }}</div>
              </td>
              
              <td class="p-4">
                <span :class="[
                  'px-2 py-1 rounded text-xs',
                  task.status === 'completed' ? 'bg-green-900 text-green-300' :
                  task.status === 'in_progress' ? 'bg-orange-900 text-orange-300' :
                  task.status === 'pending' ? 'bg-gray-900 text-gray-300' :
                  'bg-red-900 text-red-300'
                ]">
                  {{ task.status.replace('_', ' ').toUpperCase() }}
                </span>
              </td>
              
              <td class="p-4">
                <div class="text-xs">{{ task.destination_name }}</div>
                <div class="text-xs text-white/60">{{ task.destination_address }}</div>
              </td>
              
              <td class="p-4 text-xs">
                <div v-if="task.started_at">Started: {{ formatTime(task.started_at) }}</div>
                <div v-if="task.completed_at">Completed: {{ formatTime(task.completed_at) }}</div>
                <div v-if="task.actual_duration">Duration: {{ task.actual_duration }}min</div>
              </td>
              
              <td class="p-4">
                <button @click="viewTaskDetails(task)"
                  class="text-blue-400 hover:text-blue-300 text-xs">
                  View Details
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Template Modal -->
    <TemplateModal 
      v-if="showCreateTemplate"
      :template="editingTemplate"
      @save="saveTemplate"
      @cancel="showCreateTemplate = false; editingTemplate = null"
    />

    <!-- Assign Tasks Modal -->
    <AssignTasksModal
      v-if="showAssignTasks"
      :drivers="drivers"
      :templates="activeTemplates"
      @assign="assignTasks"
      @cancel="showAssignTasks = false"
    />

    <!-- Bulk Assign Modal -->
    <BulkAssignModal
      v-if="showBulkAssign"
      :drivers="drivers"
      :templates="activeTemplates"
      @assign="bulkAssignTasks"
      @cancel="showBulkAssign = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import TemplateModal from './TemplateModal.vue'
import AssignTasksModal from './AssignTasksModal.vue'
import BulkAssignModal from './BulkAssignModal.vue'

// State
const loading = ref(false)
const activeTab = ref('templates')
const templates = ref([])
const drivers = ref([])
const todayRoutes = ref([])
const allTasks = ref([])
const taskFilter = ref('')
const dateFilter = ref(new Date().toISOString().split('T')[0])

// Modals
const showCreateTemplate = ref(false)
const showAssignTasks = ref(false)
const showBulkAssign = ref(false)
const editingTemplate = ref(null)

// Tabs
const tabs = [
  { key: 'templates', name: '📝 Templates' },
  { key: 'routes', name: '🚗 Today\'s Routes' },
  { key: 'tasks', name: '📋 All Tasks' }
]

// Computed
const activeTemplates = computed(() => templates.value.filter(t => t.is_active))

const filteredTasks = computed(() => {
  let filtered = allTasks.value
  
  if (taskFilter.value) {
    filtered = filtered.filter(task => task.status === taskFilter.value)
  }
  
  if (dateFilter.value) {
    filtered = filtered.filter(task => task.task_date === dateFilter.value)
  }
  
  return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
})

const pendingTasksCount = computed(() => {
  return allTasks.value.filter(task => 
    task.status === 'pending' && task.task_date === new Date().toISOString().split('T')[0]
  ).length
})

const completedTasksCount = computed(() => {
  return allTasks.value.filter(task => 
    task.status === 'completed' && task.task_date === new Date().toISOString().split('T')[0]
  ).length
})

// Methods
const refreshData = async () => {
  loading.value = true
  try {
    await Promise.all([
      fetchTemplates(),
      fetchDrivers(),
      fetchTodayRoutes(),
      fetchAllTasks()
    ])
  } finally {
    loading.value = false
  }
}

const fetchTemplates = async () => {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  templates.value = data || []
}

const fetchDrivers = async () => {
  const { data, error } = await supabase
    .from('drivers')
    .select('id, name, phone, user_id')
    .order('name')
  
  if (error) throw error
  drivers.value = data || []
}

const fetchTodayRoutes = async () => {
  const today = new Date().toISOString().split('T')[0]
  
  // Fetch route plans
  const { data: routePlans, error: routeError } = await supabase
    .from('daily_route_plans')
    .select(`
      *,
      drivers (id, name, phone)
    `)
    .eq('plan_date', today)
    .order('created_at', { ascending: false })
  
  if (routeError) throw routeError
  
  // Fetch all tasks for today
  const { data: todayTasks, error: tasksError } = await supabase
    .from('driver_tasks')
    .select('*')
    .eq('task_date', today)
    .order('driver_id, task_order')
  
  if (tasksError) throw tasksError
  
  // Group tasks by driver_id and attach to route plans
  const tasksGrouped = {}
  todayTasks?.forEach(task => {
    if (!tasksGrouped[task.driver_id]) {
      tasksGrouped[task.driver_id] = []
    }
    tasksGrouped[task.driver_id].push(task)
  })
  
  // Attach tasks to route plans
  const routesWithTasks = routePlans?.map(route => ({
    ...route,
    tasks: tasksGrouped[route.driver_id] || []
  })) || []
  
  todayRoutes.value = routesWithTasks
}

const fetchAllTasks = async () => {
  const { data, error } = await supabase
    .from('driver_tasks')
    .select(`
      *,
      drivers (id, name, phone)
    `)
    .order('created_at', { ascending: false })
    .limit(500)
  
  if (error) throw error
  allTasks.value = data || []
}

const saveTemplate = async (templateData) => {
  try {
    if (editingTemplate.value) {
      // Update existing template
      const { error } = await supabase
        .from('task_templates')
        .update(templateData)
        .eq('id', editingTemplate.value.id)
      
      if (error) throw error
      
      // Update local state
      const index = templates.value.findIndex(t => t.id === editingTemplate.value.id)
      if (index >= 0) {
        templates.value[index] = { ...editingTemplate.value, ...templateData }
      }
      
    } else {
      // Create new template
      const { data, error } = await supabase
        .from('task_templates')
        .insert(templateData)
        .select()
        .single()
      
      if (error) throw error
      templates.value.unshift(data)
    }
    
    showCreateTemplate.value = false
    editingTemplate.value = null
    
  } catch (error) {
    console.error('Error saving template:', error)
    alert('Failed to save template')
  }
}

const editTemplate = (template) => {
  editingTemplate.value = template
  showCreateTemplate.value = true
}

const toggleTemplate = async (template) => {
  try {
    const { error } = await supabase
      .from('task_templates')
      .update({ is_active: !template.is_active })
      .eq('id', template.id)
    
    if (error) throw error
    
    template.is_active = !template.is_active
    
  } catch (error) {
    console.error('Error toggling template:', error)
    alert('Failed to update template')
  }
}

const assignTasks = async (assignmentData) => {
  try {
    // Create route plan
    const { data: routePlan, error: routeError } = await supabase
      .from('daily_route_plans')
      .insert({
        driver_id: assignmentData.driverId,
        plan_date: assignmentData.date,
        plan_name: assignmentData.planName,
        total_estimated_duration: assignmentData.tasks.reduce((sum, task) => sum + (task.estimated_duration || 0), 0)
      })
      .select()
      .single()
    
    if (routeError) throw routeError
    
    // Create tasks
    const tasksToInsert = assignmentData.tasks.map((task, index) => ({
      driver_id: assignmentData.driverId,
      task_date: assignmentData.date,
      task_order: index + 1,
      task_type: task.task_type,
      task_title: task.task_title,
      task_description: task.task_description,
      instructions: task.instructions,
      destination_name: task.destination_name,
      destination_address: task.destination_address,
      destination_lat: task.destination_lat,
      destination_lng: task.destination_lng,
      geofence_radius: task.geofence_radius,
      estimated_duration: task.estimated_duration,
      priority: task.priority || 'normal'
    }))
    
    const { error: tasksError } = await supabase
      .from('driver_tasks')
      .insert(tasksToInsert)
    
    if (tasksError) throw tasksError
    
    showAssignTasks.value = false
    await refreshData()
    
    alert(`Successfully assigned ${tasksToInsert.length} tasks!`)
    
  } catch (error) {
    console.error('Error assigning tasks:', error)
    alert('Failed to assign tasks')
  }
}

const bulkAssignTasks = async (bulkData) => {
  // Similar to assignTasks but for multiple drivers
  // Implementation would handle multiple drivers at once
  console.log('Bulk assign tasks:', bulkData)
  showBulkAssign.value = false
}

const viewTaskDetails = (task) => {
  // Open detailed task view modal
  console.log('View task details:', task)
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
    month: 'short',
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
  refreshData()
})
</script> 