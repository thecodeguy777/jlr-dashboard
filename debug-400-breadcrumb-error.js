// Debug script for 400 Bad Request error on gps_breadcrumbs insertion
// Run this in browser console to identify the specific issue

console.log('🔍 Debugging 400 Bad Request on gps_breadcrumbs...')

// Test 1: Check current user and driver info
async function checkUserAndDriver() {
  console.log('\n=== TEST 1: User & Driver Info ===')
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ No authenticated user:', userError)
      return null
    }
    
    console.log('✅ User authenticated:', user.email)
    console.log('👤 User ID:', user.id)
    
    // Get driver profile
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (driverError) {
      console.error('❌ No driver profile found:', driverError)
      console.log('💡 Need to create driver profile first!')
      return { user, driver: null }
    }
    
    console.log('✅ Driver profile found:', driver.name)
    console.log('🚗 Driver ID:', driver.id)
    
    return { user, driver }
  } catch (error) {
    console.error('❌ Error checking user/driver:', error)
    return null
  }
}

// Test 2: Test breadcrumb insertion with detailed error logging
async function testBreadcrumbInsertion() {
  console.log('\n=== TEST 2: Test Breadcrumb Insertion ===')
  
  const userDriver = await checkUserAndDriver()
  if (!userDriver?.driver) {
    console.error('❌ Cannot test insertion - no driver profile')
    return false
  }
  
  const testBreadcrumb = {
    driver_id: userDriver.driver.id,
    timestamp: new Date().toISOString(),
    latitude: 14.785775,
    longitude: 120.950727,
    gps_accuracy: 20.0,
    speed_kmh: 0.0,
    distance_from_last: 0.0,
    battery_level: 85,
    signal_status: 'good',
    is_active_route: true,
    synced: true
  }
  
  console.log('🧪 Test breadcrumb data:', testBreadcrumb)
  
  try {
    const { data, error } = await supabase
      .from('gps_breadcrumbs')
      .insert(testBreadcrumb)
      .select()
    
    if (error) {
      console.error('❌ Insertion failed with error:', error)
      console.error('📝 Error details:', error.details)
      console.error('📝 Error hint:', error.hint)
      console.error('📝 Error message:', error.message)
      return false
    }
    
    console.log('✅ Test breadcrumb inserted successfully!')
    console.log('📝 Inserted data:', data)
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error during insertion:', error)
    return false
  }
}

// Test 3: Check table schema and constraints
async function checkTableSchema() {
  console.log('\n=== TEST 3: Check Table Schema ===')
  
  try {
    // Try to get table info (this might not work in browser, but worth trying)
    const { data, error } = await supabase
      .from('gps_breadcrumbs')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Cannot access gps_breadcrumbs table:', error)
      return false
    }
    
    console.log('✅ Table accessible')
    if (data && data.length > 0) {
      console.log('📊 Sample record structure:', Object.keys(data[0]))
    } else {
      console.log('📊 Table is empty - no sample structure available')
    }
    
    return true
  } catch (error) {
    console.error('❌ Error checking table schema:', error)
    return false
  }
}

