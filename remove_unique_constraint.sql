-- Remove unique constraint on driver_date to allow flexibility
-- Multiple route plans per driver per day should be allowed

-- Remove the restrictive unique constraint
ALTER TABLE daily_route_plans DROP CONSTRAINT IF EXISTS unique_driver_date;

-- Add a non-unique index for performance instead (allows duplicates)
CREATE INDEX IF NOT EXISTS idx_daily_route_plans_driver_date 
ON daily_route_plans(driver_id, plan_date);

-- Optional: Add a composite index for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_route_plans_status_date 
ON daily_route_plans(status, plan_date);

-- This allows:
-- ✅ Multiple route plans per driver per day
-- ✅ Morning routes + afternoon routes  
-- ✅ Primary plans + backup plans
-- ✅ Different route segments
-- ✅ Emergency task assignments
-- ✅ Flexible route management 