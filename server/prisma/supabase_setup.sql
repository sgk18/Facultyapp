-- =========================================================================
-- CHRIST University Faculty App — Supabase Database Initialization Script
-- =========================================================================

-- 1. Custom Enum Definitions (Idempotent checks)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
        CREATE TYPE role_type AS ENUM ('ADMIN', 'HOD', 'FACULTY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_type') THEN
        CREATE TYPE priority_type AS ENUM ('HIGH', 'MEDIUM', 'LOW');
    END IF;
END$$;

-- 2. Create Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE, -- Reference to Supabase auth.users.id
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role role_type DEFAULT 'FACULTY'::role_type NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Create Deadlines Table
CREATE TABLE IF NOT EXISTS deadlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    priority priority_type DEFAULT 'MEDIUM'::priority_type NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'DEADLINE' NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    related_deadline_id UUID REFERENCES deadlines(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Create Push Tokens Table
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fcm_token VARCHAR(255) NOT NULL UNIQUE,
    platform VARCHAR(50) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =========================================================================
-- INDEX DEFINITIONS (Performance Optimization - Idempotent)
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_uid ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_department ON deadlines(department_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_due_date ON deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_deadlines_is_completed ON deadlines(is_completed);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

-- =========================================================================
-- DATABASE TRIGGER FUNCTIONS & TRIGGERS (Idempotent)
-- =========================================================================

-- Trigger function to automatically update updated_at timestamp columns
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_modtime ON users;
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_deadlines_modtime ON deadlines;
CREATE TRIGGER update_deadlines_modtime BEFORE UPDATE ON deadlines FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_push_tokens_modtime ON push_tokens;
CREATE TRIGGER update_push_tokens_modtime BEFORE UPDATE ON push_tokens FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- 1. Departments Policies
DROP POLICY IF EXISTS "Allow authenticated read for departments" ON departments;
CREATE POLICY "Allow authenticated read for departments" ON departments
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin write for departments" ON departments;
CREATE POLICY "Allow admin write for departments" ON departments
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'ADMIN')
    );

-- 2. Users Policies
DROP POLICY IF EXISTS "Allow authenticated read for user profiles" ON users;
CREATE POLICY "Allow authenticated read for user profiles" ON users
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users to update own profile fields" ON users;
CREATE POLICY "Allow users to update own profile fields" ON users
    FOR UPDATE TO authenticated USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Allow admin full access to users" ON users;
CREATE POLICY "Allow admin full access to users" ON users
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'ADMIN')
    );

-- 3. Deadlines Policies
DROP POLICY IF EXISTS "Allow users to read deadlines in their department" ON deadlines;
CREATE POLICY "Allow users to read deadlines in their department" ON deadlines
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_user_id = auth.uid() 
            AND (users.role IN ('ADMIN', 'HOD') OR users.department_id = deadlines.department_id)
        )
    );

DROP POLICY IF EXISTS "Allow faculty to create deadlines in their own department" ON deadlines;
CREATE POLICY "Allow faculty to create deadlines in their own department" ON deadlines
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_user_id = auth.uid() 
            AND users.id = created_by 
            AND (users.role IN ('ADMIN', 'HOD') OR users.department_id = department_id)
        )
    );

DROP POLICY IF EXISTS "Allow HOD to update/delete department deadlines" ON deadlines;
CREATE POLICY "Allow HOD to update/delete department deadlines" ON deadlines
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_user_id = auth.uid() 
            AND (users.role = 'ADMIN' OR (users.role = 'HOD' AND users.department_id = deadlines.department_id))
        )
    );

-- 4. Notifications Policies
DROP POLICY IF EXISTS "Allow users to manage own notifications" ON notifications;
CREATE POLICY "Allow users to manage own notifications" ON notifications
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_user_id = auth.uid() AND users.id = user_id
        )
    );

-- 5. Push Tokens Policies
DROP POLICY IF EXISTS "Allow users to manage own push tokens" ON push_tokens;
CREATE POLICY "Allow users to manage own push tokens" ON push_tokens
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_user_id = auth.uid() AND users.id = user_id
        )
    );

-- =========================================================================
-- AUTOMATIC PROFILE ONBOARDING & DOMAIN RESTRICTION TRIGGER
-- =========================================================================

-- Trigger function to auto-create user profile and assign role during signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_dept_id UUID;
BEGIN
    -- Verify approved email domain
    IF NEW.email LIKE '%@christuniversity.in' THEN
        -- Find or create a default department
        SELECT id INTO default_dept_id FROM public.departments LIMIT 1;
        IF default_dept_id IS NULL THEN
            INSERT INTO public.departments (name, code)
            VALUES ('General Faculty Department', 'GEN')
            RETURNING id INTO default_dept_id;
        END IF;

        -- Auto-create profile with FACULTY role
        INSERT INTO public.users (id, auth_user_id, email, full_name, role, department_id, avatar_url)
        VALUES (
            NEW.id,
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Faculty Member'),
            'FACULTY'::role_type,
            default_dept_id,
            NEW.raw_user_meta_data->>'avatar_url'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
