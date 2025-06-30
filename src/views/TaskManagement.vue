<template>
  <div class="min-h-screen text-white p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">📋 Task Management</h1>
        <p class="text-sm text-white/60">Assign and monitor daily driver tasks</p>
      </div>
      <div class="flex gap-3">
        <button @click="showQuickAssign = true"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
          ➕ Quick Assign
        </button>
        <button @click="refreshData" :disabled="loading"
          class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50">
          {{ loading ? '🔄 Loading...' : '🔄 Refresh' }}
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white/10 rounded-xl p-4">
        <h3 class="text-sm font-medium text-white/70">Today's Routes</h3>
        <p class="text-2xl font-bold text-blue-400 mt-1">{{ todayRoutes.length }}</p>
        <p class="text-xs text-white/50 mt-1">Active route plans</p>
      </div>
      <div class="bg-white/10 rounded-xl p-4">
        <h3 class="text-sm font-medium text-white/70">Pending Tasks</h3>
        <p class="text-2xl font-bold text-yellow-400 mt-1">{{ pendingTasksCount }}</p>
        <p class="text-xs text-white/50 mt-1">Awaiting start</p>
      </div>
      <div class="bg-white/10 rounded-xl p-4">
        <h3 class="text-sm font-medium text-white/70">In Progress</h3>
        <p class="text-2xl font-bold text-orange-400 mt-1">{{ inProgressTasksCount }}</p>
        <p class="text-xs text-white/50 mt-1">Currently active</p>
      </div>
      <div class="bg-white/10 rounded-xl p-4">
        <h3 class="text-sm font-medium text-white/70">Completed</h3>
        <p class="text-2xl font-bold text-green-400 mt-1">{{ completedTasksCount }}</p>
        <p class="text-xs text-white/50 mt-1">Finished today</p>
      </div>
    </div>

    <!-- Today's Routes -->
    <div class="bg-white/5 rounded-xl p-6 mb-6 border border-white/10">
      <h3 class="text-lg font-semibold mb-4">🚗 Today's Driver Routes</h3>
      
      <div v-if="todayRoutes.length === 0" class="text-center py-8 text-white/60">
        <div class="text-4xl mb-4">📅</div>
        <h3 class="text-lg font-medium mb-2">No Routes Assigned</h3>
        <p class="text-sm">Use "Quick Assign" to create tasks for drivers.</p>
      </div>
      
      <div class="grid gap-4">
        <div v-for="route in todayRoutes" :key="route.id" 
          class="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
          
          <!-- Route Header -->
          <div class="p-4 border-b border-white/10">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-medium text-lg">{{ route.drivers?.name || 'Unknown Driver' }}</h4>
                <p class="text-sm text-white/70">{{ route.plan_name || 'Daily Route' }}</p>
                <p class="text-xs text-white/50 mt-1">{{ route.tasks?.length || 0 }} tasks assigned</p>
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
                <div class="text-xs text-white/50 mt-1">
                  {{ getRouteProgress(route.tasks || []) }}% complete
                </div>
              </div>
            </div>
          </div>
          
          <!-- Tasks List -->
          <div class="p-4">
            <div v-if="!route.tasks || route.tasks.length === 0" class="text-center py-4 text-white/50">
              No tasks assigned to this route
            </div>
            
            <div v-else class="space-y-2">
              <div v-for="task in route.tasks" :key="task.id" 
                class="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                
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
                    <div class="text-xs text-white/60">
                      {{ getTaskTypeIcon(task.task_type) }} {{ task.destination_name }}
                    </div>
                  </div>
                </div>
                
                <div class="text-right">
                  <div :class="[
                    'px-2 py-1 rounded text-xs font-medium',
                    task.status === 'completed' ? 'bg-green-900 text-green-300' :
                    task.status === 'in_progress' ? 'bg-orange-900 text-orange-300' :
                    'bg-gray-900 text-gray-300'
                  ]">
                    {{ task.status.replace('_', ' ').toUpperCase() }}
                  </div>
                  <div v-if="task.completed_at" class="text-xs text-white/50 mt-1">
                    {{ formatTime(task.completed_at) }}
                  </div>
                  <div v-else-if="task.estimated_duration" class="text-xs text-white/50 mt-1">
                    ~{{ task.estimated_duration }}min
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Available Drivers -->
    <div class="bg-white/5 rounded-xl p-6 border border-white/10">
      <h3 class="text-lg font-semibold mb-4">👥 Available Drivers</h3>
      
      <div v-if="availableDrivers.length === 0" class="text-center py-8 text-white/60">
        <div class="text-4xl mb-4">👥</div>
        <h3 class="text-lg font-medium mb-2">All Drivers Assigned</h3>
        <p class="text-sm">All active drivers have routes for today.</p>
      </div>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="driver in availableDrivers" :key="driver.id" 
          class="bg-white/5 rounded-lg p-4 border border-white/10">
          
          <div class="flex justify-between items-start mb-3">
            <div>
              <h4 class="font-medium">{{ driver.name }}</h4>
              <p class="text-sm text-white/60">{{ driver.phone || 'No phone' }}</p>
            </div>
            <div class="w-3 h-3 rounded-full bg-green-400" title="Available"></div>
          </div>
          
          <button @click="assignTasksToDriver(driver)" 
            class="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-3 rounded-lg transition text-sm">
            📋 Assign Tasks
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Assign Modal -->
    <div v-if="showQuickAssign" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-2xl border border-orange-500/20 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-semibold">📋 Quick Task Assignment</h3>
          <button @click="showQuickAssign = false" class="text-gray-400 hover:text-white text-xl">✕</button>
        </div>
        
        <form @submit.prevent="handleQuickAssign" class="space-y-4">
          <!-- Driver Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Select Driver</label>
            <select v-model="quickAssign.driverId" required
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
              <option value="">Choose a driver...</option>
              <option v-for="driver in drivers" :key="driver.id" :value="driver.id">
                {{ driver.name }}
              </option>
            </select>
          </div>
          
          <!-- Route Name -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Route Name</label>
            <input v-model="quickAssign.routeName" type="text" required
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              placeholder="e.g., Morning Delivery Route">
          </div>
          
          <!-- Tasks -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Tasks</label>
            <div class="space-y-3 max-h-60 overflow-y-auto">
              <div v-for="(task, index) in quickAssign.tasks" :key="index" 
                class="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                
                <div class="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <input v-model="task.title" type="text" required
                      class="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm text-white"
                      placeholder="Task title">
                  </div>
                  <div>
                    <select v-model="task.type" required
                      class="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm text-white">
                      <option value="delivery">📦 Delivery</option>
                      <option value="pickup">📋 Pickup</option>
                      <option value="service">🔧 Service</option>
                      <option value="inspection">🔍 Inspection</option>
                    </select>
                  </div>
                </div>
                
                <div class="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <select v-model="task.clientId" required
                      class="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm text-white"
                      @change="handleClientSelection($event, index)">
                      <option value="">Choose location...</option>
                      <option value="__CREATE_NEW__" class="text-green-300">➕ Create New Location</option>
                      <optgroup label="Existing Clients">
                        <option v-for="client in clients" :key="client.id" :value="client.id">
                          {{ client.name }}
                        </option>
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <input v-model="task.estimatedDuration" type="number" min="1" max="480"
                      class="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm text-white"
                      placeholder="Duration (min)">
                  </div>
                </div>
                
                <!-- Show selected client details -->
                <div v-if="task.clientId" class="bg-gray-800/50 rounded px-3 py-2 mb-3 text-xs">
                  <div class="flex items-center gap-2 text-green-300">
                    <span>📍</span>
                    <span>{{ getClientById(task.clientId)?.address }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-blue-300 mt-1">
                    <span>🎯</span>
                    <span>GPS: {{ getClientById(task.clientId)?.location_lat?.toFixed(4) }}, {{ getClientById(task.clientId)?.location_lng?.toFixed(4) }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-orange-300 mt-1">
                    <span>🏢</span>
                    <span>Geofence: {{ getClientById(task.clientId)?.geofence_radius }}m radius</span>
                  </div>
                </div>
                
                <textarea v-model="task.description" rows="3"
                  class="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm text-white"
                  placeholder="Task description and instructions (optional)"></textarea>
                
                <div class="flex justify-between items-center mt-2">
                  <span class="text-xs text-gray-400">Task {{ index + 1 }}</span>
                  <button v-if="quickAssign.tasks.length > 1" @click="quickAssign.tasks.splice(index, 1)" 
                    type="button" class="text-red-400 hover:text-red-300 text-sm">
                    🗑️ Remove
                  </button>
                </div>
              </div>
            </div>
            
            <button @click="addTask" type="button" 
              class="mt-3 w-full bg-green-600/20 hover:bg-green-600/30 text-green-300 py-2 rounded-lg text-sm border border-green-600/20">
              ➕ Add Another Task
            </button>
          </div>
          
          <!-- Actions -->
          <div class="flex gap-3 pt-4 border-t border-gray-600">
            <button type="button" @click="showQuickAssign = false"
              class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition">
              Cancel
            </button>
            <button type="submit" :disabled="assignLoading"
              class="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg transition">
              {{ assignLoading ? '⏳ Assigning...' : '📋 Assign Tasks' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Create Client Modal -->
    <div v-if="showCreateClient" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-2xl border border-green-500/20 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-semibold text-green-400">📍 Create New Client Location</h3>
          <button @click="showCreateClient = false; resetCreateClientForm()" 
            class="text-gray-400 hover:text-white text-xl">✕</button>
        </div>
        
        <form @submit.prevent="handleCreateClient" class="space-y-4">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Client Name *</label>
              <input v-model="newClient.name" type="text" required
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="e.g., ABC Company">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Phone</label>
              <input v-model="newClient.phone" type="tel"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="e.g., +63 912 345 6789">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input v-model="newClient.email" type="email"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="e.g., contact@company.com">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Geofence Radius (meters)</label>
              <input v-model="newClient.geofence_radius" type="number" min="10" max="500"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="50">
            </div>
          </div>

          <!-- Address -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Address</label>
            <input v-model="newClient.address" type="text"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              placeholder="Full street address">
          </div>

          <!-- Location Picker -->
          <div class="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
            <div class="flex justify-between items-center mb-3">
              <h4 class="font-medium text-green-300">📍 GPS Location *</h4>
              <div class="flex gap-2">
                <button type="button" @click="useCurrentLocation" 
                  class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition">
                  📍 Use Current
                </button>
                <button type="button" @click="openMapPicker" 
                  class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition">
                  🗺️ Pick on Map
                </button>
              </div>
            </div>
            
            <!-- Google Maps Link Input -->
            <div class="mb-4 p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
              <label class="block text-sm font-medium text-orange-300 mb-2">
                🔗 Or Paste Google Maps Link
              </label>
              <div class="flex gap-2">
                <input v-model="newClient.mapsLink" type="url"
                  @paste="handleLinkAutoParse"
                  @input="handleLinkInput"
                  class="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                  placeholder="https://www.google.com/maps/...">
                <button type="button" @click="handleMapsLinkPaste"
                  class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-sm transition">
                  🎯 Extract
                </button>
              </div>
              <div class="text-xs text-orange-200 mt-2">
                <div class="mb-1">💡 Coordinates extract automatically when you paste!</div>
                <details class="mt-1">
                  <summary class="cursor-pointer text-orange-300 hover:text-orange-200">📋 Supported link formats</summary>
                  <div class="mt-1 pl-2 space-y-1 text-gray-300">
                    <div>• Direct: google.com/maps?q=14.5995,120.9842</div>
                    <div>• Place: google.com/maps/place/.../@14.5995,120.9842,17z</div>
                    <div>• Search: google.com/maps/search/...</div>
                    <div>• Mobile share links from Google Maps app</div>
                  </div>
                </details>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-gray-400 mb-1">Latitude *</label>
                <input v-model="newClient.location_lat" type="number" step="any" required
                  class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                  placeholder="14.5995">
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">Longitude *</label>
                <input v-model="newClient.location_lng" type="number" step="any" required
                  class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                  placeholder="120.9842">
              </div>
            </div>
            
            <!-- Preview Map Link -->
            <div v-if="newClient.location_lat && newClient.location_lng" class="mt-3">
              <a :href="`https://www.google.com/maps?q=${newClient.location_lat},${newClient.location_lng}`" 
                target="_blank"
                class="text-blue-400 hover:text-blue-300 text-sm">
                🗺️ Preview Location on Google Maps
              </a>
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Notes</label>
            <textarea v-model="newClient.notes" rows="2"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              placeholder="Any special notes about this location..."></textarea>
          </div>

          <!-- Instructions -->
          <div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <h5 class="text-sm font-medium text-blue-300 mb-2">📋 Easy ways to get GPS coordinates:</h5>
            <div class="text-xs text-blue-200 space-y-2">
              <div>
                <div class="font-medium text-orange-300">🔗 Method 1: Google Maps Link (Easiest)</div>
                <div>• Share location from Google Maps app → Copy link → Paste above → Click "Extract"</div>
              </div>
              <div>
                <div class="font-medium text-blue-300">📍 Method 2: Use Current Location</div>
                <div>• Click "Use Current" button → Allow location access</div>
              </div>
              <div>
                <div class="font-medium text-green-300">🗺️ Method 3: Pick on Map</div>
                <div>• Click "Pick on Map" → Navigate to location → Right-click → "What's here?" → Copy coordinates</div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-4 border-t border-gray-600">
            <button type="button" @click="showCreateClient = false; resetCreateClientForm()"
              class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition">
              Cancel
            </button>
            <button type="submit"
              class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition">
              📍 Create Client & Select
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useTaskManagement } from '@/composables/useTaskManagement'

// Composables
const { getTaskTypeIcon, getRouteProgress } = useTaskManagement()

// State
const loading = ref(false)
const assignLoading = ref(false)
const drivers = ref([])
const todayRoutes = ref([])
const allTasks = ref([])
const clients = ref([])
const showQuickAssign = ref(false)
const showCreateClient = ref(false)
const selectedTaskIndex = ref(null)

// Quick assign form
const quickAssign = ref({
  driverId: '',
  routeName: '',
  tasks: [
    {
      title: '',
      type: 'delivery',
      clientId: '',
      description: '',
      estimatedDuration: 30
    }
  ]
})

// Create client form
const newClient = ref({
  name: '',
  address: '',
  phone: '',
  email: '',
  location_lat: null,
  location_lng: null,
  geofence_radius: 50,
  notes: '',
  mapsLink: ''
})

// Computed
const todayTasksFlat = computed(() => {
  return todayRoutes.value.flatMap(route => route.tasks || [])
})

const pendingTasksCount = computed(() => 
  todayTasksFlat.value.filter(task => task.status === 'pending').length
)

const inProgressTasksCount = computed(() => 
  todayTasksFlat.value.filter(task => task.status === 'in_progress').length
)

const completedTasksCount = computed(() => 
  todayTasksFlat.value.filter(task => task.status === 'completed').length
)

const assignedDriverIds = computed(() => 
  new Set(todayRoutes.value.map(route => route.driver_id))
)

const availableDrivers = computed(() => 
  drivers.value.filter(driver => !assignedDriverIds.value.has(driver.id))
)

// Methods
const refreshData = async () => {
  loading.value = true
  try {
    await Promise.all([
      fetchDrivers(),
      fetchTodayRoutes(),
      fetchClients()
    ])
  } finally {
    loading.value = false
  }
}

const fetchDrivers = async () => {
  const { data, error } = await supabase
    .from('drivers')
    .select('id, name, phone')
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

const fetchClients = async () => {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, address, location_lat, location_lng, geofence_radius')
    .eq('is_active', true)
    .order('name')
  
  if (error) throw error
  clients.value = data || []
}

const addTask = () => {
  quickAssign.value.tasks.push({
    title: '',
    type: 'delivery',
    clientId: '',
    description: '',
    estimatedDuration: 30
  })
}

const getClientById = (clientId) => {
  return clients.value.find(client => client.id === clientId)
}

const handleClientSelection = (event, taskIndex) => {
  const value = event.target.value
  if (value === '__CREATE_NEW__') {
    selectedTaskIndex.value = taskIndex
    showCreateClient.value = true
    // Reset the select back to empty
    quickAssign.value.tasks[taskIndex].clientId = ''
  }
}

const useCurrentLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        newClient.value.location_lat = position.coords.latitude
        newClient.value.location_lng = position.coords.longitude
        alert(`✅ Current location captured!\nLat: ${position.coords.latitude.toFixed(6)}\nLng: ${position.coords.longitude.toFixed(6)}`)
      },
      (error) => {
        console.warn('Geolocation failed:', error)
        alert('❌ Unable to get current location. Please use map picker or enter coordinates manually.')
      }
    )
  } else {
    alert('❌ Geolocation is not supported by this browser.')
  }
}

