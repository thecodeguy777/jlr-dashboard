const CACHE_NAME = 'renewco-driver-v1.1.0'
const STATIC_CACHE_URLS = [
  '/',
  '/driver',
  '/driver-tracking',
  '/login',
  '/assets/renew-logo.png',
  '/manifest.json'
]

const RUNTIME_CACHE = 'renewco-runtime-v1.1.0'

// Background tracking state
let backgroundTrackingActive = false
let lastKnownLocation = null
let backgroundInterval = null

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker: Install event')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching static assets')
        return cache.addAll(STATIC_CACHE_URLS)
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activate event')
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('Service Worker: Deleting old cache', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Enhanced message handling for background tracking
self.addEventListener('message', event => {
  console.log('Service Worker: Message received', event.data)
  
  const { type, data } = event.data
  
  switch (type) {
    case 'START_BACKGROUND_TRACKING':
      startBackgroundTracking(data)
      break
      
    case 'STOP_BACKGROUND_TRACKING':
      stopBackgroundTracking()
      break
      
    case 'UPDATE_LOCATION':
      updateLocation(data)
      break
      
    case 'KEEP_ALIVE':
      // Respond to keep-alive pings
      event.ports[0]?.postMessage({ type: 'ALIVE' })
      break
      
    default:
      console.log('Service Worker: Unknown message type', type)
  }
})

// Start background tracking when app goes to background
const startBackgroundTracking = (data) => {
  console.log('🔄 Service Worker: Starting background tracking')
  backgroundTrackingActive = true
  lastKnownLocation = data.location
  
  // Clear any existing interval
  if (backgroundInterval) {
    clearInterval(backgroundInterval)
  }
  
  // Start background monitoring
  backgroundInterval = setInterval(() => {
    console.log('💓 Service Worker: Background heartbeat')
    
    // Try to wake up the main app
    notifyMainApp('BACKGROUND_PING', {
      timestamp: Date.now(),
      lastLocation: lastKnownLocation
    })
    
    // Store heartbeat in IndexedDB for tracking
    storeBackgroundEvent('heartbeat', {
      timestamp: Date.now(),
      location: lastKnownLocation
    })
    
  }, 30000) // Every 30 seconds
  
  // Store tracking start event
  storeBackgroundEvent('tracking_started', {
    timestamp: Date.now(),
    location: lastKnownLocation
  })
}

// Stop background tracking
const stopBackgroundTracking = () => {
  console.log('🛑 Service Worker: Stopping background tracking')
  backgroundTrackingActive = false
  
  if (backgroundInterval) {
    clearInterval(backgroundInterval)
    backgroundInterval = null
  }
  
  // Store tracking stop event
  storeBackgroundEvent('tracking_stopped', {
    timestamp: Date.now()
  })
}

// Update location from main app
const updateLocation = (locationData) => {
  lastKnownLocation = locationData
  console.log(`📍 Service Worker: Location updated: ${locationData.latitude?.toFixed(6)}, ${locationData.longitude?.toFixed(6)}`)
}

// Notify main app
const notifyMainApp = async (type, data) => {
  const clients = await self.clients.matchAll()
  clients.forEach(client => {
    client.postMessage({ type, data })
  })
}

// Store background events in IndexedDB
const storeBackgroundEvent = (eventType, data) => {
  // Use IndexedDB to store events persistently
  const request = indexedDB.open('RenewCoTracking', 1)
  
  request.onupgradeneeded = (event) => {
    const db = event.target.result
    if (!db.objectStoreNames.contains('background_events')) {
      const store = db.createObjectStore('background_events', { keyPath: 'id', autoIncrement: true })
      store.createIndex('timestamp', 'timestamp', { unique: false })
      store.createIndex('eventType', 'eventType', { unique: false })
    }
  }
  
  request.onsuccess = (event) => {
    const db = event.target.result
    const transaction = db.transaction(['background_events'], 'readwrite')
    const store = transaction.objectStore('background_events')
    
    store.add({
      eventType,
      data,
      timestamp: Date.now(),
      synced: false
    })
    
    console.log(`💾 Service Worker: Stored ${eventType} event`)
  }
  
  request.onerror = (event) => {
    console.error('Service Worker: IndexedDB error:', event.target.error)
  }
}

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  
  // Handle API requests - try network first, fallback to cache
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone the response for caching
          const responseClone = response.clone()
          
          // Cache successful responses
          if (response.status === 200) {
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseClone)
            })
          }
          
          return response
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request)
            .then(response => {
              if (response) {
                return response
              }
              
              // Return offline fallback for critical API calls
              if (request.method === 'GET') {
                return new Response(
                  JSON.stringify({
                    error: 'Network unavailable',
                    offline: true,
                    timestamp: new Date().toISOString(),
                    service_worker: true
                  }),
                  {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: {
                      'Content-Type': 'application/json'
                    }
                  }
                )
              }
              
              throw new Error('Network unavailable and no cache available')
            })
        })
    )
    return
  }
  
  // Handle static assets - cache first strategy
  if (request.destination === 'image' || request.destination === 'script' || 
      request.destination === 'style' || request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response
          }
          
          return fetch(request).then(response => {
            if (response.status === 200) {
              const responseClone = response.clone()
              caches.open(RUNTIME_CACHE).then(cache => {
                cache.put(request, responseClone)
              })
            }
            return response
          })
        })
    )
    return
  }
  
  // Handle navigation requests - network first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful navigation responses
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request)
            .then(response => {
              if (response) {
                return response
              }
              
              // Fallback to main page if no cache
              return caches.match('/')
            })
        })
    )
    return
  }
  
  // Default: try cache first, fallback to network
  event.respondWith(
    caches.match(request)
      .then(response => {
        return response || fetch(request)
      })
  )
})

