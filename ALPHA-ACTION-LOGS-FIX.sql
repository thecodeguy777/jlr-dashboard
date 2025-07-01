-- ALPHA TEST ACTION LOGS FIX
-- Run this in Supabase Dashboard → SQL Editor TONIGHT

-- 1. Add missing action types to delivery_logs constraint
-- (This ensures clock-out actions work properly)
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_logs_action_type_check') THEN
        ALTER TABLE delivery_logs DROP CONSTRAINT delivery_logs_action_type_check;
        RAISE NOTICE 'Dropped existing action_type constraint';
    END IF;
    
    -- Add updated constraint with all needed action types
    ALTER TABLE delivery_logs 
    ADD CONSTRAINT delivery_logs_action_type_check 
    CHECK (action_type IN ('start_route', 'arrived', 'delivered', 'end_route', 'break_start', 'break_end'));
    
    RAISE NOTICE 'Added updated action_type constraint with end_route support';
END $$;

-- 2. Verify constraint is working
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'delivery_logs_action_type_check';

-- 3. Test insert (will rollback, just for verification)
BEGIN;
    INSERT INTO delivery_logs (
        driver_id, 
        action_type, 
        timestamp, 
        note
    ) VALUES (
        (SELECT id FROM drivers LIMIT 1),
        'end_route',
        NOW(),
        'Test end_route action - will be rolled back'
    );
    
    SELECT 'SUCCESS: end_route action type accepted' as test_result;
ROLLBACK;

-- 4. Show recent action logs to verify system is working
SELECT 
    d.name as driver_name,
    dl.action_type,
    dl.timestamp,
    dl.note,
    dl.latitude IS NOT NULL as has_gps,
    dl.synced
FROM delivery_logs dl
LEFT JOIN drivers d ON dl.driver_id = d.id
ORDER BY dl.timestamp DESC
LIMIT 10;

-- SUCCESS MESSAGE
SELECT '🎉 Action logging system ready for alpha test!' as status;
SELECT 'Drivers actions will now appear in admin Action Logs tab' as info; 