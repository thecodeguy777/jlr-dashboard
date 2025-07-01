-- Fix work_sessions table - Add missing GPS columns
-- Run this in Supabase Dashboard → SQL Editor

-- Add the missing GPS columns to work_sessions table
ALTER TABLE work_sessions 
ADD COLUMN IF NOT EXISTS start_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS start_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS start_gps_accuracy DECIMAL(8, 2),
ADD COLUMN IF NOT EXISTS end_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS end_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS end_gps_accuracy DECIMAL(8, 2);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'work_sessions' 
  AND column_name LIKE '%latitude%' 
   OR column_name LIKE '%longitude%' 
   OR column_name LIKE '%gps%'
ORDER BY column_name; 