// Enhanced background sync for offline data
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync triggered', event.tag)
  
  if (event.tag === 'sync-delivery-logs') {
    event.waitUntil(syncDeliveryLogs())
  }
  
  if (event.tag === 'sync-session-logs') {
    event.waitUntil(syncSessionLogs())
  }
  
  if (event.tag === 'sync-background-events') {
    event.waitUntil(syncBackgroundEvents())
  }
})

// Sync background events
async function syncBackgroundEvents() {
  try {
    console.log('Service Worker: Syncing background events')
    
    const db = await openIndexedDB()
    const events = await getUnsyncedBackgroundEvents(db)
    
    if (events.length > 0) {
      // Notify main app to handle sync
      notifyMainApp('SYNC_BACKGROUND_EVENTS', { events })
    }
    
  } catch (error) {
    console.error('Service Worker: Failed to sync background events', error)
  }
}

// Helper functions for IndexedDB
const openIndexedDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RenewCoTracking', 1)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const getUnsyncedBackgroundEvents = (db) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['background_events'], 'readonly')
    const store = transaction.objectStore('background_events')
    const request = store.getAll()
    
    request.onsuccess = () => {
      const events = request.result.filter(event => !event.synced)
      resolve(events)
    }
    
    request.onerror = () => reject(request.error)
  })
}

// Sync delivery logs when back online
async function syncDeliveryLogs() {
  try {
    console.log('Service Worker: Attempting to sync delivery logs')
    
    // Broadcast to main app to trigger sync
    notifyMainApp('SYNC_DELIVERY_LOGS')
  } catch (error) {
    console.error('Service Worker: Failed to sync delivery logs', error)
  }
}

// Sync session logs when back online
async function syncSessionLogs() {
  try {
    console.log('Service Worker: Attempting to sync session logs')
    
    notifyMainApp('SYNC_SESSION_LOGS')
  } catch (error) {
    console.error('Service Worker: Failed to sync session logs', error)
  }
}

// Push notifications for admin alerts
self.addEventListener('push', event => {
  console.log('Service Worker: Push notification received')
  
  const options = {
    body: event.data ? event.data.text() : 'New driver alert',
    icon: '/assets/renew-logo.png',
    badge: '/assets/renew-logo.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/driver-tracking'
    },
    actions: [
      {
        action: 'view',
        title: 'View Details'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification('RenewCo Driver Alert', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked')
  
  event.notification.close()
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    )
  }
})

// Handle app visibility changes for background tracking
self.addEventListener('visibilitychange', event => {
  console.log('Service Worker: Visibility changed')
  
  if (document.hidden && backgroundTrackingActive) {
    console.log('📱 Service Worker: App went to background, maintaining tracking')
    notifyMainApp('APP_BACKGROUNDED')
  } else if (!document.hidden) {
    console.log('📱 Service Worker: App came to foreground')
    notifyMainApp('APP_FOREGROUNDED')
  }
})

// Periodic background sync (Chrome only)
self.addEventListener('periodicsync', event => {
  console.log('Service Worker: Periodic sync triggered', event.tag)
  
  if (event.tag === 'background-tracking') {
    event.waitUntil(handlePeriodicBackgroundSync())
  }
})

// Handle periodic background sync
async function handlePeriodicBackgroundSync() {
  console.log('🔄 Service Worker: Handling periodic background sync')
  
  try {
    // Wake up the main app if possible
    notifyMainApp('PERIODIC_SYNC', {
      timestamp: Date.now(),
      backgroundTrackingActive
    })
    
    // Store sync event
    storeBackgroundEvent('periodic_sync', {
      timestamp: Date.now(),
      backgroundTrackingActive
    })
    
  } catch (error) {
    console.error('Service Worker: Periodic sync error:', error)
  }
} 