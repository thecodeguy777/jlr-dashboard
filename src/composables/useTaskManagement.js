import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useSyncManager } from './useSyncManager'

export function useTaskManagement() {
  // Sync manager for offline support
  const { queueForSync, isOnline } = useSyncManager()
  
  // State
  const loading = ref(false)
  const tasks = ref([])
  const templates = ref([])
  const routePlans = ref([])
  const drivers = ref([])

  // Computed
  const todayTasks = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return tasks.value.filter(task => task.task_date === today)
  })

  const pendingTasks = computed(() => 
    tasks.value.filter(task => task.status === 'pending')
  )

  const completedTasks = computed(() => 
    tasks.value.filter(task => task.status === 'completed')
  )

  const inProgressTasks = computed(() => 
    tasks.value.filter(task => task.status === 'in_progress')
  )

  const activeTemplates = computed(() => 
    templates.value.filter(template => template.is_active)
  )

  // Methods
  const fetchDriverTasks = async (driverId, date = null) => {
    try {
      loading.value = true
      
      let query = supabase
        .from('driver_tasks')
        .select('*')
        .eq('driver_id', driverId)
        .order('task_order', { ascending: true })
      
      if (date) {
        query = query.eq('task_date', date)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      if (date) {
        // If fetching for specific date, replace tasks array
        tasks.value = data || []
      } else {
        // If fetching all tasks, append to array
        tasks.value = [...tasks.value, ...(data || [])]
      }
      
      return data || []
      
    } catch (error) {
      console.error('Error fetching driver tasks:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const fetchRoutePlan = async (driverId, date) => {
    try {
      const { data, error } = await supabase
        .from('daily_route_plans')
        .select('*')
        .eq('driver_id', driverId)
        .eq('plan_date', date)
        .single()
      
      if (error && error.code !== 'PGRST116') { // Not found error is ok
        throw error
      }
      
      return data
      
    } catch (error) {
      console.error('Error fetching route plan:', error)
      return null
    }
  }

  const fetchTaskTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_active', true)
        .order('default_order', { ascending: true })
      
      if (error) throw error
      
      templates.value = data || []
      return data || []
      
    } catch (error) {
      console.error('Error fetching task templates:', error)
      throw error
    }
  }

  const startTask = async (taskId) => {
    try {
      const task = tasks.value.find(t => t.id === taskId)
      if (!task) throw new Error('Task not found')
      
      const updateData = {
        id: taskId,
        status: 'in_progress',
        started_at: new Date().toISOString()
      }
      
      // Use sync manager for offline support
      const result = await queueForSync(
        task.driver_id,
        'driver_tasks',
        'update',
        updateData
      )
      
      // Update local state immediately
      const taskIndex = tasks.value.findIndex(t => t.id === taskId)
      if (taskIndex >= 0) {
        tasks.value[taskIndex] = { 
          ...tasks.value[taskIndex], 
          ...updateData
        }
      }
      
      console.log(`📝 Task start ${result.synced ? 'synced' : 'queued'}: ${task.task_title}`)
      
      // FIXED: Log START DELIVERY action to delivery_logs for admin visibility  
      try {
        // Get current GPS location - will be updated when driver dashboard calls this
        const gpsData = window.currentGpsLocation || null
        
        await supabase
          .from('delivery_logs')
          .insert({
            driver_id: task.driver_id,
            action_type: 'start_route',
            timestamp: updateData.started_at,
            latitude: gpsData?.latitude || null,
            longitude: gpsData?.longitude || null,
            gps_accuracy: gpsData?.accuracy || null,
            note: `Started delivery route: ${task.task_title}`,
            battery_level: gpsData?.battery_level || null,
            signal_status: gpsData?.signal_status || 'unknown',
            synced: true
          })
        console.log('📝 Task start action logged for admin visibility')
      } catch (logError) {
        console.warn('⚠️ Could not log task start action (non-critical):', logError)
      }
      
      return { ...task, ...updateData }
      
    } catch (error) {
      console.error('Error starting task:', error)
      throw error
    }
  }

  const completeTask = async (taskId, completionData = {}) => {
    try {
      const task = tasks.value.find(t => t.id === taskId)
      if (!task) throw new Error('Task not found')
      
      const startTime = task?.started_at ? new Date(task.started_at) : new Date()
      const actualDuration = Math.round((Date.now() - startTime.getTime()) / (1000 * 60))
      
      const updateData = {
        id: taskId,
        status: 'completed',
        completed_at: new Date().toISOString(),
        actual_duration: actualDuration,
        ...completionData
      }
      
      // Use sync manager for offline support
      const result = await queueForSync(
        task.driver_id,
        'driver_tasks',
        'update',
        updateData
      )
      
      // Update local state immediately
      const taskIndex = tasks.value.findIndex(t => t.id === taskId)
      if (taskIndex >= 0) {
        tasks.value[taskIndex] = { 
          ...tasks.value[taskIndex], 
          ...updateData
        }
      }
      
      console.log(`✅ Task completion ${result.synced ? 'synced' : 'queued'}: ${task.task_title}`)
      
      // FIXED: Log action to delivery_logs for admin visibility
      try {
        await supabase
          .from('delivery_logs')
          .insert({
            driver_id: task.driver_id,
            action_type: 'delivered',
            timestamp: updateData.completed_at,
            latitude: completionData.completion_location?.lat || null,
            longitude: completionData.completion_location?.lng || null,
            gps_accuracy: completionData.completion_location?.accuracy || null,
            note: `Completed delivery: ${task.task_title}${completionData.completion_notes ? ` - ${completionData.completion_notes}` : ''}`,
            synced: true
          })
        console.log('📝 Task completion action logged for admin visibility')
      } catch (logError) {
        console.warn('⚠️ Could not log task completion action (non-critical):', logError)
      }
      
      return { ...task, ...updateData }
      
    } catch (error) {
      console.error('Error completing task:', error)
      throw error
    }
  }

  const skipTask = async (taskId, reason = '') => {
    try {
      const task = tasks.value.find(t => t.id === taskId)
      if (!task) throw new Error('Task not found')
      
      const updateData = {
        id: taskId,
        status: 'skipped',
        completion_notes: reason
      }
      
      // Use sync manager for offline support
      const result = await queueForSync(
        task.driver_id,
        'driver_tasks',
        'update',
        updateData
      )
      
      // Update local state immediately
      const taskIndex = tasks.value.findIndex(t => t.id === taskId)
      if (taskIndex >= 0) {
        tasks.value[taskIndex] = { 
          ...tasks.value[taskIndex], 
          ...updateData
        }
      }
      
      console.log(`⏭️ Task skip ${result.synced ? 'synced' : 'queued'}: ${task.task_title}`)
      return { ...task, ...updateData }
      
    } catch (error) {
      console.error('Error skipping task:', error)
      throw error
    }
  }

  const createTaskFromTemplate = async (templateId, driverId, taskDate, taskOrder) => {
    try {
      const template = templates.value.find(t => t.id === templateId)
      if (!template) {
        throw new Error('Template not found')
      }
      
      const taskData = {
        driver_id: driverId,
        task_date: taskDate,
        task_order: taskOrder,
        task_type: template.task_type,
        task_title: template.task_title,
        task_description: template.task_description,
        instructions: template.instructions,
        destination_name: template.destination_name,
        destination_address: template.destination_address,
        destination_lat: template.destination_lat,
        destination_lng: template.destination_lng,
        geofence_radius: template.geofence_radius,
        estimated_duration: template.estimated_duration,
        priority: 'normal'
      }
      
      const { data, error } = await supabase
        .from('driver_tasks')
        .insert(taskData)
        .select()
        .single()
      
      if (error) throw error
      
      tasks.value.push(data)
      return data
      
    } catch (error) {
      console.error('Error creating task from template:', error)
      throw error
    }
  }

  const bulkAssignTasks = async (assignments) => {
    try {
      // assignments = [{ driverId, date, templateIds, planName }]
      const results = []
      
      for (const assignment of assignments) {
        // Create route plan
        const routePlan = {
          driver_id: assignment.driverId,
          plan_date: assignment.date,
          plan_name: assignment.planName || 'Daily Route',
          status: 'planned'
        }
        
        const { data: planData, error: planError } = await supabase
          .from('daily_route_plans')
          .insert(routePlan)
          .select()
          .single()
        
        if (planError) throw planError
        
        // Create tasks from templates
        const tasksToCreate = []
        for (let i = 0; i < assignment.templateIds.length; i++) {
          const templateId = assignment.templateIds[i]
          const template = templates.value.find(t => t.id === templateId)
          if (template) {
            tasksToCreate.push({
              driver_id: assignment.driverId,
              task_date: assignment.date,
              task_order: i + 1,
              task_type: template.task_type,
              task_title: template.task_title,
              task_description: template.task_description,
              instructions: template.instructions,
              destination_name: template.destination_name,
              destination_address: template.destination_address,
              destination_lat: template.destination_lat,
              destination_lng: template.destination_lng,
              geofence_radius: template.geofence_radius,
              estimated_duration: template.estimated_duration,
              priority: 'normal'
            })
          }
        }
        
        if (tasksToCreate.length > 0) {
          const { data: tasksData, error: tasksError } = await supabase
            .from('driver_tasks')
            .insert(tasksToCreate)
            .select()
          
          if (tasksError) throw tasksError
          
          results.push({
            routePlan: planData,
            tasks: tasksData
          })
          
          // Add to local state
          tasks.value.push(...tasksData)
        }
      }
      
      return results
      
    } catch (error) {
      console.error('Error bulk assigning tasks:', error)
      throw error
    }
  }

  const startDailyRoute = async (driverId, date) => {
    try {
      const { data, error } = await supabase
        .from('daily_route_plans')
        .update({
          status: 'started',
          started_at: new Date().toISOString()
        })
        .eq('driver_id', driverId)
        .eq('plan_date', date)
        .select()
        .single()
      
      if (error) throw error
      
      return data
      
    } catch (error) {
      console.error('Error starting daily route:', error)
      throw error
    }
  }

  const completeRoute = async (driverId, date) => {
    try {
      const { data, error } = await supabase
        .from('daily_route_plans')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('driver_id', driverId)
        .eq('plan_date', date)
        .select()
        .single()
      
      if (error) throw error
      
      return data
      
    } catch (error) {
      console.error('Error completing route:', error)
      throw error
    }
  }

  const navigateToTask = (task) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${task.destination_lat},${task.destination_lng}&travelmode=driving`
    window.open(url, '_blank')
  }

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

  const getTaskStatusColor = (status) => {
    const colors = {
      pending: 'bg-gray-600',
      in_progress: 'bg-orange-600',
      completed: 'bg-green-600',
      skipped: 'bg-red-600',
      failed: 'bg-red-800'
    }
    return colors[status] || 'bg-gray-600'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-blue-600',
      normal: 'bg-gray-600',
      high: 'bg-orange-600',
      urgent: 'bg-red-600'
    }
    return colors[priority] || 'bg-gray-600'
  }

  const getCurrentTask = (driverTasks) => {
    const sorted = driverTasks.sort((a, b) => a.task_order - b.task_order)
    return sorted.find(task => task.status === 'in_progress') || 
           sorted.find(task => task.status === 'pending') || 
           null
  }

  const getRouteProgress = (driverTasks) => {
    if (driverTasks.length === 0) return 0
    const completed = driverTasks.filter(task => task.status === 'completed').length
    return Math.round((completed / driverTasks.length) * 100)
  }

  const getTotalEstimatedTime = (driverTasks) => {
    return driverTasks.reduce((total, task) => total + (task.estimated_duration || 0), 0)
  }

  return {
    // State
    loading,
    tasks,
    templates,
    routePlans,
    drivers,
    
    // Sync state
    isOnline,
    
    // Computed
    todayTasks,
    pendingTasks,
    completedTasks,
    inProgressTasks,
    activeTemplates,
    
    // Methods
    fetchDriverTasks,
    fetchRoutePlan,
    fetchTaskTemplates,
    startTask,
    completeTask,
    skipTask,
    createTaskFromTemplate,
    bulkAssignTasks,
    startDailyRoute,
    completeRoute,
    navigateToTask,
    
    // Utility
    getTaskTypeIcon,
    getTaskStatusColor,
    getPriorityColor,
    getCurrentTask,
    getRouteProgress,
    getTotalEstimatedTime
  }
} 