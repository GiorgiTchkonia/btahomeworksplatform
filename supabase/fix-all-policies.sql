-- =============================================================================
-- Comprehensive SQL Patch: Fix Policies, Constraints & Storage Setup
-- Run this script in the Supabase SQL Editor to resolve permission and constraint issues.
-- All policy statements are idempotent (using DROP POLICY IF EXISTS before CREATE).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Helper Function: get_user_role()
-- Ensure the SECURITY DEFINER function exists so role checks bypass RLS recursion.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- 1. Submissions: Allow students to update their own submissions (resubmission)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Students can update own submissions" ON submissions;
CREATE POLICY "Students can update own submissions" ON submissions
  FOR UPDATE USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- -----------------------------------------------------------------------------
-- 2. Profiles: Allow users to update their own profile
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 3. Subjects: Allow admins to manage subjects (INSERT, UPDATE, DELETE)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage subjects" ON subjects;
CREATE POLICY "Admins can manage subjects" ON subjects
  FOR ALL USING (public.get_user_role() = 'ADMIN');

-- -----------------------------------------------------------------------------
-- 4. Submissions: Add UNIQUE constraint on (assignment_id, student_id)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'submissions'::regclass
      AND conname = 'submissions_assignment_id_student_id_key'
  ) THEN
    ALTER TABLE submissions
      ADD CONSTRAINT submissions_assignment_id_student_id_key
      UNIQUE (assignment_id, student_id);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. Storage: Create homework-files bucket and configure RLS policies
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('homework-files', 'homework-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
CREATE POLICY "Authenticated users can upload files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'homework-files' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view files" ON storage.objects;
CREATE POLICY "Authenticated users can view files" ON storage.objects
  FOR SELECT USING (bucket_id = 'homework-files' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE USING (bucket_id = 'homework-files' AND auth.uid()::text = (storage.foldername(name))[1]);
