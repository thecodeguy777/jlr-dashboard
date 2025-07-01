// Test Manual Driver Logout
// Run this in browser console to manually mark driver offline

console.log('🧪 Testing Manual Driver Logout...')

// Import supabase
const { supabase } = await import('./public/lib/supabase.js')

async function manualMarkDriverOffline() {
  try {
    console.log('\n=== 1. Get Current User & Driver ===')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ Not authenticated:', authError)
      return false
    }
    
    console.log('✅ User:', user.email)
    
    // Get driver profile
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (driverError || !driver) {
      console.error('❌ Driver not found:', driverError)
      return false
    }
    
    console.log('✅ Driver found:', driver.name, '- ID:', driver.id)
    
    console.log('\n=== 2. Check Current Presence Status ===')
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
      console.log('⚠️ No presence record found')
    }
    
    console.log('\n=== 3. Manual Logout Update ===')
    console.log('🔄 Attempting to mark driver offline...')
    
    const { data: updateResult, error: updateError } = await supabase
      .from('driver_presence')
      .update({
        is_online: false,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('driver_id', driver.id)
      .select()
    
    if (updateError) {
      console.error('❌ Update failed:', updateError)
      console.error('📋 Error code:', updateError.code)
      console.error('📋 Error message:', updateError.message)
      console.error('📋 Error details:', updateError.details)
      
      // Try fallback method
      console.log('\n=== 3b. Fallback: Log Logout Activity ===')
      const { data: logResult, error: logError } = await supabase
        .from('delivery_logs')
        .insert({
          driver_id: driver.id,
          action_type: 'manual_logout_test',
          timestamp: new Date().toISOString(),
          note: 'Manual logout test via console'
        })
        .select()
      
      if (logError) {
        console.error('❌ Fallback logging also failed:', logError)
        return false
      } else {
        console.log('✅ Fallback logging worked:', logResult)
      }
      
      return false
    }
    
    console.log('✅ Update successful!')
    console.log('📊 Update result:', updateResult)
    
    console.log('\n=== 4. Verify Status Changed ===')
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
        console.log('\n🎉 SUCCESS! Driver is now offline')
        console.log('🔄 Go refresh your task manager to see the change')
        return true
      } else {
        console.log('\n❌ FAILED! Driver is still online in database')
        return false
      }
    }
    
    return false
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

// Test database permissions
async function testDatabasePermissions() {
  console.log('\n=== Database Permissions Test ===')
  
  try {
    // Test if we can read from driver_presence
    const { data: readTest, error: readError } = await supabase
      .from('driver_presence')
      .select('id, driver_id, is_online')
      .limit(1)
    
    if (readError) {
      console.error('❌ Cannot read driver_presence table:', readError)
      return false
    }
    
    console.log('✅ Can read driver_presence table')
    
    // Test current auth user
    const { data: { user } } = await supabase.auth.getUser()
    console.log('👤 Current auth user:', user?.email)
    console.log('🆔 User ID:', user?.id)
    
    // Check if we have any presence records
    if (readTest && readTest.length > 0) {
      console.log('📊 Sample presence record:', readTest[0])
      
      // Try to update this specific record
      const testRecord = readTest[0]
      const { error: updateTestError } = await supabase
        .from('driver_presence')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', testRecord.id)
      
      if (updateTestError) {
        console.error('❌ Cannot update driver_presence table:', updateTestError)
        return false
      }
      
      console.log('✅ Can update driver_presence table')
      return true
    } else {
      console.log('⚠️ No presence records found')
      return true
    }
    
  } catch (error) {
    console.error('❌ Database permission test failed:', error)
    return false
  }
}

// Run both tests
async function runLogoutTests() {
  console.log('🚀 Running Logout Debug Tests...\n')
  
  // Test permissions first
  const hasPermissions = await testDatabasePermissions()
  
  if (!hasPermissions) {
    console.log('\n🚨 Database permissions issue detected!')
    console.log('🔧 Check your RLS policies in Supabase')
    return
  }
  
  // Test manual logout
  const logoutWorked = await manualMarkDriverOffline()
  
  if (logoutWorked) {
    console.log('\n✅ Manual logout test passed!')
    console.log('💡 The issue might be in the DriverDashboard logout function')
    console.log('🔍 Check browser console during actual logout for errors')
  } else {
    console.log('\n❌ Manual logout test failed!')
    console.log('🔧 Check the error messages above for clues')
  }
}

// Auto-run
runLogoutTests() 