const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Load Supabase credentials
const supabaseCode = fs.readFileSync('public/lib/supabase.js', 'utf8')
const urlMatch = supabaseCode.match(/supabaseUrl = '([^']+)'/)
const keyMatch = supabaseCode.match(/supabaseKey = '([^']+)'/)

const supabase = createClient(urlMatch[1], keyMatch[1])

async function fixWorkSessionsTable() {
  console.log('🔧 Checking work_sessions table...')
  
  // Test if work_sessions table exists
  console.log('\n1. Testing table access:')
  const { data: testData, error: testError } = await supabase
    .from('work_sessions')
    .select('*')
    .limit(1)
  
  if (testError) {
    console.error('❌ work_sessions table error:', testError.message)
    
    if (testError.message.includes('does not exist')) {
      console.log('\n🚀 Table does not exist - needs to be created via Supabase Dashboard')
      console.log('\nNext steps:')
      console.log('1. Go to your Supabase Dashboard')
      console.log('2. Click "SQL Editor"')
      console.log('3. Copy the contents of WORK_SESSIONS_SCHEMA_FIXED.sql')
      console.log('4. Paste and run the SQL')
      console.log('5. Then try the clock-in feature again')
    } else {
      console.log('\n🔧 Table exists but has permission/schema issues')
      console.log('Run WORK_SESSIONS_SCHEMA_FIXED.sql in Supabase Dashboard to fix')
    }
  } else {
    console.log('✅ work_sessions table exists and accessible')
    console.log('Found', testData?.length || 0, 'records')
    
    // Test insert permissions
    console.log('\n2. Testing insert permissions:')
    const testSession = {
      driver_id: '3e5c0cd-925b-411b-b87c-36058e610f8f', // The driver ID from your error
      start_time: new Date().toISOString(),
      status: 'active'
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('work_sessions')
      .insert(testSession)
      .select()
    
    if (insertError) {
      console.error('❌ Insert test failed:', insertError.message)
      console.log('This confirms the schema needs to be fixed')
    } else {
      console.log('✅ Insert test successful:', insertData?.[0]?.id)
      
      // Clean up test record
      await supabase
        .from('work_sessions')
        .delete()
        .eq('id', insertData[0].id)
      console.log('🧹 Test record cleaned up')
    }
  }
  
  process.exit(0)
}

fixWorkSessionsTable().catch((error) => {
  console.error('❌ Fix failed:', error)
  process.exit(1)
}) 