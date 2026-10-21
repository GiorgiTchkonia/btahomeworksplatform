BEGIN;

-- Invitation links establish an Auth session before the user chooses a password.
-- Require both email ownership and a saved password for academic/API access.
CREATE OR REPLACE FUNCTION public.has_confirmed_email()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid()
    AND u.email_confirmed_at IS NOT NULL AND coalesce(u.encrypted_password, '') <> '');
$$;
REVOKE ALL ON FUNCTION public.has_confirmed_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_confirmed_email() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_account_state()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE WHEN u.email_confirmed_at IS NULL THEN 'INVITED'
    WHEN coalesce(u.encrypted_password, '') = '' THEN 'PASSWORD_REQUIRED'
    ELSE 'ACTIVE' END FROM auth.users u WHERE u.id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_account_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_account_state() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_account_states()
RETURNS TABLE (id UUID, account_status TEXT) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT u.id, CASE WHEN u.email_confirmed_at IS NULL THEN 'INVITED'
    WHEN coalesce(u.encrypted_password, '') = '' THEN 'PASSWORD_REQUIRED'
    ELSE 'ACTIVE' END
  FROM auth.users u JOIN public.profiles p ON p.id = u.id
  WHERE public.has_confirmed_email() AND EXISTS (
    SELECT 1 FROM public.profiles caller WHERE caller.id = auth.uid() AND caller.role = 'ADMIN');
$$;
REVOKE ALL ON FUNCTION public.get_admin_account_states() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_account_states() TO authenticated;

-- Trigger only: execute is not granted to API users. Existing multi-subject
-- teachers retain their subjects, IDs and assignment history.
CREATE OR REPLACE FUNCTION public.sync_teacher_subject()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.role <> 'TEACHER' OR nullif(btrim(NEW.subject), '') IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'TEACHER' AND NEW.subject IS NOT DISTINCT FROM OLD.subject THEN RETURN NEW; END IF;
    IF OLD.role = 'TEACHER' THEN
      UPDATE public.subjects SET name = btrim(NEW.subject)
        WHERE teacher_id = NEW.id AND lower(btrim(name)) = lower(btrim(OLD.subject));
      IF FOUND THEN RETURN NEW; END IF;
    END IF;
  END IF;
  INSERT INTO public.subjects (name, teacher_id, color, icon)
    SELECT btrim(NEW.subject), NEW.id, 'indigo', 'BookOpen'
    WHERE NOT EXISTS (SELECT 1 FROM public.subjects WHERE teacher_id = NEW.id
      AND lower(btrim(name)) = lower(btrim(NEW.subject)));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_teacher_subject() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_teacher_subject AFTER INSERT OR UPDATE OF role, subject ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_teacher_subject();

-- Repair missing subjects, including the existing test teacher, without
-- overwriting seeded subject names or touching accounts.
INSERT INTO public.subjects (name, teacher_id, color, icon)
SELECT btrim(p.subject), p.id, 'indigo', 'BookOpen' FROM public.profiles p
WHERE p.role = 'TEACHER' AND nullif(btrim(p.subject), '') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.subjects s WHERE s.teacher_id = p.id);

COMMIT;
