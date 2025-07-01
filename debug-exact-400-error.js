// Debug the exact 400 error on gps_breadcrumbs insertion
// This will test different data combinations to find the issue

console.log('🔍 Debugging exact 400 error on breadcrumb insertion...')

async function testMinimalBreadcrumb() {
  console.log('\n=== Testing Minimal Breadcrumb Data ===')
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ Not authenticated')
      return false
    }
    
    const { data: driver } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (!driver) {
      console.error('❌ No driver profile')
      return false
    }
    
    console.log('✅ Driver found:', driver.name)
    
    // Test with MINIMAL required fields only
    const minimalData = {
      driver_id: driver.id,
      latitude: 14.785774,
      longitude: 120.950727
    }
    
    console.log('🧪 Testing minimal data:', minimalData)
    
    const { data, error } = await supabase
      .from('gps_breadcrumbs')
      .insert(minimalData)
      .select()
    
    if (error) {
      console.error('❌ Minimal insertion failed:', error)
      console.error('📝 Error code:', error.code)
      console.error('📝 Error message:', error.message)
      console.error('📝 Error details:', error.details)
      console.error('📝 Error hint:', error.hint)
      return false
    }
    
    console.log('✅ Minimal breadcrumb inserted!', data)
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

async function testFieldByField() {
  console.log('\n=== Testing Field by Field ===')
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: driver } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (!driver) return false
    
    // Test each field combination
    const testCases = [
      {
        name: 'Basic required fields',
        data: {
          driver_id: driver.id,
          latitude: 14.785774,
          longitude: 120.950727
        }
      },
      {
        name: 'With timestamp',
        data: {
          driver_id: driver.id,
          latitude: 14.785774,
          longitude: 120.950727,
          timestamp: new Date().toISOString()
        }
      },
      {
        name: 'With GPS accuracy',
        data: {
          driver_id: driver.id,
          latitude: 14.785774,
          longitude: 120.950727,
          gps_accuracy: 20.0
        }
      },
      {
        name: 'With active route flag',
        data: {
          driver_id: driver.id,
          latitude: 14.785774,
          longitude: 120.950727,
          is_active_route: true
        }
      },
      {
        name: 'Full data set',
        data: {
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
      }
    ]
    
    for (const testCase of testCases) {
      console.log(`\n🧪 Testing: ${testCase.name}`)
      console.log('📦 Data:', testCase.data)
      
      const { data, error } = await supabase
        .from('gps_breadcrumbs')
        .insert(testCase.data)
        .select()
      
      if (error) {
        console.error(`❌ ${testCase.name} failed:`, error.message)
        if (error.details) console.error('Details:', error.details)
        if (error.hint) console.error('Hint:', error.hint)
        
        // If this is the first failure, stop here to identify the problematic field
        break
      } else {
        console.log(`✅ ${testCase.name} succeeded!`)
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

async function checkTableConstraints() {
  console.log('\n=== Checking Table Constraints ===')
  
  try {
    // Try to get table schema info (limited in browser)
    const { data: sample, error } = await supabase
      .from('gps_breadcrumbs')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Cannot access table:', error)
      return false
    }
    
    if (sample && sample.length > 0) {
      console.log('📊 Sample record structure:')
      Object.keys(sample[0]).forEach(key => {
        console.log(`  - ${key}: ${typeof sample[0][key]} (${sample[0][key]})`)
      })
    } else {
      console.log('📊 Table is empty, cannot show structure')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Error checking constraints:', error)
    return false
  }
}

async function checkDriverProfile() {
  console.log('\n=== Checking Driver Profile ===')
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ Not authenticated')
      return null
    }
    
    console.log('👤 User ID:', user.id)
    console.log('📧 Email:', user.email)
    
    const { data: driver, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (error) {
      console.error('❌ Driver profile error:', error)
      return null
    }
    
    console.log('✅ Driver profile:')
    console.log('  - ID:', driver.id)
    console.log('  - Name:', driver.name)
    console.log('  - Active:', driver.is_active)
    console.log('  - Created:', driver.created_at)
    
    return driver
    
  } catch (error) {
    console.error('❌ Error checking driver:', error)
    return null
  }
}

async function testDifferentDriverIds() {
  console.log('\n=== Testing Different Driver IDs ===')
  
  try {
    // Get all drivers to test with
    const { data: allDrivers, error } = await supabase
      .from('drivers')
      .select('*')
      .limit(5)
    
    if (error) {
      console.error('❌ Cannot get drivers:', error)
      return false
    }
    
    console.log(`📊 Found ${allDrivers.length} drivers to test with`)
    
    for (const driver of allDrivers) {
      console.log(`\n🧪 Testing with driver: ${driver.name} (${driver.id})`)
      
      const testData = {
        driver_id: driver.id,
        latitude: 14.785774,
        longitude: 120.950727,
        gps_accuracy: 20.0
      }
      
      const { data, error } = await supabase
        .from('gps_breadcrumbs')
        .insert(testData)
        .select()
      
      if (error) {
        console.error(`❌ Failed with ${driver.name}:`, error.message)
      } else {
        console.log(`✅ Success with ${driver.name}!`)
        return true
      }
    }
    
    return false
    
  } catch (error) {
    console.error('❌ Error testing drivers:', error)
    return false
  }
}

// Main diagnostic function
async function diagnoseExact400Error() {
  console.log('🚀 Running comprehensive 400 error diagnosis...')
  
  // Run all tests
  const driver = await checkDriverProfile()
  if (!driver) {
    console.log('❌ Cannot proceed without driver profile')
    return
  }
  
  await checkTableConstraints()
  
  const minimalWorks = await testMinimalBreadcrumb()
  
  if (!minimalWorks) {
    console.log('\n❌ Even minimal data fails - checking with different drivers...')
    await testDifferentDriverIds()
  } else {
    console.log('\n✅ Minimal data works - testing which field causes the issue...')
    await testFieldByField()
  }
  
  console.log('\n=== FINAL DIAGNOSIS ===')
  console.log('💡 Check the detailed error messages above')
  console.log('💡 The specific error details will show what\'s wrong')
  console.log('💡 Common issues:')
  console.log('   - Invalid driver_id (foreign key constraint)')
  console.log('   - Data type mismatch (e.g., string vs number)')
  console.log('   - Required field missing')
  console.log('   - RLS policy blocking insertion')
  console.log('   - Check constraint violation')
}

// Export functions
window.debug400 = {
  diagnoseExact400Error,
  testMinimalBreadcrumb,
  testFieldByField,
  checkTableConstraints,
  checkDriverProfile,
  testDifferentDriverIds
}

// Auto-run
diagnoseExact400Error() 