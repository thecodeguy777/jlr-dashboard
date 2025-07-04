-- Work Sessions Table (FINAL CORRECTED VERSION)
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

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_work_sessions_driver_id ON work_sessions(driver_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_start_time ON work_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_work_sessions_status ON work_sessions(status);

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

-- Admins can view all work sessions (FIXED - using user_profiles instead of user_roles)
CREATE POLICY "Admins can view all work sessions" ON work_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_work_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_work_sessions_updated_at ON work_sessions;
CREATE TRIGGER update_work_sessions_updated_at
  BEFORE UPDATE ON work_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_work_sessions_updated_at();

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