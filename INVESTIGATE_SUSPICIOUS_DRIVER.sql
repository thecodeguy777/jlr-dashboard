-- URGENT: Investigate Suspicious Driver Activity
-- Replace 'DRIVER_NAME' with the actual driver's name

-- 1. Get the driver's recent breadcrumbs (last 2 hours)
SELECT 
    timestamp,
    latitude,
    longitude,
    gps_accuracy,
    speed_kmh,
    distance_from_last,
    auto_tracking,
    movement_detected,
    synced,
    created_at
FROM gps_breadcrumbs gb
JOIN drivers d ON gb.driver_id = d.id
WHERE d.name = 'DRIVER_NAME'  -- Replace with actual name
  AND timestamp > NOW() - INTERVAL '2 hours'
ORDER BY timestamp DESC;

-- 2. Check for GPS spoofing indicators
SELECT 
    'GPS Spoofing Check' as check_type,
    COUNT(*) as total_breadcrumbs,
    COUNT(CASE WHEN gps_accuracy < 5 THEN 1 END) as suspicious_accuracy,
    COUNT(CASE WHEN speed_kmh > 100 THEN 1 END) as unrealistic_speed,
    AVG(gps_accuracy) as avg_accuracy,
    MAX(speed_kmh) as max_speed
FROM gps_breadcrumbs gb
JOIN drivers d ON gb.driver_id = d.id
WHERE d.name = 'DRIVER_NAME'
  AND timestamp > NOW() - INTERVAL '2 hours';

-- 3. Check delivery logs vs breadcrumbs timeline
SELECT 
    'Timeline Comparison' as event_type,
    timestamp,
    latitude,
    longitude,
    'delivery_log' as source,
    action_type,
    note
FROM delivery_logs dl
JOIN drivers d ON dl.driver_id = d.id
WHERE d.name = 'DRIVER_NAME'
  AND timestamp > NOW() - INTERVAL '2 hours'

UNION ALL

SELECT 
    'Timeline Comparison' as event_type,
    timestamp,
    latitude,
    longitude,
    'breadcrumb' as source,
    'gps_tracking' as action_type,
    CASE 
        WHEN movement_detected THEN 'Moving'
        ELSE 'Stationary'
    END as note
FROM gps_breadcrumbs gb
JOIN drivers d ON gb.driver_id = d.id
WHERE d.name = 'DRIVER_NAME'
  AND timestamp > NOW() - INTERVAL '2 hours'
ORDER BY timestamp DESC;

-- 4. Check for suspicious patterns
SELECT 
    'Suspicious Pattern Analysis' as analysis,
    COUNT(CASE WHEN distance_from_last > 1000 THEN 1 END) as location_jumps,
    COUNT(CASE WHEN speed_kmh = 0 AND distance_from_last > 100 THEN 1 END) as teleportation,
    COUNT(CASE WHEN gps_accuracy BETWEEN 1 AND 3 THEN 1 END) as perfect_gps,
    COUNT(CASE WHEN 
        LAG(latitude) OVER (ORDER BY timestamp) = latitude AND 
        LAG(longitude) OVER (ORDER BY timestamp) = longitude 
    THEN 1 END) as duplicate_locations
FROM gps_breadcrumbs gb
JOIN drivers d ON gb.driver_id = d.id
WHERE d.name = 'DRIVER_NAME'
  AND timestamp > NOW() - INTERVAL '2 hours';

-- 5. Check work session and sync status
SELECT 
    ws.start_time,
    ws.end_time,
    ws.status,
    ws.start_latitude,
    ws.start_longitude,
    'Work Session' as data_type
FROM work_sessions ws
JOIN drivers d ON ws.driver_id = d.id
WHERE d.name = 'DRIVER_NAME'
  AND start_time > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    created_at as start_time,
    synced_at as end_time,
    CASE WHEN synced THEN 'synced' ELSE 'pending' END as status,
    NULL as start_latitude,
    NULL as start_longitude,
    'Sync Queue' as data_type
FROM sync_queue sq
JOIN drivers d ON sq.driver_id = d.id
WHERE d.name = 'DRIVER_NAME'
  AND created_at > NOW() - INTERVAL '2 hours'
ORDER BY start_time DESC; 