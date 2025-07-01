-- Ghost Control & Auto-Tracking Database Schema
-- Run this to add ghost control and movement detection capabilities

-- 1. Ghost Commands Table (for remote driver control)
CREATE TABLE IF NOT EXISTS ghost_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN (
        'FORCE_CLOCK_IN', 'FORCE_CLOCK_OUT', 'FORCE_START_ROUTE', 
        'FORCE_MARK_DELIVERED', 'SEND_MESSAGE', 'OPEN_MAPS', 'CALL_ADMIN'
    )),
    message TEXT,
    destination TEXT,
    reason TEXT,
    auto_triggered BOOLEAN DEFAULT false,
    executed BOOLEAN DEFAULT false,
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Auto-Tracking Sessions Table
CREATE TABLE IF NOT EXISTS auto_tracking_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    trigger TEXT NOT NULL CHECK (trigger IN (
        'movement_detected', 'admin_activated', 'emergency_route', 'timeout_triggered'
    )),
    metadata JSONB DEFAULT '{}',
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    total_distance DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Admin Notifications Table
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN (
        'MOVEMENT_DETECTED', 'MOVEMENT_STOPPED', 'AUTO_TRACKING_STARTED', 
        'AUTO_TRACKING_STOPPED', 'AUTO_TIMEOUT_TRIGGERED', 'GHOST_COMMAND_EXECUTED'
    )),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Movement Detection Events Table
CREATE TABLE IF NOT EXISTS movement_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('movement_start', 'movement_stop', 'speed_change')),
    speed_kmh DECIMAL(8, 2),
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    gps_accuracy DECIMAL(8, 2),
    work_session_active BOOLEAN DEFAULT false,
    auto_tracking_triggered BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Update gps_breadcrumbs table with new fields
ALTER TABLE gps_breadcrumbs 
ADD COLUMN IF NOT EXISTS auto_tracking BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tracking_trigger TEXT,
ADD COLUMN IF NOT EXISTS movement_detected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ghost_control_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_session_id UUID;

-- 6. Driver Status Table (for real-time monitoring)
CREATE TABLE IF NOT EXISTS driver_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE UNIQUE,
    is_moving BOOLEAN DEFAULT false,
    current_speed DECIMAL(8, 2) DEFAULT 0,
    last_location_lat DECIMAL(10, 8),
    last_location_lng DECIMAL(11, 8),
    last_location_time TIMESTAMP WITH TIME ZONE,
    work_session_active BOOLEAN DEFAULT false,
    auto_tracking_active BOOLEAN DEFAULT false,
    ghost_control_active BOOLEAN DEFAULT false,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ghost_commands_driver_created ON ghost_commands(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ghost_commands_executed ON ghost_commands(executed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_tracking_sessions_driver ON auto_tracking_sessions(driver_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON admin_notifications(read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movement_events_driver_timestamp ON movement_events(driver_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_driver_status_activity ON driver_status(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_breadcrumbs_auto_tracking ON gps_breadcrumbs(driver_id, auto_tracking, timestamp DESC);

-- RLS Policies

-- Ghost Commands - Only admins can insert, drivers can read their own
ALTER TABLE ghost_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert ghost commands" ON ghost_commands
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner', 'manager')
        )
    );

CREATE POLICY "Drivers can read their ghost commands" ON ghost_commands
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM drivers 
            WHERE drivers.id = ghost_commands.driver_id 
            AND drivers.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can read all ghost commands" ON ghost_commands
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner', 'manager')
        )
    );

CREATE POLICY "Admins can update ghost commands" ON ghost_commands
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner', 'manager')
        )
    );

-- Auto-tracking sessions - Drivers can read/insert their own, admins can read all
ALTER TABLE auto_tracking_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can manage their auto-tracking sessions" ON auto_tracking_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM drivers 
            WHERE drivers.id = auto_tracking_sessions.driver_id 
            AND drivers.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can read all auto-tracking sessions" ON auto_tracking_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner', 'manager')
        )
    );

-- Admin notifications - Only admins can read
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notifications" ON admin_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner', 'manager')
        )
    );

-- Movement events - Drivers can insert their own, admins can read all
ALTER TABLE movement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can insert their movement events" ON movement_events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM drivers 
            WHERE drivers.id = movement_events.driver_id 
            AND drivers.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can read all movement events" ON movement_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner', 'manager')
        )
    );

