// Quick Fix: Mark Lacay Offline
// Run this in browser console to immediately mark Lacay as offline

console.log('🔄 Quick marking Lacay as offline...')

const { supabase } = await import('./public/lib/supabase.js')

// Lacay's driver ID from your system
const LACAY_DRIVER_ID = 'c574a833-6b65-46d3-b82f-281b2ae5c50d'

try {
  console.log('🎯 Targeting driver ID:', LACAY_DRIVER_ID)
  
  const { data, error } = await supabase
    .from('driver_presence')
    .update({
      is_online: false,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('driver_id', LACAY_DRIVER_ID)
    .select()
  
  if (error) {
    console.error('❌ Failed to mark Lacay offline:', error)
    console.error('📋 Error details:', error.message)
  } else {
    console.log('✅ SUCCESS! Lacay marked as offline')
    console.log('📊 Updated record:', data)
    console.log('🔄 Go refresh your task manager to see the change!')
  }
  
} catch (error) {
  console.error('❌ Unexpected error:', error)
} 