// Test 4: Check RLS policies by trying different operations
async function testRLSPolicies() {
  console.log('\n=== TEST 4: Test RLS Policies ===')
  
  try {
    // Test SELECT permission
    const { data: selectData, error: selectError } = await supabase
      .from('gps_breadcrumbs')
      .select('count', { count: 'exact', head: true })
    
    if (selectError) {
      console.error('❌ SELECT permission denied:', selectError)
    } else {
      console.log('✅ SELECT permission OK')
    }
    
    // Test INSERT permission with minimal data
    const userDriver = await checkUserAndDriver()
    if (userDriver?.driver) {
      const { data: insertData, error: insertError } = await supabase
        .from('gps_breadcrumbs')
        .insert({
          driver_id: userDriver.driver.id,
          latitude: 14.5995,
          longitude: 120.9842
        })
        .select()
      
      if (insertError) {
        console.error('❌ INSERT permission denied:', insertError)
        console.error('📝 Specific error:', insertError.message)
      } else {
        console.log('✅ INSERT permission OK')
        console.log('📝 Inserted test record:', insertData)
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing RLS policies:', error)
  }
}

// Test 5: Create driver profile if missing
async function createDriverProfileIfMissing() {
  console.log('\n=== TEST 5: Create Driver Profile If Missing ===')
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ No authenticated user')
      return false
    }
    
    // Check if driver profile exists
    const { data: existingDriver, error: checkError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (existingDriver) {
      console.log('✅ Driver profile already exists:', existingDriver.name)
      return existingDriver
    }
    
    console.log('⚠️ No driver profile found, creating one...')
    
    // Create driver profile
    const newDriver = {
      user_id: user.id,
      name: user.email?.split('@')[0] || 'Test Driver',
      phone: '+1234567890',
      is_active: true
    }
    
    const { data: createdDriver, error: createError } = await supabase
      .from('drivers')
      .insert(newDriver)
      .select()
      .single()
    
    if (createError) {
      console.error('❌ Failed to create driver profile:', createError)
      return false
    }
    
    console.log('✅ Driver profile created:', createdDriver.name)
    return createdDriver
    
  } catch (error) {
    console.error('❌ Error creating driver profile:', error)
    return false
  }
}

// Test 6: Check actual breadcrumb data being sent
async function inspectBreadcrumbData() {
  console.log('\n=== TEST 6: Inspect Breadcrumb Data ===')
  
  // Get the useDriverTracking composable if available
  if (window.Vue && window.useDriverTracking) {
    console.log('🔍 Checking current tracking state...')
    // This would need to be implemented differently depending on how the composable is exposed
  }
  
  // Check localStorage for any pending breadcrumbs
  const pendingBreadcrumbs = localStorage.getItem('pending_breadcrumbs')
  if (pendingBreadcrumbs) {
    console.log('📦 Pending breadcrumbs in localStorage:', JSON.parse(pendingBreadcrumbs))
  } else {
    console.log('📦 No pending breadcrumbs in localStorage')
  }
  
  // Check if there are any console errors related to breadcrumb creation
  console.log('💡 Check the Network tab in DevTools for the exact request payload that\'s causing the 400 error')
}

// Main test runner
async function runBreadcrumbErrorDebug() {
  console.log('🚀 Running 400 Error Debug for GPS Breadcrumbs...')
  
  const results = {
    userDriver: await checkUserAndDriver(),
    schema: await checkTableSchema(),
    rls: await testRLSPolicies(),
    insertion: await testBreadcrumbInsertion(),
    driverCreation: await createDriverProfileIfMissing()
  }
  
  console.log('\n=== SUMMARY ===')
  console.log('Debug results:', results)
  
  console.log('\n=== RECOMMENDATIONS ===')
  
  if (!results.userDriver?.user) {
    console.log('❌ User is not authenticated - login required')
  } else if (!results.userDriver?.driver) {
    console.log('❌ No driver profile found - try creating one')
    console.log('💡 Run: await window.debugBreadcrumbs.createDriverProfileIfMissing()')
  } else if (!results.schema) {
    console.log('❌ Cannot access gps_breadcrumbs table - check RLS policies')
  } else if (!results.insertion) {
    console.log('❌ Database insertion failing - check the specific error above')
    console.log('💡 Most likely causes:')
    console.log('   - RLS policy blocking INSERT')
    console.log('   - Required field missing')
    console.log('   - Data type mismatch')
    console.log('   - Constraint violation')
  } else {
    console.log('✅ Everything looks good - 400 error might be intermittent')
  }
  
  console.log('\n💡 Next steps:')
  console.log('1. Check Network tab in DevTools for exact request payload')
  console.log('2. Look at the specific error message in the 400 response')
  console.log('3. Verify RLS policies allow INSERT for current user')
}

// Export functions for manual testing
window.debugBreadcrumbs = {
  ...window.debugBreadcrumbs,
  runBreadcrumbErrorDebug,
  checkUserAndDriver,
  testBreadcrumbInsertion,
  checkTableSchema,
  testRLSPolicies,
  createDriverProfileIfMissing,
  inspectBreadcrumbData
}

// Auto-run the debug
runBreadcrumbErrorDebug() 