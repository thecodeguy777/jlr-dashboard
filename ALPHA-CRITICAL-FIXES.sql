-- ALPHA CRITICAL FIXES - Run this IMMEDIATELY
-- Fixes all major schema conflicts and database issues

-- =================================================================
-- 1. FIX ACTION TYPES FOR PROPER CLOCK IN/OUT LOGGING
-- =================================================================

-- Drop existing constraint
ALTER TABLE delivery_logs DROP CONSTRAINT IF EXISTS delivery_logs_action_type_check;

-- Add constraint with proper clock action types
ALTER TABLE delivery_logs 
ADD CONSTRAINT delivery_logs_action_type_check 
CHECK (action_type IN (
    'clocked_in',      -- CLOCK IN - Driver starts work day
    'clocked_out',     -- CLOCK OUT - Driver ends work day  
    'start_route',     -- Driver starts a delivery route
    'arrived',         -- Driver arrives at drop-off location
    'delivered',       -- Driver completes delivery
    'break_start',     -- Driver starts break
    'break_end'        -- Driver ends break
));

-- Verify constraint works
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'delivery_logs_action_type_check';

SELECT '✅ Clock-in and Clock-out action types now properly supported!' as status;

-- =================================================================
-- 2. FIX WORK SESSIONS SCHEMA CONFLICT (CRITICAL)
-- =================================================================

-- Drop conflicting work_sessions table and recreate with correct structure
DROP TABLE IF EXISTS work_sessions CASCADE;

CREATE TABLE work_sessions (
    id BIGSERIAL PRIMARY KEY,  -- Use BIGSERIAL instead of TEXT for better performance
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,  -- Keep as UUID, NOT TEXT
    
    -- Time tracking
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    
    -- GPS tracking (individual columns for compatibility)
    start_latitude DECIMAL(10, 8) NULL,
    start_longitude DECIMAL(11, 8) NULL, 
    start_gps_accuracy DECIMAL(8, 2) NULL,
    end_latitude DECIMAL(10, 8) NULL,
    end_longitude DECIMAL(11, 8) NULL,
    end_gps_accuracy DECIMAL(8, 2) NULL,
    
    -- Session statistics
    total_worked_minutes INTEGER DEFAULT 0,
    total_routes INTEGER DEFAULT 0,
    total_deliveries INTEGER DEFAULT 0,
    total_distance DECIMAL(10,2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint to ensure valid session states
    CONSTRAINT valid_work_session CHECK (
        (status = 'active' AND end_time IS NULL) OR 
        (status IN ('completed', 'cancelled') AND end_time IS NOT NULL)
    )
);

-- Add indexes for performance
CREATE INDEX idx_work_sessions_driver_id ON work_sessions(driver_id);
CREATE INDEX idx_work_sessions_status ON work_sessions(status);
CREATE INDEX idx_work_sessions_start_time ON work_sessions(start_time DESC);

-- Enable RLS
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Drivers can manage own work sessions" ON work_sessions
    FOR ALL USING (
        driver_id IN (
            SELECT d.id FROM drivers d 
            WHERE d.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all work sessions" ON work_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'employee_admin')
        )
    );

SELECT '✅ Work sessions table recreated with proper GPS columns!' as status;

-- =================================================================
-- 3. ENSURE GPS BREADCRUMBS HAS REQUIRED COLUMNS
-- =================================================================

-- Add missing columns if they don't exist
ALTER TABLE gps_breadcrumbs 
ADD COLUMN IF NOT EXISTS auto_tracking BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS movement_detected BOOLEAN DEFAULT false;

SELECT '✅ GPS breadcrumbs table updated!' as status;

-- =================================================================
-- 4. CLEAN UP FOR ALPHA TESTING
-- =================================================================

-- Remove any conflicting work sessions
DELETE FROM work_sessions WHERE status = 'active' AND start_time < NOW() - INTERVAL '24 hours';

-- Mark all breadcrumbs as inactive (fresh start)
UPDATE gps_breadcrumbs SET is_active_route = false WHERE is_active_route = true;

-- =================================================================
-- 5. FINAL STATUS REPORT
-- =================================================================

SELECT 'ALPHA TEST DATABASE STATUS REPORT' as report;

SELECT 
    'work_sessions' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions
FROM work_sessions
UNION ALL
SELECT 
    'gps_breadcrumbs' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_active_route = true THEN 1 END) as active_routes
FROM gps_breadcrumbs
UNION ALL
SELECT 
    'drivers' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_drivers
FROM drivers;

SELECT '🚀 ALPHA TEST DATABASE READY WITH PROPER CLOCK IN/OUT LABELS!' as final_status; 