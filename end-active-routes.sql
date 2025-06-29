-- Script to manually end any currently active routes
-- Use this if drivers are stuck with active routes and GPS is still tracking

-- 1. Check current active routes
SELECT 
  d.name as driver_name,
  d.phone,
  COUNT(gb.id) as active_breadcrumbs,
  MAX(gb.timestamp) as last_breadcrumb,
  EXTRACT(EPOCH FROM (NOW() - MAX(gb.timestamp)))/60 as minutes_since_last
FROM drivers d
LEFT JOIN gps_breadcrumbs gb ON d.id = gb.driver_id AND gb.is_active_route = true
WHERE d.is_active = true
GROUP BY d.id, d.name, d.phone
HAVING COUNT(gb.id) > 0
ORDER BY last_breadcrumb DESC;

-- 2. Manually end active routes (stops GPS tracking)
-- Update all active breadcrumbs to inactive
UPDATE gps_breadcrumbs 
SET is_active_route = false 
WHERE is_active_route = true;

-- 3. Insert "End Route" log entries for any drivers with recent activity
-- (Only for drivers who had breadcrumbs in the last 4 hours)
INSERT INTO delivery_logs (
  driver_id,
  action_type,
  timestamp,
  latitude,
  longitude,
  gps_accuracy,
  note,
  synced,
  battery_level,
  signal_status
)
SELECT 
  latest_breadcrumbs.driver_id,
  'end_route' as action_type,
  NOW() as timestamp,
  latest_breadcrumbs.latitude,
  latest_breadcrumbs.longitude,
  latest_breadcrumbs.gps_accuracy,
  'Route ended manually - Admin action' as note,
  true as synced,
  latest_breadcrumbs.battery_level,
  latest_breadcrumbs.signal_status
FROM (
  SELECT DISTINCT ON (gb.driver_id)
    gb.driver_id,
    gb.latitude,
    gb.longitude,
    gb.gps_accuracy,
    gb.battery_level,
    gb.signal_status,
    gb.timestamp
  FROM gps_breadcrumbs gb
  WHERE gb.timestamp > NOW() - INTERVAL '4 hours'
    AND gb.driver_id NOT IN (
      -- Don't insert if driver already has an end_route log today
      SELECT driver_id 
      FROM delivery_logs 
      WHERE action_type = 'end_route' 
        AND DATE(timestamp) = CURRENT_DATE
    )
  ORDER BY gb.driver_id, gb.timestamp DESC
) latest_breadcrumbs;

-- 4. Verify the changes
SELECT 
  d.name as driver_name,
  dl.action_type,
  dl.timestamp,
  dl.note
FROM delivery_logs dl
JOIN drivers d ON dl.driver_id = d.id
WHERE dl.action_type = 'end_route'
  AND DATE(dl.timestamp) = CURRENT_DATE
ORDER BY dl.timestamp DESC;

-- 5. Check that no more active breadcrumbs exist
SELECT COUNT(*) as remaining_active_breadcrumbs
FROM gps_breadcrumbs 
WHERE is_active_route = true; 