-- Simplified work_sessions table schema
-- Works with existing user_profiles and drivers tables

DROP TABLE IF EXISTS work_sessions CASCADE;

CREATE TABLE work_sessions (
    id BIGSERIAL PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    total_hours DECIMAL(5,2) NULL,
    -- GPS coordinates for clock-in location
    start_latitude DECIMAL(10, 8) NULL,
    start_longitude DECIMAL(11, 8) NULL,
    start_gps_accuracy DECIMAL(8, 2) NULL,
    -- GPS coordinates for clock-out location  
    end_latitude DECIMAL(10, 8) NULL,
    end_longitude DECIMAL(11, 8) NULL,
    end_gps_accuracy DECIMAL(8, 2) NULL,
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

-- Enable RLS
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

-- SIMPLIFIED RLS POLICIES (works with your current schema)

-- Policy 1: Drivers can access their own work sessions
CREATE POLICY "work_sessions_driver_access" ON work_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM drivers 
            WHERE drivers.id = work_sessions.driver_id 
            AND drivers.user_id::uuid = auth.uid()
        )
    );

-- Policy 2: Admins can access all work sessions (using correct column names)
CREATE POLICY "work_sessions_admin_access" ON work_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('admin', 'employee_admin')
        )
    );

-- Policy 3: Fallback for authenticated users (can be removed for stricter security)
CREATE POLICY "work_sessions_authenticated_fallback" ON work_sessions
    FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON work_sessions TO authenticated;
GRANT ALL ON SEQUENCE work_sessions_id_seq TO authenticated;

-- Test insert (optional)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM drivers LIMIT 1) THEN
        INSERT INTO work_sessions (driver_id, start_time, status) 
        VALUES (
            (SELECT id FROM drivers LIMIT 1),
            NOW(),
            'active'
        );
        
        DELETE FROM work_sessions WHERE status = 'active' AND created_at > NOW() - INTERVAL '1 minute';
        
        RAISE NOTICE 'work_sessions table created and tested successfully';
    ELSE
        RAISE NOTICE 'work_sessions table created but no drivers exist for testing';
    END IF;
END;
$$;

COMMENT ON TABLE work_sessions IS 'Driver work sessions - simplified schema'; 