const openMapPicker = () => {
  // Get user's current location as default
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        newClient.value.location_lat = position.coords.latitude
        newClient.value.location_lng = position.coords.longitude
        openGoogleMapsPicker()
      },
      (error) => {
        console.warn('Geolocation failed:', error)
        // Default to Manila coordinates
        newClient.value.location_lat = 14.5995
        newClient.value.location_lng = 120.9842
        openGoogleMapsPicker()
      }
    )
  } else {
    // Default to Manila coordinates
    newClient.value.location_lat = 14.5995
    newClient.value.location_lng = 120.9842
    openGoogleMapsPicker()
  }
}

const openGoogleMapsPicker = () => {
  const lat = newClient.value.location_lat || 14.5995
  const lng = newClient.value.location_lng || 120.9842
  const url = `https://www.google.com/maps/@${lat},${lng},17z`
  
  alert(`📍 Opening Google Maps for location selection.\n\n1. Navigate to the exact location\n2. Right-click on the spot\n3. Copy the coordinates\n4. Paste them back in the form\n\nCurrent coordinates: ${lat}, ${lng}`)
  window.open(url, '_blank')
}

const handleCreateClient = async () => {
  try {
    if (!newClient.value.name || !newClient.value.location_lat || !newClient.value.location_lng) {
      alert('Please fill in client name and location coordinates')
      return
    }
    
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: newClient.value.name,
        address: newClient.value.address,
        phone: newClient.value.phone,
        email: newClient.value.email,
        location_lat: parseFloat(newClient.value.location_lat),
        location_lng: parseFloat(newClient.value.location_lng),
        geofence_radius: newClient.value.geofence_radius,
        notes: newClient.value.notes,
        is_active: true
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Add to local clients array
    clients.value.push(data)
    
    // Auto-select the new client for the task
    if (selectedTaskIndex.value !== null) {
      quickAssign.value.tasks[selectedTaskIndex.value].clientId = data.id
    }
    
    // Reset form and close modal
    resetCreateClientForm()
    showCreateClient.value = false
    
    alert(`✅ Client "${data.name}" created successfully and selected!`)
    
  } catch (error) {
    console.error('Error creating client:', error)
    alert(`❌ Failed to create client: ${error.message}`)
  }
}

