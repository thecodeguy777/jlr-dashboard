-- Add 'driver' role to user_profiles check constraint
-- Run this in Supabase SQL Editor to fix the role constraint

-- First, let's see the current constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'user_profiles'::regclass 
AND contype = 'c';

-- Drop the existing role check constraint
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Add the new constraint with 'driver' role included
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'employee_admin', 'employee', 'executive', 'driver', 'guest'));

-- Verify the new constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'user_profiles'::regclass 
AND contype = 'c';

-- Now you can insert driver users
-- Example:
-- INSERT INTO user_profiles (id, role, full_name) 
-- VALUES ('bcc6719c-8184-4786-bcc4-79ca6b072e68', 'driver', 'Lacay');

-- Also add driver profile
-- INSERT INTO drivers (user_id, name, phone) 
-- VALUES ('bcc6719c-8184-4786-bcc4-79ca6b072e68', 'Lacay', '+1234567890'); 