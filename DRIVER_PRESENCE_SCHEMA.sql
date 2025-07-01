-- Driver Presence Tracking Schema
-- This table tracks when drivers are online/offline for real-time status

CREATE TABLE IF NOT EXISTS driver_presence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
    device_id TEXT, -- For multiple device support
    location_lat DECIMAL(10, 8), -- Optional: track location when online
    location_lng DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints
    UNIQUE(driver_id, device_id) -- One record per driver per device
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_presence_driver_id ON driver_presence(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_presence_is_online ON driver_presence(is_online);
CREATE INDEX IF NOT EXISTS idx_driver_presence_last_seen ON driver_presence(last_seen DESC);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_driver_presence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_driver_presence_updated_at ON driver_presence;
CREATE TRIGGER trigger_update_driver_presence_updated_at
    BEFORE UPDATE ON driver_presence
    FOR EACH ROW
    EXECUTE FUNCTION update_driver_presence_updated_at();

-- Row Level Security
ALTER TABLE driver_presence ENABLE ROW LEVEL SECURITY;

-- Policies for drivers (can only see/update their own presence)
CREATE POLICY "Drivers can view their own presence" ON driver_presence
    FOR SELECT USING (
        driver_id = auth.uid()::uuid OR
        driver_id IN (
            SELECT id FROM drivers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Drivers can update their own presence" ON driver_presence
    FOR UPDATE USING (
        driver_id = auth.uid()::uuid OR
        driver_id IN (
            SELECT id FROM drivers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Drivers can insert their own presence" ON driver_presence
    FOR INSERT WITH CHECK (
        driver_id = auth.uid()::uuid OR
        driver_id IN (
            SELECT id FROM drivers WHERE user_id = auth.uid()
        )
    );

-- Policies for admins/managers (can see all)
CREATE POLICY "Admins can view all driver presence" ON driver_presence
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager', 'owner')
        )
    );

CREATE POLICY "Admins can update all driver presence" ON driver_presence
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager', 'owner')
        )
    );

-- Function to upsert driver presence (update if exists, insert if not)
CREATE OR REPLACE FUNCTION upsert_driver_presence(
    p_driver_id UUID,
    p_is_online BOOLEAN DEFAULT true,
    p_device_id TEXT DEFAULT 'web',
    p_location_lat DECIMAL DEFAULT NULL,
    p_location_lng DECIMAL DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO driver_presence (
        driver_id, 
        is_online, 
        last_seen, 
        device_id, 
        location_lat, 
        location_lng
    ) VALUES (
        p_driver_id, 
        p_is_online, 
        now(), 
        p_device_id, 
        p_location_lat, 
        p_location_lng
    )
    ON CONFLICT (driver_id, device_id)
    DO UPDATE SET
        is_online = p_is_online,
        last_seen = now(),
        location_lat = COALESCE(p_location_lat, driver_presence.location_lat),
        location_lng = COALESCE(p_location_lng, driver_presence.location_lng),
        updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to mark driver as offline after timeout
CREATE OR REPLACE FUNCTION mark_inactive_drivers_offline()
RETURNS VOID AS $$
BEGIN
    UPDATE driver_presence 
    SET is_online = false, updated_at = now()
    WHERE is_online = true 
    AND last_seen < (now() - INTERVAL '5 minutes');
END;
$$ LANGUAGE plpgsql;

-- Sample usage:
-- Mark driver as online
-- SELECT upsert_driver_presence('driver-uuid-here', true, 'mobile_app');

-- Mark driver as offline  
-- SELECT upsert_driver_presence('driver-uuid-here', false, 'mobile_app');

-- Get all online drivers
-- SELECT d.name, dp.last_seen, dp.is_online 
-- FROM drivers d 
-- JOIN driver_presence dp ON d.id = dp.driver_id 
-- WHERE dp.is_online = true;

-- Clean up offline drivers (run periodically)
-- SELECT mark_inactive_drivers_offline(); 