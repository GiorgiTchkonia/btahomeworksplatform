-- Apply after 20261011000000. Existing file URLs remain valid; new uploads store paths.
BEGIN;

-- Keep academic history intact even if deletion bypasses the admin UI.
ALTER TABLE public.subjects DROP CONSTRAINT subjects_teacher_id_fkey;
ALTER TABLE public.subjects ADD CONSTRAINT subjects_teacher_id_fkey
  FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.assignments DROP CONSTRAINT assignments_teacher_id_fkey;
ALTER TABLE public.assignments ADD CONSTRAINT assignments_teacher_id_fkey
  FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- Confirmed Auth email is the source of truth; unconfirmed changes stay pending.
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_updates()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF NEW.role IS DISTINCT FROM OLD.role AND public.get_user_role() IS DISTINCT FROM 'ADMIN'::user_role THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can modify user role';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email AND public.get_user_role() IS DISTINCT FROM 'ADMIN'::user_role
     AND NEW.email IS DISTINCT FROM (SELECT email FROM auth.users WHERE id = NEW.id) THEN
    RAISE EXCEPTION 'Unauthorized: Email must match confirmed Auth email';
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.sync_confirmed_profile_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_sync_confirmed_profile_email AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_confirmed_profile_email();

CREATE OR REPLACE FUNCTION public.homework_storage_path(value TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN value IS NULL OR value = '' THEN NULL
    WHEN value ~ '^https?://' THEN
      substring(value from '/homework-files/([^?]+)')
    ELSE ltrim(value, '/')
  END;
$$;

-- NOT VALID preserves legacy rows while enforcing integrity for new writes.
ALTER TABLE public.submissions ADD CONSTRAINT submission_has_content
  CHECK (nullif(btrim(file_url), '') IS NOT NULL OR nullif(btrim(submission_link), '') IS NOT NULL) NOT VALID;
ALTER TABLE public.submissions ADD CONSTRAINT submission_valid_status
  CHECK (status IS NOT NULL AND status IN ('SUBMITTED', 'APPROVED', 'DECLINED')) NOT VALID;
ALTER TABLE public.submissions ADD CONSTRAINT submission_required_relationships
  CHECK (assignment_id IS NOT NULL AND student_id IS NOT NULL) NOT VALID;

CREATE OR REPLACE FUNCTION public.enforce_submission_rules()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role user_role := public.get_user_role();
  v_assignment public.assignments;
  v_path TEXT;
  v_extension TEXT;
  v_formats TEXT[];
BEGIN
  IF auth.role() = 'service_role' OR v_role = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.assignment_id IS DISTINCT FROM OLD.assignment_id
       OR NEW.student_id IS DISTINCT FROM OLD.student_id THEN
      RAISE EXCEPTION 'Submission identity cannot be changed';
    END IF;
  END IF;

  SELECT * INTO v_assignment FROM public.assignments WHERE id = NEW.assignment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Assignment not found'; END IF;

  IF v_role = 'STUDENT' THEN
    IF NEW.student_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Unauthorized submission owner';
    END IF;
    IF clock_timestamp() > v_assignment.due_date THEN
      RAISE EXCEPTION 'დავალების ვადა ამოიწურა. ჩაბარება შეუძლებელია.';
    END IF;
    IF nullif(btrim(NEW.file_url), '') IS NOT NULL THEN
      v_path := public.homework_storage_path(NEW.file_url);
      IF v_path IS NULL OR split_part(v_path, '/', 1) <> auth.uid()::text
         OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'homework-files' AND name = v_path) THEN
        RAISE EXCEPTION 'ფაილი ვერ მოიძებნა ან მისი გამოყენება დაუშვებელია.';
      END IF;
      v_extension := lower(substring(v_path from '\.([^.]+)$'));
      IF v_extension IS NULL OR NOT (v_extension = ANY(ARRAY[
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'txt', 'zip', 'rar'
      ])) THEN RAISE EXCEPTION 'ფაილის ფორმატი დაუშვებელია.'; END IF;
      SELECT array_agg(lower(ltrim(format, '.'))) INTO v_formats
        FROM unnest(v_assignment.allowed_formats) AS format;
      IF cardinality(v_formats) > 0 AND NOT (v_extension = ANY(v_formats)) THEN
        RAISE EXCEPTION 'ფაილის ფორმატი დაუშვებელია ამ დავალებისთვის.';
      END IF;
    END IF;
    SELECT name INTO NEW.student_name FROM public.profiles WHERE id = auth.uid();
    NEW.status := 'SUBMITTED';
    NEW.teacher_feedback := NULL;
    NEW.reviewed_at := NULL;
    NEW.grade := NULL;
    NEW.submitted_at := clock_timestamp();
  ELSIF v_role = 'TEACHER' AND auth.uid() = v_assignment.teacher_id AND TG_OP = 'UPDATE' THEN
    NEW.student_name := OLD.student_name;
    NEW.file_url := OLD.file_url;
    NEW.file_name := OLD.file_name;
    NEW.file_size := OLD.file_size;
    NEW.submission_link := OLD.submission_link;
    NEW.student_comment := OLD.student_comment;
    NEW.submitted_at := OLD.submitted_at;
    NEW.reviewed_at := clock_timestamp();
  ELSE
    RAISE EXCEPTION 'Unauthorized submission operation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_submission_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.get_user_role() = 'STUDENT' AND EXISTS (
    SELECT 1 FROM public.assignments WHERE id = OLD.assignment_id AND clock_timestamp() > due_date
  ) THEN
    RAISE EXCEPTION 'დავალების ვადა ამოიწურა. ჩაბარების გაუქმება შეუძლებელია.';
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER trg_enforce_submission_delete BEFORE DELETE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_submission_delete();

