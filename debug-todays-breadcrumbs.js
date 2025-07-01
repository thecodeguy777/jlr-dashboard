// Debug why breadcrumbs worked yesterday but not today
// Run this in browser console

console.log('🔍 Debugging why breadcrumbs stopped working today...')

async function checkTodaysData() {
  console.log('\n=== Checking Today\'s Data ===')
  
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  console.log('📅 Today is:', today)
  
  try {
    // Check today's breadcrumbs
    const { data: todayBreadcrumbs, error: breadcrumbError } = await supabase
      .from('gps_breadcrumbs')
      .select('*')
      .gte('timestamp', today)
      .order('timestamp', { ascending: false })
    
    if (breadcrumbError) {
      console.error('❌ Error reading breadcrumbs:', breadcrumbError)
      return false
    }
    
    console.log(`📊 Today's breadcrumbs: ${todayBreadcrumbs.length}`)
    
    if (todayBreadcrumbs.length > 0) {
      console.log('✅ Found breadcrumbs from today:')
      todayBreadcrumbs.forEach((b, i) => {
        console.log(`  ${i+1}. ${b.timestamp} - ${b.latitude}, ${b.longitude}`)
      })
    } else {
      console.log('❌ No breadcrumbs recorded today')
    }
    
    // Check today's delivery logs (route activity)
    const { data: todayLogs, error: logError } = await supabase
      .from('delivery_logs')
      .select('*')
      .gte('timestamp', today)
      .order('timestamp', { ascending: false })
    
    if (logError) {
      console.error('❌ Error reading delivery logs:', logError)
    } else {
      console.log(`📋 Today's delivery logs: ${todayLogs.length}`)
      
      const startRoutes = todayLogs.filter(log => log.action_type === 'start_route')
      const endRoutes = todayLogs.filter(log => log.action_type === 'end_route')
      
      console.log(`🚀 Routes started today: ${startRoutes.length}`)
      console.log(`🏁 Routes ended today: ${endRoutes.length}`)
      
      if (startRoutes.length === 0) {
        console.log('💡 No routes started today - breadcrumbs only work during active routes')
      }
    }
    
    return todayBreadcrumbs.length > 0
    
  } catch (error) {
    console.error('❌ Error checking today\'s data:', error)
    return false
  }
}

async function checkActiveRoutes() {
  console.log('\n=== Checking Active Routes ===')
  
  try {
    // Check for any currently active routes
    const { data: activeBreadcrumbs, error } = await supabase
      .from('gps_breadcrumbs')
      .select(`
        *,
        drivers (name)
      `)
      .eq('is_active_route', true)
      .order('timestamp', { ascending: false })
    
    if (error) {
      console.error('❌ Error checking active routes:', error)
      return false
    }
    
    console.log(`🟢 Currently active routes: ${activeBreadcrumbs.length}`)
    
    if (activeBreadcrumbs.length > 0) {
      console.log('✅ Active routes found:')
      activeBreadcrumbs.forEach((b, i) => {
        const minutesAgo = Math.round((Date.now() - new Date(b.timestamp).getTime()) / (1000 * 60))
        console.log(`  ${i+1}. ${b.drivers?.name || 'Unknown'} - ${minutesAgo} minutes ago`)
      })
    } else {
      console.log('❌ No active routes - need to start a route for breadcrumb tracking')
    }
    
    return activeBreadcrumbs.length > 0
    
  } catch (error) {
    console.error('❌ Error checking active routes:', error)
    return false
  }
}

async function testLiveBreadcrumbInsertion() {
  console.log('\n=== Testing Live Breadcrumb Insertion ===')
  
  try {
    // Get current user and driver
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ Not authenticated')
      return false
    }
    
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
    console.log('🧪 Testing breadcrumb insertion with current timestamp...')
    
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
      console.error('❌ Breadcrumb insertion failed:', error)
      console.error('📝 Error message:', error.message)
      console.error('📝 Error details:', error.details)
      console.error('📝 Error hint:', error.hint)
      return false
    }
    
    console.log('🎉 Test breadcrumb inserted successfully!', data)
    return true
    
  } catch (error) {
    console.error('❌ Error testing breadcrumb insertion:', error)
    return false
  }
}

async function manualRouteStart() {
  console.log('\n=== Starting Route Manually ===')
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ Not authenticated')
      return false
    }
    
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (driverError) {
      console.error('❌ No driver profile:', driverError)
      return false
    }
    
    console.log('🚀 Inserting start_route log...')
    
    const routeLog = {
      driver_id: driver.id,
      action_type: 'start_route',
      timestamp: new Date().toISOString(),
      latitude: 14.785774,
      longitude: 120.950727,
      gps_accuracy: 20.0,
      note: 'Manual route start for testing',
      synced: true,
      battery_level: 85,
      signal_status: 'good'
    }
    
    const { data, error } = await supabase
      .from('delivery_logs')
      .insert(routeLog)
      .select()
    
    if (error) {
      console.error('❌ Failed to start route:', error)
      return false
    }
    
    console.log('✅ Route started manually!', data)
    console.log('💡 Now breadcrumb tracking should be active')
    return true
    
  } catch (error) {
    console.error('❌ Error starting route:', error)
    return false
  }
}

// Main debug function
async function debugTodaysIssue() {
  console.log('🚀 Running today\'s breadcrumb debug...')
  
  const results = {
    todaysData: await checkTodaysData(),
    activeRoutes: await checkActiveRoutes(),
    liveInsertion: await testLiveBreadcrumbInsertion()
  }
  
  console.log('\n=== DIAGNOSIS ===')
  
  if (!results.todaysData && !results.activeRoutes) {
    console.log('❌ No breadcrumbs today and no active routes')
    console.log('💡 SOLUTION: Start a route from Driver Dashboard')
    console.log('📱 Or run: await window.debugToday.manualRouteStart()')
  } else if (!results.liveInsertion) {
    console.log('❌ Live insertion failing - database issue')
    console.log('💡 Check the error details above')
  } else if (results.activeRoutes && results.liveInsertion) {
    console.log('✅ Everything should be working - check Driver Tracking page')
  }
  
  console.log('\n=== NEXT STEPS ===')
  console.log('1. Go to Driver Dashboard and click "Start Route"')
  console.log('2. Wait 1 minute for breadcrumbs to appear')
  console.log('3. Check Driver Tracking page GPS tab')
  console.log('4. Or run manual route start if needed')
}

// Export functions
window.debugToday = {
  debugTodaysIssue,
  checkTodaysData,
  checkActiveRoutes,
  testLiveBreadcrumbInsertion,
  manualRouteStart
}

// Auto-run
debugTodaysIssue() 