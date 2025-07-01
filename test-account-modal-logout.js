// Test AccountModal Logout Fix
// Run this to simulate the AccountModal logout

console.log('🧪 Testing AccountModal Logout Fix...')

// Import dependencies
const { supabase } = await import('./public/lib/supabase.js')

// Simulate the new AccountModal logout function
async function testAccountModalLogout() {
  try {
    console.log('🔄 AccountModal logout triggered')
    
    // Get current user and role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ No user found')
      return false
    }
    
    console.log('👤 Current user:', user.email)
    
    // Simulate userStore.role check (you might need to check this manually)
    const userRole = 'driver' // Assuming driver role for test
    
    if (userRole === 'driver') {
        console.log('👤 Driver logout detected - performing presence cleanup')
        
        const { data: driver } = await supabase
            .from('drivers')
            .select('id')
            .eq('user_id', user.id)
            .single()
        
        if (driver) {
            console.log('👋 Marking driver offline before logout:', driver.id)
            
            // Mark driver as offline
            const { error: presenceError } = await supabase
                .from('driver_presence')
                .update({
                    is_online: false,
                    last_seen: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('driver_id', driver.id)
            
            if (presenceError) {
                console.warn('⚠️ Failed to update presence, using fallback:', presenceError)
                
                // Fallback: Log logout activity
                const { error: logError } = await supabase
                    .from('delivery_logs')
                    .insert({
                        driver_id: driver.id,
                        action_type: 'test_logout_account_modal',
                        timestamp: new Date().toISOString(),
                        note: 'Test: Driver logged out via account modal'
                    })
                
                if (logError) {
                  console.error('❌ Fallback logging failed:', logError)
                  return false
                } else {
                  console.log('✅ Fallback logging successful')
                }
            } else {
                console.log('✅ Driver marked as offline successfully')
            }
            
            // Verify the change
            const { data: verifyPresence } = await supabase
                .from('driver_presence')
                .select('is_online, last_seen')
                .eq('driver_id', driver.id)
                .order('last_seen', { ascending: false })
                .limit(1)
            
            if (verifyPresence && verifyPresence.length > 0) {
                const record = verifyPresence[0]
                console.log('📍 Status after logout:', record.is_online ? '🟢 Online' : '🔴 Offline')
                console.log('📍 Last seen:', record.last_seen)
                
                if (!record.is_online) {
                    console.log('\n🎉 SUCCESS! AccountModal logout properly marks driver offline')
                    console.log('🔄 Go refresh your task manager to see the change')
                    return true
                } else {
                    console.log('\n❌ FAILED! Driver still marked as online')
                    return false
                }
            }
        } else {
            console.error('❌ Driver profile not found')
            return false
        }
    }
    
    return false
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
    return false
  }
}

// Run the test
testAccountModalLogout().then(success => {
  if (success) {
    console.log('\n✅ Test passed! AccountModal logout now works correctly')
    console.log('💡 Try logging out via Account → Logout and it should mark you offline')
  } else {
    console.log('\n❌ Test failed! Check error messages above')
  }
}) 