-- Clients Table for Geofencing
-- Stores client locations for delivery geofencing
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Client information
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  
  -- Location data for geofencing
  location_lat DECIMAL(10, 8), -- Latitude with high precision
  location_lng DECIMAL(11, 8), -- Longitude with high precision
  geofence_radius INTEGER DEFAULT 100, -- Radius in meters (default 100m)
  
  -- Status and metadata
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT valid_latitude CHECK (location_lat >= -90 AND location_lat <= 90),
  CONSTRAINT valid_longitude CHECK (location_lng >= -180 AND location_lng <= 180),
  CONSTRAINT valid_radius CHECK (geofence_radius > 0 AND geofence_radius <= 5000) -- Max 5km radius
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active);
CREATE INDEX IF NOT EXISTS idx_clients_location ON clients(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);

-- RLS (Row Level Security) policies
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active clients (for geofencing)
CREATE POLICY "Anyone can view active clients" ON clients
  FOR SELECT USING (is_active = true);

-- Admins can view all clients
CREATE POLICY "Admins can view all clients" ON clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- Admins can insert clients
CREATE POLICY "Admins can insert clients" ON clients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- Admins can update clients
CREATE POLICY "Admins can update clients" ON clients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- Admins can delete clients
CREATE POLICY "Admins can delete clients" ON clients
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at();

-- Insert some example clients (optional)
/*
INSERT INTO clients (name, address, location_lat, location_lng, geofence_radius, phone) VALUES
('ABC Company', '123 Business St, Downtown', 14.5995, 120.9842, 150, '(02) 123-4567'),
('XYZ Corporation', '456 Commerce Ave, Makati', 14.5547, 121.0244, 200, '(02) 987-6543'),
('Main Office', '789 Corporate Blvd, BGC', 14.5515, 121.0513, 100, '(02) 555-0123');
*/

-- Example queries for client management:

-- Get all active clients with location data
/*
SELECT 
  id,
  name,
  address,
  location_lat,
  location_lng,
  geofence_radius,
  phone,
  email,
  created_at
FROM clients 
WHERE is_active = true
ORDER BY name;
*/

-- Find clients near a specific location (within 5km)
/*
SELECT 
  id,
  name,
  address,
  geofence_radius,
  (6371 * acos(cos(radians(14.5995)) * cos(radians(location_lat)) * 
   cos(radians(location_lng) - radians(120.9842)) + 
   sin(radians(14.5995)) * sin(radians(location_lat)))) AS distance_km
FROM clients 
WHERE is_active = true
  AND location_lat IS NOT NULL 
  AND location_lng IS NOT NULL
HAVING distance_km <= 5
ORDER BY distance_km;
*/

-- Get clients without location data (need to set coordinates)
/*
SELECT id, name, address, phone
FROM clients 
WHERE is_active = true 
  AND (location_lat IS NULL OR location_lng IS NULL)
ORDER BY created_at DESC;
*/ 