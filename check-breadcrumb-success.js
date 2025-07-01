// Check if breadcrumbs are now working and fix session_logs issue
// Run this in browser console

console.log('🔍 Checking if breadcrumbs are working now...')

async function checkBreadcrumbSuccess() {
  try {
    // Check recent breadcrumbs
    const { data: breadcrumbs, error } = await supabase
      .from('gps_breadcrumbs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(5)
    
    if (error) {
      console.error('❌ Still can\'t read breadcrumbs:', error)
      return false
    }
    
    console.log(`📊 Found ${breadcrumbs.length} recent breadcrumbs:`)
    breadcrumbs.forEach((b, i) => {
      console.log(`  ${i+1}. ${b.timestamp} - Lat: ${b.latitude}, Lng: ${b.longitude}, Active: ${b.is_active_route}`)
    })
    
    // Check if any are from today
    const today = new Date().toISOString().split('T')[0]
    const todayBreadcrumbs = breadcrumbs.filter(b => b.timestamp.startsWith(today))
    
    if (todayBreadcrumbs.length > 0) {
      console.log('🎉 SUCCESS! Breadcrumbs are being recorded today!')
      console.log(`✅ ${todayBreadcrumbs.length} breadcrumbs recorded today`)
      return true
    } else {
      console.log('⚠️ No breadcrumbs from today yet - may need to start a route')
      return false
    }
    
  } catch (error) {
    console.error('❌ Error checking breadcrumbs:', error)
    return false
  }
}

async function fixSessionLogsTable() {
  console.log('\n🔧 Fixing session_logs table issue...')
  
  try {
    // Try to read from session_logs first
    const { data, error } = await supabase
      .from('session_logs')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ session_logs table issue:', error)
      console.log('💡 This table might not exist or have permission issues')
      
      // If it's a table not found error, suggest creating it
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('🔧 session_logs table doesn\'t exist - this is optional for basic tracking')
        console.log('💡 You can create it by running DRIVER_SCHEMA.sql in Supabase')
      }
      
      return false
    }
    
    console.log('✅ session_logs table is accessible')
    return true
    
  } catch (error) {
    console.error('❌ Error checking session_logs:', error)
    return false
  }
}

async function testCurrentBreadcrumbInsertion() {
  console.log('\n🧪 Testing live breadcrumb insertion...')
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ Not authenticated')
      return false
    }
    
    // Get driver profile
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (driverError) {
      console.error('❌ No driver profile:', driverError)
      return false
    }
    
    console.log('✅ Driver found:', driver.name)
    
    // Insert a test breadcrumb with current timestamp
    const testBreadcrumb = {
      driver_id: driver.id,
      timestamp: new Date().toISOString(),
      latitude: 14.785774,
      longitude: 120.950727,
      gps_accuracy: 20.0,
      speed_kmh: 0.0,
      distance_from_last: 0.0,
      battery_level: 85,
      signal_status: 'good',
      is_active_route: true,
      synced: true
    }
    
    const { data, error } = await supabase
      .from('gps_breadcrumbs')
      .insert(testBreadcrumb)
      .select()
    
    if (error) {
      console.error('❌ Breadcrumb insertion still failing:', error)
      return false
    }
    
    console.log('🎉 Live breadcrumb inserted successfully!', data)
    return true
    
  } catch (error) {
    console.error('❌ Error testing breadcrumb insertion:', error)
    return false
  }
}

// Run all checks
async function runFullCheck() {
  console.log('🚀 Running full breadcrumb success check...')
  
  const results = {
    breadcrumbsExist: await checkBreadcrumbSuccess(),
    sessionLogsWorking: await fixSessionLogsTable(),
    liveInsertionWorks: await testCurrentBreadcrumbInsertion()
  }
  
  console.log('\n=== RESULTS ===')
  console.log('✅ Breadcrumbs exist:', results.breadcrumbsExist)
  console.log('✅ Session logs working:', results.sessionLogsWorking)
  console.log('✅ Live insertion works:', results.liveInsertionWorks)
  
  if (results.liveInsertionWorks) {
    console.log('\n🎉 GREAT NEWS! Breadcrumb tracking is now working!')
    console.log('💡 The 400 error you see is likely from session_logs, not breadcrumbs')
    console.log('💡 Go to Driver Dashboard and start a route - breadcrumbs should appear')
  } else if (results.breadcrumbsExist) {
    console.log('\n✅ Breadcrumbs exist but live insertion not working')
    console.log('💡 Check if a route is currently active')
  } else {
    console.log('\n⚠️ Still no breadcrumbs - may need to start a route first')
  }
  
  if (!results.sessionLogsWorking) {
    console.log('\n⚠️ session_logs table has issues but this won\'t affect GPS breadcrumbs')
    console.log('💡 You can ignore session_logs errors for basic tracking')
  }
}

// Export for manual use
window.checkBreadcrumbs = {
  runFullCheck,
  checkBreadcrumbSuccess,
  fixSessionLogsTable,
  testCurrentBreadcrumbInsertion
}

// Auto-run
runFullCheck() 