// PWA Push Notifications Composable
import { ref, onMounted, onUnmounted } from 'vue'

export function usePWANotifications() {
  const isSupported = ref(false)
  const isPermissionGranted = ref(false)
  const isServiceWorkerReady = ref(false)
  const subscriptionData = ref(null)

  // Check if notifications are supported
  const checkSupport = () => {
    isSupported.value = 'Notification' in window && 'serviceWorker' in navigator
    isPermissionGranted.value = Notification.permission === 'granted'
    
    console.log('📱 PWA Notifications Support:', {
      supported: isSupported.value,
      permission: Notification.permission,
      serviceWorker: 'serviceWorker' in navigator
    })
    
    return isSupported.value
  }

  // Request notification permission
  const requestPermission = async () => {
    if (!isSupported.value) {
      throw new Error('Notifications not supported')
    }

    try {
      const permission = await Notification.requestPermission()
      isPermissionGranted.value = permission === 'granted'
      
      console.log('🔔 Notification permission:', permission)
      
      if (permission === 'granted') {
        await registerServiceWorker()
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error)
      throw error
    }
  }

  // Register service worker for push notifications
  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported')
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('✅ Service Worker registered:', registration)
      
      // Wait for service worker to be ready
      const swRegistration = await navigator.serviceWorker.ready
      isServiceWorkerReady.value = true
      
      console.log('🔄 Service Worker ready for notifications')
      return swRegistration
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error)
      throw error
    }
  }

  // Show local notification (doesn't require server)
  const showLocalNotification = async (title, options = {}) => {
    if (!isPermissionGranted.value) {
      console.warn('⚠️ Notification permission not granted')
      return false
    }

    try {
      const defaultOptions = {
        icon: '/assets/renew-logo.png',
        badge: '/assets/renew-logo.png',
        requireInteraction: true,
        tag: 'driver-notification',
        vibrate: [200, 100, 200],
        data: {
          timestamp: Date.now(),
          url: window.location.pathname
        }
      }

      const notificationOptions = { ...defaultOptions, ...options }

      // If service worker is available, use it for better control
      if (isServiceWorkerReady.value) {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(title, notificationOptions)
      } else {
        // Fallback to basic notification
        new Notification(title, notificationOptions)
      }

      console.log('🔔 Local notification shown:', title)
      return true
    } catch (error) {
      console.error('❌ Error showing local notification:', error)
      return false
    }
  }

  // Subscribe to push notifications (requires server setup)
  const subscribeToPush = async (publicKey) => {
    if (!isServiceWorkerReady.value) {
      await registerServiceWorker()
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey
      })

      subscriptionData.value = subscription
      console.log('📨 Push subscription created:', subscription)
      
      return subscription
    } catch (error) {
      console.error('❌ Error subscribing to push:', error)
      throw error
    }
  }

  // Unsubscribe from push notifications
  const unsubscribeFromPush = async () => {
    try {
      if (subscriptionData.value) {
        await subscriptionData.value.unsubscribe()
        subscriptionData.value = null
        console.log('📭 Unsubscribed from push notifications')
      }
    } catch (error) {
      console.error('❌ Error unsubscribing from push:', error)
    }
  }

  // Notification templates for common driver scenarios
  const notificationTemplates = {
    newTask: (taskData) => ({
      title: '📋 New Task Assigned',
      body: `${taskData.type}: ${taskData.title}`,
      icon: '/assets/renew-logo.png',
      tag: 'new-task',
      requireInteraction: true,
      actions: [
        { action: 'view', title: '👀 View Task' },
        { action: 'dismiss', title: '❌ Dismiss' }
      ],
      data: {
        taskId: taskData.id,
        url: '/driver-dashboard',
        type: 'new_task'
      }
    }),

    taskStatusUpdate: (taskData) => ({
      title: '📝 Task Updated',
      body: `Task "${taskData.title}" status: ${taskData.status}`,
      icon: '/assets/renew-logo.png',
      tag: 'task-update',
      actions: [
        { action: 'view', title: '👀 View Details' },
        { action: 'dismiss', title: '❌ Dismiss' }
      ],
      data: {
        taskId: taskData.id,
        url: '/driver-dashboard',
        type: 'task_update'
      }
    }),

    routeAssigned: (routeData) => ({
      title: '🚗 New Route Assigned',
      body: `You have ${routeData.taskCount} tasks for today`,
      icon: '/assets/renew-logo.png',
      tag: 'route-assigned',
      requireInteraction: true,
      actions: [
        { action: 'view', title: '👀 View Route' },
        { action: 'dismiss', title: '❌ Dismiss' }
      ],
      data: {
        routeId: routeData.id,
        url: '/driver-dashboard',
        type: 'route_assigned'
      }
    }),

    urgentMessage: (messageData) => ({
      title: '🚨 Urgent Message',
      body: messageData.message,
      icon: '/assets/renew-logo.png',
      tag: 'urgent-message',
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 300],
      actions: [
        { action: 'view', title: '👀 View Message' },
        { action: 'call', title: '📞 Call Manager' }
      ],
      data: {
        messageId: messageData.id,
        url: '/driver-dashboard',
        type: 'urgent_message'
      }
    })
  }

  // Convenience methods for driver notifications
  const notifyNewTask = (taskData) => {
    const notification = notificationTemplates.newTask(taskData)
    return showLocalNotification(notification.title, notification)
  }

  const notifyTaskUpdate = (taskData) => {
    const notification = notificationTemplates.taskStatusUpdate(taskData)
    return showLocalNotification(notification.title, notification)
  }

  const notifyRouteAssigned = (routeData) => {
    const notification = notificationTemplates.routeAssigned(routeData)
    return showLocalNotification(notification.title, notification)
  }

  const notifyUrgentMessage = (messageData) => {
    const notification = notificationTemplates.urgentMessage(messageData)
    return showLocalNotification(notification.title, notification)
  }

  // Handle notification click events from service worker
  const setupNotificationHandlers = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data

        if (type === 'NOTIFICATION_CLICKED') {
          console.log('🔔 Notification clicked:', data)
          
          // Handle different notification types
          switch (data.type) {
            case 'new_task':
              // Navigate to specific task or refresh task list
              window.location.hash = '#/driver-dashboard'
              break
            case 'task_update':
              // Refresh task data
              window.location.reload()
              break
            case 'route_assigned':
              // Navigate to route view
              window.location.hash = '#/driver-dashboard'
              break
            case 'urgent_message':
              // Show urgent message or call manager
              if (data.action === 'call') {
                window.open('tel:+1234567890') // Replace with manager's number
              }
              break
          }
        }
      })
    }
  }

  // Test notification (for debugging)
  const testNotification = () => {
    return showLocalNotification('🧪 Test Notification', {
      body: 'This is a test notification from the PWA',
      tag: 'test-notification',
      data: { type: 'test' }
    })
  }

  // Initialize on mount
  onMounted(() => {
    checkSupport()
    setupNotificationHandlers()
  })

  return {
    // State
    isSupported,
    isPermissionGranted,
    isServiceWorkerReady,
    subscriptionData,
    
    // Methods
    checkSupport,
    requestPermission,
    registerServiceWorker,
    showLocalNotification,
    subscribeToPush,
    unsubscribeFromPush,
    
    // Driver-specific notifications
    notifyNewTask,
    notifyTaskUpdate,
    notifyRouteAssigned,
    notifyUrgentMessage,
    
    // Utility
    testNotification
  }
} 