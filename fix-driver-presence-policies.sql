-- Fix Driver Presence Policies
-- The current policies are blocking the driver presence updates

-- First, let's check what tables we actually have
-- Run this to see your user/role structure:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%user%';

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Drivers can view their own presence" ON driver_presence;
DROP POLICY IF EXISTS "Drivers can update their own presence" ON driver_presence;
DROP POLICY IF EXISTS "Drivers can insert their own presence" ON driver_presence;
DROP POLICY IF EXISTS "Admins can view all driver presence" ON driver_presence;
DROP POLICY IF EXISTS "Admins can update all driver presence" ON driver_presence;

-- Create working policies that match your actual schema
-- First, let's make it simple and permissive to get it working

-- Allow all authenticated users to read driver presence
CREATE POLICY "Authenticated users can view driver presence" ON driver_presence
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert/update driver presence  
CREATE POLICY "Authenticated users can upsert driver presence" ON driver_presence
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update driver presence" ON driver_presence
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Once we get it working, we can make it more restrictive like:
-- CREATE POLICY "Drivers can manage own presence" ON driver_presence
--     FOR ALL USING (
--         driver_id IN (
--             SELECT id FROM drivers WHERE user_id = auth.uid()
--         )
--     );

-- Debug queries to help troubleshoot
-- 1. Check what tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%user%' OR table_name LIKE '%driver%';

-- 2. Check driver table structure  
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'drivers' AND table_schema = 'public';

-- 3. Check current driver records
SELECT id, name, user_id FROM drivers LIMIT 3;

-- 4. Test the upsert function (replace with real driver ID)
-- SELECT upsert_driver_presence('YOUR_DRIVER_ID_HERE', true, 'web');

-- 5. Verify the data is being inserted
SELECT * FROM driver_presence ORDER BY last_seen DESC LIMIT 5;

-- 6. Check current auth user (run this when logged in)
-- SELECT auth.uid(), auth.role(); 