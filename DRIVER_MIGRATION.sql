-- Driver Tracking Enhancement Migration
-- Run this to add breadcrumb and geofence tracking to existing driver system

-- Only create new tables (skip existing ones)

-- Breadcrumb tracking table
CREATE TABLE IF NOT EXISTS gps_breadcrumbs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    route_id UUID REFERENCES delivery_routes(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    gps_accuracy DECIMAL(8, 2),
    speed_kmh DECIMAL(8, 2), -- Calculated speed in km/h
    distance_from_last DECIMAL(10, 2), -- Distance from last point in meters
    battery_level INTEGER,
    signal_status TEXT,
    is_active_route BOOLEAN DEFAULT true,
    synced BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Geofence events table
CREATE TABLE IF NOT EXISTS geofence_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('entered', 'exited')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    distance_from_center DECIMAL(8, 2), -- Distance from client center in meters
    geofence_radius INTEGER, -- Radius that was triggered
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_breadcrumbs_driver_timestamp ON gps_breadcrumbs(driver_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_breadcrumbs_active_route ON gps_breadcrumbs(driver_id, is_active_route, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_geofence_events_driver_timestamp ON geofence_events(driver_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_geofence_events_client ON geofence_events(client_id, timestamp DESC);

-- Enable RLS on new tables
ALTER TABLE gps_breadcrumbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables

-- GPS breadcrumbs - drivers can only access their own
DROP POLICY IF EXISTS "Drivers can manage own breadcrumbs" ON gps_breadcrumbs;
CREATE POLICY "Drivers can manage own breadcrumbs" ON gps_breadcrumbs
    FOR ALL USING (
        driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can view all breadcrumbs" ON gps_breadcrumbs;
CREATE POLICY "Admins can view all breadcrumbs" ON gps_breadcrumbs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'employee_admin')
        )
    );

-- Geofence events - drivers can only access their own
DROP POLICY IF EXISTS "Drivers can manage own geofence events" ON geofence_events;
CREATE POLICY "Drivers can manage own geofence events" ON geofence_events
    FOR ALL USING (
        driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can view all geofence events" ON geofence_events;
CREATE POLICY "Admins can view all geofence events" ON geofence_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'employee_admin')
        )
    );

-- Add comments
COMMENT ON TABLE gps_breadcrumbs IS 'Continuous GPS tracking every 30 seconds';
COMMENT ON TABLE geofence_events IS 'Client area entry/exit events';

-- Verify tables were created
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('gps_breadcrumbs', 'geofence_events')
ORDER BY tablename;

-- Show table counts
SELECT 
    'gps_breadcrumbs' as table_name,
    COUNT(*) as row_count
FROM gps_breadcrumbs
UNION ALL
SELECT 
    'geofence_events' as table_name,
    COUNT(*) as row_count
FROM geofence_events
UNION ALL
SELECT 
    'drivers' as table_name,
    COUNT(*) as row_count
FROM drivers
UNION ALL
SELECT 
    'clients' as table_name,
    COUNT(*) as row_count
FROM clients; 