import { createClient } from '@supabase/supabase-js'
import { useUserStore } from '@/stores/useUserStore'

const supabaseUrl = 'https://zqjkhiqmukojzhnicigs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxamtoaXFtdWtvanpobmljaWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMzUzMDAsImV4cCI6MjA2MjcxMTMwMH0.YXfarq17d_9pVZrTkw_S_LlE3JPrpo1CwDXnxmmzjkc'

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
})