-- Taskify Database Setup Script
-- Run this in your Supabase SQL Editor to create all required tables

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  is_pro BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow users to insert their own profile (must match their auth.uid())
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create function to handle profile creation/update (bypasses RLS)
-- IMPORTANT: This function must NEVER raise an exception that would block auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_result BOOLEAN := false;
BEGIN
  -- Wrap everything in a block that catches ALL exceptions
  BEGIN
    -- Only proceed if email exists
    IF NEW.email IS NOT NULL AND NEW.email != '' THEN
      -- Try to insert/update profile
      INSERT INTO public.profiles (id, email, name, avatar, is_pro, created_at, updated_at)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
        NEW.raw_user_meta_data->>'avatar_url',
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, profiles.name),
        avatar = COALESCE(EXCLUDED.avatar, profiles.avatar),
        updated_at = NOW();
    END IF;
  EXCEPTION
    -- Catch ANY exception and do nothing - this ensures auth always succeeds
    WHEN OTHERS THEN
      -- Do absolutely nothing - not even logging
      -- This is critical to not block the auth transaction
      v_result := true; -- Dummy assignment to prevent empty exception handler
  END;

  -- CRITICAL: Always return NEW to allow auth transaction to succeed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create profile on user signup (INSERT only)
-- NOTE: Temporarily disabled - profile creation handled client-side to avoid blocking auth
-- Uncomment below to re-enable trigger-based profile creation
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION handle_new_user();

-- 2. Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  task_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable Row Level Security for chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON chat_messages;

-- Create policies for chat_messages
CREATE POLICY "Users can view own messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  due_time TIME,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low', 'none')) DEFAULT 'medium',
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'overdue')) DEFAULT 'pending',
  category TEXT NOT NULL CHECK (category IN ('work', 'personal', 'health', 'shopping', 'other')) DEFAULT 'personal',
  tags TEXT[],
  assigned_to TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_pattern TEXT,
  created_by_id UUID REFERENCES auth.users(id),
  updated_by_id UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- Enable Row Level Security for tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

-- Create policies for tasks
CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reminder_time TIMESTAMPTZ NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('due_date', 'custom', 'recurring')) DEFAULT 'custom',
  is_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for reminders
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_task_id ON reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_time ON reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_reminders_is_sent ON reminders(is_sent);

-- Enable Row Level Security for reminders
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can insert own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete own reminders" ON reminders;

-- Create policies for reminders
CREATE POLICY "Users can view own reminders"
  ON reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders"
  ON reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
  ON reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
  ON reminders FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Create ai_usage table
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'max')) DEFAULT 'free',
  usage_limit INTEGER NOT NULL DEFAULT 50,
  current_usage INTEGER NOT NULL DEFAULT 0,
  reset_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for ai_usage
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_reset_date ON ai_usage(reset_date);

-- Enable Row Level Security for ai_usage
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own usage" ON ai_usage;
DROP POLICY IF EXISTS "Users can update own usage" ON ai_usage;
DROP POLICY IF EXISTS "Users can insert own usage" ON ai_usage;

-- Create policies for ai_usage
CREATE POLICY "Users can view own usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON ai_usage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. Create function to increment AI usage
CREATE OR REPLACE FUNCTION increment_ai_usage(user_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE ai_usage
  SET current_usage = current_usage + 1,
      updated_at = NOW()
  WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create friend_relationships table
CREATE TABLE IF NOT EXISTS friend_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_friend_relationships_requester ON friend_relationships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friend_relationships_addressee ON friend_relationships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friend_relationships_status ON friend_relationships(status);

-- Enable Row Level Security
ALTER TABLE friend_relationships ENABLE ROW LEVEL SECURITY;

-- Policies for friend_relationships
DROP POLICY IF EXISTS "Users can view friend relationships" ON friend_relationships;
DROP POLICY IF EXISTS "Users can create friend requests" ON friend_relationships;
DROP POLICY IF EXISTS "Users can update own friend requests" ON friend_relationships;

CREATE POLICY "Users can view friend relationships"
  ON friend_relationships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can create friend requests"
  ON friend_relationships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update own friend requests"
  ON friend_relationships FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- 8. Create task_shares table for shared tasks
CREATE TABLE IF NOT EXISTS task_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  shared_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')) DEFAULT 'view',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, shared_with_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_shares_task_id ON task_shares(task_id);
CREATE INDEX IF NOT EXISTS idx_task_shares_shared_by ON task_shares(shared_by_id);
CREATE INDEX IF NOT EXISTS idx_task_shares_shared_with ON task_shares(shared_with_id);

-- Enable Row Level Security
ALTER TABLE task_shares ENABLE ROW LEVEL SECURITY;

-- Policies for task_shares
DROP POLICY IF EXISTS "Users can view shared tasks" ON task_shares;
DROP POLICY IF EXISTS "Users can share tasks" ON task_shares;
DROP POLICY IF EXISTS "Users can update shared tasks" ON task_shares;
DROP POLICY IF EXISTS "Users can delete shared tasks" ON task_shares;

CREATE POLICY "Users can view shared tasks"
  ON task_shares FOR SELECT
  USING (auth.uid() = shared_by_id OR auth.uid() = shared_with_id);

CREATE POLICY "Users can share tasks"
  ON task_shares FOR INSERT
  WITH CHECK (auth.uid() = shared_by_id);

CREATE POLICY "Users can update shared tasks"
  ON task_shares FOR UPDATE
  USING (auth.uid() = shared_by_id);

CREATE POLICY "Users can delete shared tasks"
  ON task_shares FOR DELETE
  USING (auth.uid() = shared_by_id OR auth.uid() = shared_with_id);

-- 9. Update tasks table to track created_by and updated_by
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES auth.users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 10. Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  task_reminders BOOLEAN DEFAULT TRUE,
  overdue_tasks BOOLEAN DEFAULT TRUE,
  shared_task_updates BOOLEAN DEFAULT TRUE,
  daily_summaries BOOLEAN DEFAULT FALSE,
  friend_requests BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can manage own notification settings" ON notification_settings;

CREATE POLICY "Users can manage own notification settings"
  ON notification_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 11. Create function to update task updated_by and updated_at
CREATE OR REPLACE FUNCTION update_task_metadata()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by_id = auth.uid();
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_task_metadata ON tasks;
CREATE TRIGGER trigger_update_task_metadata
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_metadata();

-- 12. Create admin_users table (restricted access)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  is_super_admin BOOLEAN DEFAULT FALSE,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security for admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin_users (enforced by function)
DROP POLICY IF EXISTS "Admins can view admin_users" ON admin_users;

CREATE POLICY "Admins can view admin_users"
  ON admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Allow users with matching email to insert their own admin record
-- This is a fallback for the trigger function
DROP POLICY IF EXISTS "Users can insert admin for matching email" ON admin_users;

CREATE POLICY "Users can insert admin for matching email"
  ON admin_users FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND LOWER(email) = LOWER('ankush@jarvisatwork.com')
  );

