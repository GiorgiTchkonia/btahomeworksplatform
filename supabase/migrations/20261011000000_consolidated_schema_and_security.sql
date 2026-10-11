-- =============================================================================
-- BTA Homeworks: Consolidated Schema, Security, RLS & Storage Migration
-- Version: 20261011000000
-- Idempotent: Safe to execute on both fresh setups and existing databases
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Custom Types
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Core Tables
-- -----------------------------------------------------------------------------

-- 2.1 Profiles Table (tied to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role user_role NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  grade TEXT,
  subject TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 2.3 Assignments Table
CREATE TABLE IF NOT EXISTS public.assignments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  subject_id TEXT REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  allowed_formats TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure column allowed_formats exists if table was created by older schema
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'allowed_formats'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN allowed_formats TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- 2.4 Submissions Table
CREATE TABLE IF NOT EXISTS public.submissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  assignment_id TEXT REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  file_size TEXT,
  submission_link TEXT,
  student_comment TEXT,
  status TEXT DEFAULT 'SUBMITTED',
  teacher_feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  reviewed_at TIMESTAMPTZ,
  grade INTEGER
);

-- Ensure submission columns and relaxed nullability for link-only submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'submissions' AND column_name = 'submission_link'
  ) THEN
    ALTER TABLE public.submissions ADD COLUMN submission_link TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'submissions' AND column_name = 'grade'
  ) THEN
    ALTER TABLE public.submissions ADD COLUMN grade INTEGER;
  END IF;

  -- Relax NOT NULL if older schema enforced it
  ALTER TABLE public.submissions ALTER COLUMN file_url DROP NOT NULL;
  ALTER TABLE public.submissions ALTER COLUMN file_name DROP NOT NULL;
  ALTER TABLE public.submissions ALTER COLUMN file_size DROP NOT NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Constraints & Validation Checks
-- -----------------------------------------------------------------------------

-- Unique submission per (assignment_id, student_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.submissions'::regclass
      AND conname = 'submissions_assignment_id_student_id_key'
  ) THEN
    ALTER TABLE public.submissions
      ADD CONSTRAINT submissions_assignment_id_student_id_key
      UNIQUE (assignment_id, student_id);
  END IF;
END $$;

-- Validate submission link protocol and hostnames (Google Drive / Docs only)
ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS check_submission_link_valid;

ALTER TABLE public.submissions
  ADD CONSTRAINT check_submission_link_valid
  CHECK (
    submission_link IS NULL OR 
    (submission_link ~* '^https:\/\/(drive\.google\.com|docs\.google\.com)\/.*$')
  );

-- Grade constraint: nullable integer between 1 and 10
ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_grade_check;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_grade_check
  CHECK (
    grade IS NULL OR 
    (grade >= 1 AND grade <= 10)
  );

-- -----------------------------------------------------------------------------
-- 4. Performance Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject_id ON public.assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON public.assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subjects_teacher_id ON public.subjects(teacher_id);

-- -----------------------------------------------------------------------------
-- 5. Helper Security Functions & Triggers
-- -----------------------------------------------------------------------------

-- 5.1 Helper: get_user_role() (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 5.2 Trigger: Prevent unauthorized profile role and email self-escalation
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block non-admin users from altering their role
  IF NEW.role IS DISTINCT FROM OLD.role AND public.get_user_role() != 'ADMIN' THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can modify user role';
  END IF;

  -- Block non-admin users from altering their email directly in profiles
  IF NEW.email IS DISTINCT FROM OLD.email AND public.get_user_role() != 'ADMIN' THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can modify profile email directly';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_unauthorized_profile_updates ON public.profiles;
CREATE TRIGGER trg_prevent_unauthorized_profile_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unauthorized_profile_updates();

-- 5.3 Trigger: Enforce submission rules (due_date, student identity, feedback protection)
CREATE OR REPLACE FUNCTION public.enforce_submission_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_due_date TIMESTAMPTZ;
  v_student_real_name TEXT;
  v_assignment_teacher_id UUID;
BEGIN
  v_role := public.get_user_role();

  -- Retrieve assignment details
  SELECT due_date, teacher_id INTO v_due_date, v_assignment_teacher_id
  FROM public.assignments
  WHERE id = NEW.assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;

  -- Logic for STUDENT operations (or non-admin callers who do not own the assignment)
  IF v_role = 'STUDENT' OR (v_role != 'ADMIN' AND auth.uid() != v_assignment_teacher_id) THEN
    -- Student must submit as themselves
    IF NEW.student_id != auth.uid() THEN
      RAISE EXCEPTION 'Unauthorized: Student ID must match authenticated user';
    END IF;

    -- Enforce due date deadline
    IF now() > v_due_date THEN
      RAISE EXCEPTION 'დავალების ვადა ამოიწურა. ჩაბარება შეუძლებელია.';
    END IF;

    -- Guarantee student_name matches authentic profile
    SELECT name INTO v_student_real_name FROM public.profiles WHERE id = auth.uid();
    IF v_student_real_name IS NOT NULL THEN
      NEW.student_name := v_student_real_name;
    END IF;

    -- Force status to SUBMITTED
    NEW.status := 'SUBMITTED';

    -- Forbid student from modifying teacher-managed review fields
    NEW.teacher_feedback := NULL;
    NEW.reviewed_at := NULL;
    NEW.grade := NULL;
  END IF;

  -- Logic for TEACHER review operations
  IF v_role = 'TEACHER' AND auth.uid() = v_assignment_teacher_id THEN
    IF TG_OP = 'UPDATE' THEN
      -- Preserve immutable student submission content during teacher review
      NEW.student_id := OLD.student_id;
      NEW.assignment_id := OLD.assignment_id;
      NEW.student_name := OLD.student_name;
      NEW.file_url := OLD.file_url;
      NEW.file_name := OLD.file_name;
      NEW.file_size := OLD.file_size;
      NEW.submission_link := OLD.submission_link;
      NEW.student_comment := OLD.student_comment;
      NEW.submitted_at := OLD.submitted_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_submission_rules ON public.submissions;
CREATE TRIGGER trg_enforce_submission_rules
  BEFORE INSERT OR UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_submission_rules();

-- -----------------------------------------------------------------------------
-- 6. Row Level Security (RLS) Configuration
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 6.1 Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view teacher profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view their students" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view teacher profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view students" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Authenticated users can view teacher profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (role = 'TEACHER');

CREATE POLICY "Teachers can view students" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'TEACHER' AND role = 'STUDENT');

