-- ========================================
-- COMPREHENSIVE FIX: All Authentication Issues
-- Run this ENTIRE file in your Supabase SQL Editor
-- This fixes: Logout, Profile loading, Admin access
-- ========================================

-- Step 1: Disable problematic triggers that block authentication
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_create_admin_on_signup ON auth.users;

-- Step 2: Ensure RLS policies allow users to insert their own profile
-- (This should already exist, but ensuring it's correct)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Step 3: Create profile and admin for ankush@jarvisatwork.com
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find user ID for ankush@jarvisatwork.com
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER('ankush@jarvisatwork.com')
  LIMIT 1;
  
  -- Create admin entry if user exists
  IF admin_user_id IS NOT NULL THEN
    -- First create profile if it doesn't exist
    INSERT INTO public.profiles (id, email, name, avatar, is_pro, created_at, updated_at)
    SELECT 
      admin_user_id,
      email,
      COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', 'User'),
      raw_user_meta_data->>'avatar_url',
      false,
      NOW(),
      NOW()
    FROM auth.users
    WHERE id = admin_user_id
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = NOW();
    
    -- Then create admin entry
    INSERT INTO public.admin_users (user_id, email, is_super_admin)
    VALUES (admin_user_id, 'ankush@jarvisatwork.com', true)
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      is_super_admin = true,
      updated_at = NOW();
      
    RAISE NOTICE 'Admin user created/updated for %', 'ankush@jarvisatwork.com';
  ELSE
    RAISE NOTICE 'User with email ankush@jarvisatwork.com not found in auth.users';
  END IF;
END $$;

-- Step 3: Verify profile and admin were created
SELECT 
  p.id,
  p.email,
  p.name,
  p.is_pro,
  p.created_at
FROM profiles p
WHERE LOWER(p.email) = LOWER('ankush@jarvisatwork.com');

SELECT 
  au.id,
  au.user_id,
  au.email,
  au.is_super_admin,
  au.created_at
FROM admin_users au
WHERE LOWER(au.email) = LOWER('ankush@jarvisatwork.com');

-- After running this:
-- 1. Profile should be created in the profiles table
-- 2. Admin entry should be created in admin_users table
-- 3. Try logging in again and check if admin features appear
