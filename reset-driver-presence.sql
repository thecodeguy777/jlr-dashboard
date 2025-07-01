-- Reset Driver Presence System
-- This script completely drops and recreates the driver presence tracking

-- 1. Drop everything related to driver_presence
DROP TABLE IF EXISTS driver_presence CASCADE;
DROP FUNCTION IF EXISTS upsert_driver_presence(UUID, BOOLEAN, TEXT, DECIMAL, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS mark_inactive_drivers_offline() CASCADE;
DROP FUNCTION IF EXISTS update_driver_presence_updated_at() CASCADE;

-- 2. Recreate the table with a cleaner structure
CREATE TABLE driver_presence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
    device_id TEXT DEFAULT 'web',
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints
    UNIQUE(driver_id, device_id)
);

-- 3. Create indexes
CREATE INDEX idx_driver_presence_driver_id ON driver_presence(driver_id);
CREATE INDEX idx_driver_presence_is_online ON driver_presence(is_online);
CREATE INDEX idx_driver_presence_last_seen ON driver_presence(last_seen DESC);

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

-- 6. Enable RLS
ALTER TABLE driver_presence ENABLE ROW LEVEL SECURITY;

-- 7. Create simple, working policies (very permissive to start)
CREATE POLICY "Allow all authenticated users full access" ON driver_presence
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 8. Create the upsert function
CREATE OR REPLACE FUNCTION upsert_driver_presence(
    p_driver_id UUID,
    p_is_online BOOLEAN DEFAULT true,
    p_device_id TEXT DEFAULT 'web',
    p_location_lat DECIMAL DEFAULT NULL,
    p_location_lng DECIMAL DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO driver_presence (
        driver_id, 
        is_online, 
        last_seen, 
        device_id, 
        location_lat, 
        location_lng
    ) VALUES (
        p_driver_id, 
        p_is_online, 
        now(), 
        p_device_id, 
        p_location_lat, 
        p_location_lng
    )
    ON CONFLICT (driver_id, device_id)
    DO UPDATE SET
        is_online = p_is_online,
        last_seen = now(),
        location_lat = COALESCE(p_location_lat, driver_presence.location_lat),
        location_lng = COALESCE(p_location_lng, driver_presence.location_lng),
        updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- 9. Create cleanup function
CREATE OR REPLACE FUNCTION mark_inactive_drivers_offline()
RETURNS VOID AS $$
BEGIN
    UPDATE driver_presence 
    SET is_online = false, updated_at = now()
    WHERE is_online = true 
    AND last_seen < (now() - INTERVAL '5 minutes');
END;
$$ LANGUAGE plpgsql;

-- 10. Test queries to verify everything works
-- First, let's see what drivers exist
SELECT 'Available drivers:' as info;
SELECT id, name, user_id FROM drivers ORDER BY name;

-- Test the function with first available driver
DO $$
DECLARE
    test_driver_id UUID;
BEGIN
    SELECT id INTO test_driver_id FROM drivers LIMIT 1;
    
    IF test_driver_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with driver ID: %', test_driver_id;
        PERFORM upsert_driver_presence(test_driver_id, true, 'web');
        RAISE NOTICE 'Upsert successful!';
    ELSE
        RAISE NOTICE 'No drivers found for testing';
    END IF;
END $$;

-- Check the results
SELECT 'Current driver presence records:' as info;
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

-- Show table info
SELECT 'Table structure verification:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'driver_presence' 
ORDER BY ordinal_position;

-- Show policies
SELECT 'Active policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'driver_presence'; 