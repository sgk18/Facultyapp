-- Upgrades for CHRIST Faculty App (Supabase PostgreSQL Setup Script)
-- Run this in your Supabase SQL Editor to sync your remote database with the new schema features.

-- 1. Update users table with new/missing fields
ALTER TABLE IF EXISTS "users" 
ADD COLUMN IF NOT EXISTS "password_hash" TEXT,
ADD COLUMN IF NOT EXISTS "employee_id" TEXT,
ADD COLUMN IF NOT EXISTS "auth_user_id" UUID UNIQUE,
ADD COLUMN IF NOT EXISTS "is_suspended" BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Create google_accounts table
CREATE TABLE IF NOT EXISTS "google_accounts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "google_id" TEXT UNIQUE NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "sync_gmail" BOOLEAN NOT NULL DEFAULT FALSE,
  "sync_calendar" BOOLEAN NOT NULL DEFAULT FALSE,
  "connected_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for quick user lookup
CREATE INDEX IF NOT EXISTS "idx_google_accounts_user_id" ON "google_accounts"("user_id");

-- 3. Create calendar_events table
CREATE TABLE IF NOT EXISTS "calendar_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "google_event_id" TEXT UNIQUE,
  "title" TEXT NOT NULL,
  "start_time" TIMESTAMPTZ NOT NULL,
  "end_time" TIMESTAMPTZ NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'APP',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for filtering calendar events by user
CREATE INDEX IF NOT EXISTS "idx_calendar_events_user_id" ON "calendar_events"("user_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_time" ON "calendar_events"("start_time", "end_time");

-- 4. Create reminders table
CREATE TABLE IF NOT EXISTS "reminders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "reminder_time" TIMESTAMPTZ NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for reminder dispatch polling
CREATE INDEX IF NOT EXISTS "idx_reminders_polling" ON "reminders"("status", "reminder_time");
CREATE INDEX IF NOT EXISTS "idx_reminders_user_id" ON "reminders"("user_id");

-- 5. Create audit_logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "action" TEXT NOT NULL,
  "target_user" TEXT,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for admin log queries
CREATE INDEX IF NOT EXISTS "idx_audit_logs_timestamp" ON "audit_logs"("timestamp" DESC);

-- =========================================================================
-- 6. Clean up and refactor authentication schema (Google OAuth & Supabase only)
-- =========================================================================

-- Safely drop local password hashes
ALTER TABLE IF EXISTS "users" DROP COLUMN IF EXISTS "password_hash";

-- Rename auth_user_id to supabase_user_id (if it hasn't been renamed yet)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='auth_user_id') THEN
    ALTER TABLE "users" RENAME COLUMN "auth_user_id" TO "supabase_user_id";
  END IF;
END $$;

-- Make supabase_user_id NOT NULL if we are fully migrated
-- Note: Make sure existing users have a valid supabase UUID linked first before setting this to NOT NULL.
-- ALTER TABLE "users" ALTER COLUMN "supabase_user_id" SET NOT NULL;

-- Rename employee_id to employee_code (if it hasn't been renamed yet)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='employee_id') THEN
    ALTER TABLE "users" RENAME COLUMN "employee_id" TO "employee_code";
  END IF;
END $$;