const parseGoogleMapsLink = async (link) => {
  if (!link || !link.trim()) {
    return null
  }
  
  try {
    let url = link.trim()
    
    // Handle shortened Google Maps links (maps.app.goo.gl)
    if (url.includes('maps.app.goo.gl') || url.includes('goo.gl')) {
      try {
        // For shortened links, we need to resolve the redirect
        // Since we can't directly follow redirects in browser, we'll try to extract from the link
        // or prompt user to use the full URL
        alert('📍 Shortened Google Maps links detected!\n\nPlease:\n1. Open the link in a new tab\n2. Copy the full URL from the address bar\n3. Paste that full URL here instead')
        return null
      } catch (error) {
        console.error('Error resolving shortened link:', error)
        return null
      }
    }
    
    // Pattern 1: Direct coordinate query (?q=lat,lng)
    let match = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/i)
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2]),
        source: 'query'
      }
    }
    
    // Pattern 2: Place with coordinates /@lat,lng,zoom
    match = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*),(\d+)/i)
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2]),
        source: 'place'
      }
    }
    
    // Pattern 3: Search coordinates in URL
    match = url.match(/[-]?\d+\.?\d*,[-]?\d+\.?\d*/)
    if (match) {
      const coords = match[0].split(',')
      if (coords.length === 2) {
        const lat = parseFloat(coords[0])
        const lng = parseFloat(coords[1])
        
        // Validate coordinate ranges
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return {
            lat: lat,
            lng: lng,
            source: 'extracted'
          }
        }
      }
    }
    
    // Pattern 4: ll parameter (lat,lng)
    match = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/i)
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2]),
        source: 'll_param'
      }
    }
    
    return null
    
  } catch (error) {
    console.error('Error parsing Google Maps link:', error)
    return null
  }
}

