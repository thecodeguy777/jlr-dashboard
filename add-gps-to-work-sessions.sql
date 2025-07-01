-- Add GPS columns to existing work_sessions table
-- This adds the missing GPS fields that the code expects

-- Add GPS coordinate columns for clock-in location
DO $$ 
BEGIN
    -- Add start_latitude column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'work_sessions' AND column_name = 'start_latitude') THEN
        ALTER TABLE work_sessions ADD COLUMN start_latitude DECIMAL(10, 8) NULL;
        RAISE NOTICE 'Added start_latitude column to work_sessions';
    ELSE
        RAISE NOTICE 'start_latitude column already exists';
    END IF;
    
    -- Add start_longitude column  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'work_sessions' AND column_name = 'start_longitude') THEN
        ALTER TABLE work_sessions ADD COLUMN start_longitude DECIMAL(11, 8) NULL;
        RAISE NOTICE 'Added start_longitude column to work_sessions';
    ELSE
        RAISE NOTICE 'start_longitude column already exists';
    END IF;
    
    -- Add start_gps_accuracy column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'work_sessions' AND column_name = 'start_gps_accuracy') THEN
        ALTER TABLE work_sessions ADD COLUMN start_gps_accuracy DECIMAL(8, 2) NULL;
        RAISE NOTICE 'Added start_gps_accuracy column to work_sessions';
    ELSE
        RAISE NOTICE 'start_gps_accuracy column already exists';
    END IF;
    
    -- Add end_latitude column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'work_sessions' AND column_name = 'end_latitude') THEN
        ALTER TABLE work_sessions ADD COLUMN end_latitude DECIMAL(10, 8) NULL;
        RAISE NOTICE 'Added end_latitude column to work_sessions';
    ELSE
        RAISE NOTICE 'end_latitude column already exists';
    END IF;
    
    -- Add end_longitude column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'work_sessions' AND column_name = 'end_longitude') THEN
        ALTER TABLE work_sessions ADD COLUMN end_longitude DECIMAL(11, 8) NULL;
        RAISE NOTICE 'Added end_longitude column to work_sessions';
    ELSE
        RAISE NOTICE 'end_longitude column already exists';
    END IF;
    
    -- Add end_gps_accuracy column (this is the one that was missing!)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'work_sessions' AND column_name = 'end_gps_accuracy') THEN
        ALTER TABLE work_sessions ADD COLUMN end_gps_accuracy DECIMAL(8, 2) NULL;
        RAISE NOTICE 'Added end_gps_accuracy column to work_sessions';
    ELSE
        RAISE NOTICE 'end_gps_accuracy column already exists';
    END IF;
    
    RAISE NOTICE 'Work sessions GPS columns migration complete!';
END $$;

-- Create index for GPS queries on work sessions
CREATE INDEX IF NOT EXISTS idx_work_sessions_start_location 
ON work_sessions (start_latitude, start_longitude) 
WHERE start_latitude IS NOT NULL AND start_longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_sessions_end_location 
ON work_sessions (end_latitude, end_longitude) 
WHERE end_latitude IS NOT NULL AND end_longitude IS NOT NULL;

-- Show current table structure to verify
SELECT 'Current work_sessions table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'work_sessions' 
ORDER BY ordinal_position;

-- Test query to make sure new columns exist
SELECT 'Testing new GPS columns...' as test;
SELECT COUNT(*) as total_records, 
       COUNT(start_latitude) as records_with_start_gps,
       COUNT(end_latitude) as records_with_end_gps
FROM work_sessions; 