-- Driver status - Drivers can update their own, admins can read all
ALTER TABLE driver_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can update their status" ON driver_status
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM drivers 
            WHERE drivers.id = driver_status.driver_id 
            AND drivers.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can read all driver status" ON driver_status
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner', 'manager')
        )
    );

-- Database Functions

-- Function to automatically end auto-tracking sessions after 24 hours
CREATE OR REPLACE FUNCTION auto_end_stale_tracking_sessions()
RETURNS void AS $$
BEGIN
    UPDATE auto_tracking_sessions 
    SET 
        end_time = NOW(),
        duration_minutes = EXTRACT(EPOCH FROM (NOW() - start_time))/60
    WHERE 
        end_time IS NULL 
        AND start_time < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM admin_notifications 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    DELETE FROM movement_events 
    WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to update driver status
CREATE OR REPLACE FUNCTION update_driver_status(
    p_driver_id UUID,
    p_is_moving BOOLEAN DEFAULT NULL,
    p_current_speed DECIMAL DEFAULT NULL,
    p_location_lat DECIMAL DEFAULT NULL,
    p_location_lng DECIMAL DEFAULT NULL,
    p_work_session_active BOOLEAN DEFAULT NULL,
    p_auto_tracking_active BOOLEAN DEFAULT NULL,
    p_ghost_control_active BOOLEAN DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO driver_status (
        driver_id, 
        is_moving, 
        current_speed, 
        last_location_lat, 
        last_location_lng,
        last_location_time,
        work_session_active,
        auto_tracking_active,
        ghost_control_active,
        last_activity,
        updated_at
    ) VALUES (
        p_driver_id,
        COALESCE(p_is_moving, false),
        COALESCE(p_current_speed, 0),
        p_location_lat,
        p_location_lng,
        CASE WHEN p_location_lat IS NOT NULL THEN NOW() ELSE NULL END,
        COALESCE(p_work_session_active, false),
        COALESCE(p_auto_tracking_active, false),
        COALESCE(p_ghost_control_active, false),
        NOW(),
        NOW()
    )
    ON CONFLICT (driver_id) DO UPDATE SET
        is_moving = COALESCE(p_is_moving, driver_status.is_moving),
        current_speed = COALESCE(p_current_speed, driver_status.current_speed),
        last_location_lat = COALESCE(p_location_lat, driver_status.last_location_lat),
        last_location_lng = COALESCE(p_location_lng, driver_status.last_location_lng),
        last_location_time = CASE WHEN p_location_lat IS NOT NULL THEN NOW() ELSE driver_status.last_location_time END,
        work_session_active = COALESCE(p_work_session_active, driver_status.work_session_active),
        auto_tracking_active = COALESCE(p_auto_tracking_active, driver_status.auto_tracking_active),
        ghost_control_active = COALESCE(p_ghost_control_active, driver_status.ghost_control_active),
        last_activity = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Triggers

-- Trigger to auto-update driver status when breadcrumbs are inserted
CREATE OR REPLACE FUNCTION trigger_update_driver_status()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_driver_status(
        NEW.driver_id,
        NEW.movement_detected,
        NEW.speed_kmh,
        NEW.latitude,
        NEW.longitude,
        NULL, -- Don't update work session from breadcrumb
        NEW.auto_tracking,
        NEW.ghost_control_active
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_driver_status_on_breadcrumb
    AFTER INSERT ON gps_breadcrumbs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_driver_status();

-- Trigger to clean up ghost commands after execution
CREATE OR REPLACE FUNCTION cleanup_executed_ghost_commands()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete executed commands older than 1 hour
    DELETE FROM ghost_commands 
    WHERE executed = true 
    AND executed_at < NOW() - INTERVAL '1 hour';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_ghost_commands_trigger
    AFTER UPDATE ON ghost_commands
    FOR EACH ROW
    WHEN (NEW.executed = true AND OLD.executed = false)
    EXECUTE FUNCTION cleanup_executed_ghost_commands();

-- Initial setup
-- Create default driver status entries for existing drivers
INSERT INTO driver_status (driver_id)
SELECT id FROM drivers 
WHERE id NOT IN (SELECT driver_id FROM driver_status);

COMMENT ON TABLE ghost_commands IS 'Remote commands that admins can send to control driver interfaces';
COMMENT ON TABLE auto_tracking_sessions IS 'Sessions where GPS tracking was automatically activated';
COMMENT ON TABLE admin_notifications IS 'Real-time notifications for admin dashboard';
COMMENT ON TABLE movement_events IS 'Log of driver movement detection events';
COMMENT ON TABLE driver_status IS 'Real-time status of each driver for admin monitoring'; 