-- Assignment updates must enforce the same subject ownership as inserts.
DROP POLICY IF EXISTS "Teachers can update own assignments" ON public.assignments;
CREATE POLICY "Teachers can update own assignments" ON public.assignments
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'TEACHER' AND auth.uid() = teacher_id)
  WITH CHECK (public.get_user_role() = 'TEACHER' AND auth.uid() = teacher_id AND EXISTS (
    SELECT 1 FROM public.subjects WHERE id = subject_id AND teacher_id = auth.uid()
  ));

-- SECURITY DEFINER lets storage rules inspect references without leaking records
-- or relying on the caller's SELECT policies. Only object-level access is returned.
CREATE OR REPLACE FUNCTION public.can_read_homework_file(object_name TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.get_user_role() = 'ADMIN'
    OR split_part(object_name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE public.homework_storage_path(a.attachment_url) = object_name
        AND public.get_user_role() IN ('STUDENT', 'TEACHER')
    )
    OR EXISTS (
      SELECT 1 FROM public.submissions s JOIN public.assignments a ON a.id = s.assignment_id
      WHERE public.homework_storage_path(s.file_url) = object_name
        AND a.teacher_id = auth.uid() AND public.get_user_role() = 'TEACHER'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_delete_homework_file(object_name TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
    AND (split_part(object_name, '/', 1) = auth.uid()::text OR public.get_user_role() = 'ADMIN')
    AND NOT EXISTS (SELECT 1 FROM public.submissions WHERE public.homework_storage_path(file_url) = object_name)
    AND NOT EXISTS (SELECT 1 FROM public.assignments WHERE public.homework_storage_path(attachment_url) = object_name);
$$;

REVOKE ALL ON FUNCTION public.can_read_homework_file(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_delete_homework_file(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_homework_file(TEXT), public.can_delete_homework_file(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Users can view permitted files" ON storage.objects;
CREATE POLICY "Users can view permitted files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'homework-files' AND public.can_read_homework_file(name));
DROP POLICY IF EXISTS "Users can delete permitted files" ON storage.objects;
CREATE POLICY "Users can delete permitted files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'homework-files' AND public.can_delete_homework_file(name));

DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
CREATE POLICY "Users can upload to own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'homework-files'
    AND public.get_user_role() IN ('STUDENT', 'TEACHER', 'ADMIN')
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND name ~* '\.(pdf|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|png|webp|gif|txt|zip|rar)$');

-- Reject disallowed upload types even if a client bypasses frontend validation.
UPDATE storage.buckets SET public = false, file_size_limit = 15728640,
  allowed_mime_types = ARRAY[
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'text/plain',
    'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/vnd.rar',
    'application/octet-stream'
  ] WHERE id = 'homework-files';

COMMIT;
