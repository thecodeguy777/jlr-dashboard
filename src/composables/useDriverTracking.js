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

  // Movement detection thresholds - TRAFFIC AWARE
  const MOVEMENT_CONFIG = {
    speedThreshold: 8, // km/h - lowered to catch heavy traffic (was 15)
    trafficSpeedMin: 3, // km/h - minimum to be considered traffic movement  
    distanceThreshold: 50, // meters to confirm movement (lowered for traffic)
    timeWindow: 60, // seconds to confirm sustained movement (longer for traffic)
    accuracyRequired: 50, // GPS accuracy needed
    stopDuration: 10, // minutes stopped before ending tracking (longer for traffic jams)
    trafficDetectionWindow: 300 // 5 minutes to detect traffic patterns
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

      // TRAFFIC-AWARE Movement Detection!
      if (speed > MOVEMENT_CONFIG.speedThreshold && !isMoving.value) {
        console.log(`🚗 Movement detected: ${speed.toFixed(1)} km/h`)
        startMovementTracking(speed)
      }
      
      // TRAFFIC DETECTION: Slow but sustained movement
      else if (speed >= MOVEMENT_CONFIG.trafficSpeedMin && speed <= MOVEMENT_CONFIG.speedThreshold && !isMoving.value) {
        console.log(`🚦 Potential traffic detected: ${speed.toFixed(1)} km/h - checking pattern...`)
        checkTrafficPattern(speed, distance)
      }
      
      // Still moving - update movement data
      else if (speed > MOVEMENT_CONFIG.trafficSpeedMin && isMoving.value) {
        updateMovementData(speed, distance)
        
        // Log traffic status
        if (speed < MOVEMENT_CONFIG.speedThreshold) {
          console.log(`🚦 Traffic movement: ${speed.toFixed(1)} km/h`)
        }
      }
      
      // Completely stopped (not even traffic crawl)
      else if (speed < MOVEMENT_CONFIG.trafficSpeedMin && isMoving.value) {
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

  const startMovementTracking = async (initialSpeed, detectionType = 'normal') => {
    isMoving.value = true
    movementStartTime.value = Date.now()
    
    // Auto-start breadcrumb tracking if not already active
    if (!isActiveRoute.value) {
      const trackingReason = detectionType === 'traffic_detected' ? 
        '🚦 Auto-starting breadcrumb tracking due to TRAFFIC movement' :
        '🔄 Auto-starting breadcrumb tracking due to movement'
      
      console.log(trackingReason)
      await startAutoTracking('movement_detected', {
        initialSpeed,
        detectionType,
        detectionTime: new Date().toISOString()
      })
    }

    // Notify admin of movement with traffic context
    notifyAdmin({
      type: detectionType === 'traffic_detected' ? 'TRAFFIC_MOVEMENT_DETECTED' : 'MOVEMENT_DETECTED',
      driver_id: driverId.value,
      speed: initialSpeed,
      detection_type: detectionType,
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

  // TRAFFIC DETECTION: Check for sustained slow movement patterns
  const checkTrafficPattern = (speed, distance) => {
    const now = Date.now()
    
    // Look at movement history for traffic patterns
    const recentMovement = movementHistory.value.filter(entry => 
      now - entry.timestamp <= MOVEMENT_CONFIG.trafficDetectionWindow * 1000
    )
    
    if (recentMovement.length >= 3) {
      // Calculate average speed and total distance over detection window
      const avgSpeed = recentMovement.reduce((sum, entry) => sum + entry.speed, 0) / recentMovement.length
      const totalDistance = recentMovement.reduce((sum, entry) => sum + (entry.distance || 0), 0)
      
      // Traffic pattern: sustained slow movement with significant distance
      const isTrafficPattern = avgSpeed >= MOVEMENT_CONFIG.trafficSpeedMin && 
                             avgSpeed <= MOVEMENT_CONFIG.speedThreshold && 
                             totalDistance >= MOVEMENT_CONFIG.distanceThreshold
      
      if (isTrafficPattern) {
        console.log(`🚦 TRAFFIC CONFIRMED: Avg speed ${avgSpeed.toFixed(1)} km/h over ${(totalDistance).toFixed(0)}m - starting tracking`)
        startMovementTracking(avgSpeed, 'traffic_detected')
      } else {
        console.log(`⏳ Slow movement detected but not enough for traffic pattern (avg: ${avgSpeed.toFixed(1)} km/h, distance: ${totalDistance.toFixed(0)}m)`)
      }
    }
  }

  const handleMovementStop = () => {
    console.log('🛑 Movement stopped, monitoring for continued stop...')
    console.log(`⏱️ Will wait ${MOVEMENT_CONFIG.stopDuration} minutes before stopping tracking (traffic-aware)`)
    
    // Wait longer before officially stopping tracking (traffic-aware: 10 minutes)
    setTimeout(() => {
      if (currentSpeed.value < MOVEMENT_CONFIG.trafficSpeedMin) {
        const movementDuration = (Date.now() - movementStartTime.value) / 1000 / 60 // minutes
        console.log(`📍 Movement ended after ${movementDuration.toFixed(1)} minutes`)
        
        isMoving.value = false
        
        // Notify admin of stop
        notifyAdmin({
          type: 'MOVEMENT_STOPPED',
          driver_id: driverId.value,
          duration_minutes: movementDuration,
          total_distance: totalDistance.value,
          final_speed: currentSpeed.value,
          location: currentLocation.value,
          timestamp: new Date().toISOString()
        })

        // Stop auto-tracking if it was only triggered by movement
        if (autoTrackingMode.value && trackingTrigger.value === 'movement_detected') {
          setTimeout(() => {
            if (currentSpeed.value < MOVEMENT_CONFIG.trafficSpeedMin) {
              console.log('🔚 Ending movement-based tracking due to sustained stop')
              stopAutoTracking('movement_ended')
            }
          }, 2 * 60 * 1000) // Wait additional 2 minutes to be sure
        }
      } else {
        console.log(`🚦 Still moving at ${currentSpeed.value.toFixed(1)} km/h - continuing tracking`)
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
    
    // Start MOVEMENT-BASED breadcrumbs immediately
    if (!breadcrumbInterval) {
      console.log('🚶‍♂️ MOVEMENT DETECTED - Starting breadcrumb logging every 30 seconds')
      
      logBreadcrumb({
        trigger: trigger,
        note: `Movement tracking started: ${trigger}`
      })
      
      breadcrumbInterval = setInterval(() => {
        // Only log if still moving or in active route
        if (isMoving.value || trigger === 'work_session_active') {
          console.log('🍞 MOVEMENT BREADCRUMB - logging because driver is moving or working')
          logBreadcrumb({
            trigger: trigger,
            note: `Movement tracking: ${isMoving.value ? 'Moving' : 'Stationary'}`
          })
        } else {
          console.log('⏸️ Skipping breadcrumb - driver not moving')
        }
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
    // SIMPLIFIED breadcrumb data - ONLY fields that actually exist in your database
    const breadcrumbData = {
      driver_id: driverId.value, // UUID directly
      timestamp: now.toISOString(),
      latitude: currentLocation.value.latitude,
      longitude: currentLocation.value.longitude,
      gps_accuracy: gpsAccuracy.value || null,
      is_active_route: isActiveRoute.value || false,
      synced: isOnline.value,
      // ALPHA SIMPLIFIED: Only the columns you actually added
      auto_tracking: additionalData.auto_tracking !== undefined ? additionalData.auto_tracking : autoTrackingMode.value,
      movement_detected: additionalData.movement_detected !== undefined ? additionalData.movement_detected : isMoving.value
    }

    // Add speed/distance if we have previous breadcrumb (these fields should exist)
    if (lastBreadcrumb.value) {
      const distance = calculateDistance(
        lastBreadcrumb.value.latitude,
        lastBreadcrumb.value.longitude,
        currentLocation.value.latitude,
        currentLocation.value.longitude
      )

      const timeSeconds = (now - new Date(lastBreadcrumb.value.timestamp)) / 1000
      const speed = calculateSpeed(distance, timeSeconds)

      breadcrumbData.distance_from_last = Math.round(distance * 100) / 100
      breadcrumbData.speed_kmh = Math.round(speed * 100) / 100

      totalDistance.value += distance
      currentSpeed.value = speed
    }

    console.log('🍞 BREADCRUMB DATA prepared (ALPHA SIMPLIFIED):', {
      driver_id: breadcrumbData.driver_id,
      lat: breadcrumbData.latitude?.toFixed(6),
      lng: breadcrumbData.longitude?.toFixed(6),
      accuracy: breadcrumbData.gps_accuracy,
      route_active: breadcrumbData.is_active_route,
      speed: breadcrumbData.speed_kmh || 'N/A',
      distance: breadcrumbData.distance_from_last || 'N/A',
      synced: breadcrumbData.synced,
      auto_tracking: breadcrumbData.auto_tracking,
      movement: breadcrumbData.movement_detected
    })

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
          auto_tracking: data[0]?.auto_tracking,
          movement: data[0]?.movement_detected
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
    
    // GEOFENCE DETECTION: Automatic 'arrived' logging when entering task geofence
    checkTaskGeofences(latitude, longitude)
  }

  // GEOFENCE DETECTION: Automatic 'arrived' logging when entering task geofence
  const checkTaskGeofences = async (lat, lng) => {
    try {
      // Get current tasks from window object (set by driver dashboard)
      const currentTasks = window.currentDriverTasks || []
      
      // Check each pending task for geofence entry
      for (const task of currentTasks) {
        if (task.status === 'in_progress' && task.destination_lat && task.destination_lng) {
          const distance = calculateDistance(
            lat, lng,
            task.destination_lat, task.destination_lng
          )
          
          const geofenceRadius = task.geofence_radius || 100 // Default 100m radius
          
          // Driver entered geofence - log 'arrived' action
          if (distance <= geofenceRadius) {
            console.log(`🎯 GEOFENCE ENTRY: Driver arrived at ${task.destination_name} (${distance.toFixed(0)}m from center)`)
            
            // Check if already logged arrival for this task
            const alreadyArrived = await checkIfAlreadyArrived(task.id)
            if (!alreadyArrived) {
              await logArrivalAction(task, lat, lng)
              
              // Update arrival status for UI
              await checkTaskArrivals()
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Geofence check failed (non-critical):', error)
    }
  }

  // Check if arrival already logged for this task
  const checkIfAlreadyArrived = async (taskId) => {
    try {
      const { data, error } = await supabase
        .from('delivery_logs')
        .select('id, timestamp')
        .eq('driver_id', driverId.value)
        .eq('action_type', 'arrived')
        .like('note', `%task_id:${taskId}%`)
        .limit(1)
      
      if (error) throw error
      return data && data.length > 0 ? data[0] : null
    } catch (error) {
      console.warn('⚠️ Could not check arrival status:', error)
      return null
    }
  }

  // NEW: Check arrival status for all current tasks
  const checkTaskArrivals = async () => {
    try {
      const currentTasks = window.currentDriverTasks || []
      const taskArrivals = {}
      
      for (const task of currentTasks) {
        if (task.status === 'in_progress') {
          const arrivalLog = await checkIfAlreadyArrived(task.id)
          if (arrivalLog) {
            taskArrivals[task.id] = {
              arrived: true,
              timestamp: arrivalLog.timestamp
            }
          }
        }
      }
      
      // Store arrival info on window object for other components
      window.taskArrivals = taskArrivals
      console.log('📍 Task arrivals updated:', taskArrivals)
      
      return taskArrivals
    } catch (error) {
      console.warn('⚠️ Could not check task arrivals:', error)
      return {}
    }
  }

  // Log automatic arrival action
  const logArrivalAction = async (task, lat, lng) => {
    try {
      await supabase
        .from('delivery_logs')
        .insert({
          driver_id: driverId.value,
          action_type: 'arrived',
          timestamp: new Date().toISOString(),
          latitude: lat,
          longitude: lng,
          gps_accuracy: gpsAccuracy.value,
          note: `Auto-arrived at ${task.destination_name} (geofence) - task_id:${task.id}`,
          battery_level: batteryLevel.value,
          signal_status: signalStatus.value || 'unknown',
          synced: true
        })
      
      console.log('✅ Automatic arrival logged for geofence entry')
      
      // Notify admin of geofence entry
      notifyAdmin({
        type: 'GEOFENCE_ENTRY',
        driver_id: driverId.value,
        task_id: task.id,
        destination: task.destination_name,
        location: { lat, lng },
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      console.error('❌ Failed to log automatic arrival:', error)
    }
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
        driver_id: driverId.value, // FIXED: Use UUID directly, NOT .toString()
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
        accuracy: sessionData.start_gps_accuracy,
        driverIdType: typeof sessionData.driver_id
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
      
      // ROBUST: Log CLOCK-IN action to delivery_logs (with comprehensive error handling)
      try {
        console.log('📝 Attempting to log clock-in action to delivery_logs...')
        console.log('🌐 Network status:', navigator.onLine ? 'Online' : 'Offline')
        console.log('🔗 Supabase URL:', supabase.supabaseUrl)
        
        const deliveryLogData = {
          driver_id: driverId.value,
          action_type: 'clocked_in', // FIXED: Use 'clocked_in' for proper clock-in logging
          timestamp: sessionData.start_time,
          latitude: sessionData.start_latitude,
          longitude: sessionData.start_longitude,
          gps_accuracy: sessionData.start_gps_accuracy,
          note: 'Driver clocked in - work day started',
          battery_level: batteryLevel.value,
          signal_status: signalStatus.value || 'unknown',
          synced: true,
          created_at: new Date().toISOString()
        }
        
        console.log('📋 Delivery log data:', deliveryLogData)
        console.log('🚀 Making request to delivery_logs...')
        
        const startTime = Date.now()
        const result = await supabase
          .from('delivery_logs')
          .insert(deliveryLogData)
          
        console.log(`✅ Clock-in action logged (${Date.now() - startTime}ms)`)
        
      } catch (logError) {
        console.error('❌ DELIVERY LOG ERROR - Full details:', logError)
        console.error('🔍 Error type:', typeof logError)
        console.error('🔍 Error constructor:', logError.constructor.name)
        console.error('🔍 Error message:', logError.message)
        console.error('🔍 Error code:', logError.code)
        console.error('🔍 Error status:', logError.status)
        
        // Check if it's a network/fetch issue
        if (logError.message?.includes('fetch') || logError.name === 'TypeError') {
          console.error('🌐 NETWORK/FETCH ISSUE detected!')
          console.log('🔧 Possible solutions:')
          console.log('   1. Check internet connection')
          console.log('   2. Check CORS settings')
          console.log('   3. Check Supabase URL/key')
          console.log('   4. Try refreshing the page')
        }
        
        // Try with different action_type as fallback
        if (logError.message?.includes('action_type') || logError.code === '23514') {
          console.log('🔄 Retrying with different action_type...')
          try {
            await supabase
              .from('delivery_logs')
              .insert({
                driver_id: driverId.value,
                action_type: 'clocked_in', // Fallback to known valid action
                timestamp: sessionData.start_time,
                latitude: sessionData.start_latitude,
                longitude: sessionData.start_longitude,
                gps_accuracy: sessionData.start_gps_accuracy,
                note: 'Driver clocked in - work day started',
                battery_level: batteryLevel.value,
                signal_status: signalStatus.value || 'unknown',
                synced: true
              })
            console.log('✅ Clock-in logged with fallback action_type')
          } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError)
            console.log('⚠️ Delivery logging disabled for this session - main tracking continues')
          }
        } else {
          console.error('❌ Unexpected delivery log error:', logError.message)
          console.log('⚠️ Skipping delivery log - main work session tracking is working fine')
        }
      }
      
      // Save to localStorage as backup
      localStorage.setItem('active_work_session', JSON.stringify(data))
      
      // IMPORTANT: Also immediately update driver presence with current location
      await updateDriverPresenceWithLocation()
      
      // FIXED: Start CONTINUOUS breadcrumb tracking when clocking in (for admin visibility)
      console.log('🍞 Starting CONTINUOUS breadcrumb tracking for clocked-in driver')
      isActiveRoute.value = true
      autoTrackingMode.value = true
      trackingTrigger.value = 'work_session_active'
      
      // Log immediate breadcrumb for clock-in (for admin visibility)
      console.log('🍞 LOGGING IMMEDIATE CLOCK-IN BREADCRUMB...')
      await logBreadcrumb({
        trigger: 'work_session_start',
        note: 'Clock-in breadcrumb - tracking active',
        showUserError: true
      })
      
      // FIXED: Start CONTINUOUS interval for work session (every 60 seconds for clocked-in drivers)
      if (!breadcrumbInterval) {
        console.log('🍞 Starting CONTINUOUS breadcrumb tracking every 60 seconds (work session active)')
        breadcrumbInterval = setInterval(async () => {
          if (isWorkSessionActive.value) {
            console.log('🍞 WORK SESSION BREADCRUMB - logging for admin visibility')
            await logBreadcrumb({
              trigger: 'work_session_active',
              note: `Work session tracking: ${isMoving.value ? 'Moving' : 'Stationary'}`,
              auto_tracking: autoTrackingMode.value,
              movement_detected: isMoving.value
            })
          } else {
            console.log('⏸️ Work session ended - stopping breadcrumb tracking')
            clearInterval(breadcrumbInterval)
            breadcrumbInterval = null
          }
        }, 60000) // Every 60 seconds for work sessions (slower than movement-based)
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
          total_worked_minutes: Math.round(totalHours * 60), // Convert hours to minutes
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
      
      // ROBUST: Log CLOCK-OUT action to delivery_logs (with comprehensive error handling)
      try {
        console.log('📝 Attempting to log clock-out action to delivery_logs...')
        
        const deliveryLogData = {
          driver_id: driverId.value,
          action_type: 'clocked_out', // FIXED: Use 'clocked_out' for proper clock-out logging
          timestamp: endTime,
          latitude: currentLocation.value?.latitude,
          longitude: currentLocation.value?.longitude,
          gps_accuracy: gpsAccuracy.value,
          note: `Driver clocked out - work day completed (${totalHours} hours)`,
          battery_level: batteryLevel.value,
          signal_status: signalStatus.value || 'unknown',
          synced: true,
          created_at: new Date().toISOString()
        }
        
        await supabase
          .from('delivery_logs')
          .insert(deliveryLogData)
          
        console.log('✅ Clock-out action logged for admin visibility')
        
      } catch (logError) {
        console.error('❌ CLOCK-OUT LOG ERROR:', logError)
        console.log('⚠️ Clock-out logging failed - but work session ended successfully')
        
        // Don't retry for clock-out - just log the error and continue
        console.log('📊 Work session data is safely stored in work_sessions table')
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
      // Check database for active work session (using UUID driver_id directly)
      const { data, error } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('driver_id', driverId.value) // FIXED: Use UUID directly, NOT .toString()
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
        
        // FIXED: Also restore breadcrumb tracking if work session is active
        if (!breadcrumbInterval && isWorkSessionActive.value) {
          console.log('🍞 Restoring breadcrumb tracking for active work session')
          isActiveRoute.value = true
          autoTrackingMode.value = true
          trackingTrigger.value = 'work_session_active'
          
          // Start continuous tracking for restored session
          breadcrumbInterval = setInterval(async () => {
            if (isWorkSessionActive.value) {
              await logBreadcrumb({
                trigger: 'work_session_active',
                note: `Work session tracking: ${isMoving.value ? 'Moving' : 'Stationary'}`,
                auto_tracking: autoTrackingMode.value,
                movement_detected: isMoving.value
              })
            } else {
              clearInterval(breadcrumbInterval)
              breadcrumbInterval = null
            }
          }, 60000) // Every 60 seconds
        }
        
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
    testGpsAndBreadcrumb,
    
    // NEW: Check arrival status for all current tasks
    checkTaskArrivals
  }
} 