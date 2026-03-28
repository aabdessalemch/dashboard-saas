-- Run this SQL in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This creates a function that allows looking up users by email for sharing.
-- It uses SECURITY DEFINER to bypass RLS (runs with the function creator's privileges).

-- 1. Make sure the profiles table has an email column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Backfill emails from auth.users into profiles for all existing users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');

-- 3. Create a function to look up a user by exact email (for sharing)
CREATE OR REPLACE FUNCTION public.lookup_user_by_email(lookup_email TEXT)
RETURNS TABLE(id UUID, email TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email
  FROM public.profiles p
  WHERE LOWER(p.email) = LOWER(lookup_email)
  LIMIT 1;
$$;

-- 4. Create a function to search users by partial email (for autocomplete)
CREATE OR REPLACE FUNCTION public.search_users_by_email(search_term TEXT, exclude_user_id UUID DEFAULT NULL)
RETURNS TABLE(email TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.email
  FROM public.profiles p
  WHERE p.email ILIKE '%' || search_term || '%'
    AND (exclude_user_id IS NULL OR p.id != exclude_user_id)
    AND p.email IS NOT NULL
  LIMIT 5;
$$;

-- 5. Grant execute permissions to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.lookup_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_user_by_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.search_users_by_email(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_users_by_email(TEXT, UUID) TO anon;

-- 6. Add RLS policy to allow users to update their own email in profiles
-- (This ensures the upsert in initializeUser works)
DO $$
BEGIN
  -- Allow users to insert their own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON public.profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;

  -- Allow users to update their own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = id);
  END IF;

  -- Allow users to read their own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can read own profile'
  ) THEN
    CREATE POLICY "Users can read own profile"
      ON public.profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;
END $$;
