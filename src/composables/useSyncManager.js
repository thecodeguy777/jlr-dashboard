import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export function useSyncManager() {
  // State
  const isOnline = ref(navigator.onLine)
  const syncingStatus = ref(false)
  const pendingSyncCount = ref(0)
  const lastSyncTime = ref(null)
  const syncErrors = ref([])

  // Computed
  const canSync = computed(() => isOnline.value && !syncingStatus.value)

  // Online/Offline event listeners
  const setupNetworkListeners = () => {
    window.addEventListener('online', () => {
      isOnline.value = true
      console.log('🌐 Network online - starting sync')
      triggerSync()
    })
    
    window.addEventListener('offline', () => {
      isOnline.value = false
      console.log('📱 Network offline - queuing data locally')
    })
  }

  // Add data to sync queue (offline-first)
  const queueForSync = async (driverId, tableName, action, data, localId = null) => {
    try {
      const queueItem = {
        id: localId || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        driver_id: driverId,
        table_name: tableName,
        action: action, // 'insert', 'update', 'delete'
        data: data,
        synced: false,
        created_at: new Date().toISOString(),
        retry_count: 0,
        last_error: null
      }

      if (isOnline.value) {
        // Try direct sync first when online
        try {
          const syncResult = await performDirectSync(queueItem)
          if (syncResult.success) {
            console.log(`✅ Direct sync successful for ${tableName}`)
            return { success: true, data: syncResult.data, synced: true }
          }
        } catch (error) {
          console.warn(`⚠️ Direct sync failed, queuing for retry:`, error.message)
        }
      }

      // Add to sync_queue table (or localStorage if database is unreachable)
      try {
        const { data: queueData, error } = await supabase
          .from('sync_queue')
          .insert(queueItem)
          .select()
          .single()

        if (error) throw error

        await updatePendingCount()
        console.log(`📝 Queued ${action} for ${tableName} in sync_queue`)
        return { success: true, data: queueItem.data, synced: false, queueId: queueData.id }

      } catch (dbError) {
        // Fallback to localStorage if database is completely unreachable
        console.warn(`⚠️ Database unreachable, using localStorage fallback:`, dbError.message)
        return await queueToLocalStorage(queueItem)
      }

    } catch (error) {
      console.error('❌ Error queuing for sync:', error)
      throw error
    }
  }

  // Direct sync attempt (when online)
  const performDirectSync = async (queueItem) => {
    const { table_name, action, data } = queueItem

    switch (action) {
      case 'insert':
        const { data: insertData, error: insertError } = await supabase
          .from(table_name)
          .insert(data)
          .select()
          .single()
        
        if (insertError) throw insertError
        return { success: true, data: insertData }

      case 'update':
        const { id, ...updateData } = data
        const { data: updatedData, error: updateError } = await supabase
          .from(table_name)
          .update(updateData)
          .eq('id', id)
          .select()
          .single()
        
        if (updateError) throw updateError
        return { success: true, data: updatedData }

      case 'delete':
        const { error: deleteError } = await supabase
          .from(table_name)
          .delete()
          .eq('id', data.id)
        
        if (deleteError) throw deleteError
        return { success: true, data: null }

      default:
        throw new Error(`Unknown sync action: ${action}`)
    }
  }

  // Fallback to localStorage when database is unreachable
  const queueToLocalStorage = async (queueItem) => {
    try {
      const localQueue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]')
      localQueue.push(queueItem)
      localStorage.setItem('offline_sync_queue', JSON.stringify(localQueue))
      
      pendingSyncCount.value = localQueue.length
      console.log(`💾 Stored in localStorage: ${queueItem.table_name}`)
      return { success: true, data: queueItem.data, synced: false, queueId: queueItem.id }
    } catch (error) {
      console.error('❌ Failed to save to localStorage:', error)
      throw error
    }
  }

  // Main sync process
  const triggerSync = async () => {
    if (!canSync.value) {
      console.log('⏸️ Sync not available (offline or already syncing)')
      return
    }

    syncingStatus.value = true
    syncErrors.value = []

    try {
      console.log('🔄 Starting comprehensive sync...')

      // First, sync any localStorage fallback items
      await syncLocalStorageQueue()

      // Then sync database queue items
      await syncDatabaseQueue()

      lastSyncTime.value = new Date().toISOString()
      await updatePendingCount()

      console.log('✅ Sync completed successfully')

    } catch (error) {
      console.error('❌ Sync process failed:', error)
      syncErrors.value.push({
        timestamp: new Date().toISOString(),
        error: error.message
      })
    } finally {
      syncingStatus.value = false
    }
  }

  // Sync localStorage fallback items
  const syncLocalStorageQueue = async () => {
    try {
      const localQueue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]')
      if (localQueue.length === 0) return

      console.log(`📤 Syncing ${localQueue.length} localStorage items...`)

      for (const item of localQueue) {
        try {
          // First try to add to database queue
          const { error } = await supabase
            .from('sync_queue')
            .insert(item)

          if (!error) {
            // Remove from localStorage once added to database
            const remainingQueue = localQueue.filter(i => i.id !== item.id)
            localStorage.setItem('offline_sync_queue', JSON.stringify(remainingQueue))
          }
        } catch (error) {
          console.warn(`⚠️ Failed to move item ${item.id} to database queue:`, error.message)
        }
      }

      // Update localStorage with any remaining items
      const finalQueue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]')
      pendingSyncCount.value += finalQueue.length

    } catch (error) {
      console.error('❌ Error syncing localStorage queue:', error)
    }
  }

  // Sync database queue items
  const syncDatabaseQueue = async () => {
    try {
      // Get all unsynced items for current driver
      const { data: queueItems, error } = await supabase
        .from('sync_queue')
        .select('*')
        .eq('synced', false)
        .order('created_at', { ascending: true })
        .limit(50) // Batch size

      if (error) throw error
      if (!queueItems?.length) return

      console.log(`📤 Syncing ${queueItems.length} database queue items...`)

      for (const item of queueItems) {
        try {
          // Attempt sync
          await performDirectSync(item)

          // Mark as synced
          await supabase
            .from('sync_queue')
            .update({ 
              synced: true, 
              synced_at: new Date().toISOString() 
            })
            .eq('id', item.id)

          console.log(`✅ Synced ${item.table_name} ${item.action} (${item.id})`)

        } catch (syncError) {
          // Update retry count and error
          const retryCount = (item.retry_count || 0) + 1
          const maxRetries = 5

          if (retryCount >= maxRetries) {
            console.error(`❌ Max retries exceeded for ${item.id}:`, syncError.message)
            
            // Mark as failed
            await supabase
              .from('sync_queue')
              .update({ 
                last_error: syncError.message,
                retry_count: retryCount
              })
              .eq('id', item.id)
          } else {
            // Update retry count
            await supabase
              .from('sync_queue')
              .update({ 
                last_error: syncError.message,
                retry_count: retryCount
              })
              .eq('id', item.id)

            console.warn(`⚠️ Retry ${retryCount}/${maxRetries} for ${item.id}:`, syncError.message)
          }

          syncErrors.value.push({
            id: item.id,
            table: item.table_name,
            action: item.action,
            error: syncError.message,
            retryCount
          })
        }
      }

    } catch (error) {
      console.error('❌ Error syncing database queue:', error)
    }
  }

  // Update pending sync count
  const updatePendingCount = async () => {
    try {
      // Count database queue items
      const { count: dbCount } = await supabase
        .from('sync_queue')
        .select('*', { count: 'exact', head: true })
        .eq('synced', false)

      // Count localStorage items
      const localQueue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]')
      
      pendingSyncCount.value = (dbCount || 0) + localQueue.length

    } catch (error) {
      console.warn('⚠️ Failed to update pending count:', error)
      // Fallback to localStorage count only
      const localQueue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]')
      pendingSyncCount.value = localQueue.length
    }
  }

  // Auto-sync setup
  const setupAutoSync = () => {
    // Sync when online
    setupNetworkListeners()

    // Periodic sync every 30 seconds when online
    setInterval(() => {
      if (canSync.value && pendingSyncCount.value > 0) {
        triggerSync()
      }
    }, 30000)

    // Sync on page visibility change (when user returns to app)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && canSync.value && pendingSyncCount.value > 0) {
        setTimeout(triggerSync, 1000) // Delay to allow network to settle
      }
    })

    // Initial count update
    updatePendingCount()
  }

  // Clean up old synced items (run periodically)
  const cleanupSyncQueue = async () => {
    try {
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      
      const { error } = await supabase
        .from('sync_queue')
        .delete()
        .eq('synced', true)
        .lt('synced_at', cutoffDate.toISOString())

      if (error) throw error
      console.log('🧹 Cleaned up old sync queue items')

    } catch (error) {
      console.warn('⚠️ Failed to cleanup sync queue:', error)
    }
  }

  // Force sync specific item
  const forceSyncItem = async (queueId) => {
    try {
      const { data: item, error } = await supabase
        .from('sync_queue')
        .select('*')
        .eq('id', queueId)
        .single()

      if (error) throw error

      await performDirectSync(item)
      
      await supabase
        .from('sync_queue')
        .update({ 
          synced: true, 
          synced_at: new Date().toISOString() 
        })
        .eq('id', queueId)

      await updatePendingCount()
      console.log(`✅ Force synced item ${queueId}`)

    } catch (error) {
      console.error(`❌ Failed to force sync item ${queueId}:`, error)
      throw error
    }
  }

  // Get sync status for debugging
  const getSyncStatus = async () => {
    try {
      const { data: queueItems, error } = await supabase
        .from('sync_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const localQueue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]')

      return {
        online: isOnline.value,
        syncing: syncingStatus.value,
        pendingCount: pendingSyncCount.value,
        lastSync: lastSyncTime.value,
        errors: syncErrors.value,
        recentQueue: queueItems,
        localQueue: localQueue
      }

    } catch (error) {
      console.error('❌ Failed to get sync status:', error)
      return {
        online: isOnline.value,
        syncing: syncingStatus.value,
        pendingCount: pendingSyncCount.value,
        error: error.message
      }
    }
  }

  return {
    // State
    isOnline,
    syncingStatus,
    pendingSyncCount,
    lastSyncTime,
    syncErrors,
    
    // Computed
    canSync,
    
    // Methods
    queueForSync,
    triggerSync,
    setupAutoSync,
    cleanupSyncQueue,
    forceSyncItem,
    getSyncStatus,
    updatePendingCount
  }
} 