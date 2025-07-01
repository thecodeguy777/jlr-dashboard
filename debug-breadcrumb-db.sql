-- Debug SQL script for GPS breadcrumb tracking
-- Run these queries in your Supabase SQL editor

-- 1. Check if tables exist
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename IN ('drivers', 'gps_breadcrumbs', 'delivery_logs', 'clients')
ORDER BY tablename;

-- 2. Check table structures
\d drivers;
\d gps_breadcrumbs;
\d delivery_logs;

-- 3. Count records in each table
SELECT 
  'drivers' as table_name,
  COUNT(*) as row_count
FROM drivers
UNION ALL
SELECT 
  'gps_breadcrumbs' as table_name,
  COUNT(*) as row_count
FROM gps_breadcrumbs
UNION ALL
SELECT 
  'delivery_logs' as table_name,
  COUNT(*) as row_count
FROM delivery_logs
UNION ALL
SELECT 
  'clients' as table_name,
  COUNT(*) as row_count
FROM clients;

-- 4. Check recent delivery logs (routes started)
SELECT 
  d.name as driver_name,
  dl.action_type,
  dl.timestamp,
  dl.latitude,
  dl.longitude,
  dl.gps_accuracy,
  dl.note
FROM delivery_logs dl
LEFT JOIN drivers d ON dl.driver_id = d.id
ORDER BY dl.timestamp DESC
LIMIT 10;

-- 5. Check recent breadcrumbs
SELECT 
  d.name as driver_name,
  gb.timestamp,
  gb.latitude,
  gb.longitude,
  gb.speed_kmh,
  gb.is_active_route,
  gb.synced
FROM gps_breadcrumbs gb
LEFT JOIN drivers d ON gb.driver_id = d.id
ORDER BY gb.timestamp DESC
LIMIT 10;

-- 6. Check for active routes (should trigger breadcrumb tracking)
SELECT 
  d.name as driver_name,
  COUNT(gb.id) as active_breadcrumbs,
  MAX(gb.timestamp) as last_breadcrumb,
  EXTRACT(EPOCH FROM (NOW() - MAX(gb.timestamp)))/60 as minutes_since_last
FROM drivers d
LEFT JOIN gps_breadcrumbs gb ON d.id = gb.driver_id AND gb.is_active_route = true
WHERE d.is_active = true
GROUP BY d.id, d.name
HAVING COUNT(gb.id) > 0
ORDER BY last_breadcrumb DESC;

-- 7. Check RLS policies on gps_breadcrumbs
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'gps_breadcrumbs';

-- 8. Insert a test breadcrumb (if you have drivers)
-- Uncomment and run this if needed:
/*
INSERT INTO gps_breadcrumbs (
  driver_id,
  timestamp,
  latitude,
  longitude,
  gps_accuracy,
  speed_kmh,
  distance_from_last,
  battery_level,
  signal_status,
  is_active_route,
  synced
)
SELECT 
  id as driver_id,
  NOW() as timestamp,
  14.5995 as latitude,
  120.9842 as longitude,
  15.0 as gps_accuracy,
  25.0 as speed_kmh,
  50.0 as distance_from_last,
  85 as battery_level,
  'good' as signal_status,
  true as is_active_route,
  true as synced
FROM drivers 
LIMIT 1;
*/

-- 9. Check constraint on delivery_logs action_type
SELECT 
  conname,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'delivery_logs'::regclass
  AND conname LIKE '%action_type%';

-- 10. Create a simple driver if none exist (uncomment if needed)
/*
INSERT INTO drivers (name, phone, is_active) 
VALUES ('Test Driver', '+1234567890', true)
ON CONFLICT DO NOTHING;
*/ 