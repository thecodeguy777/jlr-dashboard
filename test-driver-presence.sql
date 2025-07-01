-- Test Driver Presence with Actual IDs
-- Based on your database query results

-- First, run the policy fixes
DROP POLICY IF EXISTS "Drivers can view their own presence" ON driver_presence;
DROP POLICY IF EXISTS "Drivers can update their own presence" ON driver_presence;
DROP POLICY IF EXISTS "Drivers can insert their own presence" ON driver_presence;
DROP POLICY IF EXISTS "Admins can view all driver presence" ON driver_presence;
DROP POLICY IF EXISTS "Admins can update all driver presence" ON driver_presence;

-- Create working policies
CREATE POLICY "Authenticated users can view driver presence" ON driver_presence
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upsert driver presence" ON driver_presence
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update driver presence" ON driver_presence
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Test with Lacay's driver ID (the one showing offline)
SELECT upsert_driver_presence('c574a833-6b65-46d3-b82f-281b2ae5c50d', true, 'web');

-- Test with Admin Testing Driver ID  
SELECT upsert_driver_presence('6824387d-0743-4a2e-b192-02071885ae11', true, 'web');

-- Check what got inserted
SELECT 
    dp.id,
    d.name as driver_name,
    dp.is_online,
    dp.last_seen,
    dp.device_id,
    dp.created_at
FROM driver_presence dp
JOIN drivers d ON dp.driver_id = d.id
ORDER BY dp.last_seen DESC;

-- Verify the drivers table has the right structure
SELECT id, name, user_id FROM drivers; 