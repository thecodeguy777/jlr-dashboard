// Debug work session vs breadcrumb conflict
// This will identify what the work session is breaking

console.log('🔍 Debugging work session interference with breadcrumbs...')

async function checkWorkSessionState() {
  console.log('\n=== Work Session State ===')
  
  // Check localStorage for work session data
  const currentWorkSession = localStorage.getItem('current_work_session')
  const pendingWorkSessions = localStorage.getItem('pending_work_sessions')
  
  console.log('💼 Current work session in localStorage:', currentWorkSession)
  console.log('📦 Pending work sessions:', pendingWorkSessions)
  
  if (currentWorkSession) {
    const session = JSON.parse(currentWorkSession)
    console.log('🔍 Work session details:')
    console.log('   Session ID:', session.id)
    console.log('   Driver ID:', session.driver_id)
    console.log('   Status:', session.status)
    console.log('   Start time:', session.start_time)
    console.log('   Active?:', session.status === 'active')
  }
}

async function checkDriverIdConflict() {
  console.log('\n=== Driver ID Conflict Check ===')
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ Not authenticated')
      return false
    }
    
    console.log('👤 Current user ID:', user.id)
    
    // Check driver profile
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (driverError) {
      console.error('❌ Driver profile error:', driverError)
      return false
    }
    
    console.log('🚗 Driver from database:')
    console.log('   Driver ID:', driver.id)
    console.log('   Name:', driver.name)
    console.log('   Active:', driver.is_active)
    
    // Check work session driver ID
    const currentWorkSession = localStorage.getItem('current_work_session')
    if (currentWorkSession) {
      const session = JSON.parse(currentWorkSession)
      console.log('💼 Driver ID in work session:', session.driver_id)
      
      if (driver.id !== session.driver_id) {
        console.error('🚨 DRIVER ID MISMATCH!')
        console.error('   Database driver ID:', driver.id)
        console.error('   Work session driver ID:', session.driver_id)
        return false
      } else {
        console.log('✅ Driver IDs match')
      }
    }
    
    return driver
    
  } catch (error) {
    console.error('❌ Error checking driver:', error)
    return false
  }
}

async function testBreadcrumbWithoutWorkSession() {
  console.log('\n=== Testing Breadcrumb Without Work Session ===')
  
  // Temporarily disable work session
  const originalWorkSession = localStorage.getItem('current_work_session')
  localStorage.removeItem('current_work_session')
  
  try {
    const driver = await checkDriverIdConflict()
    if (!driver) return false
    
    console.log('🧪 Testing breadcrumb insertion without work session...')
    
    const testBreadcrumb = {
      driver_id: driver.id,
      timestamp: new Date().toISOString(),
      latitude: 14.785774,
      longitude: 120.950727,
      gps_accuracy: 20.0,
      is_active_route: true,
      synced: true
    }
    
    const { data, error } = await supabase
      .from('gps_breadcrumbs')
      .insert(testBreadcrumb)
      .select()
    
    if (error) {
      console.error('❌ Still failing without work session:', error)
      return false
    }
    
    console.log('✅ SUCCESS! Breadcrumb works without work session:', data)
    return true
    
  } finally {
    // Restore work session
    if (originalWorkSession) {
      localStorage.setItem('current_work_session', originalWorkSession)
    }
  }
}

async function checkWorkSessionTable() {
  console.log('\n=== Checking Work Session Table ===')
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: driver } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (!driver) return false
    
    // Check active work sessions
    const { data: activeSessions, error } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('driver_id', driver.id)
      .eq('status', 'active')
    
    if (error) {
      console.error('❌ Error checking work sessions:', error)
      console.log('💡 work_sessions table might not exist or have permission issues')
      return false
    }
    
    console.log(`📊 Active work sessions: ${activeSessions.length}`)
    
    if (activeSessions.length > 0) {
      activeSessions.forEach((session, i) => {
        console.log(`   ${i + 1}. ID: ${session.id}, Started: ${session.start_time}`)
      })
      
      if (activeSessions.length > 1) {
        console.warn('⚠️ Multiple active work sessions found - this might cause issues')
      }
    }
    
    return activeSessions
    
  } catch (error) {
    console.error('❌ Error checking work session table:', error)
    return false
  }
}

async function fixWorkSessionConflict() {
  console.log('\n=== Attempting to Fix Work Session Conflict ===')
  
  try {
    // Clear any corrupted work session data
    localStorage.removeItem('current_work_session')
    localStorage.removeItem('pending_work_sessions')
    console.log('🧹 Cleared localStorage work session data')
    
    // End any stuck active work sessions
    const { data: { user } } = await supabase.auth.getUser()
    const { data: driver } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (driver) {
      const { error: updateError } = await supabase
        .from('work_sessions')
        .update({ 
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('driver_id', driver.id)
        .eq('status', 'active')
      
      if (updateError) {
        console.warn('⚠️ Could not update work sessions:', updateError.message)
      } else {
        console.log('✅ Ended any active work sessions')
      }
    }
    
    // Test breadcrumb insertion
    console.log('🧪 Testing breadcrumb after cleanup...')
    const testBreadcrumb = {
      driver_id: driver.id,
      timestamp: new Date().toISOString(),
      latitude: 14.785774,
      longitude: 120.950727,
      gps_accuracy: 20.0,
      is_active_route: true,
      synced: true
    }
    
    const { data, error } = await supabase
      .from('gps_breadcrumbs')
      .insert(testBreadcrumb)
      .select()
    
    if (error) {
      console.error('❌ Still failing after cleanup:', error)
      return false
    }
    
    console.log('🎉 SUCCESS! Breadcrumbs fixed after work session cleanup')
    return true
    
  } catch (error) {
    console.error('❌ Error fixing work session conflict:', error)
    return false
  }
}

// Main diagnostic function
async function diagnoseWorkSessionConflict() {
  console.log('🚀 Diagnosing work session vs breadcrumb conflict...')
  
  await checkWorkSessionState()
  const driver = await checkDriverIdConflict()
  
  if (!driver) {
    console.log('❌ Cannot proceed - driver issues')
    return
  }
  
  const workSessionTable = await checkWorkSessionTable()
  const worksWithoutSession = await testBreadcrumbWithoutWorkSession()
  
  console.log('\n=== DIAGNOSIS ===')
  
  if (worksWithoutSession) {
    console.log('🎯 FOUND THE PROBLEM!')
    console.log('✅ Breadcrumbs work WITHOUT work session')
    console.log('❌ Breadcrumbs fail WITH work session')
    console.log('💡 The work session functionality is interfering')
    console.log('')
    console.log('🔧 SOLUTION OPTIONS:')
    console.log('1. Run: await window.workSessionDebug.fix()')
    console.log('2. Disable work session temporarily')
    console.log('3. Fix the work session integration')
  } else {
    console.log('❌ Issue is deeper than work session conflict')
  }
}

// Export functions
window.workSessionDebug = {
  diagnose: diagnoseWorkSessionConflict,
  checkState: checkWorkSessionState,
  checkDriverId: checkDriverIdConflict,
  testWithout: testBreadcrumbWithoutWorkSession,
  checkTable: checkWorkSessionTable,
  fix: fixWorkSessionConflict
}

// Auto-run
diagnoseWorkSessionConflict() 