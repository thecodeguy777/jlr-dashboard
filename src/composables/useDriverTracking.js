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
    timeout: 15000, // Reduced timeout
    maximumAge: 3000 // Use more recent cache
  }

  // Faster GPS options for clock-in process
  const QUICK_GPS_OPTIONS = {
    enableHighAccuracy: false, // Accept less accuracy for speed
    timeout: 8000, // Much faster timeout
    maximumAge: 10000 // Accept older cached location
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
        metadata: metadata,
        note: `Auto-tracking started: ${trigger}`
      })
      
      breadcrumbInterval = setInterval(() => {
        logBreadcrumb({
          auto_tracking: true,
          trigger: trigger,
          movement_detected: isMoving.value,
          note: 'Auto-tracking breadcrumb'
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

  // Enhanced breadcrumb logging with full schema support
  const logBreadcrumb = async (additionalData = {}) => {
    // ROBUST LOGGING: Always attempt to log, with detailed status
    console.log('🍞 BREADCRUMB ATTEMPT:', {
      gpsAvailable: isGpsAvailable.value,
      hasLocation: !!currentLocation.value,
      isActiveRoute: isActiveRoute.value,
      accuracy: gpsAccuracy.value,
      driverId: driverId.value,
      isOnline: isOnline.value
    })

    // Check if we have minimum requirements
    if (!driverId.value) {
      console.error('❌ Breadcrumb FAILED: No driver ID')
      return
    }

    if (!currentLocation.value) {
      console.warn('⚠️ Breadcrumb skipped: No GPS location available yet')
      // Try to get GPS location immediately
      try {
        await getQuickGpsLocation()
        if (!currentLocation.value) {
          console.error('❌ Breadcrumb FAILED: Could not get GPS location')
          return
        }
      } catch (error) {
        console.error('❌ Breadcrumb FAILED: GPS error:', error)
        return
      }
    }

    // Log breadcrumb even with poor accuracy - mark it as low accuracy
    const isLowAccuracy = gpsAccuracy.value > 100
    if (isLowAccuracy) {
      console.warn(`⚠️ Breadcrumb logging with LOW accuracy: ${gpsAccuracy.value}m`)
    }

    const now = new Date()
    // ROBUST breadcrumb data - log everything we have
    const breadcrumbData = {
      driver_id: driverId.value,
      timestamp: now.toISOString(),
      latitude: currentLocation.value.latitude,
      longitude: currentLocation.value.longitude,
      gps_accuracy: gpsAccuracy.value || 999, // Mark unknown accuracy as 999
      battery_level: batteryLevel.value || null,
      signal_status: signalStatus.value || 'unknown',
      is_active_route: isActiveRoute.value || false, // Force to boolean
      synced: isOnline.value,
      // Advanced tracking fields
      auto_tracking: autoTrackingMode.value || false,
      tracking_trigger: trackingTrigger.value || 'manual',
      movement_detected: isMoving.value || false,
      ghost_control_active: ghostControlActive.value || false,
      // Mark if this is low accuracy
      low_accuracy_warning: isLowAccuracy,
      // Merge any additional data
      ...additionalData
    }

    console.log('🍞 BREADCRUMB DATA prepared:', {
      lat: breadcrumbData.latitude?.toFixed(6),
      lng: breadcrumbData.longitude?.toFixed(6),
      accuracy: breadcrumbData.gps_accuracy,
      trigger: breadcrumbData.tracking_trigger,
      route_active: breadcrumbData.is_active_route
    })

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

      breadcrumbData.distance_from_last = Math.round(distance * 100) / 100 // Round to 2 decimals
      breadcrumbData.speed_kmh = Math.round(speed * 100) / 100 // Round to 2 decimals

      totalDistance.value += distance
      currentSpeed.value = speed
    }

    try {
      if (isOnline.value) {
        console.log('💾 ATTEMPTING to save breadcrumb to database...')
        
        const { data, error } = await supabase
          .from('gps_breadcrumbs')
          .insert(breadcrumbData)
          .select()
        
        if (error) {
          console.error('❌ DATABASE ERROR saving breadcrumb:', error)
          console.error('📋 Failed breadcrumb data:', breadcrumbData)
          
          // Still store locally as backup
          const stored = JSON.parse(localStorage.getItem('pending_breadcrumbs') || '[]')
          stored.push({ ...breadcrumbData, error: error.message })
          localStorage.setItem('pending_breadcrumbs', JSON.stringify(stored))
          console.log('📦 Stored failed breadcrumb locally for retry')
          
          throw error
        }
        
        console.log('✅ SUCCESS! Breadcrumb saved to database:', {
          id: data[0]?.id,
          timestamp: data[0]?.timestamp,
          location: `${data[0]?.latitude?.toFixed(6)}, ${data[0]?.longitude?.toFixed(6)}`,
          accuracy: `${data[0]?.gps_accuracy}m`,
          trigger: data[0]?.tracking_trigger
        })
      } else {
        console.log('📶 OFFLINE - Storing breadcrumb locally')
        const stored = JSON.parse(localStorage.getItem('pending_breadcrumbs') || '[]')
        stored.push(breadcrumbData)
        localStorage.setItem('pending_breadcrumbs', JSON.stringify(stored))
        console.log('📦 Offline breadcrumb stored, will sync when online')
      }

      lastBreadcrumb.value = breadcrumbData
      
    } catch (error) {
      console.error('❌ CRITICAL BREADCRUMB ERROR:', error.message)
      console.error('🔍 Error details:', error)
      console.error('📋 Breadcrumb data that failed:', breadcrumbData)
      
      // For alpha testing - show user-friendly error
      if (additionalData.showUserError) {
        alert(`⚠️ GPS logging error: ${error.message}\n\nThis helps us debug the issue!`)
      }
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

  // Quick GPS for clock-in - prioritizes speed over accuracy
  const getQuickGpsLocation = async () => {
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported')
      }

      console.log('⚡ Getting quick GPS location for clock-in...')
      
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, QUICK_GPS_OPTIONS)
      })

      // Update location state immediately
      updateLocation(position)
      console.log('✅ Quick GPS location obtained:', {
        lat: position.coords.latitude.toFixed(6),
        lng: position.coords.longitude.toFixed(6),
        accuracy: position.coords.accuracy
      })
      
      return true
    } catch (error) {
      console.warn('⚠️ Quick GPS failed, trying regular GPS...', error.message)
      
      // Fallback to regular GPS
      try {
        const fallbackPosition = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 30000 // Accept very old cache as last resort
          })
        })
        
        updateLocation(fallbackPosition)
        console.log('✅ Fallback GPS location obtained')
        return true
      } catch (fallbackError) {
        console.error('❌ All GPS attempts failed:', fallbackError.message)
        return false
      }
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

  // Update driver presence with current GPS location
  const updateDriverPresenceWithLocation = async (isOnlineStatus = true) => {
    if (!driverId.value) {
      console.warn('⚠️ Cannot update presence: Driver ID not available')
      return
    }
    
    try {
      const gpsData = {
        latitude: currentLocation.value?.latitude || null,
        longitude: currentLocation.value?.longitude || null,
        accuracy: gpsAccuracy.value || null
      }

      console.log('📍 Updating driver presence with GPS:', {
        driver: driverId.value,
        online: isOnlineStatus,
        hasGPS: !!(gpsData.latitude && gpsData.longitude),
        accuracy: gpsData.accuracy,
        battery: batteryLevel.value,
        signal: signalStatus.value
      })
      
      // Try direct upsert with proper conflict handling
      const { data: upsertData, error: upsertError } = await supabase
        .from('driver_presence')
        .upsert({
          driver_id: driverId.value,
          is_online: isOnlineStatus,
          last_seen: new Date().toISOString(),
          device_id: 'web',
          location_lat: gpsData.latitude,
          location_lng: gpsData.longitude,
          gps_accuracy: gpsData.accuracy,
          battery_level: batteryLevel.value || null,
          signal_status: signalStatus.value || 'unknown'
        }, {
          onConflict: 'driver_id,device_id', // Handle the unique constraint properly
          ignoreDuplicates: false // Update existing records
        })
        .select()
      
      if (upsertError) {
        console.error('❌ Driver presence upsert failed:', upsertError)
        
        // Final fallback: try updating existing record
        const { data: updateData, error: updateError } = await supabase
          .from('driver_presence')
          .update({
            is_online: isOnlineStatus,
            last_seen: new Date().toISOString(),
            location_lat: gpsData.latitude,
            location_lng: gpsData.longitude,
            gps_accuracy: gpsData.accuracy,
            battery_level: batteryLevel.value || null,
            signal_status: signalStatus.value || 'unknown'
          })
          .eq('driver_id', driverId.value)
          .eq('device_id', 'web')
          .select()
        
        if (updateError) {
          console.error('❌ Update fallback also failed:', updateError)
        } else {
          console.log('✅ Driver presence updated via UPDATE with GPS')
        }
      } else {
        console.log('✅ Driver presence updated via UPSERT with GPS coordinates')
      }
      
    } catch (error) {
      console.error('❌ Unexpected error updating driver presence:', error)
    }
  }

  // Work Session Management - DATABASE (SIMPLIFIED)
  const startWorkSession = async () => {
    if (!driverId.value) {
      throw new Error('Driver ID not available')
    }

    console.log('🕐 Starting work session for driver:', driverId.value)
    
    try {
      // Save work session to database with GPS coordinates
      const sessionData = {
        driver_id: driverId.value.toString(), // Convert to TEXT
        start_time: new Date().toISOString(),
        status: 'active',
        // Capture GPS location at clock-in
        start_latitude: currentLocation.value?.latitude || null,
        start_longitude: currentLocation.value?.longitude || null,
        start_gps_accuracy: gpsAccuracy.value || null
      }

      console.log('📍 Clock-in location captured:', {
        lat: sessionData.start_latitude,
        lng: sessionData.start_longitude,
        accuracy: sessionData.start_gps_accuracy
      })

      const { data, error } = await supabase
        .from('work_sessions')
        .insert(sessionData)
        .select()
        .single()

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      // Update local state
      isWorkSessionActive.value = true
      sessionStartTime.value = sessionData.start_time
      currentWorkSession.value = data

      console.log('✅ Work session started with GPS location saved to database:', data.id)
      
      // FIXED: Log action to delivery_logs for admin visibility
      try {
        await supabase
          .from('delivery_logs')
          .insert({
            driver_id: driverId.value,
            action_type: 'start_route',
            timestamp: sessionData.start_time,
            latitude: sessionData.start_latitude,
            longitude: sessionData.start_longitude,
            gps_accuracy: sessionData.start_gps_accuracy,
            note: 'Driver clocked in - work session started',
            battery_level: batteryLevel.value,
            signal_status: signalStatus.value || 'unknown',
            synced: true
          })
        console.log('📝 Clock-in action logged for admin visibility')
      } catch (logError) {
        console.warn('⚠️ Could not log start action (non-critical):', logError)
      }
      
      // Save to localStorage as backup
      localStorage.setItem('active_work_session', JSON.stringify(data))
      
      // IMPORTANT: Also immediately update driver presence with current location
      await updateDriverPresenceWithLocation()
      
      // FIXED: Start breadcrumb tracking when clocking in (not just when moving)
      console.log('🍞 Starting breadcrumb tracking for clocked-in driver')
      isActiveRoute.value = true
      autoTrackingMode.value = true
      trackingTrigger.value = 'work_session_active'
      
      // ROBUST breadcrumb tracking for alpha test visibility
      if (!breadcrumbInterval) {
        // Log immediate breadcrumb for clock-in
        console.log('🍞 LOGGING IMMEDIATE CLOCK-IN BREADCRUMB...')
        await logBreadcrumb({
          trigger: 'work_session_active',
          note: 'Clock-in breadcrumb for admin visibility',
          showUserError: true // Show errors to user for debugging
        })
        
        // Start regular interval
        console.log('🍞 STARTING BREADCRUMB INTERVAL (every 30 seconds)...')
        breadcrumbInterval = setInterval(async () => {
          console.log('🍞 INTERVAL BREADCRUMB triggered...')
          await logBreadcrumb({
            trigger: 'work_session_active',
            note: 'Regular work session breadcrumb',
            showUserError: false // Don't spam user with regular breadcrumb errors
          })
        }, 30000) // Every 30 seconds
      }
      
      return { success: true, sessionId: data.id }
    } catch (error) {
      console.error('❌ Failed to start work session:', error)
      throw error
    }
  }

  const endWorkSession = async () => {
    if (!currentWorkSession.value) {
      console.warn('⚠️ No active work session to end')
      return { success: false, error: 'No active session' }
    }

    console.log('🕐 Ending work session:', currentWorkSession.value.id)
    
    try {
      const endTime = new Date().toISOString()
      const sessionDuration = new Date(endTime) - new Date(currentWorkSession.value.start_time)
      const totalHours = (sessionDuration / (1000 * 60 * 60)).toFixed(2)

      // Update work session in database with GPS coordinates
      const { data, error } = await supabase
        .from('work_sessions')
        .update({
          end_time: endTime,
          status: 'completed',
          total_hours: totalHours,
          // Capture GPS location at clock-out
          end_latitude: currentLocation.value?.latitude || null,
          end_longitude: currentLocation.value?.longitude || null,
          end_gps_accuracy: gpsAccuracy.value || null
        })
        .eq('id', currentWorkSession.value.id)
        .select()
        .single()

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      console.log('📍 Clock-out location captured:', {
        lat: currentLocation.value?.latitude,
        lng: currentLocation.value?.longitude,
        accuracy: gpsAccuracy.value
      })

      // Update local state
      isWorkSessionActive.value = false
      sessionEndTime.value = endTime
      currentWorkSession.value = null

      console.log('✅ Work session ended with GPS location saved to database')
      
      // FIXED: Log action to delivery_logs for admin visibility
      try {
        await supabase
          .from('delivery_logs')
          .insert({
            driver_id: driverId.value,
            action_type: 'end_route',
            timestamp: endTime,
            latitude: currentLocation.value?.latitude,
            longitude: currentLocation.value?.longitude,
            gps_accuracy: gpsAccuracy.value,
            note: `Driver clocked out - work session completed (${totalHours} hours)`,
            battery_level: batteryLevel.value,
            signal_status: signalStatus.value || 'unknown',
            synced: true
          })
        console.log('📝 Clock-out action logged for admin visibility')
      } catch (logError) {
        console.warn('⚠️ Could not log end action (non-critical):', logError)
      }
      
      // Clear localStorage backup
      localStorage.removeItem('active_work_session')
      
      // FIXED: Stop breadcrumb tracking when clocking out
      console.log('🍞 Stopping breadcrumb tracking for clocked-out driver')
      if (breadcrumbInterval) {
        clearInterval(breadcrumbInterval)
        breadcrumbInterval = null
      }
      
      isActiveRoute.value = false
      autoTrackingMode.value = false
      trackingTrigger.value = null
      
      // Mark breadcrumbs as inactive in database
      try {
        await supabase
          .from('gps_breadcrumbs')
          .update({ is_active_route: false })
          .eq('driver_id', driverId.value)
          .eq('is_active_route', true)
        console.log('✅ Marked route as ended in database')
      } catch (error) {
        console.warn('⚠️ Could not mark route as ended (non-critical):', error)
      }
      
      // Update driver presence to offline after clock-out
      await updateDriverPresenceWithLocation(false)
      
      return { success: true, totalHours }
    } catch (error) {
      console.error('❌ Failed to end work session:', error)
      throw error
    }
  }

  // Load active work session on initialization
  const loadActiveWorkSession = async () => {
    if (!driverId.value) return

    console.log('🔍 Loading active work session for driver:', driverId.value)
    
    try {
      // Check database for active work session (using TEXT driver_id)
      const { data, error } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('driver_id', driverId.value.toString())
        .eq('status', 'active')
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (data) {
        // Active session found - restore state
        isWorkSessionActive.value = true
        sessionStartTime.value = data.start_time
        currentWorkSession.value = data
        
        console.log('✅ Active work session restored:', data.id)
        console.log('📅 Session started at:', new Date(data.start_time).toLocaleString())
        
        // Update localStorage backup
        localStorage.setItem('active_work_session', JSON.stringify(data))
      } else {
        // No active session - check localStorage backup
        const backup = localStorage.getItem('active_work_session')
        if (backup) {
          console.log('⚠️ No DB session but found localStorage backup - clearing it')
          localStorage.removeItem('active_work_session')
        }
        
        isWorkSessionActive.value = false
        sessionStartTime.value = null
        currentWorkSession.value = null
        console.log('ℹ️ No active work session found')
      }
    } catch (error) {
      console.error('❌ Failed to load work session:', error)
      
      // Fallback to localStorage if database fails
      const backup = localStorage.getItem('active_work_session')
      if (backup) {
        try {
          const sessionData = JSON.parse(backup)
          isWorkSessionActive.value = true
          sessionStartTime.value = sessionData.start_time
          currentWorkSession.value = sessionData
          console.log('📦 Restored from localStorage backup')
        } catch (parseError) {
          console.error('❌ Failed to parse localStorage backup:', parseError)
          localStorage.removeItem('active_work_session')
        }
      }
    }
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
      
      // Ensure driverId is set before returning
      if (driverIdResult) {
        driverId.value = driverIdResult
        console.log('✅ Driver ID set for work session loading:', driverIdResult)
      }
      
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

  // ALPHA TESTING: Manual GPS and breadcrumb test function
  const testGpsAndBreadcrumb = async () => {
    console.log('🧪 MANUAL GPS & BREADCRUMB TEST started...')
    
    try {
      // Force GPS update
      console.log('📍 Step 1: Getting fresh GPS location...')
      const gpsSuccess = await getQuickGpsLocation()
      
      if (!gpsSuccess) {
        alert('❌ GPS Test FAILED\n\nCould not get GPS location. Check location permissions.')
        return false
      }
      
      console.log('✅ Step 1 complete: GPS location obtained')
      
      // Force breadcrumb log
      console.log('🍞 Step 2: Logging test breadcrumb...')
      await logBreadcrumb({
        trigger: 'manual_test',
        note: 'Manual test breadcrumb - alpha testing',
        showUserError: true
      })
      
      console.log('✅ Step 2 complete: Test breadcrumb logged')
      
      alert(`✅ GPS & Breadcrumb Test SUCCESSFUL!\n\nLocation: ${currentLocation.value.latitude.toFixed(6)}, ${currentLocation.value.longitude.toFixed(6)}\nAccuracy: ±${gpsAccuracy.value}m\n\nCheck the console for detailed logs!`)
      return true
      
    } catch (error) {
      console.error('❌ GPS & Breadcrumb test failed:', error)
      alert(`❌ GPS & Breadcrumb Test FAILED\n\nError: ${error.message}\n\nCheck the console for details.`)
      return false
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
    getQuickGpsLocation,
    startLocationTracking,
    initializeDriverWithRouteCheck,
    startWorkSession,
    endWorkSession,
    loadActiveWorkSession,
    getFormattedWorkTime,
    updateDriverPresenceWithLocation,
    
    // NEW: Auto-tracking methods
    startAutoTracking,
    stopAutoTracking,
    enableGhostControl,
    connectToGhostControl,
    sendGhostCommand,
    notifyAdmin,
    
    // NEW: Movement detection methods
    startMovementDetection,
    stopMovementDetection,
    detectMovement,
    
    // NEW: Manual testing methods
    logBreadcrumb,
    testGpsAndBreadcrumb
  }
} 