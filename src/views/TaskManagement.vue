<template>
  <div class="min-h-screen text-white p-3 sm:p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
    <!-- Mobile Header -->
    <div class="mb-4 sm:mb-6">
      <div class="flex justify-between items-start mb-3">
        <div class="flex-1">
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight">📋 Task Manager</h1>
          <div class="flex items-center gap-2">
            <p class="text-xs sm:text-sm text-white/60">Driver task planning</p>
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span class="text-xs text-green-400">Live</span>
            </div>
          </div>
        </div>
        <button @click="refreshData" :disabled="loading"
          class="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg transition disabled:opacity-50 text-sm touch-manipulation">
          {{ loading ? '🔄' : '🔄' }}
        </button>
      </div>
      
      <!-- Removed fixed button - now using floating action button -->
    </div>

    <!-- Mobile Calendar Navigation -->
    <div class="bg-white/5 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 border border-white/10">
      <!-- Mobile Date Controls -->
      <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        <!-- Navigation Row -->
        <div class="flex items-center gap-3 w-full sm:w-auto">
          <button @click="previousDay" class="bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-xl transition touch-manipulation flex-shrink-0">
            ←
          </button>
          <div class="text-center flex-1 min-w-0">
            <h2 class="text-lg sm:text-xl font-bold truncate">{{ selectedDateFormatted }}</h2>
            <p class="text-xs sm:text-sm text-white/60">
              {{ isToday ? 'Today' : getRelativeDay(selectedDate) }}
            </p>
          </div>
          <button @click="nextDay" class="bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-xl transition touch-manipulation flex-shrink-0">
            →
          </button>
        </div>
        
        <!-- Mobile Actions Row -->
        <div class="flex gap-2 w-full sm:w-auto">
          <button @click="goToToday" 
            :class="[
              'px-4 py-2 rounded-lg transition text-sm font-medium touch-manipulation flex-1 sm:flex-none',
              isToday ? 'bg-orange-600 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'
            ]">
            📅 Today
          </button>
          <button @click="viewMode = viewMode === 'day' ? 'week' : 'day'"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm font-medium touch-manipulation flex-1 sm:flex-none">
            {{ viewMode === 'day' ? '📊 Week' : '📋 Day' }}
          </button>
        </div>
      </div>

      <!-- Mobile Week View -->
      <div v-if="viewMode === 'week'" class="grid grid-cols-2 sm:grid-cols-7 gap-2 sm:gap-3">
        <div v-for="day in weekDaysData" :key="day.date" 
          @click="selectDate(day.date)"
          :class="[
            'p-3 sm:p-4 rounded-xl border cursor-pointer transition hover:bg-white/10 touch-manipulation',
            day.isSelected ? 'border-orange-500 bg-orange-600/20' :
            day.isToday ? 'border-blue-500 bg-blue-600/20' :
            'border-white/10 bg-white/5'
          ]">
          
          <div class="text-center">
            <div class="text-xs sm:text-xs text-white/60 mb-1">{{ day.dayName }}</div>
            <div class="text-lg sm:text-xl font-bold mb-2">{{ day.dayNumber }}</div>
            
            <div class="space-y-1 text-xs">
              <div v-if="day.routeCount > 0" class="flex justify-between items-center">
                <span class="text-white/70">Routes:</span>
                <span class="text-orange-300 font-medium">{{ day.routeCount }}</span>
              </div>
              <div v-if="day.taskCount > 0" class="flex justify-between items-center">
                <span class="text-white/70">Tasks:</span>
                <span class="text-blue-300 font-medium">{{ day.taskCount }}</span>
              </div>
              <div v-if="day.completedCount > 0" class="flex justify-between items-center">
                <span class="text-white/70">Done:</span>
                <span class="text-green-300 font-medium">{{ day.completedCount }}</span>
              </div>
            </div>
            
            <div v-if="day.taskCount === 0" class="text-xs text-white/40 mt-2">
              No tasks
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile Quick Day Navigation -->
      <div v-else class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button v-for="day in weekDaysData" :key="day.date"
          @click="selectDate(day.date)"
          :class="[
            'flex-shrink-0 px-4 py-3 rounded-xl transition text-sm font-medium whitespace-nowrap touch-manipulation min-w-[100px]',
            day.isSelected ? 'bg-orange-600 text-white shadow-lg' :
            day.isToday ? 'bg-blue-600 text-white shadow-lg' :
            'bg-white/10 text-white/80 hover:bg-white/20'
          ]">
          <div class="text-center">
            <div class="font-medium">{{ day.dayName }} {{ day.dayNumber }}</div>
            <div v-if="day.taskCount > 0" class="text-xs opacity-80 mt-1">
              {{ day.taskCount }} tasks
            </div>
            <div v-else class="text-xs opacity-50 mt-1">
              No tasks
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
      <div class="bg-white/10 rounded-xl p-3 sm:p-4">
        <h3 class="text-xs sm:text-sm font-medium text-white/70">{{ isToday ? "Today's" : "Routes" }}</h3>
        <p class="text-xl sm:text-2xl font-bold text-blue-400 mt-1">{{ todayRoutes.length }}</p>
        <p class="text-xs text-white/50 mt-1">Active plans</p>
      </div>
      <div class="bg-white/10 rounded-xl p-3 sm:p-4">
        <h3 class="text-xs sm:text-sm font-medium text-white/70">Pending</h3>
        <p class="text-xl sm:text-2xl font-bold text-yellow-400 mt-1">{{ pendingTasksCount }}</p>
        <p class="text-xs text-white/50 mt-1">Tasks waiting</p>
      </div>
      <div class="bg-white/10 rounded-xl p-3 sm:p-4">
        <h3 class="text-xs sm:text-sm font-medium text-white/70">In Progress</h3>
        <p class="text-xl sm:text-2xl font-bold text-orange-400 mt-1">{{ inProgressTasksCount }}</p>
        <p class="text-xs text-white/50 mt-1">Active now</p>
      </div>
      <div class="bg-white/10 rounded-xl p-3 sm:p-4">
        <h3 class="text-xs sm:text-sm font-medium text-white/70">Completed</h3>
        <p class="text-xl sm:text-2xl font-bold text-green-400 mt-1">{{ completedTasksCount }}</p>
        <p class="text-xs text-white/50 mt-1">Finished</p>
      </div>
      <div class="bg-white/10 rounded-xl p-3 sm:p-4 col-span-2 sm:col-span-1">
        <h3 class="text-xs sm:text-sm font-medium text-white/70">Drivers</h3>
        <div class="flex items-center gap-2 mt-1">
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span class="text-lg sm:text-xl font-bold text-green-400">{{ onlineDriversCount }}</span>
          </div>
          <span class="text-white/40">/</span>
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 bg-gray-500 rounded-full"></div>
            <span class="text-lg sm:text-xl font-bold text-gray-400">{{ offlineDriversCount }}</span>
          </div>
        </div>
        <p class="text-xs text-white/50 mt-1">Online / Offline</p>
      </div>
    </div>

    <!-- Selected Date Routes -->
    <div class="bg-white/5 rounded-xl p-6 mb-6 border border-white/10">
              <h3 class="text-lg font-semibold mb-4">🚗 {{ isToday ? "Today's" : selectedDateFormatted }} Driver Routes</h3>
      
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
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <h4 class="font-medium text-lg">{{ route.drivers?.name || 'Unknown Driver' }}</h4>
                  <div class="flex items-center gap-1">
                    <div :class="[
                      'w-2 h-2 rounded-full',
                      getDriverOnlineStatus(route.driver_id) ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
                    ]"></div>
                    <span :class="[
                      'text-xs font-medium',
                      getDriverOnlineStatus(route.driver_id) ? 'text-green-400' : 'text-gray-400'
                    ]">
                      {{ getDriverOnlineStatus(route.driver_id) ? 'Online' : 'Offline' }}
                    </span>
                  </div>
                </div>
                <p class="text-sm text-white/70">{{ route.plan_name || 'Daily Route' }}</p>
                <p class="text-xs text-white/50 mt-1">
                  {{ route.tasks?.length || 0 }} tasks assigned • Last seen: {{ getDriverLastSeen(route.driver_id) }}
                </p>
              </div>
              
              <div class="text-right">
                <div class="flex items-center gap-2 mb-2">
                  <button @click="openAddTask(route)" 
                    class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition">
                    ➕ Add Task
                  </button>
                </div>
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
                class="flex items-center justify-between p-3 bg-white/5 rounded-lg group">
                
                <div class="flex items-center gap-3">
                  <div :class="[
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                    task.status === 'completed' ? 'bg-green-600' :
                    task.status === 'in_progress' ? 'bg-orange-600' :
                    'bg-gray-600'
                  ]">
                    {{ task.task_order }}
                  </div>
                  
                  <div class="flex-1">
                    <div class="font-medium text-sm">{{ task.task_title }}</div>
                    <div class="text-xs text-white/60">
                      {{ getTaskTypeIcon(task.task_type) }} {{ task.destination_name }}
                    </div>
                    <div v-if="task.task_description" class="text-xs text-white/50 mt-1">
                      {{ task.task_description }}
                    </div>
                  </div>
                </div>
                
                <div class="flex items-center gap-2">
                  <!-- Task Actions -->
                  <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button @click="openEditTask(task)" 
                      :disabled="task.status === 'completed'"
                      class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-2 py-1 rounded text-xs transition">
                      ✏️ Edit
                    </button>
                    <button @click="deleteTask(task)" 
                      :disabled="task.status === 'in_progress' || task.status === 'completed'"
                      class="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-2 py-1 rounded text-xs transition">
                      🗑️ Delete
                    </button>
                  </div>
                  
                  <!-- Task Status -->
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
    </div>

    <!-- Available Drivers -->
    <div class="bg-white/5 rounded-xl p-6 border border-white/10">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">👥 Available Drivers {{ isToday ? 'Today' : `(${selectedDateFormatted})` }}</h3>
        <div class="flex items-center gap-3">
          <div class="text-xs text-white/50">
            Total: {{ drivers.length }} | Assigned: {{ assignedDriverIds.size }} | Available: {{ availableDrivers.length }}
          </div>
          <button @click="updateDriverPresence" 
            class="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-xs transition">
            🔄 Refresh Status
          </button>
        </div>
      </div>
      
      <!-- Debug Information -->
      <div v-if="drivers.length === 0" class="text-center py-8 text-white/60">
        <div class="text-4xl mb-4">❌</div>
        <h3 class="text-lg font-medium mb-2">No Drivers Found</h3>
        <p class="text-sm">No drivers exist in the database. Add drivers first.</p>
        <div class="space-y-2">
          <button @click="refreshData" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition">
            🔄 Refresh Data
          </button>
          <button @click="addTestDriver" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
            👤 Add Test Driver
          </button>
        </div>
      </div>
      
      <div v-else-if="availableDrivers.length === 0" class="text-center py-8 text-white/60">
        <div class="text-4xl mb-4">👥</div>
        <h3 class="text-lg font-medium mb-2">All Drivers Assigned</h3>
        <p class="text-sm mb-4">All {{ drivers.length }} drivers have routes for {{ isToday ? 'today' : selectedDateFormatted }}.</p>
        
        <!-- Show assigned drivers for reference -->
        <div class="bg-white/5 rounded-lg p-4 mb-4">
          <h4 class="text-sm font-medium mb-2">Drivers with routes {{ isToday ? 'today' : `on ${selectedDateFormatted}` }}:</h4>
          <div class="space-y-1 text-xs">
            <div v-for="route in todayRoutes" :key="route.id" class="flex justify-between">
              <span>{{ route.drivers?.name || 'Unknown Driver' }}</span>
              <span class="text-white/50">{{ route.tasks?.length || 0 }} tasks</span>
            </div>
          </div>
        </div>
        
        <p class="text-xs text-white/50">You can still add more tasks to existing routes using the "Add Task" button.</p>
      </div>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="driver in availableDrivers" :key="driver.id" 
          class="bg-white/5 rounded-lg p-4 border border-white/10">
          
          <div class="flex justify-between items-start mb-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h4 class="font-medium">{{ driver.name }}</h4>
                <div class="flex items-center gap-1">
                  <div :class="[
                    'w-2.5 h-2.5 rounded-full',
                    getDriverOnlineStatus(driver.id) ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
                  ]"></div>
                  <span :class="[
                    'text-xs font-medium',
                    getDriverOnlineStatus(driver.id) ? 'text-green-400' : 'text-gray-400'
                  ]">
                    {{ getDriverOnlineStatus(driver.id) ? 'Online' : 'Offline' }}
                  </span>
                </div>
              </div>
              <p class="text-sm text-white/60">{{ driver.phone || 'No phone' }}</p>
              <p class="text-xs text-white/40 mt-1">
                Last seen: {{ getDriverLastSeen(driver.id) }}
              </p>
            </div>
            <div :class="[
              'w-3 h-3 rounded-full',
              getDriverOnlineStatus(driver.id) ? 'bg-green-400' : 'bg-gray-500'
            ]" :title="getDriverOnlineStatus(driver.id) ? 'Online & Available' : 'Offline'"></div>
          </div>
          
          <button @click="assignTasksToDriver(driver)" 
            :disabled="!getDriverOnlineStatus(driver.id)"
            :class="[
              'w-full py-2 px-3 rounded-lg transition text-sm font-medium',
              getDriverOnlineStatus(driver.id) 
                ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            ]">
            {{ getDriverOnlineStatus(driver.id) ? '📋 Assign Tasks' : '📴 Driver Offline' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Floating Action Button -->
    <div class="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-40">
      <!-- Pulsing ring animation -->
      <div class="absolute inset-0 bg-green-600 rounded-full animate-ping opacity-75 pointer-events-none"></div>
      
      <!-- Main FAB -->
      <button @click="showQuickAssign = true"
        class="relative bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 touch-manipulation flex items-center justify-center group animate-bounce"
        style="animation-iteration-count: 3; animation-delay: 1s;"
        title="Add New Tasks"
        aria-label="Add new tasks to drivers">
        
        <span class="text-2xl sm:text-3xl font-bold group-hover:rotate-90 transition-transform duration-300">➕</span>
        
        <!-- Tooltip for desktop -->
        <div class="absolute bottom-full right-0 mb-2 hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div class="bg-gray-900 text-white text-sm font-medium px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            Add New Tasks
            <div class="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </button>
    </div>

    <!-- Quick Assign Modal -->
    <div v-if="showQuickAssign" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-2xl border border-orange-500/20 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-semibold">📋 Quick Task Assignment {{ isToday ? '(Today)' : `(${selectedDateFormatted})` }}</h3>
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

    <!-- Edit Task Modal -->
    <div v-if="showEditTask" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-2xl border border-blue-500/20 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-semibold text-blue-400">✏️ Edit Task</h3>
          <button @click="closeEditTask" class="text-gray-400 hover:text-white text-xl">✕</button>
        </div>
        
        <form @submit.prevent="handleEditTask" class="space-y-4">
          <!-- Task Details -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Task Title *</label>
              <input v-model="editingTask.task_title" type="text" required
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="Task title">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Task Type *</label>
              <select v-model="editingTask.task_type" required
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                <option value="delivery">📦 Delivery</option>
                <option value="pickup">📋 Pickup</option>
                <option value="service">🔧 Service</option>
                <option value="inspection">🔍 Inspection</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Location *</label>
              <select v-model="editingTask.clientId" required
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                <option value="">Choose location...</option>
                <option v-for="client in clients" :key="client.id" :value="client.id">
                  {{ client.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Duration (minutes)</label>
              <input v-model="editingTask.estimated_duration" type="number" min="1" max="480"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="30">
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Task Description</label>
            <textarea v-model="editingTask.task_description" rows="3"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              placeholder="Task description and instructions..."></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Priority</label>
              <select v-model="editingTask.priority"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Task Order</label>
              <input v-model="editingTask.task_order" type="number" min="1"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="1">
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-4 border-t border-gray-600">
            <button type="button" @click="closeEditTask"
              class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition">
              Cancel
            </button>
            <button type="submit" :disabled="assignLoading"
              class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg transition">
              {{ assignLoading ? '⏳ Saving...' : '💾 Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add Task Modal -->
    <div v-if="showAddTask" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-2xl border border-green-500/20 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-semibold text-green-400">➕ Add New Task</h3>
          <button @click="closeAddTask" class="text-gray-400 hover:text-white text-xl">✕</button>
        </div>
        
        <form @submit.prevent="handleAddTask" class="space-y-4">
          <!-- Task Details -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Task Title *</label>
              <input v-model="newTask.title" type="text" required
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="Task title">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Task Type *</label>
              <select v-model="newTask.type" required
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                <option value="delivery">📦 Delivery</option>
                <option value="pickup">📋 Pickup</option>
                <option value="service">🔧 Service</option>
                <option value="inspection">🔍 Inspection</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Location *</label>
              <select v-model="newTask.clientId" @change="handleNewTaskClientSelection" required
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
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
              <label class="block text-sm font-medium text-gray-300 mb-2">Duration (minutes)</label>
              <input v-model="newTask.estimatedDuration" type="number" min="1" max="480"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="30">
            </div>
          </div>

          <!-- Show selected client details -->
          <div v-if="newTask.clientId && newTask.clientId !== '__CREATE_NEW__'" class="bg-gray-700/50 rounded px-3 py-2 text-xs">
            <div class="flex items-center gap-2 text-green-300">
              <span>📍</span>
              <span>{{ getClientById(newTask.clientId)?.address }}</span>
            </div>
            <div class="flex items-center gap-2 text-blue-300 mt-1">
              <span>🎯</span>
              <span>GPS: {{ getClientById(newTask.clientId)?.location_lat?.toFixed(4) }}, {{ getClientById(newTask.clientId)?.location_lng?.toFixed(4) }}</span>
            </div>
            <div class="flex items-center gap-2 text-orange-300 mt-1">
              <span>🏢</span>
              <span>Geofence: {{ getClientById(newTask.clientId)?.geofence_radius }}m radius</span>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Task Description</label>
            <textarea v-model="newTask.description" rows="3"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              placeholder="Task description and instructions..."></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Priority</label>
              <select v-model="newTask.priority"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Insert Position</label>
              <select v-model="newTask.insertPosition"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                <option value="end">At the end</option>
                <option value="start">At the beginning</option>
                <option value="after">After specific task</option>
              </select>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-4 border-t border-gray-600">
            <button type="button" @click="closeAddTask"
              class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition">
              Cancel
            </button>
            <button type="submit" :disabled="assignLoading"
              class="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg transition">
              {{ assignLoading ? '⏳ Adding...' : '➕ Add Task' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
const showEditTask = ref(false)
const showAddTask = ref(false)
const editingTask = ref(null)
const addTaskRouteId = ref(null)

// Calendar/Date State
const selectedDate = ref(new Date().toISOString().split('T')[0])
const viewMode = ref('day') // 'day', 'week'
const weekDates = ref([])
const routesByDate = ref({})

// Driver Online Status
const driverPresence = ref(new Map()) // Map of driver_id -> { isOnline, lastSeen }
const ONLINE_THRESHOLD = 5 * 60 * 1000 // 5 minutes

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

// New task form
const newTask = ref({
  title: '',
  type: 'delivery',
  clientId: '',
  description: '',
  estimatedDuration: 30,
  priority: 'normal',
  insertPosition: 'end'
})

// Computed
const today = computed(() => new Date().toISOString().split('T')[0])

const isToday = computed(() => selectedDate.value === today.value)

const selectedDateFormatted = computed(() => {
  return new Date(selectedDate.value).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

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

const onlineDriversCount = computed(() => 
  drivers.value.filter(driver => getDriverOnlineStatus(driver.id)).length
)

const offlineDriversCount = computed(() => 
  drivers.value.length - onlineDriversCount.value
)

const weekDaysData = computed(() => {
  return weekDates.value.map(date => {
    const routes = routesByDate.value[date] || []
    const tasks = routes.flatMap(route => route.tasks || [])
    
    return {
      date,
      dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: new Date(date).getDate(),
      isToday: date === today.value,
      isSelected: date === selectedDate.value,
      routeCount: routes.length,
      taskCount: tasks.length,
      completedCount: tasks.filter(t => t.status === 'completed').length,
      pendingCount: tasks.filter(t => t.status === 'pending').length
    }
  })
})

// Methods
// Calendar & Date Navigation Methods
const generateWeekDates = () => {
  const current = new Date(selectedDate.value)
  const dayOfWeek = current.getDay()
  const startOfWeek = new Date(current)
  startOfWeek.setDate(current.getDate() - dayOfWeek)
  
  const dates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    dates.push(date.toISOString().split('T')[0])
  }
  
  weekDates.value = dates
}

const selectDate = (date) => {
  selectedDate.value = date
  fetchRoutesForDate(date)
}

const previousDay = () => {
  const current = new Date(selectedDate.value)
  current.setDate(current.getDate() - 1)
  selectDate(current.toISOString().split('T')[0])
}

const nextDay = () => {
  const current = new Date(selectedDate.value)
  current.setDate(current.getDate() + 1)
  selectDate(current.toISOString().split('T')[0])
}

const goToToday = () => {
  selectDate(today.value)
}

const getRelativeDay = (date) => {
  const target = new Date(date)
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  
  const diffTime = target - todayDate
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays > 1) return `In ${diffDays} days`
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`
  return date
}

const fetchRoutesForDate = async (date) => {
  try {
    // Fetch route plans for the specific date
    const { data: routePlans, error: routeError } = await supabase
      .from('daily_route_plans')
      .select(`
        *,
        drivers (id, name, phone)
      `)
      .eq('plan_date', date)
      .order('created_at', { ascending: false })
    
    if (routeError) throw routeError
    
    // Fetch all tasks for the specific date
    const { data: dateTasks, error: tasksError } = await supabase
      .from('driver_tasks')
      .select('*')
      .eq('task_date', date)
      .order('driver_id, task_order')
    
    if (tasksError) throw tasksError
    
    // Group tasks by driver_id and attach to route plans
    const tasksGrouped = {}
    dateTasks?.forEach(task => {
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
    
    // Store in the current routes (for compatibility with existing UI)
    todayRoutes.value = routesWithTasks
    
    // Also store in the week data cache
    routesByDate.value[date] = routesWithTasks
    
    console.log(`✅ Routes fetched for ${date}:`, routesWithTasks.length)
    
  } catch (error) {
    console.error(`❌ Error fetching routes for ${date}:`, error)
    todayRoutes.value = []
    routesByDate.value[date] = []
  }
}

const fetchWeekData = async () => {
  try {
    // Fetch route plans for the entire week
    const startDate = weekDates.value[0]
    const endDate = weekDates.value[6]
    
    const { data: routePlans, error: routeError } = await supabase
      .from('daily_route_plans')
      .select(`
        *,
        drivers (id, name, phone)
      `)
      .gte('plan_date', startDate)
      .lte('plan_date', endDate)
      .order('plan_date, created_at')
    
    if (routeError) throw routeError
    
    // Fetch all tasks for the week
    const { data: weekTasks, error: tasksError } = await supabase
      .from('driver_tasks')
      .select('*')
      .gte('task_date', startDate)
      .lte('task_date', endDate)
      .order('task_date, driver_id, task_order')
    
    if (tasksError) throw tasksError
    
    // Group by date and driver
    const routesByDateLocal = {}
    weekDates.value.forEach(date => {
      routesByDateLocal[date] = []
    })
    
    // Group route plans by date
    const routePlansByDate = {}
    routePlans?.forEach(route => {
      if (!routePlansByDate[route.plan_date]) {
        routePlansByDate[route.plan_date] = []
      }
      routePlansByDate[route.plan_date].push(route)
    })
    
    // Group tasks by date and driver
    const tasksByDateAndDriver = {}
    weekTasks?.forEach(task => {
      if (!tasksByDateAndDriver[task.task_date]) {
        tasksByDateAndDriver[task.task_date] = {}
      }
      if (!tasksByDateAndDriver[task.task_date][task.driver_id]) {
        tasksByDateAndDriver[task.task_date][task.driver_id] = []
      }
      tasksByDateAndDriver[task.task_date][task.driver_id].push(task)
    })
    
    // Combine routes and tasks for each date
    Object.keys(routePlansByDate).forEach(date => {
      const routesForDate = routePlansByDate[date].map(route => ({
        ...route,
        tasks: tasksByDateAndDriver[date]?.[route.driver_id] || []
      }))
      routesByDateLocal[date] = routesForDate
    })
    
    routesByDate.value = routesByDateLocal
    
    console.log('✅ Week data fetched:', Object.keys(routesByDate.value))
    
  } catch (error) {
    console.error('❌ Error fetching week data:', error)
  }
}

const refreshData = async () => {
  loading.value = true
  try {
    generateWeekDates()
    await Promise.all([
      fetchDrivers(),
      fetchRoutesForDate(selectedDate.value),
      fetchClients(),
      fetchWeekData()
    ])
  } finally {
    loading.value = false
  }
}

const fetchDrivers = async () => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('id, name, phone')
      .order('name')
    
    if (error) throw error
    drivers.value = data || []
    
    console.log('✅ Drivers fetched:', drivers.value.length, drivers.value)
  } catch (error) {
    console.error('❌ Error fetching drivers:', error)
    drivers.value = []
  }
}

// Legacy method - replaced by fetchRoutesForDate for calendar functionality
// const fetchTodayRoutes = ...

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

const handleNewTaskClientSelection = (event) => {
  const value = event.target.value
  if (value === '__CREATE_NEW__') {
    showCreateClient.value = true
    // Reset the select back to empty
    newTask.value.clientId = ''
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
      // For quick assign form
      quickAssign.value.tasks[selectedTaskIndex.value].clientId = data.id
    } else if (showAddTask.value) {
      // For add new task form
      newTask.value.clientId = data.id
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
    // Use the selected date instead of hardcoded today
    const taskDate = selectedDate.value
    
    // Create new route plan (multiple plans per driver per day are now allowed)
    const { data: routePlan, error: routeError } = await supabase
      .from('daily_route_plans')
      .insert({
        driver_id: quickAssign.value.driverId,
        plan_date: taskDate,
        plan_name: quickAssign.value.routeName,
        total_estimated_duration: quickAssign.value.tasks.reduce((sum, task) => sum + (task.estimatedDuration || 0), 0)
      })
      .select()
      .single()
    
    if (routeError) throw routeError
    
    // Get current highest task order for this driver on the selected date
    const { data: existingTasks, error: tasksCheckError } = await supabase
      .from('driver_tasks')
      .select('task_order')
      .eq('driver_id', quickAssign.value.driverId)
      .eq('task_date', taskDate)
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
        task_date: taskDate,
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
    
    const dateDisplay = isToday.value ? 'today' : selectedDateFormatted.value
    alert(`✅ Successfully assigned ${tasksToInsert.length} tasks for ${dateDisplay}!`)
    
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

// Edit Task Methods
const openEditTask = (task) => {
  editingTask.value = {
    ...task,
    clientId: findClientIdByName(task.destination_name)
  }
  showEditTask.value = true
}

const closeEditTask = () => {
  showEditTask.value = false
  editingTask.value = null
}

const handleEditTask = async () => {
  assignLoading.value = true
  
  try {
    const client = getClientById(editingTask.value.clientId)
    if (!client) {
      throw new Error('Client not found')
    }
    
    const updateData = {
      task_title: editingTask.value.task_title,
      task_type: editingTask.value.task_type,
      task_description: editingTask.value.task_description || null,
      destination_name: client.name,
      destination_address: client.address,
      destination_lat: client.location_lat,
      destination_lng: client.location_lng,
      geofence_radius: client.geofence_radius || 50,
      estimated_duration: editingTask.value.estimated_duration || 30,
      priority: editingTask.value.priority,
      task_order: editingTask.value.task_order
    }
    
    const { error } = await supabase
      .from('driver_tasks')
      .update(updateData)
      .eq('id', editingTask.value.id)
    
    if (error) throw error
    
    closeEditTask()
    await refreshData()
    
    alert('✅ Task updated successfully!')
    
  } catch (error) {
    console.error('Error updating task:', error)
    alert(`❌ Failed to update task: ${error.message}`)
  } finally {
    assignLoading.value = false
  }
}

// Add Task Methods
const openAddTask = (route) => {
  addTaskRouteId.value = route.id
  newTask.value = {
    title: '',
    type: 'delivery',
    clientId: '',
    description: '',
    estimatedDuration: 30,
    priority: 'normal',
    insertPosition: 'end',
    driverId: route.driver_id
  }
  showAddTask.value = true
}

const closeAddTask = () => {
  showAddTask.value = false
  newTask.value = {
    title: '',
    type: 'delivery',
    clientId: '',
    description: '',
    estimatedDuration: 30,
    priority: 'normal',
    insertPosition: 'end'
  }
  addTaskRouteId.value = null
}

const handleAddTask = async () => {
  assignLoading.value = true
  
  try {
    const client = getClientById(newTask.value.clientId)
    if (!client) {
      throw new Error('Client not found')
    }
    
    // Use the selected date instead of hardcoded today
    const taskDate = selectedDate.value
    
    // Get existing tasks for this driver to determine task order
    const { data: existingTasks, error: tasksCheckError } = await supabase
      .from('driver_tasks')
      .select('task_order')
      .eq('driver_id', newTask.value.driverId)
      .eq('task_date', taskDate)
      .order('task_order', { ascending: false })
      .limit(1)
    
    if (tasksCheckError) throw tasksCheckError
    
    let taskOrder = 1
    if (newTask.value.insertPosition === 'end') {
      taskOrder = existingTasks?.length > 0 ? existingTasks[0].task_order + 1 : 1
    } else if (newTask.value.insertPosition === 'start') {
      // TODO: Update all existing task orders
      taskOrder = 1
    }
    
    const taskData = {
      driver_id: newTask.value.driverId,
      task_date: taskDate,
      task_order: taskOrder,
      task_type: newTask.value.type,
      task_title: newTask.value.title,
      task_description: newTask.value.description || null,
      destination_name: client.name,
      destination_address: client.address,
      destination_lat: client.location_lat,
      destination_lng: client.location_lng,
      geofence_radius: client.geofence_radius || 50,
      estimated_duration: newTask.value.estimatedDuration || 30,
      priority: newTask.value.priority
    }
    
    const { error } = await supabase
      .from('driver_tasks')
      .insert(taskData)
    
    if (error) throw error
    
    closeAddTask()
    await refreshData()
    
    const dateDisplay = isToday.value ? 'today' : selectedDateFormatted.value
    alert(`✅ Task added successfully for ${dateDisplay}!`)
    
  } catch (error) {
    console.error('Error adding task:', error)
    alert(`❌ Failed to add task: ${error.message}`)
  } finally {
    assignLoading.value = false
  }
}

// Delete Task Method
const deleteTask = async (task) => {
  if (task.status === 'in_progress' || task.status === 'completed') {
    alert('❌ Cannot delete tasks that are in progress or completed')
    return
  }
  
  if (confirm(`Are you sure you want to delete "${task.task_title}"?\n\nThis action cannot be undone.`)) {
    try {
      const { error } = await supabase
        .from('driver_tasks')
        .delete()
        .eq('id', task.id)
      
      if (error) throw error
      
      await refreshData()
      alert('✅ Task deleted successfully!')
      
    } catch (error) {
      console.error('Error deleting task:', error)
      alert(`❌ Failed to delete task: ${error.message}`)
    }
  }
}

// Helper method to find client ID by destination name
const findClientIdByName = (destinationName) => {
  const client = clients.value.find(c => c.name === destinationName)
  return client?.id || ''
}

// Quick add test driver for debugging
const addTestDriver = async () => {
  try {
    const testDriverName = `Test Driver ${Date.now().toString().slice(-4)}`
    
    const { data, error } = await supabase
      .from('drivers')
      .insert({
        name: testDriverName,
        phone: '+63 912 345 6789',
        license_number: 'TEST123',
        vehicle_type: 'van',
        is_active: true
      })
      .select()
      .single()
    
    if (error) throw error
    
    await refreshData()
    alert(`✅ Test driver "${testDriverName}" added successfully!`)
    
  } catch (error) {
    console.error('Error adding test driver:', error)
    alert(`❌ Failed to add test driver: ${error.message}`)
  }
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Driver Online Status Methods
const getDriverOnlineStatus = (driverId) => {
  const presence = driverPresence.value.get(driverId)
  if (!presence) {
    console.log(`👤 Driver ${driverId}: No presence record found`)
    return false
  }
  
  // FIXED: Check BOTH is_online field AND time threshold
  // If driver explicitly marked offline, they're offline regardless of time
  if (presence.isOnline === false) {
    console.log(`👤 Driver ${driverId}: Marked offline in database (is_online=false)`)
    return false
  }
  
  const now = Date.now()
  const timeSinceLastSeen = now - new Date(presence.lastSeen).getTime()
  const minutesAgo = Math.floor(timeSinceLastSeen / (1000 * 60))
  
  const isWithinThreshold = timeSinceLastSeen < ONLINE_THRESHOLD
  const isOnline = presence.isOnline === true && isWithinThreshold
  
  console.log(`👤 Driver ${driverId}: is_online=${presence.isOnline}, minutes_ago=${minutesAgo}, within_threshold=${isWithinThreshold}, final_result=${isOnline}`)
  
  // Driver is online only if both conditions are true:
  // 1. is_online = true in database
  // 2. last_seen within threshold time
  return isOnline
}

const getDriverLastSeen = (driverId) => {
  const presence = driverPresence.value.get(driverId)
  if (!presence) return 'Never'
  
  const lastSeen = new Date(presence.lastSeen)
  const now = new Date()
  const diffMs = now - lastSeen
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

const updateDriverPresence = async () => {
  try {
    console.log('🔄 Fetching driver presence from database...')
    
    // Fetch driver activity/presence data
    const { data, error } = await supabase
      .from('driver_presence')
      .select('driver_id, last_seen, is_online')
      .order('last_seen', { ascending: false })
    
    if (error) {
      console.warn('Driver presence table not found, using fallback logic')
      // Fallback: consider drivers with recent task activity as online
      await updatePresenceFromTaskActivity()
      return
    }
    
    console.log('📊 Raw presence data from database:', data)
    
    const presenceMap = new Map()
    data?.forEach(record => {
      presenceMap.set(record.driver_id, {
        lastSeen: record.last_seen,
        isOnline: record.is_online
      })
      
      // Debug log for each driver
      console.log(`👤 Driver ${record.driver_id}: is_online=${record.is_online}, last_seen=${record.last_seen}`)
    })
    
    driverPresence.value = presenceMap
    console.log('✅ Driver presence updated:', presenceMap.size, 'drivers')
    
    // Force reactivity update
    driverPresence.value = new Map(driverPresence.value)
    
  } catch (error) {
    console.error('Error fetching driver presence:', error)
    await updatePresenceFromTaskActivity()
  }
}

const updatePresenceFromTaskActivity = async () => {
  try {
    // Fallback: Use recent task activity to determine online status
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    
    const { data: recentActivity, error } = await supabase
      .from('driver_tasks')
      .select('driver_id, updated_at, started_at, completed_at')
      .or(`updated_at.gte.${thirtyMinsAgo},started_at.gte.${thirtyMinsAgo},completed_at.gte.${thirtyMinsAgo}`)
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    
    const presenceMap = new Map()
    
    // Set all drivers as offline first
    drivers.value.forEach(driver => {
      presenceMap.set(driver.id, {
        lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24h ago
        isOnline: false
      })
    })
    
    // Update with recent activity
    recentActivity?.forEach(activity => {
      const lastActivity = activity.completed_at || activity.started_at || activity.updated_at
      const existing = presenceMap.get(activity.driver_id)
      
      if (!existing || new Date(lastActivity) > new Date(existing.lastSeen)) {
        presenceMap.set(activity.driver_id, {
          lastSeen: lastActivity,
          isOnline: true
        })
      }
    })
    
    driverPresence.value = presenceMap
    console.log('✅ Driver presence updated from task activity')
    
  } catch (error) {
    console.error('Error updating presence from task activity:', error)
  }
}

const startPresenceTracking = () => {
  // Update presence immediately
  updateDriverPresence()
  
  // Update every 10 seconds for faster feedback (was 30 seconds)
  setInterval(updateDriverPresence, 10000)
  
  console.log('✅ Driver presence tracking started (10s interval)')
}

// Real-time subscriptions
let tasksSubscription = null
let routesSubscription = null

const setupRealTimeSubscriptions = () => {
  // Subscribe to driver_tasks changes
  tasksSubscription = supabase
    .channel('driver_tasks_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'driver_tasks'
    }, (payload) => {
      console.log('🔄 Real-time task update:', payload)
      handleTaskUpdate(payload)
    })
    .subscribe()

  // Subscribe to daily_route_plans changes  
  routesSubscription = supabase
    .channel('route_plans_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'daily_route_plans'
    }, (payload) => {
      console.log('🔄 Real-time route update:', payload)
      handleRouteUpdate(payload)
    })
    .subscribe()

  console.log('✅ Real-time subscriptions active')
}

const handleTaskUpdate = async (payload) => {
  const { eventType, new: newRecord, old: oldRecord } = payload
  
  // Show visual notification
  showRealTimeNotification(`Task ${eventType}`, 'bg-blue-600')
  
  // Refresh data to get latest state
  await fetchRoutesForDate(selectedDate.value)
  await fetchWeekData()
}

const handleRouteUpdate = async (payload) => {
  const { eventType, new: newRecord, old: oldRecord } = payload
  
  // Show visual notification
  showRealTimeNotification(`Route ${eventType}`, 'bg-green-600')
  
  // Refresh data to get latest state
  await fetchRoutesForDate(selectedDate.value)
  await fetchWeekData()
}

const showRealTimeNotification = (message, bgColor = 'bg-blue-600') => {
  // Create floating notification
  const notification = document.createElement('div')
  notification.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-50 transform transition-all duration-300`
  notification.textContent = `🔄 ${message}`
  document.body.appendChild(notification)
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)'
  }, 100)
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)'
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
    }, 300)
  }, 3000)
}

const cleanupSubscriptions = () => {
  if (tasksSubscription) {
    supabase.removeChannel(tasksSubscription)
    tasksSubscription = null
  }
  if (routesSubscription) {
    supabase.removeChannel(routesSubscription)
    routesSubscription = null
  }
  console.log('🔌 Real-time subscriptions cleaned up')
}

// Initialize
onMounted(() => {
  generateWeekDates()
  refreshData()
  setupRealTimeSubscriptions()
  startPresenceTracking()
})

// Cleanup on unmount
onUnmounted(() => {
  cleanupSubscriptions()
})
</script> 