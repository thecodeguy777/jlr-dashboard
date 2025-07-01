// Debug script for GPS breadcrumb tracking
// Run this in browser console on DriverTracking.vue page

console.log('🔍 Starting GPS Breadcrumb Debug...')

// Test 1: Check if Supabase connection is working
async function testSupabaseConnection() {
  console.log('\n=== TEST 1: Supabase Connection ===')
  try {
    const { data, error } = await supabase.from('drivers').select('*').limit(1)
    if (error) {
      console.error('❌ Supabase connection failed:', error)
      return false
    }
    console.log('✅ Supabase connection working')
    console.log('📊 Sample driver data:', data)
    return true
  } catch (err) {
    console.error('❌ Supabase test failed:', err)
    return false
  }
}

// Test 2: Check if there are any drivers in the system
async function checkDrivers() {
  console.log('\n=== TEST 2: Check Drivers ===')
  try {
    const { data: drivers, error } = await supabase
      .from('drivers')
      .select('*')
    
    if (error) throw error
    
    console.log(`📊 Found ${drivers.length} drivers:`)
    drivers.forEach(driver => {
      console.log(`  - ${driver.name} (ID: ${driver.id.substring(0, 8)}...)`)
    })
    
    return drivers
  } catch (error) {
    console.error('❌ Error fetching drivers:', error)
    return []
  }
}

// Test 3: Check if there are any delivery logs (indicating route activity)
async function checkDeliveryLogs() {
  console.log('\n=== TEST 3: Check Delivery Logs ===')
  try {
    const { data: logs, error } = await supabase
      .from('delivery_logs')
      .select(`
        *,
        drivers (name)
      `)
      .order('timestamp', { ascending: false })
      .limit(10)
    
    if (error) throw error
    
    console.log(`📊 Found ${logs.length} recent delivery logs:`)
    logs.forEach(log => {
      console.log(`  - ${log.drivers?.name || 'Unknown'}: ${log.action_type} at ${log.timestamp}`)
    })
    
    const startRouteLogs = logs.filter(log => log.action_type === 'start_route')
    console.log(`🚀 Routes started: ${startRouteLogs.length}`)
    
    return logs
  } catch (error) {
    console.error('❌ Error fetching delivery logs:', error)
    return []
  }
}

// Test 4: Check existing breadcrumbs
async function checkBreadcrumbs() {
  console.log('\n=== TEST 4: Check Existing Breadcrumbs ===')
  try {
    const { data: breadcrumbs, error } = await supabase
      .from('gps_breadcrumbs')
      .select(`
        *,
        drivers (name)
      `)
      .order('timestamp', { ascending: false })
      .limit(10)
    
    if (error) throw error
    
    console.log(`📊 Found ${breadcrumbs.length} recent breadcrumbs:`)
    breadcrumbs.forEach(breadcrumb => {
      console.log(`  - ${breadcrumb.drivers?.name || 'Unknown'}: ${breadcrumb.timestamp} (Active: ${breadcrumb.is_active_route})`)
    })
    
    const activeBreadcrumbs = breadcrumbs.filter(b => b.is_active_route)
    console.log(`🟢 Active breadcrumbs: ${activeBreadcrumbs.length}`)
    
    return breadcrumbs
  } catch (error) {
    console.error('❌ Error fetching breadcrumbs:', error)
    return []
  }
}

