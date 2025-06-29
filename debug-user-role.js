// 🔍 Debug User Role - Paste this in browser console to check your role
// Or add this temporarily to your Vue component

console.log('=== USER ROLE DEBUG ===');

// Check Pinia store state
const userStore = useUserStore ? useUserStore() : null;
console.log('User from store:', userStore?.user);
console.log('Role from store:', userStore?.role);
console.log('User ID:', userStore?.user?.id);

// Check localStorage
console.log('LocalStorage user:', localStorage.getItem('user'));
console.log('LocalStorage role:', localStorage.getItem('role'));

// Check Supabase session directly
import { supabase } from '@/lib/supabase';

supabase.auth.getSession().then(({ data: { session }, error }) => {
  console.log('Supabase session:', session);
  console.log('Session user:', session?.user);
  console.log('User metadata:', session?.user?.user_metadata);
  
  if (session?.user?.id) {
    // Check user_profiles table
    supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        console.log('User profile from DB:', data);
        console.log('User profile error:', error);
        
        if (!data) {
          console.log('❌ USER NOT FOUND IN user_profiles TABLE!');
          console.log('Run this SQL to fix:');
          console.log(`INSERT INTO user_profiles (id, role, full_name, email) VALUES ('${session.user.id}', 'admin', 'Admin User', '${session.user.email}');`);
        } else if (data.role !== 'admin') {
          console.log('❌ USER ROLE IS NOT ADMIN!');
          console.log('Current role:', data.role);
          console.log('Run this SQL to fix:');
          console.log(`UPDATE user_profiles SET role = 'admin' WHERE id = '${session.user.id}';`);
        } else {
          console.log('✅ User profile looks correct!');
        }
      });
  }
});

console.log('=== END DEBUG ==='); 