import { createApp } from 'vue';
import App from './App.vue';
import router from './router'; // Import the router
import './index.css'; // Adjust the path if needed
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zqjkhiqmukojzhnicigs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxamtoaXFtdWtvanpobmljaWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMzUzMDAsImV4cCI6MjA2MjcxMTMwMH0.YXfarq17d_9pVZrTkw_S_LlE3JPrpo1CwDXnxmmzjkc'
export const supabase = createClient(supabaseUrl, supabaseKey)
const app = createApp(App);

app.use(router); // Use the router
app.mount('#app');
