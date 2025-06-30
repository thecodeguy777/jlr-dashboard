# GPS Breadcrumb Tracking Troubleshooting Guide

## Overview
GPS breadcrumbs are only tracked when a driver **starts a route** and are recorded every 30 seconds while the route is active.

## Common Issues and Solutions

### 1. No Breadcrumbs Being Recorded

**Possible Causes:**
- No driver profiles in the system
- Driver hasn't started a route
- GPS permissions not granted
- Poor GPS accuracy (>100m)
- User not authenticated properly
- RLS (Row Level Security) blocking access

**Solutions:**
1. **Check if drivers exist:**
   ```sql
   SELECT * FROM drivers;
   ```

2. **Create a driver profile if needed:**
   ```sql
   INSERT INTO drivers (user_id, name, phone, is_active) 
   VALUES (auth.uid(), 'Your Name', '+1234567890', true);
   ```

3. **Check if routes have been started:**
   ```sql
   SELECT * FROM delivery_logs WHERE action_type = 'start_route' ORDER BY timestamp DESC;
   ```

4. **Test GPS permissions:**
   - Go to Driver Dashboard (`/driver-dashboard`)
   - Click "Allow GPS" when prompted
   - Check browser location permissions

### 2. Routes Started But No Breadcrumbs

**Debugging Steps:**

1. **Run the debug script:**
   - Open browser console on Driver Tracking page
   - Paste the contents of `debug-breadcrumb-tracking.js`
   - Check the output for specific issues

2. **Check GPS accuracy:**
   - Breadcrumbs are only recorded if GPS accuracy ≤ 100m
   - Try testing outdoors for better GPS signal

3. **Check active routes:**
   ```sql
   SELECT COUNT(*) FROM gps_breadcrumbs WHERE is_active_route = true;
   ```

### 3. Permission/Authentication Issues

**Symptoms:**
- "RLS Policy blocking read access" errors
- Empty results when querying breadcrumbs

**Solutions:**
1. **Ensure user is logged in:**
   - Check authentication status
   - Login with a valid account

2. **Verify user has driver profile:**
   ```sql
   SELECT d.* FROM drivers d 
   JOIN auth.users u ON d.user_id = u.id 
   WHERE u.email = 'your-email@example.com';
   ```

3. **Check RLS policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'gps_breadcrumbs';
   ```

### 4. Database Setup Issues

**Check if tables exist:**
```sql
SELECT tablename FROM pg_tables 
WHERE tablename IN ('drivers', 'gps_breadcrumbs', 'delivery_logs', 'clients');
```

**Run migration if needed:**
- Execute `DRIVER_SCHEMA.sql` in Supabase SQL editor
- Or run `DRIVER_MIGRATION.sql` for existing setups

### 5. Testing the System

**Manual Test Process:**

1. **Create a test driver (if needed):**
   ```sql
   INSERT INTO drivers (name, phone, is_active) 
   VALUES ('Test Driver', '+1234567890', true);
   ```

2. **Insert a test breadcrumb:**
   ```sql
   INSERT INTO gps_breadcrumbs (
     driver_id,
     latitude,
     longitude,
     gps_accuracy,
     is_active_route
   ) SELECT 
     id,
     14.5995,
     120.9842,
     15.0,
     true
   FROM drivers LIMIT 1;
   ```

3. **Verify insertion:**
   ```sql
   SELECT * FROM gps_breadcrumbs ORDER BY timestamp DESC LIMIT 5;
   ```

## Step-by-Step Testing Guide

### For Developers:

1. **Open Driver Tracking page** (`/driver-tracking`)
2. **Open browser console** (F12)
3. **Paste and run** the `debug-breadcrumb-tracking.js` script
4. **Follow the recommendations** in the console output

### For Drivers:

1. **Go to Driver Dashboard** (`/driver-dashboard`)
2. **Allow GPS permissions** when prompted
3. **Click "Start Route"** button
4. **Wait outdoors** for good GPS signal (accuracy ≤ 50m recommended)
5. **Check Driver Tracking page** after a few minutes

## Common Error Messages

### "GPS location required for delivery actions"
- Enable location permissions in browser
- Try refreshing the page
- Test outdoors for better GPS signal

### "GPS accuracy too low: XXXm"
- Move to an open area (outdoors)
- Wait for GPS signal to improve
- Check device location settings

### "No drivers found for test insertion"
- Create driver profiles first
- Ensure user_id is properly linked to auth.users

### "RLS Policy blocking read access"
- User needs to be authenticated
- User needs proper role (driver/admin)
- Check RLS policies in database

## Monitoring Active Tracking

Check if breadcrumb tracking is currently active:

```sql
-- Check active routes
SELECT 
  d.name,
  COUNT(gb.id) as active_breadcrumbs,
  MAX(gb.timestamp) as last_breadcrumb
FROM drivers d
LEFT JOIN gps_breadcrumbs gb ON d.id = gb.driver_id AND gb.is_active_route = true
GROUP BY d.id, d.name
HAVING COUNT(gb.id) > 0;
```

## Manual Route Ending

If routes get stuck "active", manually end them:

```sql
-- End all active routes
UPDATE gps_breadcrumbs SET is_active_route = false WHERE is_active_route = true;

-- Add end_route logs
INSERT INTO delivery_logs (driver_id, action_type, timestamp, note)
SELECT driver_id, 'end_route', NOW(), 'Manually ended route'
FROM gps_breadcrumbs 
WHERE is_active_route = false
GROUP BY driver_id;
```

## Quick Fixes

### Reset Everything:
```sql
-- Clear all breadcrumbs (careful!)
DELETE FROM gps_breadcrumbs;

-- Clear all delivery logs (careful!)
DELETE FROM delivery_logs;
```

### Create Sample Data:
```sql
-- Create test driver
INSERT INTO drivers (name, phone, is_active) 
VALUES ('Test Driver', '+1234567890', true);

-- Create test client
INSERT INTO clients (name, address, location_lat, location_lng)
VALUES ('Test Client', '123 Test St', 14.5995, 120.9842);
```

## Contact/Support

If issues persist:
1. Run the debug scripts first
2. Check browser console for JavaScript errors
3. Verify Supabase connection and permissions
4. Test with a simple manual breadcrumb insertion 