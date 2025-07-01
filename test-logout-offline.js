// Test Logout Offline Functionality
// Run this in browser console while logged in as a driver

console.log('🧪 Testing Logout Offline Functionality...')

// Import supabase
const { supabase } = await import('./public/lib/supabase.js')

async function testMarkDriverOffline() {
  try {
    console.log('\n=== 1. Get Current Driver ===')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ Not authenticated:', authError)
      return false
    }
    
    console.log('✅ User:', user.email)
    
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (driverError || !driver) {
      console.error('❌ Driver not found:', driverError)
      return false
    }
    
    console.log('✅ Driver:', driver.name, '- ID:', driver.id)
    
    console.log('\n=== 2. Check Current Presence ===')
    const { data: currentPresence, error: presenceError } = await supabase
      .from('driver_presence')
      .select('*')
      .eq('driver_id', driver.id)
      .order('last_seen', { ascending: false })
      .limit(1)
    
    if (presenceError) {
      console.error('❌ Error checking presence:', presenceError)
      return false
    }
    
    if (currentPresence && currentPresence.length > 0) {
      const record = currentPresence[0]
      console.log('📍 Current Status:', record.is_online ? '🟢 Online' : '🔴 Offline')
      console.log('📍 Last Seen:', record.last_seen)
    } else {
      console.log('⚠️ No presence record found - creating one first...')
      
      // Create a presence record
      await supabase.rpc('upsert_driver_presence', {
        p_driver_id: driver.id,
        p_is_online: true,
        p_device_id: 'test_manual'
      })
      
      console.log('✅ Created online presence record')
    }
    
    console.log('\n=== 3. Test Manual Logout Marking ===')
    const { error: logoutError } = await supabase
      .from('driver_presence')
      .update({
        is_online: false,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('driver_id', driver.id)
    
    if (logoutError) {
      console.error('❌ Failed to mark offline:', logoutError)
      
      // Try fallback method
      console.log('🔄 Trying fallback method...')
      const { error: fallbackError } = await supabase
        .from('delivery_logs')
        .insert({
          driver_id: driver.id,
          action_type: 'test_logout',
          timestamp: new Date().toISOString(),
          note: 'Manual test logout'
        })
      
      if (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError)
        return false
      } else {
        console.log('✅ Fallback method worked - logged test logout')
      }
    } else {
      console.log('✅ Successfully marked driver as offline')
    }
    
    console.log('\n=== 4. Verify Offline Status ===')
    const { data: verifyPresence, error: verifyError } = await supabase
      .from('driver_presence')
      .select('*')
      .eq('driver_id', driver.id)
      .order('last_seen', { ascending: false })
      .limit(1)
    
    if (verifyError) {
      console.error('❌ Error verifying:', verifyError)
      return false
    }
    
    if (verifyPresence && verifyPresence.length > 0) {
      const record = verifyPresence[0]
      console.log('📍 New Status:', record.is_online ? '🟢 Online' : '🔴 Offline')
      console.log('📍 Updated At:', record.updated_at)
      
      if (!record.is_online) {
        console.log('\n🎉 SUCCESS! Driver is now marked as offline')
        console.log('🔍 Go check your task manager - driver should show as offline')
        return true
      } else {
        console.log('\n❌ FAILED! Driver is still marked as online')
        return false
      }
    }
    
    return false
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

// Run the test
testMarkDriverOffline().then(success => {
  if (success) {
    console.log('\n✅ Test passed! Logout offline functionality works.')
    console.log('💡 The real logout should now work properly.')
  } else {
    console.log('\n❌ Test failed! There are still issues with marking offline.')
    console.log('🔧 Check the error messages above and database policies.')
  }
}) 