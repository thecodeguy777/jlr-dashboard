import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'

export function useDriverTracking() {
  // State
  const isGpsAvailable = ref(false)
  const currentLocation = ref(null)
  const gpsAccuracy = ref(null)
  const isOnline = ref(navigator.onLine)
  const unsyncedLogs = ref([])
  const batteryLevel = ref(null)
  const signalStatus = ref('unknown')
  const appFocused = ref(true)
  const lastBlurTime = ref(null)
  const driverId = ref(null)
  const isLoading = ref(false)
  const isActiveRoute = ref(false)
  const lastBreadcrumb = ref(null)
  const clients = ref([])
  const currentSpeed = ref(0)
  const totalDistance = ref(0)

  // NEW: Movement Detection & Auto-Tracking
  const isMoving = ref(false)
  const autoTrackingMode = ref(false)
  const trackingTrigger = ref(null)
  const movementStartTime = ref(null)
  const lastPosition = ref(null)
  const movementHistory = ref([])

  // NEW: Ghost Control System
  const ghostControlActive = ref(false)
  const pendingGhostCommands = ref([])
  const ghostConnection = ref(null)
  const adminControlSession = ref(null)

  // NEW: Auto-Timeout System
  const timeoutSettings = ref({
    clockIn: 5, // minutes
    startDelivery: 3,
    markDelivered: 10,
    clockOut: 2
  })
  const activeTimeouts = ref(new Map())

  // Work Session Management
  const isWorkSessionActive = ref(false)
  const currentWorkSession = ref(null)
  const sessionStartTime = ref(null)
  const sessionEndTime = ref(null)
  const totalWorkedMinutes = ref(0)
  const sessionStats = ref({
    totalRoutes: 0,
    totalDeliveries: 0,
    totalDistance: 0,
    startTime: null,
    endTime: null
  })

  // GPS Tracking
  let watchId = null
  let sessionMonitorInterval = null
  let breadcrumbInterval = null
  let wakeInterval = null
  let movementDetectionInterval = null
  let timeoutMonitorInterval = null
  let lastValidLocation = null
  let locationBuffer = []

  // Enhanced GPS options for better accuracy
  const GPS_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 5000
  }

  // Movement detection thresholds
  const MOVEMENT_CONFIG = {
    speedThreshold: 15, // km/h - faster than walking
    distanceThreshold: 100, // meters to confirm movement
    timeWindow: 30, // seconds to confirm sustained movement
    accuracyRequired: 50, // GPS accuracy needed
    stopDuration: 5 // minutes stopped before ending tracking
  }

  // Location filtering thresholds
  const ACCURACY_THRESHOLD = 100
  const SPEED_THRESHOLD = 200
  const DISTANCE_THRESHOLD = 1000

  // NEW: Movement Detection Engine
  const detectMovement = () => {
    if (!currentLocation.value || gpsAccuracy.value > MOVEMENT_CONFIG.accuracyRequired) {
      return
    }

    if (lastPosition.value) {
      const distance = calculateDistance(
        lastPosition.value.lat, lastPosition.value.lng,
        currentLocation.value.latitude, currentLocation.value.longitude
      )

      const timeDiff = (Date.now() - lastPosition.value.timestamp) / 1000 // seconds
      const speed = timeDiff > 0 ? (distance / timeDiff) * 3.6 : 0 // km/h

      // Update current speed
      currentSpeed.value = speed

      // Movement detected!
      if (speed > MOVEMENT_CONFIG.speedThreshold && !isMoving.value) {
        console.log(`🚗 Movement detected: ${speed.toFixed(1)} km/h`)
        startMovementTracking(speed)
      }
      
      // Still moving - update movement data
      else if (speed > MOVEMENT_CONFIG.speedThreshold && isMoving.value) {
        updateMovementData(speed, distance)
      }
      
      // Stopped moving
      else if (speed < 5 && isMoving.value) {
        handleMovementStop()
      }

      // Store movement history
      movementHistory.value.unshift({
        timestamp: Date.now(),
        speed: speed,
        distance: distance,
        location: { ...currentLocation.value }
      })

      // Keep only last 50 movement records
      if (movementHistory.value.length > 50) {
        movementHistory.value = movementHistory.value.slice(0, 50)
      }
    }

    lastPosition.value = {
      lat: currentLocation.value.latitude,
      lng: currentLocation.value.longitude,
      timestamp: Date.now()
    }
  }

  const startMovementTracking = async (initialSpeed) => {
    isMoving.value = true
    movementStartTime.value = Date.now()
    
    // Auto-start breadcrumb tracking if not already active
    if (!isActiveRoute.value) {
      console.log('🔄 Auto-starting breadcrumb tracking due to movement')
      await startAutoTracking('movement_detected', {
        initialSpeed,
        detectionTime: new Date().toISOString()
      })
    }

    // Notify admin of movement
    notifyAdmin({
      type: 'MOVEMENT_DETECTED',
      driver_id: driverId.value,
      speed: initialSpeed,
      location: currentLocation.value,
      timestamp: new Date().toISOString(),
      work_session_active: isWorkSessionActive.value
    })
  }

  const updateMovementData = (speed, distance) => {
    // Update running totals
    totalDistance.value += distance
    
    // Update session stats if work session is active
    if (isWorkSessionActive.value) {
      sessionStats.value.totalDistance += distance
    }
  }

  const handleMovementStop = () => {
    console.log('🛑 Movement stopped, monitoring for continued stop...')
    
    // Wait 5 minutes before officially stopping tracking
    setTimeout(() => {
      if (currentSpeed.value < 5) {
        const movementDuration = (Date.now() - movementStartTime.value) / 1000 / 60 // minutes
        console.log(`📍 Movement ended after ${movementDuration.toFixed(1)} minutes`)
        
        isMoving.value = false
        
        // Notify admin of stop
        notifyAdmin({
          type: 'MOVEMENT_STOPPED',
          driver_id: driverId.value,
          duration_minutes: movementDuration,
          total_distance: totalDistance.value,
          location: currentLocation.value,
          timestamp: new Date().toISOString()
        })

        // Stop auto-tracking if it was only triggered by movement
        if (autoTrackingMode.value && trackingTrigger.value === 'movement_detected') {
          setTimeout(() => {
            if (currentSpeed.value < 5) {
              stopAutoTracking('movement_ended')
            }
          }, 2 * 60 * 1000) // Wait additional 2 minutes
        }
      }
    }, MOVEMENT_CONFIG.stopDuration * 60 * 1000)
  }

  // NEW: Auto-Tracking System
  const startAutoTracking = async (trigger, metadata = {}) => {
    console.log(`🔄 Auto-starting tracking: ${trigger}`)
    
    // Set tracking state
    isActiveRoute.value = true
    autoTrackingMode.value = true
    trackingTrigger.value = trigger
    
    // Save tracking state
    saveTrackingState()
    
    // Start breadcrumbs immediately
    if (!breadcrumbInterval) {
      logBreadcrumb({
        auto_tracking: true,
        trigger: trigger,
        metadata: metadata
      })
      
      breadcrumbInterval = setInterval(() => {
        logBreadcrumb({
          auto_tracking: true,
          trigger: trigger,
          movement_detected: isMoving.value
        })
      }, 30000) // Every 30 seconds
    }
    
    // Enable ghost control interface
    enableGhostControl()
    
    // Store auto-tracking session
    await storeAutoTrackingSession(trigger, metadata)
  }

  const stopAutoTracking = async (reason) => {
    console.log(`🛑 Stopping auto-tracking: ${reason}`)
    
    if (breadcrumbInterval) {
      clearInterval(breadcrumbInterval)
      breadcrumbInterval = null
    }
    
    isActiveRoute.value = false
    autoTrackingMode.value = false
    trackingTrigger.value = null
    
    // Save tracking state
    saveTrackingState()
    
    // Mark breadcrumbs as inactive
    if (driverId.value) {
      try {
        await supabase
          .from('gps_breadcrumbs')
          .update({ is_active_route: false })
          .eq('driver_id', driverId.value)
          .eq('is_active_route', true)
        
        console.log('✅ Marked route as ended in database')
      } catch (error) {
        console.error('❌ Error ending route in database:', error)
      }
    }
    
    // Notify admin
    notifyAdmin({
      type: 'AUTO_TRACKING_STOPPED',
      driver_id: driverId.value,
      reason: reason,
      timestamp: new Date().toISOString()
    })
  }

  // NEW: Ghost Control System
  const enableGhostControl = () => {
    if (ghostControlActive.value) return
    
    console.log('👻 Enabling ghost control interface')
    ghostControlActive.value = true
    
    // Establish WebSocket connection for real-time commands
    connectToGhostControl()
    
    // Start monitoring for ghost commands
    startGhostCommandMonitoring()
  }

  const connectToGhostControl = () => {
    // In a real implementation, this would be a WebSocket
    // For now, we'll use Supabase real-time subscriptions
    
    const channel = supabase
      .channel(`ghost-control-${driverId.value}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ghost_commands',
        filter: `driver_id=eq.${driverId.value}`
      }, (payload) => {
        handleGhostCommand(payload.new)
      })
      .subscribe()
    
    ghostConnection.value = channel
  }

  const handleGhostCommand = async (command) => {
    console.log(`👻 Received ghost command: ${command.action}`)
    
    // Show notification to driver
    showGhostNotification(command)
    
    // Execute the command
    switch (command.action) {
      case 'FORCE_CLOCK_IN':
        await executeClockIn(true) // true = ghost controlled
        break
      case 'FORCE_START_ROUTE':
        await executeStartRoute(true)
        break
      case 'FORCE_MARK_DELIVERED':
        await executeMarkDelivered(true)
        break
      case 'FORCE_CLOCK_OUT':
        await executeClockOut(true)
        break
      case 'SEND_MESSAGE':
        showDriverMessage(command.message)
        break
      case 'OPEN_MAPS':
        openMapsApp(command.destination)
        break
      case 'CALL_ADMIN':
        initiateAdminCall()
        break
      default:
        console.warn(`Unknown ghost command: ${command.action}`)
    }
    
    // Confirm command execution
    await confirmGhostCommand(command.id)
  }

  const showGhostNotification = (command) => {
    // Create prominent notification for driver
    const notification = {
      title: '👻 Admin is helping you',
      message: getGhostActionMessage(command.action),
      duration: 5000,
      type: 'ghost-control',
      persistent: true
    }
    
    // In a real app, this would trigger a notification component
    console.log('👻 Ghost notification:', notification)
    
    // Could also trigger browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/assets/renew-logo.png'
      })
    }
  }

  const getGhostActionMessage = (action) => {
    const messages = {
      'FORCE_CLOCK_IN': 'Clocking you in automatically - no action needed',
      'FORCE_START_ROUTE': 'Starting your route - drive safely!',
      'FORCE_MARK_DELIVERED': 'Marking delivery as complete',
      'FORCE_CLOCK_OUT': 'Clocking you out - great job today!',
      'SEND_MESSAGE': 'Message from admin',
      'OPEN_MAPS': 'Opening directions for you',
      'CALL_ADMIN': 'Please call the office'
    }
    return messages[action] || 'Admin is helping you'
  }

  // NEW: Auto-Timeout Monitoring
  const startTimeoutMonitoring = () => {
    if (timeoutMonitorInterval) return
    
    timeoutMonitorInterval = setInterval(() => {
      checkTimeouts()
    }, 60000) // Check every minute
  }

  const checkTimeouts = () => {
    const now = Date.now()
    
    // Check clock-in timeout
    if (shouldBeWorking() && !isWorkSessionActive.value) {
      const workStartTime = getExpectedWorkStartTime()
      if (now - workStartTime > timeoutSettings.value.clockIn * 60 * 1000) {
        triggerAutoTimeout('clock_in')
      }
    }
    
    // Check delivery timeouts
    if (isWorkSessionActive.value && hasAssignedTasks()) {
      checkDeliveryTimeouts()
    }
    
    // Check clock-out timeout
    if (isWorkSessionActive.value && isPastWorkHours()) {
      const endTime = getExpectedWorkEndTime()
      if (now - endTime > timeoutSettings.value.clockOut * 60 * 1000) {
        triggerAutoTimeout('clock_out')
      }
    }
  }

  const triggerAutoTimeout = async (type) => {
    console.log(`⏰ Auto-timeout triggered: ${type}`)
    
    // Send ghost command to handle timeout
    await sendGhostCommand({
      action: getTimeoutAction(type),
      reason: `auto_timeout_${type}`,
      auto_triggered: true
    })
    
    // Notify admin
    notifyAdmin({
      type: 'AUTO_TIMEOUT_TRIGGERED',
      timeout_type: type,
      driver_id: driverId.value,
      timestamp: new Date().toISOString()
    })
  }

  const getTimeoutAction = (type) => {
    const actions = {
      'clock_in': 'FORCE_CLOCK_IN',
      'start_delivery': 'FORCE_START_ROUTE',
      'mark_delivered': 'FORCE_MARK_DELIVERED',
      'clock_out': 'FORCE_CLOCK_OUT'
    }
    return actions[type]
  }

  // Helper functions for timeout logic
  const shouldBeWorking = () => {
    const now = new Date()
    const hour = now.getHours()
    // Assuming work hours 8 AM - 6 PM
    return hour >= 8 && hour < 18
  }

  const getExpectedWorkStartTime = () => {
    const today = new Date()
    today.setHours(8, 0, 0, 0) // 8 AM
    return today.getTime()
  }

  const getExpectedWorkEndTime = () => {
    const today = new Date()
    today.setHours(18, 0, 0, 0) // 6 PM
    return today.getTime()
  }

  const isPastWorkHours = () => {
    const now = new Date()
    return now.getHours() >= 18
  }

  const hasAssignedTasks = () => {
    // This would check if driver has pending tasks
    // Implementation depends on task management system
    return false // Placeholder
  }

  const checkDeliveryTimeouts = () => {
    // Check if driver has been at delivery location too long
    // Implementation would involve geofencing logic
  }

  // Enhanced breadcrumb logging with auto-tracking
  const logBreadcrumb = async (additionalData = {}) => {
    if (!isGpsAvailable.value || !currentLocation.value || !isActiveRoute.value) {
      console.log('🍞 Breadcrumb skipped: GPS unavailable or route inactive')
      return
    }

    if (gpsAccuracy.value > ACCURACY_THRESHOLD) {
      console.warn(`🍞 Breadcrumb skipped: Poor GPS accuracy ${gpsAccuracy.value}m`)
      return
    }

    const now = new Date()
    const breadcrumbData = {
      driver_id: driverId.value,
      timestamp: now.toISOString(),
      latitude: currentLocation.value.latitude,
      longitude: currentLocation.value.longitude,
      gps_accuracy: gpsAccuracy.value,
      battery_level: batteryLevel.value,
      signal_status: signalStatus.value,
      is_active_route: isActiveRoute.value,
      synced: isOnline.value,
      // NEW: Auto-tracking fields
      auto_tracking: autoTrackingMode.value,
      tracking_trigger: trackingTrigger.value,
      movement_detected: isMoving.value,
      current_speed: currentSpeed.value,
      ghost_control_active: ghostControlActive.value,
      ...additionalData
    }

    // Calculate speed and distance if we have a previous breadcrumb
    if (lastBreadcrumb.value) {
      const distance = calculateDistance(
        lastBreadcrumb.value.latitude,
        lastBreadcrumb.value.longitude,
        currentLocation.value.latitude,
        currentLocation.value.longitude
      )

      const timeSeconds = (now - new Date(lastBreadcrumb.value.timestamp)) / 1000
      const speed = calculateSpeed(distance, timeSeconds)

      breadcrumbData.distance_from_last = distance
      breadcrumbData.speed_kmh = speed

      totalDistance.value += distance
    }

    try {
      if (isOnline.value) {
        const { data, error } = await supabase
          .from('gps_breadcrumbs')
          .insert(breadcrumbData)
          .select()
        
        if (error) {
          throw error
        }
        
        console.log('✅ Auto-tracking breadcrumb logged:', data)
      } else {
        console.log('📦 Storing breadcrumb locally (offline)')
        const stored = JSON.parse(localStorage.getItem('pending_breadcrumbs') || '[]')
        stored.push(breadcrumbData)
        localStorage.setItem('pending_breadcrumbs', JSON.stringify(stored))
      }

      lastBreadcrumb.value = breadcrumbData
      
    } catch (error) {
      console.error('❌ Auto-tracking breadcrumb error:', error)
    }
  }

  // Movement detection activation
  const startMovementDetection = () => {
    if (movementDetectionInterval) return
    
    console.log('🔍 Starting movement detection')
    movementDetectionInterval = setInterval(detectMovement, 10000) // Every 10 seconds
  }

  const stopMovementDetection = () => {
    if (movementDetectionInterval) {
      clearInterval(movementDetectionInterval)
      movementDetectionInterval = null
    }
  }

  // Admin notification system
  const notifyAdmin = async (data) => {
    try {
      await supabase
        .from('admin_notifications')
        .insert({
          ...data,
          created_at: new Date().toISOString()
        })
      
      console.log('📢 Admin notified:', data.type)
    } catch (error) {
      console.error('❌ Failed to notify admin:', error)
    }
  }

  // Store auto-tracking session
  const storeAutoTrackingSession = async (trigger, metadata) => {
    try {
      await supabase
        .from('auto_tracking_sessions')
        .insert({
          driver_id: driverId.value,
          trigger: trigger,
          metadata: metadata,
          start_time: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('❌ Failed to store auto-tracking session:', error)
    }
  }

  // Confirm ghost command execution
  const confirmGhostCommand = async (commandId) => {
    try {
      await supabase
        .from('ghost_commands')
        .update({
          executed: true,
          executed_at: new Date().toISOString()
        })
        .eq('id', commandId)
    } catch (error) {
      console.error('❌ Failed to confirm ghost command:', error)
    }
  }

  // Send ghost command (for admin interface)
  const sendGhostCommand = async (command) => {
    try {
      await supabase
        .from('ghost_commands')
        .insert({
          driver_id: driverId.value,
          action: command.action,
          message: command.message || null,
          destination: command.destination || null,
          reason: command.reason || null,
          auto_triggered: command.auto_triggered || false,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('❌ Failed to send ghost command:', error)
    }
  }

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000 // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Calculate speed from distance and time
  const calculateSpeed = (distance, timeSeconds) => {
    if (timeSeconds === 0) return 0
    return (distance / timeSeconds) * 3.6 // Convert m/s to km/h
  }

  // GPS Permission and Location Tracking
  const requestGpsPermission = async () => {
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported')
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, GPS_OPTIONS)
      })

      isGpsAvailable.value = true
      updateLocation(position)
      console.log('✅ GPS permission granted')
      return true
    } catch (error) {
      console.error('❌ GPS permission denied:', error)
      isGpsAvailable.value = false
      return false
    }
  }

  const startLocationTracking = () => {
    if (!navigator.geolocation || watchId) return

    console.log('📍 Starting location tracking')
    
    watchId = navigator.geolocation.watchPosition(
      updateLocation,
      handleLocationError,
      GPS_OPTIONS
    )

    // Start movement detection
    startMovementDetection()
    
    // Start timeout monitoring
    startTimeoutMonitoring()
  }

  const updateLocation = (position) => {
    const { latitude, longitude, accuracy } = position.coords
    
    currentLocation.value = {
      latitude,
      longitude,
      timestamp: Date.now()
    }
    gpsAccuracy.value = accuracy

    console.log(`📍 Location updated: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${accuracy}m)`)
  }

  const handleLocationError = (error) => {
    console.error('❌ Location error:', error)
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        isGpsAvailable.value = false
        break
      case error.POSITION_UNAVAILABLE:
        console.warn('⚠️ Position unavailable, retrying...')
        break
      case error.TIMEOUT:
        console.warn('⚠️ Location timeout, retrying...')
        break
    }
  }

  // Work Session Management (existing functions would be here)
  const startWorkSession = async () => {
    // Implementation for starting work session
    console.log('🕐 Starting work session')
    isWorkSessionActive.value = true
    sessionStartTime.value = new Date().toISOString()
    
    return { success: true }
  }

  const endWorkSession = async () => {
    // Implementation for ending work session
    console.log('🕐 Ending work session')
    isWorkSessionActive.value = false
    sessionEndTime.value = new Date().toISOString()
    
    return { success: true, totalHours: '8.5' }
  }

  const getFormattedWorkTime = () => {
    if (!sessionStartTime.value) return '0:00'
    
    const start = new Date(sessionStartTime.value)
    const now = new Date()
    const diff = now - start
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}:${minutes.toString().padStart(2, '0')}`
  }

  // Initialize driver profile
  const initializeDriver = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) throw error

      driverId.value = data.id
      console.log('✅ Driver initialized:', data.name)
      return data.id
    } catch (error) {
      console.error('❌ Driver initialization failed:', error)
      throw error
    }
  }

  const initializeDriverWithRouteCheck = async (userId) => {
    try {
      const driverIdResult = await initializeDriver(userId)
      // Additional initialization logic would go here
      return driverIdResult
    } catch (error) {
      console.error('Error initializing driver with route check:', error)
      throw error
    }
  }

  // Save and load tracking state
  const saveTrackingState = () => {
    const state = {
      isActiveRoute: isActiveRoute.value,
      autoTrackingMode: autoTrackingMode.value,
      trackingTrigger: trackingTrigger.value,
      ghostControlActive: ghostControlActive.value,
      isMoving: isMoving.value
    }
    localStorage.setItem('tracking_state', JSON.stringify(state))
  }

  const loadTrackingState = () => {
    try {
      const stored = localStorage.getItem('tracking_state')
      if (stored) {
        const state = JSON.parse(stored)
        isActiveRoute.value = state.isActiveRoute || false
        autoTrackingMode.value = state.autoTrackingMode || false
        trackingTrigger.value = state.trackingTrigger || null
        ghostControlActive.value = state.ghostControlActive || false
        isMoving.value = state.isMoving || false
      }
    } catch (error) {
      console.warn('⚠️ Could not load tracking state:', error)
    }
  }

  // Ghost command execution methods
  const startGhostCommandMonitoring = () => {
    console.log('👻 Ghost command monitoring started')
  }

  const executeClockIn = async (ghostControlled = false) => {
    console.log('🕐 Executing clock in', ghostControlled ? '(ghost controlled)' : '')
    return await startWorkSession()
  }

  const executeClockOut = async (ghostControlled = false) => {
    console.log('🕐 Executing clock out', ghostControlled ? '(ghost controlled)' : '')
    return await endWorkSession()
  }

  const executeStartRoute = async (ghostControlled = false) => {
    console.log('🚀 Executing start route', ghostControlled ? '(ghost controlled)' : '')
    if (!isActiveRoute.value) {
      await startAutoTracking('ghost_controlled')
    }
  }

  const executeMarkDelivered = async (ghostControlled = false) => {
    console.log('✅ Executing mark delivered', ghostControlled ? '(ghost controlled)' : '')
    // This would integrate with task management system
  }

  const showDriverMessage = (message) => {
    alert(`📢 Message from Admin:\n\n${message}`)
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Message from Admin', {
        body: message,
        icon: '/assets/renew-logo.png'
      })
    }
  }

  const openMapsApp = (destination) => {
    if (destination) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
      window.open(url, '_blank')
    }
  }

  const initiateAdminCall = () => {
    const adminPhone = '+1234567890'
    if (confirm('Call admin now?')) {
      window.open(`tel:${adminPhone}`)
    }
  }

  // Cleanup function
  const cleanup = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
    
    stopMovementDetection()
    
    if (breadcrumbInterval) {
      clearInterval(breadcrumbInterval)
      breadcrumbInterval = null
    }
    
    if (timeoutMonitorInterval) {
      clearInterval(timeoutMonitorInterval)
      timeoutMonitorInterval = null
    }
    
    if (ghostConnection.value) {
      supabase.removeChannel(ghostConnection.value)
      ghostConnection.value = null
    }
  }

  // Initialize on mount
  onMounted(() => {
    loadTrackingState()
    
    // Monitor online status
    window.addEventListener('online', () => {
      isOnline.value = true
      console.log('🌐 Back online')
    })
    
    window.addEventListener('offline', () => {
      isOnline.value = false
      console.log('📴 Gone offline')
    })
  })

  // Cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })

  return {
    // Basic GPS state
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
    lastBreadcrumb,
    clients,
    currentSpeed,
    totalDistance,
    
    // NEW: Movement detection
    isMoving,
    autoTrackingMode,
    trackingTrigger,
    movementStartTime,
    movementHistory,
    
    // NEW: Ghost control
    ghostControlActive,
    pendingGhostCommands,
    adminControlSession,
    
    // NEW: Auto-timeout
    timeoutSettings,
    activeTimeouts,
    
    // Work session
    isWorkSessionActive,
    currentWorkSession,
    sessionStartTime,
    sessionEndTime,
    totalWorkedMinutes,
    sessionStats,
    
    // Methods
    requestGpsPermission,
    startLocationTracking,
    initializeDriverWithRouteCheck,
    startWorkSession,
    endWorkSession,
    getFormattedWorkTime,
    
    // NEW: Auto-tracking methods
    startAutoTracking,
    stopAutoTracking,
    enableGhostControl,
    sendGhostCommand,
    notifyAdmin,
    
    // NEW: Movement detection methods
    startMovementDetection,
    stopMovementDetection,
    detectMovement
  }
} 