// 🔍 Driver Login Debug Script
// Paste this in browser console after login attempt

console.log('=== DRIVER LOGIN DEBUG ===');

// Check current user and role
const userStore = useUserStore();
console.log('🔐 Current user:', userStore.user);
console.log('👤 Current role:', userStore.role);
console.log('📧 User email:', userStore.user?.email);
console.log('🆔 User ID:', userStore.user?.id);

// Check if user profile exists in database
if (userStore.user?.id) {
  supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userStore.user.id)
    .single()
    .then(({ data, error }) => {
      console.log('👤 User profile from DB:', data);
      console.log('❌ Profile error:', error);
      
      if (!data) {
        console.log('🚨 ISSUE: User profile not found in database!');
        console.log('💡 FIX: Run this SQL:');
        console.log(`INSERT INTO user_profiles (id, role, full_name, email) VALUES ('${userStore.user.id}', 'driver', 'Driver Name', '${userStore.user.email}');`);
      } else if (data.role !== 'driver') {
        console.log('🚨 ISSUE: User role is not "driver"!');
        console.log('💡 Current role:', data.role);
        console.log('💡 FIX: Run this SQL:');
        console.log(`UPDATE user_profiles SET role = 'driver' WHERE id = '${userStore.user.id}';`);
      } else {
        console.log('✅ User profile looks correct!');
        
        // Check if driver profile exists
        supabase
          .from('drivers')
          .select('*')
          .eq('user_id', userStore.user.id)
          .single()
          .then(({ data: driverData, error: driverError }) => {
            console.log('🚛 Driver profile:', driverData);
            console.log('❌ Driver error:', driverError);
            
            if (!driverData) {
              console.log('🚨 ISSUE: Driver profile not found!');
              console.log('💡 FIX: Run this SQL:');
              console.log(`INSERT INTO drivers (user_id, name, phone, is_active) VALUES ('${userStore.user.id}', '${data.full_name}', '+1234567890', true);`);
            } else {
              console.log('✅ Driver profile exists!');
              console.log('🎯 Everything should work now. Try accessing /driver again.');
            }
          });
      }
    });
} else {
  console.log('🚨 ISSUE: No authenticated user found!');
  console.log('💡 FIX: Make sure you are logged in first.');
}

// Check router guard logs
console.log('🛣️ Check the router guard logs above for "🚨 Access denied" messages');

console.log('=== END DEBUG ==='); 