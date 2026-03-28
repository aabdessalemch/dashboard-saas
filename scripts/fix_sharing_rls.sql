-- ============================================================
-- Talk to Data — Sharing Feature SQL Fix
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor
-- ============================================================

-- Step 1: Check current profiles policies (informational)
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'profiles'
-- ORDER BY policyname;

-- Step 2: Allow authenticated users to read ANY profile (needed for sharing)
-- This is the critical missing policy. Without it, users can only see their own row.
CREATE POLICY "Authenticated users can read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- Step 3: Ensure profiles table has an email column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email from auth.users for all existing users
UPDATE profiles
SET email = auth.users.email
FROM auth.users
WHERE profiles.id = auth.users.id
  AND profiles.email IS NULL;

-- Step 4: Trigger to auto-sync email on signup and email change

-- Function: sync email on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function: sync email when user updates their auth email
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET email = new.email
  WHERE id = new.id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_email_update();

-- Step 5: Ensure project_shares RLS policies exist

-- Owner can see all shares for their projects
DO $$ BEGIN
  CREATE POLICY "Owners can view their project shares"
  ON project_shares FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Recipient can see shares where they are the recipient
DO $$ BEGIN
  CREATE POLICY "Recipients can view shares with them"
  ON project_shares FOR SELECT
  TO authenticated
  USING (shared_with_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Owner can create shares
DO $$ BEGIN
  CREATE POLICY "Owners can create shares"
  ON project_shares FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Owner can delete shares
DO $$ BEGIN
  CREATE POLICY "Owners can delete shares"
  ON project_shares FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Owner can update shares
DO $$ BEGIN
  CREATE POLICY "Owners can update shares"
  ON project_shares FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Done! Verify by running:
-- SELECT * FROM profiles LIMIT 5;
-- (Should show rows with email populated)
-- ============================================================
