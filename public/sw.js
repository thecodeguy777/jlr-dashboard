const CACHE_NAME = 'renewco-driver-v1.0.0'
const STATIC_CACHE_URLS = [
  '/',
  '/driver',
  '/driver-tracking',
  '/login',
  '/assets/renew-logo.png',
  '/manifest.json'
]

const RUNTIME_CACHE = 'renewco-runtime-v1.0.0'

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
                    timestamp: new Date().toISOString()
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

// Background sync for offline data
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync triggered', event.tag)
  
  if (event.tag === 'sync-delivery-logs') {
    event.waitUntil(syncDeliveryLogs())
  }
  
  if (event.tag === 'sync-session-logs') {
    event.waitUntil(syncSessionLogs())
  }
})

// Sync delivery logs when back online
async function syncDeliveryLogs() {
  try {
    // This would normally communicate with the main app
    // For now, just log that sync is attempted
    console.log('Service Worker: Attempting to sync delivery logs')
    
    // Broadcast to main app to trigger sync
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_DELIVERY_LOGS'
      })
    })
  } catch (error) {
    console.error('Service Worker: Failed to sync delivery logs', error)
  }
}

// Sync session logs when back online
async function syncSessionLogs() {
  try {
    console.log('Service Worker: Attempting to sync session logs')
    
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_SESSION_LOGS'
      })
    })
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