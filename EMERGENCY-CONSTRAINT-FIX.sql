-- EMERGENCY CONSTRAINT FIX
-- Run this immediately in Supabase Dashboard → SQL Editor

-- 1. Force drop the constraint (ignore errors if it doesn't exist)
ALTER TABLE delivery_logs DROP CONSTRAINT IF EXISTS delivery_logs_action_type_check;

-- 2. Show current action types in the table
SELECT 'Current action types in database:' as info;
SELECT DISTINCT action_type, COUNT(*) 
FROM delivery_logs 
GROUP BY action_type 
ORDER BY action_type;

-- 3. Add the new constraint with ALL required action types
ALTER TABLE delivery_logs 
ADD CONSTRAINT delivery_logs_action_type_check 
CHECK (action_type IN (
    'clocked_in',
    'clocked_out', 
    'start_route',
    'arrived',
    'delivered',
    'break_start',
    'break_end'
));

-- 4. Test the constraint works
INSERT INTO delivery_logs (
    driver_id, 
    action_type, 
    timestamp, 
    note
) VALUES (
    (SELECT id FROM drivers LIMIT 1),
    'clocked_out',
    NOW(),
    'Test clocked_out - will be deleted'
);

-- Delete the test row
DELETE FROM delivery_logs WHERE note = 'Test clocked_out - will be deleted';

-- 5. Verify success
SELECT 'SUCCESS: clocked_out action type now works!' as result;
SELECT 'All action types now allowed:' as info;
SELECT unnest(ARRAY['clocked_in', 'clocked_out', 'start_route', 'arrived', 'delivered', 'break_start', 'break_end']) as allowed_action_types; 