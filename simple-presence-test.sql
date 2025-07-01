-- Simple Presence Test (skip policy creation since they exist)

-- Test with Lacay's driver ID (the one showing offline)
SELECT upsert_driver_presence('c574a833-6b65-46d3-b82f-281b2ae5c50d', true, 'web');

-- Test with Admin Testing Driver ID  
SELECT upsert_driver_presence('6824387d-0743-4a2e-b192-02071885ae11', true, 'web');

-- Check what got inserted/updated
SELECT 
    dp.id,
    d.name as driver_name,
    dp.is_online,
    dp.last_seen,
    dp.device_id,
    dp.created_at,
    dp.updated_at
FROM driver_presence dp
JOIN drivers d ON dp.driver_id = d.id
ORDER BY dp.last_seen DESC;

-- Check if there are any presence records at all
SELECT COUNT(*) as total_records FROM driver_presence; 