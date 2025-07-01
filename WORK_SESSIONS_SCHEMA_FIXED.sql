-- Create work_sessions table with proper schema
-- This fixes the "null value in column id" error

DROP TABLE IF EXISTS work_sessions CASCADE;

CREATE TABLE work_sessions (
    id BIGSERIAL PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    total_hours DECIMAL(5,2) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_work_sessions_driver_id ON work_sessions(driver_id);
CREATE INDEX idx_work_sessions_status ON work_sessions(status);
CREATE INDEX idx_work_sessions_start_time ON work_sessions(start_time);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_work_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_work_sessions_updated_at
    BEFORE UPDATE ON work_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_work_sessions_updated_at();

-- RLS Policies
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

-- Drivers can see their own work sessions
CREATE POLICY "work_sessions_driver_access" ON work_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM drivers 
            WHERE drivers.id = work_sessions.driver_id 
            AND drivers.user_id = auth.uid()
        )
    );

-- Admins can see all work sessions
CREATE POLICY "work_sessions_admin_access" ON work_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- Employee admins can see all work sessions
CREATE POLICY "work_sessions_employee_admin_access" ON work_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'employee_admin'
        )
    );

-- Grant permissions
GRANT ALL ON work_sessions TO authenticated;
GRANT ALL ON SEQUENCE work_sessions_id_seq TO authenticated;

-- Insert test comment
INSERT INTO work_sessions (driver_id, start_time, status) 
VALUES (
    (SELECT id FROM drivers LIMIT 1),
    NOW(),
    'active'
) 
ON CONFLICT DO NOTHING;

COMMENT ON TABLE work_sessions IS 'Driver work sessions with proper auto-incrementing ID';

-- Work Sessions Table (FIXED VERSION)
-- Tracks driver work sessions from clock in to clock out
CREATE TABLE IF NOT EXISTS work_sessions (
  id TEXT PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  
  -- Time tracking
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  total_worked_minutes INTEGER DEFAULT 0,
  
  -- Location tracking
  start_location JSONB NOT NULL, -- {latitude, longitude, accuracy}
  end_location JSONB,
  
  -- Session statistics
  total_routes INTEGER DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0,
  total_distance DECIMAL(10,2) DEFAULT 0, -- in meters
  
  -- Status and metadata
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_work_session CHECK (
    (status = 'active' AND end_time IS NULL) OR 
    (status IN ('completed', 'cancelled') AND end_time IS NOT NULL)
  )
);

-- Indexes for efficient queries (FIXED - removed DATE() function)
CREATE INDEX IF NOT EXISTS idx_work_sessions_driver_id ON work_sessions(driver_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_start_time ON work_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_work_sessions_status ON work_sessions(status);
-- Removed problematic index with DATE() function
-- Query performance will still be good with the start_time index

-- RLS (Row Level Security) policies
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

-- Drivers can only see their own work sessions
CREATE POLICY "Drivers can view own work sessions" ON work_sessions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM drivers WHERE id = work_sessions.driver_id
    )
  );

-- Drivers can insert their own work sessions
CREATE POLICY "Drivers can insert own work sessions" ON work_sessions
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM drivers WHERE id = work_sessions.driver_id
    )
  );

-- Drivers can update their own work sessions
CREATE POLICY "Drivers can update own work sessions" ON work_sessions
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM drivers WHERE id = work_sessions.driver_id
    )
  );

-- Admins can view all work sessions
CREATE POLICY "Admins can view all work sessions" ON work_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- Example queries for manual payroll verification:

-- Get daily work sessions for a driver
/*
SELECT 
  id,
  start_time,
  end_time,
  total_worked_minutes,
  ROUND(total_worked_minutes::decimal / 60, 2) as total_hours,
  total_routes,
  total_deliveries,
  ROUND(total_distance / 1000, 2) as total_km,
  status
FROM work_sessions 
WHERE driver_id = 'your-driver-id'
  AND start_time >= CURRENT_DATE
  AND start_time < CURRENT_DATE + INTERVAL '1 day'
ORDER BY start_time DESC;
*/

-- Get weekly summary for payroll
/*
SELECT 
  driver_id,
  drivers.name as driver_name,
  DATE_TRUNC('week', start_time) as week_start,
  COUNT(*) as total_sessions,
  SUM(total_worked_minutes) as total_minutes,
  ROUND(SUM(total_worked_minutes)::decimal / 60, 2) as total_hours,
  SUM(total_routes) as total_routes,
  SUM(total_deliveries) as total_deliveries,
  ROUND(SUM(total_distance) / 1000, 2) as total_km
FROM work_sessions 
JOIN drivers ON drivers.id = work_sessions.driver_id
WHERE status = 'completed'
  AND start_time >= DATE_TRUNC('week', CURRENT_DATE)
GROUP BY driver_id, drivers.name, DATE_TRUNC('week', start_time)
ORDER BY week_start DESC, driver_name;
*/

-- Get active work sessions (currently clocked in)
/*
SELECT 
  ws.id,
  d.name as driver_name,
  ws.start_time,
  EXTRACT(EPOCH FROM (NOW() - ws.start_time))/60 as current_minutes,
  ROUND(EXTRACT(EPOCH FROM (NOW() - ws.start_time))/3600, 2) as current_hours,
  ws.total_routes,
  ws.total_deliveries
FROM work_sessions ws
JOIN drivers d ON d.id = ws.driver_id  
WHERE ws.status = 'active'
ORDER BY ws.start_time;
*/ 