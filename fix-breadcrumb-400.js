// Quick fix for 400 Bad Request on gps_breadcrumbs
// Paste this in browser console to debug and fix the issue

console.log('🔧 Fixing 400 Bad Request on gps_breadcrumbs...')

// Step 1: Check if driver profile exists
async function checkAndCreateDriver() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ Not logged in')
      return null
    }
    
    // Check for existing driver
    let { data: driver, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (error && error.code === 'PGRST116') {
      // No driver found, create one
      console.log('🔧 Creating driver profile...')
      const { data: newDriver, error: createError } = await supabase
        .from('drivers')
        .insert({
          user_id: user.id,
          name: user.email?.split('@')[0] || 'Driver',
          phone: '+1234567890',
          is_active: true
        })
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Failed to create driver:', createError)
        return null
      }
      
      driver = newDriver
      console.log('✅ Driver created:', driver.name)
    } else if (error) {
      console.error('❌ Error checking driver:', error)
      return null
    } else {
      console.log('✅ Driver exists:', driver.name)
    }
    
    return driver
  } catch (error) {
    console.error('❌ Error:', error)
    return null
  }
}

// Step 2: Test breadcrumb insertion
async function testBreadcrumbInsert() {
  const driver = await checkAndCreateDriver()
  if (!driver) return false
  
  console.log('🧪 Testing breadcrumb insertion...')
  
  const testData = {
    driver_id: driver.id,
    latitude: 14.785775,
    longitude: 120.950727,
    gps_accuracy: 20.0,
    is_active_route: true,
    synced: true
  }
  
  const { data, error } = await supabase
    .from('gps_breadcrumbs')
    .insert(testData)
    .select()
  
  if (error) {
    console.error('❌ Still getting 400 error:', error)
    console.error('Error details:', error.message)
    return false
  }
  
  console.log('✅ Breadcrumb inserted successfully!', data)
  return true
}

// Step 3: Run the fix
testBreadcrumbInsert().then(success => {
  if (success) {
    console.log('🎉 Problem fixed! Breadcrumbs should work now.')
    console.log('💡 Try starting a route again from the Driver Dashboard')
  } else {
    console.log('❌ Still having issues. Check the error messages above.')
  }
}) 