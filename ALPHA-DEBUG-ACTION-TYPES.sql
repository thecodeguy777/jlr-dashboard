-- Check what action_type values are allowed in delivery_logs table
-- This will help debug the 400 Bad Request errors

-- 1. Check the constraint definition for action_type
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'delivery_logs'::regclass 
  AND contype = 'c'
  AND pg_get_constraintdef(oid) LIKE '%action_type%';

-- 2. Show all existing action_type values in the table
SELECT 
    action_type,
    COUNT(*) as count,
    MAX(timestamp) as latest_use
FROM delivery_logs 
GROUP BY action_type 
ORDER BY count DESC;

-- 3. Test insert with a simple action_type
-- Try inserting with 'arrived' which should be valid
DO $$
DECLARE
    test_driver_id UUID;
BEGIN
    SELECT id INTO test_driver_id FROM drivers LIMIT 1;
    
    IF test_driver_id IS NOT NULL THEN
        -- Test with 'arrived' action type
        INSERT INTO delivery_logs (
            driver_id, 
            action_type, 
            timestamp,
            note
        ) VALUES (
            test_driver_id,
            'arrived',
            NOW(),
            'Test log entry'
        );
        
        -- Clean up
        DELETE FROM delivery_logs WHERE note = 'Test log entry';
        
        RAISE NOTICE '✅ Basic delivery_logs insert works with action_type=arrived';
    END IF;
END $$;

-- 4. Show table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'delivery_logs' 
ORDER BY ordinal_position; 