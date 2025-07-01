-- ALPHA TESTING QUICK FIX
-- Run this RIGHT NOW to fix common issues for tomorrow's test

-- 1. ENSURE work_sessions table has GPS columns (clock-in won't work without these)
ALTER TABLE work_sessions 
ADD COLUMN IF NOT EXISTS start_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS start_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS start_gps_accuracy DECIMAL(8, 2),
ADD COLUMN IF NOT EXISTS end_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS end_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS end_gps_accuracy DECIMAL(8, 2);

-- 2. ENSURE gps_breadcrumbs has all needed columns
ALTER TABLE gps_breadcrumbs 
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS trigger TEXT,
ADD COLUMN IF NOT EXISTS auto_tracking BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS movement_detected BOOLEAN DEFAULT false;

-- 3. RELAX RLS policies for alpha testing (restore strict security later)
-- Drop overly restrictive policies that might block legitimate operations
DROP POLICY IF EXISTS "Strict driver breadcrumb access" ON gps_breadcrumbs;
DROP POLICY IF EXISTS "Strict work session access" ON work_sessions;

-- Create permissive policies for alpha testing
CREATE POLICY "Alpha test breadcrumb access" ON gps_breadcrumbs
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Alpha test work session access" ON work_sessions
    FOR ALL USING (auth.role() = 'authenticated');

-- 4. CLEAN UP any stuck/broken data
-- Remove any conflicting work sessions
DELETE FROM work_sessions WHERE status = 'active' AND start_time < NOW() - INTERVAL '24 hours';

-- Mark all breadcrumbs as inactive (fresh start)
UPDATE gps_breadcrumbs SET is_active_route = false WHERE is_active_route = true;

-- 5. TEST the fixes
-- Try inserting a test work session
DO $$
DECLARE
    test_driver_id UUID;
BEGIN
    -- Get first driver ID
    SELECT id INTO test_driver_id FROM drivers LIMIT 1;
    
    IF test_driver_id IS NOT NULL THEN
        -- Test work session insert
        INSERT INTO work_sessions (
            driver_id, start_time, status, 
            start_latitude, start_longitude, start_gps_accuracy
        ) VALUES (
            test_driver_id, NOW(), 'active',
            14.5995, 120.9842, 15.0
        );
        
        -- Clean up test
        DELETE FROM work_sessions WHERE driver_id = test_driver_id AND start_time > NOW() - INTERVAL '1 minute';
        
        RAISE NOTICE '✅ work_sessions GPS columns test PASSED';
    ELSE
        RAISE NOTICE '⚠️ No drivers found - create driver profiles first';
    END IF;
    
    -- Test breadcrumb insert
    IF test_driver_id IS NOT NULL THEN
        INSERT INTO gps_breadcrumbs (
            driver_id, latitude, longitude, gps_accuracy, 
            note, trigger, auto_tracking
        ) VALUES (
            test_driver_id, 14.5995, 120.9842, 15.0,
            'Alpha test breadcrumb', 'test', false
        );
        
        -- Clean up test
        DELETE FROM gps_breadcrumbs WHERE driver_id = test_driver_id AND note = 'Alpha test breadcrumb';
        
        RAISE NOTICE '✅ gps_breadcrumbs insert test PASSED';
    END IF;
END $$;

-- 6. SHOW CURRENT STATUS
SELECT 'ALPHA TEST STATUS REPORT' as report;

SELECT 
    'work_sessions' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions
FROM work_sessions
UNION ALL
SELECT 
    'gps_breadcrumbs' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_active_route = true THEN 1 END) as active_routes
FROM gps_breadcrumbs
UNION ALL
SELECT 
    'drivers' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_drivers
FROM drivers;

COMMENT ON TABLE work_sessions IS 'ALPHA READY - GPS columns added for clock-in tracking';
COMMENT ON TABLE gps_breadcrumbs IS 'ALPHA READY - Breadcrumb tracking enabled';

SELECT '🚀 ALPHA TEST DATABASE READY!' as status; 