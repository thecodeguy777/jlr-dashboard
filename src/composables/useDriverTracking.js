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

  // NEW: Work Session Management (Manual Payroll)
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
  let wakeInterval = null // New: Keep app alive
  let lastValidLocation = null // New: Store last good location
  let locationBuffer = [] // New: Buffer for location filtering

  // Enhanced GPS options for better accuracy
  const GPS_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 20000, // Increased timeout
    maximumAge: 5000 // Reduced max age for fresher data
  }

  // Location filtering thresholds
  const ACCURACY_THRESHOLD = 100 // Maximum acceptable accuracy in meters
  const SPEED_THRESHOLD = 200 // Maximum realistic speed in km/h to filter GPS jumps
  const DISTANCE_THRESHOLD = 1000 // Maximum distance jump in meters

  const requestGpsPermission = async () => {
    try {
      const position = await getCurrentPosition()
      isGpsAvailable.value = true
      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }
      
      // Only update if location passes filtering
      if (isLocationValid(newLocation, position.coords.accuracy)) {
        currentLocation.value = newLocation
        lastValidLocation = newLocation
      }
      
      gpsAccuracy.value = position.coords.accuracy
      return true
    } catch (error) {
      console.error('GPS permission denied:', error)
      isGpsAvailable.value = false
      
      // Log GPS denial
      await logSessionEvent('gps_denied', { error: error.message })
      return false
    }
  }

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        GPS_OPTIONS
      )
    })
  }

  // New: Enhanced location validation and filtering
  const isLocationValid = (newLocation, accuracy) => {
    // Check accuracy threshold
    if (accuracy > ACCURACY_THRESHOLD) {
      console.warn(`🎯 GPS accuracy too low: ${accuracy}m`)
      return false
    }

    // If we don't have a previous location, accept this one
    if (!lastValidLocation) {
      return true
    }

    // Calculate distance from last valid location
    const distance = calculateDistance(
      lastValidLocation.latitude,
      lastValidLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    )

    // Check for unrealistic jumps
    if (distance > DISTANCE_THRESHOLD) {
      console.warn(`🚨 GPS jump detected: ${distance.toFixed(0)}m - rejecting`)
      logSessionEvent('gps_jump_filtered', { 
        distance,
        accuracy,
        from: lastValidLocation,
        to: newLocation
      })
      return false
    }

    return true
  }

  // New: Smooth location filtering using buffer
  const addLocationToBuffer = (position) => {
    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: Date.now(),
      speed: position.coords.speed || 0
    }

    locationBuffer.push(location)

    // Keep only last 5 readings for filtering
    if (locationBuffer.length > 5) {
      locationBuffer.shift()
    }

    return getFilteredLocation()
  }

  // New: Get filtered location from buffer
  const getFilteredLocation = () => {
    if (locationBuffer.length === 0) return null

    // If only one reading, use it if valid
    if (locationBuffer.length === 1) {
      const loc = locationBuffer[0]
      return isLocationValid({ latitude: loc.latitude, longitude: loc.longitude }, loc.accuracy) 
        ? loc : null
    }

    // Filter out readings with poor accuracy
    const goodReadings = locationBuffer.filter(loc => loc.accuracy <= ACCURACY_THRESHOLD)
    
    if (goodReadings.length === 0) {
      console.warn('🎯 No good GPS readings in buffer')
      return null
    }

    // Use weighted average based on accuracy (better accuracy = higher weight)
    let totalWeight = 0
    let weightedLat = 0
    let weightedLng = 0

    goodReadings.forEach(reading => {
      const weight = 1 / (reading.accuracy + 1) // Better accuracy = higher weight
      totalWeight += weight
      weightedLat += reading.latitude * weight
      weightedLng += reading.longitude * weight
    })

    return {
      latitude: weightedLat / totalWeight,
      longitude: weightedLng / totalWeight,
      accuracy: Math.min(...goodReadings.map(r => r.accuracy)),
      timestamp: Date.now()
    }
  }

  const startLocationTracking = () => {
    if (!navigator.geolocation) return

    console.log('📍 Starting enhanced location tracking with filtering')

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        console.log(`🛰️ Raw GPS: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)} (±${position.coords.accuracy.toFixed(1)}m)`)
        
        // Add to buffer and get filtered location
        const filteredLocation = addLocationToBuffer(position)
        
        if (filteredLocation) {
          const newLocation = {
            latitude: filteredLocation.latitude,
            longitude: filteredLocation.longitude
          }

          // Additional speed-based filtering for GPS jumps
          if (lastValidLocation) {
            const distance = calculateDistance(
              lastValidLocation.latitude,
              lastValidLocation.longitude,
              newLocation.latitude,
              newLocation.longitude
            )
            
            const timeDiff = (Date.now() - (lastValidLocation.timestamp || Date.now())) / 1000
            const calculatedSpeed = timeDiff > 0 ? (distance / timeDiff) * 3.6 : 0 // km/h

            if (calculatedSpeed > SPEED_THRESHOLD) {
              console.warn(`🚨 Unrealistic speed detected: ${calculatedSpeed.toFixed(1)} km/h - rejecting`)
              logSessionEvent('speed_filter_triggered', { 
                speed: calculatedSpeed,
                distance,
                timeDiff
              })
              return
            }
          }

          currentLocation.value = newLocation
          lastValidLocation = { ...newLocation, timestamp: Date.now() }
          gpsAccuracy.value = filteredLocation.accuracy

          console.log(`✅ Filtered GPS: ${newLocation.latitude.toFixed(6)}, ${newLocation.longitude.toFixed(6)} (±${filteredLocation.accuracy.toFixed(1)}m)`)
        } else {
          console.warn('❌ GPS reading filtered out')
        }

        // Detect potential GPS spoofing (accuracy too perfect)
        if (position.coords.accuracy < 1) {
          logSessionEvent('location_spoofing', { 
            accuracy: position.coords.accuracy,
            coords: currentLocation.value 
          })
        }
      },
      (error) => {
        console.error('Location tracking error:', error)
        isGpsAvailable.value = false
        
        // Log specific GPS errors
        logSessionEvent('gps_error', { 
          error: error.message,
          code: error.code
        })
      },
      GPS_OPTIONS
    )

    // Start wake interval to prevent app from sleeping
    startWakeInterval()
  }

  // New: Keep app alive to prevent background suspension
  const startWakeInterval = () => {
    if (wakeInterval) return

    console.log('⏰ Starting wake interval to prevent app suspension')
    
    wakeInterval = setInterval(() => {
      // Ping to keep app alive
      console.log('💓 App heartbeat - preventing suspension')
      
      // Update battery and connection status
      updateDeviceStatus()
      
      // Update worked time if session is active
      updateWorkedTime()
      
      // Check if we're still getting GPS updates
      if (lastValidLocation) {
        const timeSinceLastGPS = Date.now() - (lastValidLocation.timestamp || 0)
        if (timeSinceLastGPS > 60000) { // No GPS for 1 minute
          console.warn('⚠️ GPS tracking may have stopped - attempting restart')
          logSessionEvent('gps_tracking_stalled', { timeSinceLastGPS })
          
          // Restart location tracking
          if (watchId) {
            navigator.geolocation.clearWatch(watchId)
          }
          startLocationTracking()
        }
      }
    }, 30000) // Every 30 seconds
  }

  // New: Update device status
  const updateDeviceStatus = async () => {
    // Update online status
    isOnline.value = navigator.onLine

    // Update battery status if available
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery()
        batteryLevel.value = Math.round(battery.level * 100)
        
        // Log low battery warnings
        if (batteryLevel.value < 20 && batteryLevel.value % 5 === 0) {
          logSessionEvent('low_battery_warning', { level: batteryLevel.value })
        }
      } catch (error) {
        console.warn('Battery API not available:', error)
      }
    }

    // Update signal status based on connection
    signalStatus.value = navigator.onLine ? 'good' : 'offline'
  }

  // Anti-cheat measures
  const setupAntiCheat = () => {
    // Monitor app focus/blur
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Battery API monitoring
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        batteryLevel.value = Math.round(battery.level * 100)
        
        battery.addEventListener('levelchange', () => {
          batteryLevel.value = Math.round(battery.level * 100)
        })
      }).catch(() => {
        // Battery API not supported
        batteryLevel.value = null
      })
    }

    // Network monitoring
    if ('connection' in navigator) {
      const connection = navigator.connection
      signalStatus.value = `${connection.effectiveType || 'unknown'} - ${connection.downlink}Mbps`
      
      connection.addEventListener('change', () => {
        signalStatus.value = `${connection.effectiveType || 'unknown'} - ${connection.downlink}Mbps`
      })
    }

    // Session monitoring interval
    sessionMonitorInterval = setInterval(checkSessionIntegrity, 30000) // Every 30 seconds
  }

  const handleVisibilityChange = () => {
    if (document.hidden) {
      console.log('📱 App hidden - starting background mode')
      lastBlurTime.value = Date.now()
      appFocused.value = false
      
      // Start service worker background tracking if route is active
      if (isActiveRoute.value) {
        startBackgroundTracking()
      }
      
      logSessionEvent('app_hidden')
    } else {
      console.log('📱 App visible - resuming foreground mode')
      const now = Date.now()
      appFocused.value = true

      if (lastBlurTime.value) {
        const hiddenDuration = Math.floor((now - lastBlurTime.value) / 1000)
        
        logSessionEvent('app_visible', { 
          hidden_duration: hiddenDuration,
          long_absence: hiddenDuration > 300
        })

        // Stop background tracking
        stopBackgroundTracking()

        // Log session interruption if away for more than 5 minutes
        if (hiddenDuration > 300) {
          logSessionEvent('session_interruption', { duration: hiddenDuration })
        }
      }

      lastBlurTime.value = null
    }
  }

  const handleFocus = () => {
    const now = Date.now()
    appFocused.value = true

    if (lastBlurTime.value) {
      const blurDuration = Math.floor((now - lastBlurTime.value) / 1000)
      
      logSessionEvent('app_focus', { 
        blur_duration: blurDuration,
        long_absence: blurDuration > 300 // 5 minutes
      })

      // Log session interruption if away for more than 5 minutes
      if (blurDuration > 300) {
        logSessionEvent('session_interruption', { duration: blurDuration })
      }
    }

    lastBlurTime.value = null
  }

  const handleBlur = () => {
    appFocused.value = false
    lastBlurTime.value = Date.now()
    
    logSessionEvent('app_blur')
  }

  const handleOnline = () => {
    isOnline.value = true
    syncPendingLogs()
  }

  const handleOffline = () => {
    isOnline.value = false
    logSessionEvent('offline_detected')
  }

  const checkSessionIntegrity = () => {
    // Check if GPS is still available
    if (isGpsAvailable.value && gpsAccuracy.value > 100) {
      logSessionEvent('gps_accuracy_degraded', { accuracy: gpsAccuracy.value })
    }

    // Check if still in focus (for long-running sessions)
    if (!appFocused.value && lastBlurTime.value) {
      const blurDuration = Math.floor((Date.now() - lastBlurTime.value) / 1000)
      if (blurDuration > 600) { // 10 minutes
        logSessionEvent('extended_absence', { duration: blurDuration })
      }
    }
  }

  // Utility functions for enhanced tracking
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c // Distance in meters
  }

  const calculateSpeed = (distance, timeSeconds) => {
    if (timeSeconds === 0) return 0
    const speedMps = distance / timeSeconds // meters per second
    return speedMps * 3.6 // convert to km/h
  }

  const checkGeofences = async (latitude, longitude) => {
    if (!clients.value.length) return

    for (const client of clients.value) {
      if (!client.location_lat || !client.location_lng) continue

      const distance = calculateDistance(
        latitude, longitude,
        client.location_lat, client.location_lng
      )

      const radius = client.geofence_radius || 100 // Default 100m radius
      const wasInside = client.isInside || false
      const isInside = distance <= radius

      // Detect geofence transitions
      if (isInside && !wasInside) {
        // Entered geofence
        await logGeofenceEvent(client.id, 'entered', latitude, longitude, distance, radius)
        client.isInside = true
      } else if (!isInside && wasInside) {
        // Exited geofence
        await logGeofenceEvent(client.id, 'exited', latitude, longitude, distance, radius)
        client.isInside = false
      }
    }
  }

  const logGeofenceEvent = async (clientId, eventType, latitude, longitude, distance, radius) => {
    const geofenceData = {
      driver_id: driverId.value,
      client_id: clientId,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      latitude,
      longitude,
      distance_from_center: distance,
      geofence_radius: radius
    }

    try {
      if (isOnline.value) {
        await supabase
          .from('geofence_events')
          .insert(geofenceData)
      } else {
        // Store locally for later sync
        const stored = JSON.parse(localStorage.getItem('pending_geofence_events') || '[]')
        stored.push(geofenceData)
        localStorage.setItem('pending_geofence_events', JSON.stringify(stored))
      }

      console.log(`🏢 Geofence ${eventType}: Client ${clientId} at ${Math.round(distance)}m`)
    } catch (error) {
      console.error('Error logging geofence event:', error)
    }
  }

  // Enhanced breadcrumb logging function with filtering
  const logBreadcrumb = async () => {
    if (!isGpsAvailable.value || !currentLocation.value || !isActiveRoute.value) {
      console.log('🍞 Breadcrumb skipped: GPS unavailable or route inactive')
      return
    }

    // Skip if GPS accuracy is too poor
    if (gpsAccuracy.value > ACCURACY_THRESHOLD) {
      console.warn(`🍞 Breadcrumb skipped: Poor GPS accuracy ${gpsAccuracy.value}m`)
      logSessionEvent('breadcrumb_skipped_accuracy', { accuracy: gpsAccuracy.value })
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
      location_method: 'filtered' // Mark as filtered data
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

      // Update reactive values
      currentSpeed.value = speed
      totalDistance.value += distance

      console.log(`🚗 Speed: ${speed.toFixed(1)} km/h, Distance: ${distance.toFixed(1)}m`)
    }

    try {
      if (isOnline.value) {
        await supabase
          .from('gps_breadcrumbs')
          .insert(breadcrumbData)
      } else {
        // Store locally for later sync
        const stored = JSON.parse(localStorage.getItem('pending_breadcrumbs') || '[]')
        stored.push(breadcrumbData)
        localStorage.setItem('pending_breadcrumbs', JSON.stringify(stored))
      }

      lastBreadcrumb.value = breadcrumbData

      // Check geofences
      await checkGeofences(currentLocation.value.latitude, currentLocation.value.longitude)
      
    } catch (error) {
      console.error('Error logging breadcrumb:', error)
    }
  }

  const startBreadcrumbTracking = () => {
    if (breadcrumbInterval) return

    console.log('📍 Starting breadcrumb tracking (30s interval)')
    isActiveRoute.value = true
    
    // Log initial breadcrumb immediately
    logBreadcrumb()
    
    // Then log every 30 seconds
    breadcrumbInterval = setInterval(logBreadcrumb, 30000)
  }

  const stopBreadcrumbTracking = () => {
    if (breadcrumbInterval) {
      clearInterval(breadcrumbInterval)
      breadcrumbInterval = null
    }
    
    console.log('🛑 Stopped breadcrumb tracking')
    isActiveRoute.value = false
    
    // Log final breadcrumb
    logBreadcrumb()
  }

  // Logging functions
  const logDeliveryAction = async (actionType, note = '', photo = null) => {
    if (!isGpsAvailable.value || !currentLocation.value) {
      throw new Error('GPS location required for delivery actions')
    }

    if (gpsAccuracy.value > 50) {
      throw new Error(`GPS accuracy too low: ${gpsAccuracy.value}m. Please wait for better signal.`)
    }

    isLoading.value = true

    try {
      const logData = {
        driver_id: driverId.value,
        action_type: actionType,
        timestamp: new Date().toISOString(),
        latitude: currentLocation.value.latitude,
        longitude: currentLocation.value.longitude,
        gps_accuracy: gpsAccuracy.value,
        note: note || null,
        photo_url: null,
        synced: isOnline.value,
        battery_level: batteryLevel.value,
        signal_status: signalStatus.value,
        device_info: {
          user_agent: navigator.userAgent,
          platform: navigator.platform,
          online: isOnline.value,
          timestamp: Date.now()
        }
      }

      // Handle photo upload if provided
      if (photo) {
        const photoUrl = await uploadPhoto(photo, actionType)
        logData.photo_url = photoUrl
      }

      // Handle breadcrumb tracking based on action
      if (actionType === 'start_route') {
        startBreadcrumbTracking()
        // Increment route count in work session
        if (isWorkSessionActive.value) {
          sessionStats.value.totalRoutes++
        }
      } else if (actionType === 'delivered') {
        // Increment delivery count in work session
        if (isWorkSessionActive.value) {
          sessionStats.value.totalDeliveries++
        }
      } else if (actionType === 'end_route') {
        stopBreadcrumbTracking()
        // Update session distance
        if (isWorkSessionActive.value) {
          sessionStats.value.totalDistance += totalDistance.value
        }
      }

      if (isOnline.value) {
        // Save directly to Supabase
        const { error } = await supabase
          .from('delivery_logs')
          .insert(logData)

        if (error) throw error
      } else {
        // Save to local storage for later sync
        logData.synced = false
        saveToLocalStorage(logData)
      }

      return { success: true, data: logData }
    } catch (error) {
      console.error('Error logging delivery action:', error)
      
      // Save to local storage as fallback
      const logData = {
        driver_id: driverId.value,
        action_type: actionType,
        timestamp: new Date().toISOString(),
        latitude: currentLocation.value.latitude,
        longitude: currentLocation.value.longitude,
        gps_accuracy: gpsAccuracy.value,
        note: note || null,
        synced: false,
        error: error.message
      }
      
      saveToLocalStorage(logData)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const logSessionEvent = async (eventType, metadata = {}) => {
    const sessionData = {
      driver_id: driverId.value,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        battery_level: batteryLevel.value,
        signal_status: signalStatus.value,
        gps_available: isGpsAvailable.value,
        app_focused: appFocused.value
      }
    }

    try {
      if (isOnline.value && driverId.value) {
        await supabase
          .from('session_logs')
          .insert(sessionData)
      } else {
        // Store locally for later sync
        const stored = JSON.parse(localStorage.getItem('pending_session_logs') || '[]')
        stored.push(sessionData)
        localStorage.setItem('pending_session_logs', JSON.stringify(stored))
      }
    } catch (error) {
      console.error('Error logging session event:', error)
    }
  }

  const uploadPhoto = async (file, actionType) => {
    if (!file) return null

    try {
      const fileName = `${driverId.value}/${actionType}_${Date.now()}.jpg`
      
      const { data, error } = await supabase.storage
        .from('delivery-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('delivery-photos')
        .getPublicUrl(fileName)

      return urlData.publicUrl
    } catch (error) {
      console.error('Error uploading photo:', error)
      throw error
    }
  }

  const saveToLocalStorage = (logData) => {
    const stored = JSON.parse(localStorage.getItem('unsynced_logs') || '[]')
    stored.push(logData)
    localStorage.setItem('unsynced_logs', JSON.stringify(stored))
    unsyncedLogs.value = stored
  }

  const syncPendingLogs = async () => {
    if (!isOnline.value || !driverId.value) return

    try {
      // Sync delivery logs
      const storedLogs = JSON.parse(localStorage.getItem('unsynced_logs') || '[]')
      
      for (const log of storedLogs) {
        try {
          const { error } = await supabase
            .from('delivery_logs')
            .insert({
              ...log,
              synced: true
            })
          
          if (!error) {
            // Remove from local storage
            const remaining = storedLogs.filter(l => l.timestamp !== log.timestamp)
            localStorage.setItem('unsynced_logs', JSON.stringify(remaining))
          }
        } catch (syncError) {
          console.error('Error syncing log:', syncError)
        }
      }

      // Sync breadcrumbs
      const storedBreadcrumbs = JSON.parse(localStorage.getItem('pending_breadcrumbs') || '[]')
      
      for (const breadcrumb of storedBreadcrumbs) {
        try {
          const { error } = await supabase
            .from('gps_breadcrumbs')
            .insert({
              ...breadcrumb,
              synced: true
            })
          
          if (!error) {
            const remaining = storedBreadcrumbs.filter(b => b.timestamp !== breadcrumb.timestamp)
            localStorage.setItem('pending_breadcrumbs', JSON.stringify(remaining))
          }
        } catch (syncError) {
          console.error('Error syncing breadcrumb:', syncError)
        }
      }

      // Sync geofence events
      const storedGeofenceEvents = JSON.parse(localStorage.getItem('pending_geofence_events') || '[]')
      
      for (const event of storedGeofenceEvents) {
        try {
          const { error } = await supabase
            .from('geofence_events')
            .insert(event)
          
          if (!error) {
            const remaining = storedGeofenceEvents.filter(e => e.timestamp !== event.timestamp)
            localStorage.setItem('pending_geofence_events', JSON.stringify(remaining))
          }
        } catch (syncError) {
          console.error('Error syncing geofence event:', syncError)
        }
      }

      // Sync session logs
      const storedSessionLogs = JSON.parse(localStorage.getItem('pending_session_logs') || '[]')
      
      for (const sessionLog of storedSessionLogs) {
        try {
          const { error } = await supabase
            .from('session_logs')
            .insert(sessionLog)
          
          if (!error) {
            const remaining = storedSessionLogs.filter(l => l.timestamp !== sessionLog.timestamp)
            localStorage.setItem('pending_session_logs', JSON.stringify(remaining))
          }
        } catch (syncError) {
          console.error('Error syncing session log:', syncError)
        }
      }

      // Sync work sessions
      const storedWorkSessions = JSON.parse(localStorage.getItem('pending_work_sessions') || '[]')
      
      for (const workSession of storedWorkSessions) {
        try {
          const { error } = await supabase
            .from('work_sessions')
            .upsert(workSession)
          
          if (!error) {
            const remaining = storedWorkSessions.filter(ws => ws.id !== workSession.id)
            localStorage.setItem('pending_work_sessions', JSON.stringify(remaining))
          }
        } catch (syncError) {
          console.error('Error syncing work session:', syncError)
        }
      }

      // Update unsynced logs count
      const totalUnsynced = 
        JSON.parse(localStorage.getItem('unsynced_logs') || '[]').length +
        JSON.parse(localStorage.getItem('pending_breadcrumbs') || '[]').length +
        JSON.parse(localStorage.getItem('pending_geofence_events') || '[]').length +
        JSON.parse(localStorage.getItem('pending_work_sessions') || '[]').length
      
      unsyncedLogs.value = totalUnsynced
    } catch (error) {
      console.error('Error syncing pending logs:', error)
    }
  }

  // Fetch clients for geofencing
  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, location_lat, location_lng, geofence_radius')
        .eq('is_active', true)

      if (error) throw error
      
      clients.value = data.map(client => ({
        ...client,
        isInside: false // Track geofence state
      }))
      
      console.log(`📍 Loaded ${clients.value.length} clients for geofencing`)
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  // Initialize driver profile
  const initializeDriver = async (userId) => {
    try {
      const { data: driver, error } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (error || !driver) {
        throw new Error('Driver profile not found')
      }

      driverId.value = driver.id
      return driver.id
    } catch (error) {
      console.error('Error initializing driver:', error)
      throw error
    }
  }

  // Cleanup
  const cleanup = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId)
    }
    
    if (sessionMonitorInterval) {
      clearInterval(sessionMonitorInterval)
    }

    if (breadcrumbInterval) {
      clearInterval(breadcrumbInterval)
    }

    if (wakeInterval) {
      clearInterval(wakeInterval)
    }

    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('focus', handleFocus)
    window.removeEventListener('blur', handleBlur)
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }

  // Service Worker Communication
  const setupServiceWorkerMessaging = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', event => {
        const { type, data } = event.data
        console.log('📱 Main app received SW message:', type)
        
        switch (type) {
          case 'BACKGROUND_PING':
            console.log('💓 Service worker background ping')
            // Send current location to service worker
            sendLocationToServiceWorker()
            break
            
          case 'SYNC_DELIVERY_LOGS':
            console.log('🔄 Service worker requesting delivery logs sync')
            syncPendingLogs()
            break
            
          case 'SYNC_SESSION_LOGS':
            console.log('🔄 Service worker requesting session logs sync')
            syncPendingLogs()
            break
            
          case 'APP_BACKGROUNDED':
            console.log('📱 App went to background - service worker taking over')
            handleAppBackgrounded()
            break
            
          case 'APP_FOREGROUNDED':
            console.log('📱 App came to foreground - resuming main tracking')
            handleAppForegrounded()
            break
            
          case 'PERIODIC_SYNC':
            console.log('🔄 Periodic sync from service worker')
            syncPendingLogs()
            break
            
          default:
            console.log('📱 Unknown service worker message:', type)
        }
      })
    }
  }

  // Send location update to service worker
  const sendLocationToServiceWorker = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller && currentLocation.value) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_LOCATION',
        data: {
          ...currentLocation.value,
          accuracy: gpsAccuracy.value,
          timestamp: Date.now()
        }
      })
    }
  }

  // Start background tracking via service worker
  const startBackgroundTracking = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'START_BACKGROUND_TRACKING',
        data: {
          driverId: driverId.value,
          location: currentLocation.value,
          isActiveRoute: isActiveRoute.value
        }
      })
      console.log('🔄 Started service worker background tracking')
    }
  }

  // Stop background tracking via service worker
  const stopBackgroundTracking = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'STOP_BACKGROUND_TRACKING'
      })
      console.log('🛑 Stopped service worker background tracking')
    }
  }

  // Handle app going to background
  const handleAppBackgrounded = () => {
    console.log('📱 App backgrounded - reducing main app activity')
    // The service worker will maintain heartbeat
    // Reduce frequency of main app operations
  }

  // Handle app coming to foreground
  const handleAppForegrounded = () => {
    console.log('📱 App foregrounded - resuming full tracking')
    // Sync any missed data
    syncPendingLogs()
    
    // Update current location immediately
    if (isGpsAvailable.value) {
      getCurrentPosition().then(position => {
        console.log('📍 Updated location after foreground resume')
      }).catch(error => {
        console.warn('Failed to get location after resume:', error)
      })
    }
  }

  // Auto-initialize on mount
  onMounted(() => {
    setupAntiCheat()
    setupServiceWorkerMessaging() // Add service worker messaging
    
    // Calculate total unsynced items
    const totalUnsynced = 
      JSON.parse(localStorage.getItem('unsynced_logs') || '[]').length +
      JSON.parse(localStorage.getItem('pending_breadcrumbs') || '[]').length +
      JSON.parse(localStorage.getItem('pending_geofence_events') || '[]').length +
      JSON.parse(localStorage.getItem('pending_work_sessions') || '[]').length
    
    unsyncedLogs.value = totalUnsynced
    
    // Fetch clients for geofencing
    fetchClients()
    
    // Initialize work session if exists
    loadExistingWorkSession()
    
    // Setup enhanced visibility change handling
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  // =================== WORK SESSION MANAGEMENT ===================

  // Start work day (Clock In)
  const startWorkSession = async () => {
    if (isWorkSessionActive.value) {
      throw new Error('Work session already active')
    }

    if (!isGpsAvailable.value || !currentLocation.value) {
      throw new Error('GPS location required to start work session')
    }

    isLoading.value = true

    try {
      const now = new Date()
      const sessionId = `session_${driverId.value}_${now.getTime()}`
      
      const workSessionData = {
        id: sessionId,
        driver_id: driverId.value,
        start_time: now.toISOString(),
        start_location: {
          latitude: currentLocation.value.latitude,
          longitude: currentLocation.value.longitude,
          accuracy: gpsAccuracy.value
        },
        end_time: null,
        end_location: null,
        total_worked_minutes: 0,
        total_routes: 0,
        total_deliveries: 0,
        total_distance: 0,
        status: 'active',
        created_at: now.toISOString()
      }

      // Save to database if online
      if (isOnline.value) {
        const { error } = await supabase
          .from('work_sessions')
          .insert(workSessionData)

        if (error) throw error
      } else {
        // Store locally for later sync
        const stored = JSON.parse(localStorage.getItem('pending_work_sessions') || '[]')
        stored.push(workSessionData)
        localStorage.setItem('pending_work_sessions', JSON.stringify(stored))
      }

      // Update local state
      currentWorkSession.value = workSessionData
      sessionStartTime.value = now
      isWorkSessionActive.value = true
      sessionStats.value.startTime = now.toISOString()

      // Save to localStorage for persistence
      localStorage.setItem('current_work_session', JSON.stringify(workSessionData))

      // Log session start
      await logSessionEvent('work_session_started', {
        session_id: sessionId,
        start_location: workSessionData.start_location
      })

      console.log('🕐 Work session started:', sessionId)
      return { success: true, sessionId }

    } catch (error) {
      console.error('Error starting work session:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // End work day (Clock Out)
  const endWorkSession = async () => {
    if (!isWorkSessionActive.value || !currentWorkSession.value) {
      throw new Error('No active work session to end')
    }

    if (!isGpsAvailable.value || !currentLocation.value) {
      throw new Error('GPS location required to end work session')
    }

    // End any active route first
    if (isActiveRoute.value) {
      stopBreadcrumbTracking()
    }

    isLoading.value = true

    try {
      const now = new Date()
      const startTime = new Date(sessionStartTime.value)
      const workedMinutes = Math.floor((now - startTime) / (1000 * 60))

      const updatedSession = {
        ...currentWorkSession.value,
        end_time: now.toISOString(),
        end_location: {
          latitude: currentLocation.value.latitude,
          longitude: currentLocation.value.longitude,
          accuracy: gpsAccuracy.value
        },
        total_worked_minutes: workedMinutes,
        total_routes: sessionStats.value.totalRoutes,
        total_deliveries: sessionStats.value.totalDeliveries,
        total_distance: Math.round(sessionStats.value.totalDistance),
        status: 'completed'
      }

      // Save to database if online
      if (isOnline.value) {
        const { error } = await supabase
          .from('work_sessions')
          .upsert(updatedSession)

        if (error) throw error
      } else {
        // Update pending sessions
        const stored = JSON.parse(localStorage.getItem('pending_work_sessions') || '[]')
        const index = stored.findIndex(s => s.id === updatedSession.id)
        if (index !== -1) {
          stored[index] = updatedSession
        } else {
          stored.push(updatedSession)
        }
        localStorage.setItem('pending_work_sessions', JSON.stringify(stored))
      }

      // Update local state
      sessionEndTime.value = now
      totalWorkedMinutes.value = workedMinutes
      sessionStats.value.endTime = now.toISOString()
      isWorkSessionActive.value = false

      // Log session end
      await logSessionEvent('work_session_ended', {
        session_id: currentWorkSession.value.id,
        total_worked_minutes: workedMinutes,
        total_routes: sessionStats.value.totalRoutes,
        total_deliveries: sessionStats.value.totalDeliveries,
        end_location: updatedSession.end_location
      })

      // Clear localStorage
      localStorage.removeItem('current_work_session')

      console.log(`🕐 Work session ended: ${workedMinutes} minutes (${Math.round(workedMinutes/60*10)/10} hours)`)
      
      return { 
        success: true, 
        sessionData: updatedSession,
        totalHours: Math.round(workedMinutes/60*10)/10,
        totalMinutes: workedMinutes
      }

    } catch (error) {
      console.error('Error ending work session:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // Load existing work session from localStorage
  const loadExistingWorkSession = () => {
    try {
      const stored = localStorage.getItem('current_work_session')
      if (stored) {
        const session = JSON.parse(stored)
        
        // Check if session is from today (prevent carrying over old sessions)
        const sessionDate = new Date(session.start_time).toDateString()
        const today = new Date().toDateString()
        
        if (sessionDate === today) {
          currentWorkSession.value = session
          sessionStartTime.value = new Date(session.start_time)
          isWorkSessionActive.value = true
          sessionStats.value.startTime = session.start_time
          
          // Calculate current worked time
          const now = new Date()
          const startTime = new Date(session.start_time)
          totalWorkedMinutes.value = Math.floor((now - startTime) / (1000 * 60))
          
          console.log('📂 Restored work session:', session.id)
          console.log(`⏱️ Current worked time: ${Math.round(totalWorkedMinutes.value/60*10)/10} hours`)
        } else {
          // Clear old session
          localStorage.removeItem('current_work_session')
          console.log('🗑️ Cleared old work session from different day')
        }
      }
    } catch (error) {
      console.error('Error loading work session:', error)
      localStorage.removeItem('current_work_session')
    }
  }

  // Update worked time (called periodically)
  const updateWorkedTime = () => {
    if (isWorkSessionActive.value && sessionStartTime.value) {
      const now = new Date()
      const startTime = new Date(sessionStartTime.value)
      totalWorkedMinutes.value = Math.floor((now - startTime) / (1000 * 60))
    }
  }

  // Get formatted work time
  const getFormattedWorkTime = () => {
    const hours = Math.floor(totalWorkedMinutes.value / 60)
    const minutes = totalWorkedMinutes.value % 60
    return `${hours}h ${minutes}m`
  }

  // =================== ENHANCED ROUTE TRACKING ===================

  onUnmounted(() => {
    cleanup()
  })

  return {
    // Existing State
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

    // Work Session State
    isWorkSessionActive,
    currentWorkSession,
    sessionStartTime,
    sessionEndTime,
    totalWorkedMinutes,
    sessionStats,

    // Existing Methods
    requestGpsPermission,
    startLocationTracking,
    logDeliveryAction,
    logSessionEvent,
    syncPendingLogs,
    initializeDriver,
    startBreadcrumbTracking,
    stopBreadcrumbTracking,
    fetchClients,
    cleanup,

    // Work Session Methods
    startWorkSession,
    endWorkSession,
    updateWorkedTime,
    getFormattedWorkTime,
    loadExistingWorkSession
  }
} 