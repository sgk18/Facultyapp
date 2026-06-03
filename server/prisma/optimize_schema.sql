-- =========================================================================
-- DATABASE SCHEMA OPTIMIZATION MIGRATION SCRIPT
-- Consolidates 9 tables into 5 tables:
-- departments, users, deadlines, notifications, audit_logs
-- Run this in your Supabase SQL Editor to execute the optimization.
-- =========================================================================

-- 1. Add new consolidated columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gmail_sync_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS calendar_sync_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fcm_token text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_id text UNIQUE;

-- 2. Add new consolidated columns to deadlines table
ALTER TABLE public.deadlines ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.deadlines ADD COLUMN IF NOT EXISTS reminder_time timestamp without time zone;
ALTER TABLE public.deadlines ADD COLUMN IF NOT EXISTS repeat_type text;
ALTER TABLE public.deadlines ADD COLUMN IF NOT EXISTS sync_to_calendar boolean NOT NULL DEFAULT false;
ALTER TABLE public.deadlines ADD COLUMN IF NOT EXISTS google_event_id text UNIQUE;

-- 3. Data Migration: Copy sync settings and google profile details from google_accounts to users
UPDATE public.users u
SET gmail_sync_enabled = g.sync_gmail,
    calendar_sync_enabled = g.sync_calendar,
    google_id = g.google_id
FROM public.google_accounts g
WHERE u.id = g.user_id;

-- 4. Data Migration: Copy push tokens to users (take the latest updated token for each user)
UPDATE public.users u
SET fcm_token = p.fcm_token,
    platform = p.platform
FROM (
  SELECT DISTINCT ON (user_id) user_id, fcm_token, platform, updated_at
  FROM public.push_tokens
  ORDER BY user_id, updated_at DESC
) p
WHERE u.id = p.user_id;

-- 5. Data Migration: Copy reminder properties for reminders already linked to deadlines
UPDATE public.deadlines d
SET reminder_enabled = true,
    reminder_time = r.reminder_time,
    repeat_type = r.repeat_type
FROM public.reminders r
WHERE d.id = r.deadline_id;

-- 6. Data Migration: Convert standalone reminders into deadlines
INSERT INTO public.deadlines (
  id, title, description, due_date, owner_id, department_id, is_completed, status, priority,
  reminder_enabled, reminder_time, repeat_type, sync_to_calendar, created_at, updated_at
)
SELECT 
  r.id,
  r.title,
  COALESCE(r.description, 'Personal Reminder'),
  r.reminder_time,
  r.user_id,
  u.department_id,
  r.status = 'COMPLETED',
  CASE WHEN r.status = 'COMPLETED' THEN 'COMPLETED' ELSE 'ACTIVE' END,
  'MEDIUM'::"Priority",
  true,
  r.reminder_time,
  r.repeat_type,
  false,
  r.created_at,
  r.updated_at
FROM public.reminders r
JOIN public.users u ON r.user_id = u.id
WHERE r.deadline_id IS NULL;

-- 7. Data Migration: Copy calendar event sync properties for events linked to deadlines
UPDATE public.deadlines d
SET sync_to_calendar = true,
    google_event_id = c.google_event_id
FROM public.calendar_events c
WHERE d.id = c.deadline_id;

-- 8. Data Migration: Convert standalone calendar events into deadlines
INSERT INTO public.deadlines (
  id, title, description, due_date, owner_id, department_id, is_completed, status, priority,
  reminder_enabled, sync_to_calendar, google_event_id, created_at, updated_at
)
SELECT 
  c.id,
  c.title,
  COALESCE(c.description, 'Calendar Event'),
  c.start_time,
  c.user_id,
  u.department_id,
  false,
  'ACTIVE',
  'MEDIUM'::"Priority",
  false,
  true,
  c.google_event_id,
  c.created_at,
  c.updated_at
FROM public.calendar_events c
JOIN public.users u ON c.user_id = u.id
WHERE c.deadline_id IS NULL;

-- 9. Drop old tables and references
ALTER TABLE IF EXISTS public.google_accounts DROP CONSTRAINT IF EXISTS google_accounts_user_id_fkey;
DROP TABLE IF EXISTS public.google_accounts;

ALTER TABLE IF EXISTS public.push_tokens DROP CONSTRAINT IF EXISTS push_tokens_user_id_fkey;
DROP TABLE IF EXISTS public.push_tokens;

ALTER TABLE IF EXISTS public.reminders DROP CONSTRAINT IF EXISTS reminders_deadline_id_fkey;
ALTER TABLE IF EXISTS public.reminders DROP CONSTRAINT IF EXISTS reminders_user_id_fkey;
DROP TABLE IF EXISTS public.reminders;

ALTER TABLE IF EXISTS public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_deadline_id_fkey;
ALTER TABLE IF EXISTS public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_user_id_fkey;
DROP TABLE IF EXISTS public.calendar_events;

-- 10. Performance Indexes on consolidation columns
CREATE INDEX IF NOT EXISTS "idx_users_fcm_token" ON public.users("fcm_token");
CREATE INDEX IF NOT EXISTS "idx_deadlines_reminders" ON public.deadlines("reminder_enabled", "reminder_time") WHERE reminder_enabled = true;
CREATE INDEX IF NOT EXISTS "idx_deadlines_calendar" ON public.deadlines("sync_to_calendar", "due_date") WHERE sync_to_calendar = true;

-- 11. Print completion confirmation
SELECT 'Database schema successfully optimized to 5 tables. Existing records safely migrated.' AS result;
