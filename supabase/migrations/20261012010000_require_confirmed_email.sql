-- Preserve all existing accounts. This migration does not edit confirmation flags.
-- Existing auto-confirmed test students/teachers continue to work until removed.
BEGIN;

CREATE OR REPLACE FUNCTION public.has_confirmed_email()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL
  );
$$;
REVOKE ALL ON FUNCTION public.has_confirmed_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_confirmed_email() TO authenticated;

-- Restrictive policies compose with existing ownership/role rules. Even if
-- confirmation is accidentally disabled in Auth settings, pending users cannot
-- access academic data or storage directly through the API.
CREATE POLICY "Confirmed email required" ON public.profiles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_confirmed_email()) WITH CHECK (public.has_confirmed_email());
CREATE POLICY "Confirmed email required" ON public.subjects
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_confirmed_email()) WITH CHECK (public.has_confirmed_email());
CREATE POLICY "Confirmed email required" ON public.assignments
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_confirmed_email()) WITH CHECK (public.has_confirmed_email());
CREATE POLICY "Confirmed email required" ON public.submissions
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_confirmed_email()) WITH CHECK (public.has_confirmed_email());
CREATE POLICY "Confirmed email required for homework files" ON storage.objects
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (bucket_id <> 'homework-files' OR public.has_confirmed_email())
  WITH CHECK (bucket_id <> 'homework-files' OR public.has_confirmed_email());

COMMIT;
