-- 1. Rename created_by to owner_id in deadlines table safely
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deadlines' AND column_name='created_by') THEN
    ALTER TABLE "deadlines" RENAME COLUMN "created_by" TO "owner_id";
  END IF;
END $$;

-- 2. Drop visibility column if exists
ALTER TABLE IF EXISTS "deadlines" DROP COLUMN IF EXISTS "visibility";

-- 3. Enable RLS on all relevant tables
ALTER TABLE "deadlines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for Deadlines
DROP POLICY IF EXISTS select_own_deadlines ON "deadlines";
CREATE POLICY select_own_deadlines ON "deadlines"
  FOR SELECT USING (
    owner_id IN (SELECT id FROM users WHERE supabase_user_id = auth.uid())
  );

DROP POLICY IF EXISTS insert_own_deadlines ON "deadlines";
CREATE POLICY insert_own_deadlines ON "deadlines"
  FOR INSERT WITH CHECK (
    owner_id IN (SELECT id FROM users WHERE supabase_user_id = auth.uid())
  );

DROP POLICY IF EXISTS update_own_deadlines ON "deadlines";
CREATE POLICY update_own_deadlines ON "deadlines"
  FOR UPDATE USING (
    owner_id IN (SELECT id FROM users WHERE supabase_user_id = auth.uid())
  );

DROP POLICY IF EXISTS delete_own_deadlines ON "deadlines";
CREATE POLICY delete_own_deadlines ON "deadlines"
  FOR DELETE USING (
    owner_id IN (SELECT id FROM users WHERE supabase_user_id = auth.uid())
  );

-- 5. Create RLS Policies for Reminders
DROP POLICY IF EXISTS select_own_reminders ON "reminders";
CREATE POLICY select_own_reminders ON "reminders"
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE supabase_user_id = auth.uid())
  );

DROP POLICY IF EXISTS insert_own_reminders ON "reminders";
CREATE POLICY insert_own_reminders ON "reminders"
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE supabase_user_id = auth.uid())
  );

DROP POLICY IF EXISTS update_own_reminders ON "reminders";
CREATE POLICY update_own_reminders ON "reminders"
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE supabase_user_id = auth.uid())
  );

DROP POLICY IF EXISTS delete_own_reminders ON "reminders";
CREATE POLICY delete_own_reminders ON "reminders"
  FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE supabase_user_id = auth.uid())
  );

-- 6. Create RLS Policies for Notifications
DROP POLICY IF EXISTS select_own_notifications ON "notifications";
CREATE POLICY select_own_notifications ON "notifications"
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE supabase_user_id = auth.uid())
  );

DROP POLICY IF EXISTS insert_own_notifications ON "notifications";
CREATE POLICY insert_own_notifications ON "notifications"
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE supabase_user_id = auth.uid())
  );

DROP POLICY IF EXISTS update_own_notifications ON "notifications";
CREATE POLICY update_own_notifications ON "notifications"
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE supabase_user_id = auth.uid())
  );

DROP POLICY IF EXISTS delete_own_notifications ON "notifications";
CREATE POLICY delete_own_notifications ON "notifications"
  FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE supabase_user_id = auth.uid())
  );

-- 7. Create RLS Policies for Calendar Events
DROP POLICY IF EXISTS select_own_calendar_events ON "calendar_events";
CREATE POLICY select_own_calendar_events ON "calendar_events"
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE supabase_user_id = auth.uid())
  );

DROP POLICY IF EXISTS insert_own_calendar_events ON "calendar_events";
CREATE POLICY insert_own_calendar_events ON "calendar_events"
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE supabase_user_id = auth.uid())
  );

DROP POLICY IF EXISTS update_own_calendar_events ON "calendar_events";
CREATE POLICY update_own_calendar_events ON "calendar_events"
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE supabase_user_id = auth.uid())
  );

DROP POLICY IF EXISTS delete_own_calendar_events ON "calendar_events";
CREATE POLICY delete_own_calendar_events ON "calendar_events"
  FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE supabase_user_id = auth.uid())
  );
