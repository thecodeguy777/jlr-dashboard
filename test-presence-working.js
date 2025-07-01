// Test Driver Presence System
// Run this in browser console while logged in as a driver

console.log('🧪 Testing Driver Presence System...')

// Import supabase
const { supabase } = await import('./public/lib/supabase.js')

// Test the presence system
async function testDriverPresence() {
  try {
    console.log('\n=== 1. Check Authentication ===')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ Not authenticated:', authError)
      return false
    }
    
    console.log('✅ Authenticated as:', user.email)
    console.log('👤 User ID:', user.id)
    
    console.log('\n=== 2. Get Driver Profile ===')
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (driverError || !driver) {
      console.error('❌ Driver profile not found:', driverError)
      return false
    }
    
    console.log('✅ Driver found:', driver.name)
    console.log('🚗 Driver ID:', driver.id)
    
    console.log('\n=== 3. Test Database Function ===')
    const { data: functionResult, error: functionError } = await supabase
      .rpc('upsert_driver_presence', {
        p_driver_id: driver.id,
        p_is_online: true,
        p_device_id: 'test_console'
      })
    
    if (functionError) {
      console.warn('⚠️ Database function failed:', functionError.message)
      
      console.log('\n=== 3b. Test Direct Upsert ===')
      const { data: upsertResult, error: upsertError } = await supabase
        .from('driver_presence')
        .upsert({
          driver_id: driver.id,
          is_online: true,
          last_seen: new Date().toISOString(),
          device_id: 'test_console'
        })
        .select()
      
      if (upsertError) {
        console.error('❌ Direct upsert failed:', upsertError)
        return false
      }
      
      console.log('✅ Direct upsert worked:', upsertResult)
    } else {
      console.log('✅ Database function worked!')
    }
    
    console.log('\n=== 4. Verify Record Created ===')
    const { data: presenceCheck, error: checkError } = await supabase
      .from('driver_presence')
      .select('*')
      .eq('driver_id', driver.id)
      .order('last_seen', { ascending: false })
      .limit(1)
    
    if (checkError) {
      console.error('❌ Error checking presence:', checkError)
      return false
    }
    
    if (presenceCheck && presenceCheck.length > 0) {
      const record = presenceCheck[0]
      console.log('✅ Presence record found:')
      console.log('   Online:', record.is_online)
      console.log('   Last Seen:', record.last_seen)
      console.log('   Device:', record.device_id)
      
      const lastSeenTime = new Date(record.last_seen)
      const now = new Date()
      const minutesAgo = Math.floor((now - lastSeenTime) / (1000 * 60))
      console.log('   Time Ago:', `${minutesAgo} minutes`)
      
      return true
    } else {
      console.error('❌ No presence record found')
      return false
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

// Test and start presence reporting
async function startTestPresenceReporting() {
  const working = await testDriverPresence()
  
  if (!working) {
    console.log('\n🚨 Presence system not working properly!')
    console.log('🔧 Make sure you ran the reset-driver-presence.sql script first!')
    return
  }
  
  console.log('\n🎉 Presence system working!')
  console.log('\n=== 5. Starting Test Presence Reporting ===')
  
  // Get driver ID
  const { data: { user } } = await supabase.auth.getUser()
  const { data: driver } = await supabase
    .from('drivers')
    .select('id')
    .eq('user_id', user.id)
    .single()
  
  let reportCount = 0
  
  const testInterval = setInterval(async () => {
    reportCount++
    console.log(`📡 Presence report #${reportCount}...`)
    
    try {
      await supabase.rpc('upsert_driver_presence', {
        p_driver_id: driver.id,
        p_is_online: true,
        p_device_id: 'test_console'
      })
      console.log(`✅ Report #${reportCount} successful`)
    } catch (error) {
      console.error(`❌ Report #${reportCount} failed:`, error)
    }
    
    if (reportCount >= 5) {
      clearInterval(testInterval)
      console.log('\n🏁 Test complete! Check your task manager to see if driver shows as online.')
      console.log('💡 If still offline, check browser console for errors in DriverDashboard.vue')
    }
  }, 10000) // Every 10 seconds for testing
  
  console.log('⏰ Test reporting started - will run 5 times every 10 seconds')
  console.log('🖥️ Go check your task manager in another tab!')
}

// Auto-run the test
startTestPresenceReporting() 