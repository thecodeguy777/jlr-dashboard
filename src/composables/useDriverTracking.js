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

  // GPS Tracking
  let watchId = null
  let sessionMonitorInterval = null
  let breadcrumbInterval = null

  const requestGpsPermission = async () => {
    try {
      const position = await getCurrentPosition()
      isGpsAvailable.value = true
      currentLocation.value = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
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
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000
        }
      )
    })
  }

  const startLocationTracking = () => {
    if (!navigator.geolocation) return

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        currentLocation.value = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
        gpsAccuracy.value = position.coords.accuracy

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
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    )
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
      handleBlur()
    } else {
      handleFocus()
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

  // Breadcrumb logging function
  const logBreadcrumb = async () => {
    if (!isGpsAvailable.value || !currentLocation.value || !isActiveRoute.value) {
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
      synced: isOnline.value
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
      } else if (actionType === 'delivered') {
        stopBreadcrumbTracking()
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

      // Update unsynced logs count
      const totalUnsynced = 
        JSON.parse(localStorage.getItem('unsynced_logs') || '[]').length +
        JSON.parse(localStorage.getItem('pending_breadcrumbs') || '[]').length +
        JSON.parse(localStorage.getItem('pending_geofence_events') || '[]').length
      
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

    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('focus', handleFocus)
    window.removeEventListener('blur', handleBlur)
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }

  // Auto-initialize on mount
  onMounted(() => {
    setupAntiCheat()
    
    // Calculate total unsynced items
    const totalUnsynced = 
      JSON.parse(localStorage.getItem('unsynced_logs') || '[]').length +
      JSON.parse(localStorage.getItem('pending_breadcrumbs') || '[]').length +
      JSON.parse(localStorage.getItem('pending_geofence_events') || '[]').length
    
    unsyncedLogs.value = totalUnsynced
    
    // Fetch clients for geofencing
    fetchClients()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
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

    // Methods
    requestGpsPermission,
    startLocationTracking,
    logDeliveryAction,
    logSessionEvent,
    syncPendingLogs,
    initializeDriver,
    startBreadcrumbTracking,
    stopBreadcrumbTracking,
    fetchClients,
    cleanup
  }
} 