CREATE POLICY "Admins have full access to profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'ADMIN');

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6.2 Subjects Policies
DROP POLICY IF EXISTS "Subjects are viewable by everyone" ON public.subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
DROP POLICY IF EXISTS "Authenticated users can view subjects" ON public.subjects;

CREATE POLICY "Authenticated users can view subjects" ON public.subjects
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage subjects" ON public.subjects
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'ADMIN');

-- 6.3 Assignments Policies
DROP POLICY IF EXISTS "Assignments are viewable by everyone" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can manage their own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Authenticated users can view assignments" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can create own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can update own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can delete own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.assignments;

CREATE POLICY "Authenticated users can view assignments" ON public.assignments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Teachers can create own assignments" ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'TEACHER' AND
    auth.uid() = teacher_id AND
    EXISTS (SELECT 1 FROM public.subjects WHERE id = subject_id AND teacher_id = auth.uid())
  );

CREATE POLICY "Teachers can update own assignments" ON public.assignments
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'TEACHER' AND auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own assignments" ON public.assignments
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'TEACHER' AND auth.uid() = teacher_id);

CREATE POLICY "Admins can manage assignments" ON public.assignments
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'ADMIN');

-- 6.4 Submissions Policies
DROP POLICY IF EXISTS "Students can view their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can create their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers can view and update submissions for their assignments" ON public.submissions;
DROP POLICY IF EXISTS "Students can update own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can view own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers can view submissions for their assignments" ON public.submissions;
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can create own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers can update submissions for their assignments" ON public.submissions;
DROP POLICY IF EXISTS "Students can delete own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Admins can manage submissions" ON public.submissions;

CREATE POLICY "Students can view own submissions" ON public.submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view submissions for their assignments" ON public.submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments 
      WHERE assignments.id = submissions.assignment_id 
        AND assignments.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all submissions" ON public.submissions
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'ADMIN');

CREATE POLICY "Students can create own submissions" ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = student_id AND
    public.get_user_role() = 'STUDENT'
  );

CREATE POLICY "Students can update own submissions" ON public.submissions
  FOR UPDATE TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers can update submissions for their assignments" ON public.submissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments 
      WHERE assignments.id = submissions.assignment_id 
        AND assignments.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can delete own submissions" ON public.submissions
  FOR DELETE TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage submissions" ON public.submissions
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'ADMIN');

-- -----------------------------------------------------------------------------
-- 7. Storage Bucket & Policies (`homework-files`)
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('homework-files', 'homework-files', false, 15728640)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 15728640;

DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view permitted files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete permitted files" ON storage.objects;

-- Upload: authenticated users upload files into their own folder {userId}/{file}
CREATE POLICY "Users can upload to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'homework-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Select: student can view own files; teachers and admins can view all submissions
CREATE POLICY "Users can view permitted files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'homework-files' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      public.get_user_role() IN ('TEACHER', 'ADMIN')
    )
  );

-- Delete: file owner or administrator can delete
CREATE POLICY "Users can delete permitted files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'homework-files' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      public.get_user_role() = 'ADMIN'
    )
  );
