-- Driver Task Management System Schema
-- Preset daily routes and tasks for drivers

-- Driver Tasks Table
CREATE TABLE IF NOT EXISTS driver_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Assignment Details
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id), -- Admin who assigned
    task_date DATE NOT NULL,
    task_order INTEGER NOT NULL, -- Order of tasks for the day (1, 2, 3...)
    
    -- Task Information
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    task_type TEXT NOT NULL CHECK (task_type IN ('delivery', 'pickup', 'service', 'inspection', 'other')),
    task_title TEXT NOT NULL,
    task_description TEXT,
    instructions JSONB DEFAULT '{}', -- Special instructions, notes, etc.
    
    -- Location Details
    destination_name TEXT NOT NULL,
    destination_address TEXT NOT NULL,
    destination_lat DECIMAL(10, 8) NOT NULL,
    destination_lng DECIMAL(11, 8) NOT NULL,
    geofence_radius INTEGER DEFAULT 50, -- Completion detection radius in meters
    
    -- Task Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Completion Details
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    completion_location JSONB, -- {lat, lng, accuracy} where task was marked complete
    completion_notes TEXT,
    completion_photo_url TEXT,
    
    -- Timing
    estimated_duration INTEGER, -- Estimated minutes for this task
    actual_duration INTEGER, -- Actual minutes taken
    estimated_arrival TIMESTAMPTZ, -- When driver should arrive
    actual_arrival TIMESTAMPTZ, -- When driver actually arrived
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_coordinates CHECK (
        destination_lat >= -90 AND destination_lat <= 90 AND
        destination_lng >= -180 AND destination_lng <= 180
    ),
    CONSTRAINT logical_timing CHECK (
        (started_at IS NULL OR completed_at IS NULL OR completed_at >= started_at) AND
        (estimated_arrival IS NULL OR estimated_arrival >= created_at)
    )
);

-- Task Templates Table (for recurring daily routes)
CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template Details
    template_name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    
    -- Default Task Data
    task_type TEXT NOT NULL,
    task_title TEXT NOT NULL,
    task_description TEXT,
    instructions JSONB DEFAULT '{}',
    
    -- Location
    destination_name TEXT NOT NULL,
    destination_address TEXT NOT NULL,
    destination_lat DECIMAL(10, 8) NOT NULL,
    destination_lng DECIMAL(11, 8) NOT NULL,
    geofence_radius INTEGER DEFAULT 50,
    
    -- Timing
    estimated_duration INTEGER,
    default_order INTEGER, -- Default position in daily route
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Route Plans (grouping of tasks for a specific day)
CREATE TABLE IF NOT EXISTS daily_route_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Plan Details
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    plan_name TEXT, -- e.g., "North Route", "Express Delivery", etc.
    
    -- Planning Details
    created_by UUID REFERENCES auth.users(id),
    total_estimated_duration INTEGER, -- Total minutes for all tasks
    total_estimated_distance DECIMAL(10, 2), -- Total km estimated
    
    -- Route Status
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'started', 'completed', 'cancelled')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one plan per driver per day
    CONSTRAINT unique_driver_date UNIQUE (driver_id, plan_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_tasks_driver_date ON driver_tasks(driver_id, task_date);
CREATE INDEX IF NOT EXISTS idx_driver_tasks_status ON driver_tasks(status);
CREATE INDEX IF NOT EXISTS idx_driver_tasks_date_order ON driver_tasks(task_date, task_order);
CREATE INDEX IF NOT EXISTS idx_daily_route_plans_driver_date ON daily_route_plans(driver_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_task_templates_active ON task_templates(is_active);

-- RLS (Row Level Security)
ALTER TABLE driver_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_route_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_tasks
CREATE POLICY "Drivers can view own tasks" ON driver_tasks
    FOR SELECT USING (
        driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    );

CREATE POLICY "Drivers can update own task status" ON driver_tasks
    FOR UPDATE USING (
        driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    ) WITH CHECK (
        driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can manage all tasks" ON driver_tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'employee_admin', 'owner')
        )
    );

-- RLS Policies for task_templates
CREATE POLICY "Authenticated users can view templates" ON task_templates
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage templates" ON task_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'employee_admin', 'owner')
        )
    );

-- RLS Policies for daily_route_plans
CREATE POLICY "Drivers can view own route plans" ON daily_route_plans
    FOR SELECT USING (
        driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can manage all route plans" ON daily_route_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'employee_admin', 'owner')
        )
    );

-- Functions for task management
CREATE OR REPLACE FUNCTION update_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_driver_tasks_updated_at 
    BEFORE UPDATE ON driver_tasks
    FOR EACH ROW EXECUTE FUNCTION update_task_updated_at();

CREATE TRIGGER update_task_templates_updated_at 
    BEFORE UPDATE ON task_templates
    FOR EACH ROW EXECUTE FUNCTION update_task_updated_at();

CREATE TRIGGER update_daily_route_plans_updated_at 
    BEFORE UPDATE ON daily_route_plans
    FOR EACH ROW EXECUTE FUNCTION update_task_updated_at();

-- Sample data insertion function
CREATE OR REPLACE FUNCTION create_sample_task_data()
RETURNS void AS $$
BEGIN
    -- Insert sample task templates
    INSERT INTO task_templates (
        template_name, task_type, task_title, task_description,
        destination_name, destination_address, destination_lat, destination_lng,
        estimated_duration, default_order
    ) VALUES 
    ('Morning Bakery Delivery', 'delivery', 'Deliver Fresh Bread', 'Deliver daily bread order to cafe', 
     'Sunrise Cafe', '123 Morning St, Manila', 14.5995, 120.9842, 30, 1),
    ('Grocery Store Pickup', 'pickup', 'Collect Produce Order', 'Pick up fresh vegetables for restaurants',
     'Fresh Market', '456 Market Ave, Quezon City', 14.6760, 121.0437, 45, 2),
    ('Restaurant Delivery', 'delivery', 'Food Delivery Service', 'Deliver prepared meals to customers',
     'Golden Spoon Restaurant', '789 Food Blvd, Makati', 14.5547, 121.0244, 60, 3);
    
    RAISE NOTICE 'Sample task templates created successfully';
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE driver_tasks IS 'Daily tasks assigned to drivers with locations and instructions';
COMMENT ON TABLE task_templates IS 'Reusable task templates for creating daily routes';
COMMENT ON TABLE daily_route_plans IS 'Daily route plans grouping multiple tasks for drivers';

-- Create sample data (uncomment to run)
-- SELECT create_sample_task_data(); 