const handleMapsLinkPaste = async () => {
  if (!newClient.value.mapsLink) {
    return
  }
  
  const coordinates = await parseGoogleMapsLink(newClient.value.mapsLink)
  
  if (coordinates) {
    newClient.value.location_lat = coordinates.lat
    newClient.value.location_lng = coordinates.lng
    
    alert(`✅ Coordinates extracted successfully!\n\nLatitude: ${coordinates.lat}\nLongitude: ${coordinates.lng}\nSource: ${coordinates.source}`)
  } else {
    alert(`❌ Could not extract coordinates from this link.\n\nSupported formats:\n• https://www.google.com/maps?q=14.5995,120.9842\n• https://www.google.com/maps/place/.../@14.5995,120.9842,17z\n• https://www.google.com/maps/search/...\n\nFor shortened links (goo.gl), please use the full URL instead.`)
  }
}

const handleLinkAutoParse = async (event) => {
  // Wait for the paste to complete
  setTimeout(async () => {
    const link = event.target.value || newClient.value.mapsLink
    if (link && link.includes('google.com/maps')) {
      const coordinates = await parseGoogleMapsLink(link)
      if (coordinates) {
        newClient.value.location_lat = coordinates.lat
        newClient.value.location_lng = coordinates.lng
        
        // Show a subtle notification
        const notification = document.createElement('div')
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50'
        notification.textContent = `✅ Coordinates auto-extracted: ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`
        document.body.appendChild(notification)
        
        setTimeout(() => {
          document.body.removeChild(notification)
        }, 3000)
      }
    }
  }, 100)
}

