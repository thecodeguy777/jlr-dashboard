-- Driver Tracking System Schema
-- Run these in your Supabase SQL editor

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drivers table (extends your existing user system)
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    vehicle_info JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients table for delivery locations
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    contact_info JSONB DEFAULT '{}',
    geofence_radius INTEGER DEFAULT 100, -- meters
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery routes/assignments
CREATE TABLE delivery_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    route_name TEXT,
    scheduled_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main tracking table
CREATE TABLE delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    route_id UUID REFERENCES delivery_routes(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('start_route', 'arrived', 'delivered', 'break_start', 'break_end')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    gps_accuracy DECIMAL(8, 2),
    note TEXT,
    photo_url TEXT,
    synced BOOLEAN DEFAULT true,
    battery_level INTEGER,
    signal_status TEXT,
    device_info JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Breadcrumb tracking table
CREATE TABLE gps_breadcrumbs (
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
CREATE TABLE geofence_events (
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

-- Session monitoring
CREATE TABLE session_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('app_focus', 'app_blur', 'offline_detected', 'gps_denied', 'location_spoofing')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration INTEGER, -- in seconds for blur events
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Offline sync queue
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
    data JSONB NOT NULL,
    synced BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_delivery_logs_driver_timestamp ON delivery_logs(driver_id, timestamp DESC);
CREATE INDEX idx_delivery_logs_timestamp ON delivery_logs(timestamp);
CREATE INDEX idx_session_logs_driver_timestamp ON session_logs(driver_id, timestamp DESC);
CREATE INDEX idx_sync_queue_unsynced ON sync_queue(driver_id, synced) WHERE synced = false;
CREATE INDEX idx_breadcrumbs_driver_timestamp ON gps_breadcrumbs(driver_id, timestamp DESC);
CREATE INDEX idx_breadcrumbs_active_route ON gps_breadcrumbs(driver_id, is_active_route, timestamp DESC);
CREATE INDEX idx_geofence_events_driver_timestamp ON geofence_events(driver_id, timestamp DESC);
CREATE INDEX idx_geofence_events_client ON geofence_events(client_id, timestamp DESC);

-- Row Level Security (RLS)
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_breadcrumbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drivers can only see their own data
CREATE POLICY "Drivers can view own data" ON drivers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Drivers can update own data" ON drivers
    FOR UPDATE USING (auth.uid() = user_id);

-- Delivery logs - drivers can only access their own
CREATE POLICY "Drivers can manage own delivery logs" ON delivery_logs
    FOR ALL USING (
        driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    );

-- Session logs - drivers can only access their own
CREATE POLICY "Drivers can manage own session logs" ON session_logs
    FOR ALL USING (
        driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    );

-- Sync queue - drivers can only access their own
CREATE POLICY "Drivers can manage own sync queue" ON sync_queue
    FOR ALL USING (
        driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    );

-- Admins can see everything
CREATE POLICY "Admins can view all driver data" ON drivers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'employee_admin')
        )
    );

CREATE POLICY "Admins can view all delivery logs" ON delivery_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'employee_admin')
        )
    );

CREATE POLICY "Admins can view all session logs" ON session_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'employee_admin')
        )
    );

-- Clients can be viewed by drivers and admins
CREATE POLICY "Drivers and admins can view clients" ON clients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'employee_admin', 'driver')
        )
    );

-- Delivery routes can be viewed by assigned drivers and admins
CREATE POLICY "Drivers can view assigned routes" ON delivery_routes
    FOR SELECT USING (
        driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'employee_admin')
        )
    );

-- GPS breadcrumbs - drivers can only access their own
CREATE POLICY "Drivers can manage own breadcrumbs" ON gps_breadcrumbs
    FOR ALL USING (
        driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can view all breadcrumbs" ON gps_breadcrumbs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'employee_admin')
        )
    );

-- Geofence events - drivers can only access their own
CREATE POLICY "Drivers can manage own geofence events" ON geofence_events
    FOR ALL USING (
        driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can view all geofence events" ON geofence_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'employee_admin')
        )
    );

-- Functions and triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_routes_updated_at BEFORE UPDATE ON delivery_routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data
INSERT INTO clients (name, address, location_lat, location_lng) VALUES
('ABC Corporation', '123 Business St, Manila', 14.5995, 120.9842),
('XYZ Store', '456 Commerce Ave, Quezon City', 14.6760, 121.0437),
('Global Mart', '789 Trade Blvd, Makati', 14.5547, 121.0244);

COMMENT ON TABLE drivers IS 'Driver profiles linked to auth users';
COMMENT ON TABLE clients IS 'Delivery destination clients with geolocation';
COMMENT ON TABLE delivery_routes IS 'Assigned routes for drivers';
COMMENT ON TABLE delivery_logs IS 'GPS tracking logs for deliveries';
COMMENT ON TABLE session_logs IS 'App usage monitoring for anti-cheat';
COMMENT ON TABLE sync_queue IS 'Offline data sync queue';
COMMENT ON TABLE gps_breadcrumbs IS 'Continuous GPS tracking every 30 seconds';
COMMENT ON TABLE geofence_events IS 'Client area entry/exit events'; 