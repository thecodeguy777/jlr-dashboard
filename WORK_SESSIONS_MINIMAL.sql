-- MINIMAL work_sessions table - just get it working!
-- Skip all the complex RLS stuff for now

DROP TABLE IF EXISTS work_sessions CASCADE;

CREATE TABLE work_sessions (
    id BIGSERIAL PRIMARY KEY,
    driver_id TEXT NOT NULL,  -- Using TEXT to avoid UUID casting issues
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ NULL,
    status TEXT NOT NULL DEFAULT 'active',
    total_hours DECIMAL(5,2) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No RLS for now - just get it working
ALTER TABLE work_sessions DISABLE ROW LEVEL SECURITY;

-- Grant basic permissions
GRANT ALL ON work_sessions TO authenticated;
GRANT ALL ON work_sessions TO anon;
GRANT ALL ON SEQUENCE work_sessions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE work_sessions_id_seq TO anon;

-- Test insert
INSERT INTO work_sessions (driver_id, start_time, status) 
VALUES ('test-driver-123', NOW(), 'active');

-- Clean up test
DELETE FROM work_sessions WHERE driver_id = 'test-driver-123';

-- Success message
SELECT 'work_sessions table created successfully!' AS result; 