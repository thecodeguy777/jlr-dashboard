-- Add GPS columns to driver_presence table for live tracking

-- Add GPS coordinate columns if they don't exist
DO $$ 
BEGIN
    -- Add location_lat column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'driver_presence' AND column_name = 'location_lat') THEN
        ALTER TABLE driver_presence ADD COLUMN location_lat DECIMAL(10, 8) NULL;
        RAISE NOTICE 'Added location_lat column to driver_presence';
    END IF;
    
    -- Add location_lng column  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'driver_presence' AND column_name = 'location_lng') THEN
        ALTER TABLE driver_presence ADD COLUMN location_lng DECIMAL(11, 8) NULL;
        RAISE NOTICE 'Added location_lng column to driver_presence';
    END IF;
    
    -- Add gps_accuracy column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'driver_presence' AND column_name = 'gps_accuracy') THEN
        ALTER TABLE driver_presence ADD COLUMN gps_accuracy DECIMAL(8, 2) NULL;
        RAISE NOTICE 'Added gps_accuracy column to driver_presence';
    END IF;
    
    -- Add battery_level column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'driver_presence' AND column_name = 'battery_level') THEN
        ALTER TABLE driver_presence ADD COLUMN battery_level INTEGER NULL;
        RAISE NOTICE 'Added battery_level column to driver_presence';
    END IF;
    
    -- Add signal_status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'driver_presence' AND column_name = 'signal_status') THEN
        ALTER TABLE driver_presence ADD COLUMN signal_status TEXT NULL;
        RAISE NOTICE 'Added signal_status column to driver_presence';
    END IF;
    
    RAISE NOTICE 'Driver presence table GPS columns updated successfully!';
END $$;

-- Create index for GPS queries
CREATE INDEX IF NOT EXISTS idx_driver_presence_location 
ON driver_presence (location_lat, location_lng) 
WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;

-- Create index for online drivers
CREATE INDEX IF NOT EXISTS idx_driver_presence_online 
ON driver_presence (is_online, last_seen) 
WHERE is_online = true;

-- Show current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'driver_presence' 
ORDER BY ordinal_position; 