-- 13. Create app_metrics table for admin dashboard
CREATE TABLE IF NOT EXISTS app_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  free_users INTEGER DEFAULT 0,
  pro_users INTEGER DEFAULT 0,
  max_users INTEGER DEFAULT 0,
  total_tasks INTEGER DEFAULT 0,
  tasks_created_today INTEGER DEFAULT 0,
  shared_tasks INTEGER DEFAULT 0,
  ai_messages_today INTEGER DEFAULT 0,
  notifications_sent_today INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(metric_date)
);

-- Enable Row Level Security
ALTER TABLE app_metrics ENABLE ROW LEVEL SECURITY;

-- Only admins can view metrics
DROP POLICY IF EXISTS "Admins can view metrics" ON app_metrics;

CREATE POLICY "Admins can view metrics"
  ON app_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- 14. Create ai_usage_logs table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  response_time_ms INTEGER,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_success ON ai_usage_logs(success);

-- Enable Row Level Security
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view AI logs
DROP POLICY IF EXISTS "Admins can view AI logs" ON ai_usage_logs;

CREATE POLICY "Admins can view AI logs"
  ON ai_usage_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- 15. Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_success ON notification_logs(success);

-- Enable Row Level Security
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view notification logs
DROP POLICY IF EXISTS "Admins can view notification logs" ON notification_logs;

CREATE POLICY "Admins can view notification logs"
  ON notification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- 16. Create system_settings table for admin controls
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('maintenance_mode', '{"enabled": false}', 'Maintenance mode toggle'),
  ('ai_enabled', '{"enabled": true}', 'AI service toggle'),
  ('collaboration_enabled', '{"enabled": true}', 'Task collaboration toggle'),
  ('notifications_enabled', '{"enabled": true}', 'Push notifications toggle'),
  ('ads_enabled', '{"enabled": false, "free_only": false}', 'Ads configuration'),
  ('ai_limits', '{"free": 50, "pro": 500, "max": 5000}', 'AI usage limits per plan')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read (for app functionality), only admins can write
DROP POLICY IF EXISTS "Anyone can read settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON system_settings;

CREATE POLICY "Anyone can read settings"
  ON system_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update settings"
  ON system_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- 17. Create function to check admin access
CREATE OR REPLACE FUNCTION is_admin(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. Create function to get admin email (for initial admin setup)
CREATE OR REPLACE FUNCTION get_admin_email()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ankush@jarvisatwork.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 19. Create trigger to auto-create admin user (if email matches)
CREATE OR REPLACE FUNCTION create_admin_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Wrap in exception handler to never block auth
  BEGIN
    -- Check if email matches admin email (case-insensitive)
    IF LOWER(NEW.email) = LOWER(get_admin_email()) THEN
      INSERT INTO public.admin_users (user_id, email, is_super_admin)
      VALUES (NEW.id, NEW.email, true)
      ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Silently fail - never block auth transaction
      NULL;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users (runs on INSERT and UPDATE)
DROP TRIGGER IF EXISTS trigger_create_admin_on_signup ON auth.users;
CREATE TRIGGER trigger_create_admin_on_signup
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_admin_on_signup();

-- Manually create admin user for existing users (if email matches)
-- This will run once and create admin user if they already exist
DO $$
DECLARE
  admin_user_id UUID;
  admin_email TEXT;
BEGIN
  admin_email := get_admin_email();
  
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(admin_email)
  LIMIT 1;
  
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.admin_users (user_id, email, is_super_admin)
    VALUES (admin_user_id, admin_email, true)
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = NOW();
  END IF;
END $$;

-- 20. Enable Real-time for tables
-- Note: Real-time must be enabled through Supabase dashboard
-- Go to Database > Replication and enable for: chat_messages, tasks, friend_relationships, task_shares, system_settings

-- Success message (this won't execute but shows the script completed)
-- All tables created successfully!
