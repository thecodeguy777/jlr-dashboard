# Test Driver Presence Workflow 📊

## What I Fixed
- ✅ Added detailed logging to see what's happening
- ✅ Added page visibility/unload event handlers
- ✅ Better cleanup when drivers log out
- ✅ Proper driver ID change detection

## Testing Steps

### 1. **Login as Lacay (Driver)**
1. Open driver dashboard
2. Check browser console - you should see:
   ```
   🚀 DailyTasksView mounted, driver ID: c574a833-6b65-46d3-b82f-281b2ae5c50d
   🔄 Driver ID changed: { old: undefined, new: "c574a833-..." }
   👋 New driver logging in: c574a833-...
   🟢 Starting presence reporting for driver: c574a833-...
   📡 Updating driver presence for driver: c574a833-...
   ✅ Driver presence updated via function (or via direct upsert)
   ✅ Driver presence reporting started with 30s interval
   ```

### 2. **Check Task Manager**
1. Open task manager in another tab/window
2. Look for Lacay in the driver list
3. Should show "🟢 Online" next to his name
4. Should show "Last seen: Just now" or "1m ago"

### 3. **Test Logout/Close**
1. Close the driver dashboard tab
2. Wait 30-60 seconds
3. Refresh task manager
4. Lacay should show "🔴 Offline" with "Last seen: 2m ago"

### 4. **Test Page Background**
1. Open driver dashboard again as Lacay
2. Switch to another tab (don't close)
3. Wait 1 minute
4. Switch back to driver dashboard
5. Should see: `📱 Page visible - driver back online`

## Expected Database State

Run this query to verify presence is being recorded:
```sql
SELECT 
    d.name,
    dp.is_online,
    dp.last_seen,
    dp.device_id,
    EXTRACT(EPOCH FROM (now() - dp.last_seen))/60 as minutes_ago
FROM driver_presence dp
JOIN drivers d ON dp.driver_id = d.id
ORDER BY dp.last_seen DESC;
```

Should show:
- Lacay: `is_online = true`, `last_seen` within last minute
- Admin Testing Driver: depends on if logged in

## Troubleshooting

If presence not working:

1. **Check Console Logs** - Look for error messages
2. **Check Driver ID** - Make sure it's being detected
3. **Check Database** - Verify presence records are being created
4. **Check Policies** - Make sure the authenticated policies work

The key is the detailed logging - you'll now see exactly where it's failing! 🎯 