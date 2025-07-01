-- Fix for Ghost Control RLS Policy Issues
-- Run this if you're getting "new row violates row-level security policy" errors

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Drivers can manage their auto-tracking sessions" ON auto_tracking_sessions;

-- Create correct auto-tracking sessions policies
CREATE POLICY "Drivers can insert their auto-tracking sessions" ON auto_tracking_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM drivers 
            WHERE drivers.id = driver_id 
            AND drivers.user_id = auth.uid()
        )
    );

CREATE POLICY "Drivers can read their auto-tracking sessions" ON auto_tracking_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM drivers 
            WHERE drivers.id = auto_tracking_sessions.driver_id 
            AND drivers.user_id = auth.uid()
        )
    );

CREATE POLICY "Drivers can update their auto-tracking sessions" ON auto_tracking_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM drivers 
            WHERE drivers.id = auto_tracking_sessions.driver_id 
            AND drivers.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can insert auto-tracking sessions" ON auto_tracking_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'owner', 'employee_admin')
        )
    );

CREATE POLICY "Admins can update auto-tracking sessions" ON auto_tracking_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'owner', 'employee_admin')
        )
    );

-- Add missing ghost_commands policies
CREATE POLICY "Drivers can update their ghost commands" ON ghost_commands
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM drivers 
            WHERE drivers.id = ghost_commands.driver_id 
            AND drivers.user_id = auth.uid()
        )
    );

-- Verify policies were created
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('auto_tracking_sessions', 'ghost_commands')
ORDER BY tablename, policyname; 