// Test 5: Try to insert a test breadcrumb
async function testBreadcrumbInsertion() {
  console.log('\n=== TEST 5: Test Breadcrumb Insertion ===')
  
  // Get first driver
  const { data: drivers, error: driverError } = await supabase
    .from('drivers')
    .select('*')
    .limit(1)
  
  if (driverError || !drivers.length) {
    console.error('❌ No drivers found for test insertion')
    return false
  }
  
  const testDriver = drivers[0]
  console.log(`🧪 Testing with driver: ${testDriver.name}`)
  
  const testBreadcrumb = {
    driver_id: testDriver.id,
    timestamp: new Date().toISOString(),
    latitude: 14.5995, // Manila coordinates
    longitude: 120.9842,
    gps_accuracy: 15.0,
    speed_kmh: 25.0,
    distance_from_last: 50.0,
    battery_level: 85,
    signal_status: 'good',
    is_active_route: true,
    synced: true
  }
  
  try {
    const { data, error } = await supabase
      .from('gps_breadcrumbs')
      .insert(testBreadcrumb)
      .select()
    
    if (error) throw error
    
    console.log('✅ Test breadcrumb inserted successfully!')
    console.log('📝 Inserted data:', data)
    return true
  } catch (error) {
    console.error('❌ Failed to insert test breadcrumb:', error)
    return false
  }
}

// Test 6: Check RLS (Row Level Security) policies
async function checkRLSPermissions() {
  console.log('\n=== TEST 6: Check RLS Permissions ===')
  
  try {
    // Try to read from gps_breadcrumbs
    const { data, error } = await supabase
      .from('gps_breadcrumbs')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ RLS Policy blocking read access:', error)
      console.log('💡 You might need to be logged in as a driver or admin')
      return false
    }
    
    console.log('✅ Read access working')
    console.log(`📊 Total breadcrumbs in database: ${data || 0}`)
    return true
  } catch (error) {
    console.error('❌ RLS permission check failed:', error)
    return false
  }
}

// Test 7: Check current user authentication
async function checkCurrentUser() {
  console.log('\n=== TEST 7: Check Current User ===')
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) throw error
    
    if (user) {
      console.log('✅ User is authenticated')
      console.log(`👤 User ID: ${user.id}`)
      console.log(`📧 Email: ${user.email}`)
      
      // Check if user has driver profile
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (driverError) {
        console.warn('⚠️ User has no driver profile:', driverError)
      } else {
        console.log('🚗 Driver profile found:', driver.name)
      }
      
      return user
    } else {
      console.error('❌ No user is authenticated')
      return null
    }
  } catch (error) {
    console.error('❌ Auth check failed:', error)
    return null
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Running GPS Breadcrumb Debug Tests...')
  
  const results = {
    supabase: await testSupabaseConnection(),
    drivers: await checkDrivers(),
    deliveryLogs: await checkDeliveryLogs(),
    breadcrumbs: await checkBreadcrumbs(),
    insertion: await testBreadcrumbInsertion(),
    rls: await checkRLSPermissions(),
    user: await checkCurrentUser()
  }
  
  console.log('\n=== SUMMARY ===')
  console.log('Results:', results)
  
  // Provide recommendations
  console.log('\n=== RECOMMENDATIONS ===')
  
  if (!results.supabase) {
    console.log('❌ Fix Supabase connection first')
  } else if (!results.user) {
    console.log('❌ User needs to be logged in')
  } else if (results.drivers.length === 0) {
    console.log('❌ Create driver profiles first')
  } else if (!results.rls) {
    console.log('❌ Check RLS policies - user might not have proper permissions')
  } else if (results.deliveryLogs.filter(log => log.action_type === 'start_route').length === 0) {
    console.log('⚠️ No routes have been started - breadcrumbs only track during active routes')
    console.log('💡 Try using the Driver Dashboard to start a route')
  } else if (!results.insertion) {
    console.log('❌ Database insertion is failing - check table permissions')
  } else {
    console.log('✅ System looks good - breadcrumbs should be working')
    console.log('💡 Make sure GPS is enabled and routes are started via Driver Dashboard')
  }
}

// Export functions for manual testing
window.debugBreadcrumbs = {
  runAllTests,
  testSupabaseConnection,
  checkDrivers,
  checkDeliveryLogs,
  checkBreadcrumbs,
  testBreadcrumbInsertion,
  checkRLSPermissions,
  checkCurrentUser
}

// Auto-run tests
runAllTests() 