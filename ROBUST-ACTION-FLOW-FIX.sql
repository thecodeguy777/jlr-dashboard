-- ROBUST ACTION FLOW FIX 
-- Fixes action types for proper delivery workflow
-- Run this in Supabase Dashboard → SQL Editor

-- 1. First, check what action types currently exist
SELECT 
    action_type,
    COUNT(*) as count
FROM delivery_logs 
GROUP BY action_type
ORDER BY count DESC;

-- 2. Update existing rows to match new action types
UPDATE delivery_logs 
SET action_type = CASE
    WHEN action_type = 'start_route' AND note LIKE '%clocked in%' THEN 'clocked_in'
    WHEN action_type = 'start_route' AND note LIKE '%work session started%' THEN 'clocked_in'
    WHEN action_type = 'end_route' AND note LIKE '%clocked out%' THEN 'clocked_out'
    WHEN action_type = 'end_route' AND note LIKE '%work session completed%' THEN 'clocked_out'
    ELSE action_type
END
WHERE action_type IN ('start_route', 'end_route') 
  AND (note LIKE '%clocked%' OR note LIKE '%work session%');

-- 3. Show what we updated
SELECT 'Data migration completed' as status;
SELECT 
    action_type,
    COUNT(*) as count
FROM delivery_logs 
GROUP BY action_type
ORDER BY count DESC;

-- 4. Drop existing constraint if it exists
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_logs_action_type_check') THEN
        ALTER TABLE delivery_logs DROP CONSTRAINT delivery_logs_action_type_check;
        RAISE NOTICE 'Dropped existing action_type constraint';
    END IF;
END $$;

-- 5. Check for any remaining invalid action types
SELECT 
    action_type,
    COUNT(*) as count,
    'INVALID - Will cause constraint violation' as warning
FROM delivery_logs 
WHERE action_type NOT IN (
    'clocked_in', 'clocked_out', 'start_route', 
    'arrived', 'delivered', 'break_start', 'break_end'
)
GROUP BY action_type;

-- 6. If any invalid types found, update them
UPDATE delivery_logs 
SET action_type = 'delivered'  -- Default fallback
WHERE action_type NOT IN (
    'clocked_in', 'clocked_out', 'start_route', 
    'arrived', 'delivered', 'break_start', 'break_end'
);

-- 7. Now add the constraint (should work without violations)
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

-- 8. Verify constraint is working
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'delivery_logs_action_type_check';

-- 9. Show final action type distribution
SELECT 
    action_type,
    COUNT(*) as count,
    'VALID' as status
FROM delivery_logs 
GROUP BY action_type
ORDER BY count DESC;

-- 10. Show the proper action flow sequence
SELECT '📋 PROPER ACTION FLOW:' as workflow_guide;
SELECT '1. clocked_in    - Driver starts work day' as step_1;
SELECT '2. start_route   - Driver begins delivery route' as step_2;  
SELECT '3. arrived       - Driver arrives at customer (auto geofence)' as step_3;
SELECT '4. delivered     - Driver completes delivery' as step_4;
SELECT '5. clocked_out   - Driver ends work day' as step_5;

-- SUCCESS MESSAGE
SELECT '🎯 Robust action flow ready with data migration!' as status;
SELECT 'Existing data updated and new constraint applied successfully' as info; 