const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Load Supabase credentials
const supabaseCode = fs.readFileSync('public/lib/supabase.js', 'utf8')
const urlMatch = supabaseCode.match(/supabaseUrl = '([^']+)'/)
const keyMatch = supabaseCode.match(/supabaseKey = '([^']+)'/)

if (!urlMatch || !keyMatch) {
  console.error('Could not extract Supabase credentials')
  process.exit(1)
}

const supabase = createClient(urlMatch[1], keyMatch[1])

async function testGhostCommands() {
  console.log('🧪 Testing ghost commands table...')
  
  // Test read access
  console.log('\n1. Testing READ access:')
  const { data: readData, error: readError } = await supabase
    .from('ghost_commands')
    .select('*')
    .limit(5)
  
  if (readError) {
    console.error('❌ Read error:', readError.message)
  } else {
    console.log('✅ Read access works, found', readData?.length || 0, 'records')
  }
  
  // Test getting drivers
  console.log('\n2. Testing DRIVERS table access:')
  const { data: driversData, error: driversError } = await supabase
    .from('drivers')
    .select('id, name, phone')
    .limit(3)
  
  if (driversError) {
    console.error('❌ Drivers read error:', driversError.message)
  } else {
    console.log('✅ Drivers access works, found', driversData?.length || 0, 'drivers')
    if (driversData && driversData.length > 0) {
      console.log('First driver:', driversData[0])
      
      // Test insert with real driver ID
      console.log('\n3. Testing INSERT access with real driver:')
      const testCommand = {
        driver_id: driversData[0].id,
        action: 'FORCE_CLOCK_IN', 
        reason: 'connection_test'
      }
      
      const { data: insertData, error: insertError } = await supabase
        .from('ghost_commands')
        .insert(testCommand)
        .select()
      
      if (insertError) {
        console.error('❌ Insert error:', insertError.message)
        console.error('Insert error details:', insertError)
      } else {
        console.log('✅ Insert access works, created command ID:', insertData?.[0]?.id)
        
        // Clean up test command
        if (insertData && insertData[0]) {
          const { error: deleteError } = await supabase
            .from('ghost_commands')
            .delete()
            .eq('id', insertData[0].id)
          
          if (deleteError) {
            console.error('⚠️ Could not clean up test command:', deleteError.message)
          } else {
            console.log('🧹 Test command cleaned up')
          }
        }
      }
    }
  }
  
  // Test real-time subscription
  console.log('\n4. Testing REAL-TIME subscription:')
  const channel = supabase
    .channel('ghost-control-test')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'ghost_commands',
      filter: 'driver_id=eq.test'
    }, (payload) => {
      console.log('🔔 Real-time event received:', payload)
    })
    .subscribe((status) => {
      console.log('📡 Subscription status:', status)
      
      // Close after 2 seconds
      setTimeout(() => {
        supabase.removeChannel(channel)
        console.log('🔌 Real-time subscription closed')
        process.exit(0)
      }, 2000)
    })
}

testGhostCommands().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
}) 