const handleLinkInput = async (event) => {
  const link = event.target.value
  if (link && (link.includes('google.com/maps') || link.includes('maps.app.goo.gl'))) {
    // Auto-detect when a full URL is entered
    if (link.length > 30) { // Reasonable minimum for a Google Maps URL
      const coordinates = await parseGoogleMapsLink(link)
      if (coordinates) {
        newClient.value.location_lat = coordinates.lat
        newClient.value.location_lng = coordinates.lng
      }
    }
  }
}

const resetCreateClientForm = () => {
  newClient.value = {
    name: '',
    address: '',
    phone: '',
    email: '',
    location_lat: null,
    location_lng: null,
    geofence_radius: 50,
    notes: '',
    mapsLink: ''
  }
  selectedTaskIndex.value = null
}

const handleQuickAssign = async () => {
  assignLoading.value = true
  
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Create new route plan (multiple plans per driver per day are now allowed)
    const { data: routePlan, error: routeError } = await supabase
      .from('daily_route_plans')
      .insert({
        driver_id: quickAssign.value.driverId,
        plan_date: today,
        plan_name: quickAssign.value.routeName,
        total_estimated_duration: quickAssign.value.tasks.reduce((sum, task) => sum + (task.estimatedDuration || 0), 0)
      })
      .select()
      .single()
    
    if (routeError) throw routeError
    
    // Get current highest task order for this driver today
    const { data: existingTasks, error: tasksCheckError } = await supabase
      .from('driver_tasks')
      .select('task_order')
      .eq('driver_id', quickAssign.value.driverId)
      .eq('task_date', today)
      .order('task_order', { ascending: false })
      .limit(1)
    
    if (tasksCheckError) throw tasksCheckError
    
    const startingOrder = existingTasks && existingTasks.length > 0 
      ? existingTasks[0].task_order + 1 
      : 1
    
    // Create tasks with client data
    const tasksToInsert = quickAssign.value.tasks.map((task, index) => {
      const client = getClientById(task.clientId)
      if (!client) {
        throw new Error(`Client not found for task ${index + 1}`)
      }
      
      return {
        driver_id: quickAssign.value.driverId,
        task_date: today,
        task_order: startingOrder + index,
        task_type: task.type,
        task_title: task.title,
        task_description: task.description || null,
        destination_name: client.name,
        destination_address: client.address,
        destination_lat: client.location_lat,
        destination_lng: client.location_lng,
        geofence_radius: client.geofence_radius || 50,
        estimated_duration: task.estimatedDuration || 30,
        priority: 'normal'
      }
    })
    
    const { error: tasksError } = await supabase
      .from('driver_tasks')
      .insert(tasksToInsert)
    
    if (tasksError) throw tasksError
    
    // Reset form
    quickAssign.value = {
      driverId: '',
      routeName: '',
      tasks: [{
        title: '',
        type: 'delivery',
        clientId: '',
        description: '',
        estimatedDuration: 30
      }]
    }
    
    showQuickAssign.value = false
    await refreshData()
    
    alert(`✅ Successfully assigned ${tasksToInsert.length} tasks!`)
    
  } catch (error) {
    console.error('Error assigning tasks:', error)
    alert(`❌ Failed to assign tasks: ${error.message}`)
  } finally {
    assignLoading.value = false
  }
}

const assignTasksToDriver = (driver) => {
  quickAssign.value.driverId = driver.id
  quickAssign.value.routeName = `${driver.name}'s Route`
  showQuickAssign.value = true
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