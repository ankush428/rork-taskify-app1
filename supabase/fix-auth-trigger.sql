-- Fix: Disable triggers that are blocking authentication
-- Run this in your Supabase SQL Editor to fix "Database error granting user"
-- Copy and paste this entire file into Supabase SQL Editor and run it

-- Step 1: Disable the profile creation trigger (if it exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Disable the admin creation trigger (temporarily to fix auth)
DROP TRIGGER IF EXISTS trigger_create_admin_on_signup ON auth.users;

-- Step 3: Verify triggers are disabled
-- This will show all triggers on auth.users - there should be NONE after running above
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND event_object_schema = 'auth';

-- After running this SQL:
-- 1. Try signing in again - authentication should now work
-- 2. Profile creation will be handled by client-side code (AuthProvider.tsx)
-- 3. Admin users can be created manually if needed later
