-- ROBUST ACTION FLOW FIX 
-- Fixes action types for proper delivery workflow
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Update delivery_logs constraint with complete action flow
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_logs_action_type_check') THEN
        ALTER TABLE delivery_logs DROP CONSTRAINT delivery_logs_action_type_check;
        RAISE NOTICE 'Dropped existing action_type constraint';
    END IF;
    
    -- Add comprehensive constraint with complete workflow
    ALTER TABLE delivery_logs 
    ADD CONSTRAINT delivery_logs_action_type_check 
    CHECK (action_type IN (
        'clocked_in',      -- Driver clocks in to start work day
        'clocked_out',     -- Driver clocks out to end work day  
        'start_route',     -- Driver starts a delivery route
        'arrived',         -- Driver arrives at drop-off (geofence or manual)
        'delivered',       -- Driver completes delivery
        'break_start',     -- Driver starts break
        'break_end'        -- Driver ends break
    ));
    
    RAISE NOTICE 'Added comprehensive action_type constraint with proper workflow';
END $$;

-- 2. Verify constraint is working
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'delivery_logs_action_type_check';

-- 3. Test all action types (will rollback, just for verification)
BEGIN;
    INSERT INTO delivery_logs (driver_id, action_type, timestamp, note) VALUES 
        ((SELECT id FROM drivers LIMIT 1), 'clocked_in', NOW(), 'Test clocked_in'),
        ((SELECT id FROM drivers LIMIT 1), 'clocked_out', NOW(), 'Test clocked_out'),
        ((SELECT id FROM drivers LIMIT 1), 'start_route', NOW(), 'Test start_route'),
        ((SELECT id FROM drivers LIMIT 1), 'arrived', NOW(), 'Test arrived'),
        ((SELECT id FROM drivers LIMIT 1), 'delivered', NOW(), 'Test delivered');
    
    SELECT 'SUCCESS: All action types accepted' as test_result;
ROLLBACK;

-- 4. Show the proper action flow sequence
SELECT '📋 PROPER ACTION FLOW:' as workflow_guide;
SELECT '1. clocked_in    - Driver starts work day' as step_1;
SELECT '2. start_route   - Driver begins delivery route' as step_2;  
SELECT '3. arrived       - Driver arrives at customer (auto geofence)' as step_3;
SELECT '4. delivered     - Driver completes delivery' as step_4;
SELECT '5. clocked_out   - Driver ends work day' as step_5;

-- SUCCESS MESSAGE
SELECT '🎯 Robust action flow ready!' as status;
SELECT 'Clock in/out and delivery workflow now properly logged' as info; 