-- Add 'end_route' to the allowed action types in delivery_logs table

-- 1. First, check current constraint
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'delivery_logs_action_type_check';

-- 2. Drop the existing check constraint
ALTER TABLE delivery_logs 
DROP CONSTRAINT IF EXISTS delivery_logs_action_type_check;

-- 3. Add the updated constraint with 'end_route' included
ALTER TABLE delivery_logs 
ADD CONSTRAINT delivery_logs_action_type_check 
CHECK (action_type IN ('start_route', 'arrived', 'delivered', 'end_route', 'break_start', 'break_end'));

-- 4. Verify the new constraint
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'delivery_logs_action_type_check';

-- 5. Test inserting an end_route action (optional test)
-- This should now work without errors
/*
INSERT INTO delivery_logs (
  driver_id, 
  action_type, 
  timestamp, 
  latitude, 
  longitude, 
  gps_accuracy, 
  note, 
  synced
) VALUES (
  (SELECT id FROM drivers LIMIT 1),
  'end_route',
  NOW(),
  0.0,
  0.0,
  10.0,
  'Test end route action',
  true
);
*/ 