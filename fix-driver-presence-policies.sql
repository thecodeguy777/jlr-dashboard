-- Fix Driver Presence System - Complete Reset and Repair
-- This will solve the unique constraint violation issues

-- 1. Drop and recreate the driver_presence table to fix constraint issues
DROP TABLE IF EXISTS driver_presence CASCADE;

-- 2. Create clean driver_presence table with proper structure
CREATE TABLE driver_presence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
    device_id TEXT DEFAULT 'web',
    -- GPS coordinates for live tracking
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    gps_accuracy DECIMAL(8, 2),
    battery_level INTEGER,
    signal_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- FIXED: Make constraint work properly with upsert
    UNIQUE(driver_id, device_id)
);

-- 3. Create performance indexes
CREATE INDEX idx_driver_presence_driver_id ON driver_presence(driver_id);
CREATE INDEX idx_driver_presence_is_online ON driver_presence(is_online);
CREATE INDEX idx_driver_presence_last_seen ON driver_presence(last_seen DESC);
CREATE INDEX idx_driver_presence_location ON driver_presence(location_lat, location_lng) 
WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;

-- 4. Auto-update trigger function
CREATE OR REPLACE FUNCTION update_driver_presence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger
CREATE TRIGGER trigger_update_driver_presence_updated_at
    BEFORE UPDATE ON driver_presence
    FOR EACH ROW
    EXECUTE FUNCTION update_driver_presence_updated_at();

-- 6. Enable RLS with simple policies
ALTER TABLE driver_presence ENABLE ROW LEVEL SECURITY;

-- Simple policy that allows authenticated users full access
CREATE POLICY "Allow authenticated users full access" ON driver_presence
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 7. Create PROPER upsert function that handles conflicts correctly
CREATE OR REPLACE FUNCTION upsert_driver_presence(
    p_driver_id UUID,
    p_is_online BOOLEAN DEFAULT true,
    p_device_id TEXT DEFAULT 'web',
    p_location_lat DECIMAL DEFAULT NULL,
    p_location_lng DECIMAL DEFAULT NULL,
    p_gps_accuracy DECIMAL DEFAULT NULL,
    p_battery_level INTEGER DEFAULT NULL,
    p_signal_status TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO driver_presence (
        driver_id, 
        is_online, 
        last_seen, 
        device_id, 
        location_lat, 
        location_lng,
        gps_accuracy,
        battery_level,
        signal_status
    ) VALUES (
        p_driver_id, 
        p_is_online, 
        now(), 
        p_device_id, 
        p_location_lat, 
        p_location_lng,
        p_gps_accuracy,
        p_battery_level,
        p_signal_status
    )
    ON CONFLICT (driver_id, device_id)
    DO UPDATE SET
        is_online = p_is_online,
        last_seen = now(),
        location_lat = COALESCE(p_location_lat, driver_presence.location_lat),
        location_lng = COALESCE(p_location_lng, driver_presence.location_lng),
        gps_accuracy = COALESCE(p_gps_accuracy, driver_presence.gps_accuracy),
        battery_level = COALESCE(p_battery_level, driver_presence.battery_level),
        signal_status = COALESCE(p_signal_status, driver_presence.signal_status),
        updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- 8. Grant proper permissions
GRANT ALL ON driver_presence TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_driver_presence TO authenticated;

-- 9. Test the function immediately
DO $$
DECLARE
    test_driver_id UUID;
BEGIN
    -- Get first available driver
    SELECT id INTO test_driver_id FROM drivers LIMIT 1;
    
    IF test_driver_id IS NOT NULL THEN
        RAISE NOTICE 'Testing upsert function with driver: %', test_driver_id;
        
        -- Test the function
        PERFORM upsert_driver_presence(
            test_driver_id, 
            true, 
            'web', 
            40.7128, 
            -74.0060, 
            15.5,
            85,
            'good'
        );
        
        RAISE NOTICE 'Upsert test successful!';
        
        -- Verify the record
        IF EXISTS (SELECT 1 FROM driver_presence WHERE driver_id = test_driver_id) THEN
            RAISE NOTICE 'Verification: Record exists in database';
        ELSE
            RAISE WARNING 'Verification: Record NOT found after upsert';
        END IF;
    ELSE
        RAISE NOTICE 'No drivers found for testing';
    END IF;
END $$;

-- 10. Show final status
SELECT 'Driver presence system fixed!' as status;
SELECT COUNT(*) as total_records FROM driver_presence;

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