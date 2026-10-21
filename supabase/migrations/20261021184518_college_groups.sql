BEGIN;
CREATE TABLE public.college_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL CHECK (length(btrim(code)) BETWEEN 1 AND 60),
  programme_type TEXT NOT NULL CHECK (programme_type IN ('INTEGRATED','NON_INTEGRATED')),
  programme_name TEXT NOT NULL DEFAULT '' CHECK (length(programme_name) <= 200),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX college_groups_code_unique ON public.college_groups(lower(btrim(code)));
CREATE TABLE public.teacher_groups (
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.college_groups(id) ON DELETE RESTRICT,
  PRIMARY KEY (teacher_id,group_id)
);
CREATE INDEX teacher_groups_group_idx ON public.teacher_groups(group_id);
ALTER TABLE public.profiles ADD COLUMN group_id UUID REFERENCES public.college_groups(id) ON DELETE RESTRICT;
CREATE INDEX profiles_group_idx ON public.profiles(group_id) WHERE role='STUDENT';
ALTER TABLE public.assignments ADD COLUMN group_ids UUID[] NOT NULL DEFAULT '{}';
CREATE INDEX assignments_groups_idx ON public.assignments USING gin(group_ids);

CREATE FUNCTION bta_group_delete_guard() RETURNS TRIGGER LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.assignments WHERE group_ids @> ARRAY[OLD.id]) THEN
  RAISE EXCEPTION 'ჯგუფს აქვს დავალებები — გამოიყენეთ არქივში გადატანა';
 END IF;
 RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.bta_group_delete_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER group_delete_guard BEFORE DELETE ON public.college_groups FOR EACH ROW EXECUTE FUNCTION public.bta_group_delete_guard();

-- One explicit migration group preserves existing accounts and homework.
DO $$ DECLARE legacy UUID; BEGIN
  INSERT INTO public.college_groups(code,programme_type,programme_name)
    VALUES ('TEST-LEGACY','NON_INTEGRATED','სატესტო ჯგუფი — გადასანაწილებელი') RETURNING id INTO legacy;
  UPDATE public.profiles SET group_id=legacy WHERE role='STUDENT';
  INSERT INTO public.teacher_groups SELECT id,legacy FROM public.profiles WHERE role='TEACHER';
  UPDATE public.assignments SET group_ids=ARRAY[legacy];
END $$;
ALTER TABLE public.profiles ADD CONSTRAINT student_exactly_one_group CHECK (
  (role='STUDENT' AND group_id IS NOT NULL) OR (role<>'STUDENT' AND group_id IS NULL));
ALTER TABLE public.assignments ADD CONSTRAINT assignment_has_groups CHECK (cardinality(group_ids)>0 AND array_position(group_ids,NULL) IS NULL);
ALTER TABLE public.assignments ALTER COLUMN group_ids DROP DEFAULT;

CREATE SCHEMA IF NOT EXISTS bta_private;
REVOKE ALL ON SCHEMA bta_private FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA bta_private TO authenticated;
CREATE FUNCTION bta_private.my_group() RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT group_id FROM public.profiles WHERE id=auth.uid() AND role='STUDENT';
$$;
CREATE FUNCTION bta_private.teaches_group(target UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND public.get_user_role()='TEACHER' AND EXISTS(
   SELECT 1 FROM public.teacher_groups WHERE teacher_id=auth.uid() AND group_id=target);
$$;
CREATE FUNCTION bta_private.assignment_access(owner UUID,targets UUID[]) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (public.get_user_role()='ADMIN'
 OR (public.get_user_role()='TEACHER' AND owner=auth.uid())
 OR (public.get_user_role()='STUDENT' AND bta_private.my_group()=ANY(targets)));
$$;
REVOKE ALL ON FUNCTION bta_private.my_group(),bta_private.teaches_group(UUID),bta_private.assignment_access(UUID,UUID[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION bta_private.my_group(),bta_private.teaches_group(UUID),bta_private.assignment_access(UUID,UUID[]) TO authenticated;

ALTER TABLE public.college_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_groups ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.college_groups,public.teacher_groups TO authenticated,service_role;
REVOKE ALL ON public.college_groups,public.teacher_groups FROM anon;
CREATE POLICY "Active accounts only" ON public.college_groups AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.has_confirmed_email()) WITH CHECK(public.has_confirmed_email());
CREATE POLICY "Active accounts only" ON public.teacher_groups AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.has_confirmed_email()) WITH CHECK(public.has_confirmed_email());
CREATE POLICY "Group members read groups" ON public.college_groups FOR SELECT TO authenticated
 USING(public.get_user_role()='ADMIN' OR id=bta_private.my_group() OR bta_private.teaches_group(id));
CREATE POLICY "Admins manage groups" ON public.college_groups FOR ALL TO authenticated
 USING(public.get_user_role()='ADMIN') WITH CHECK(public.get_user_role()='ADMIN');
CREATE POLICY "Teachers read own memberships" ON public.teacher_groups FOR SELECT TO authenticated
 USING(teacher_id=auth.uid() OR public.get_user_role()='ADMIN');
CREATE POLICY "Admins manage teacher memberships" ON public.teacher_groups FOR ALL TO authenticated
 USING(public.get_user_role()='ADMIN') WITH CHECK(public.get_user_role()='ADMIN');
CREATE POLICY "Group student visibility" ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated
 USING(role<>'STUDENT' OR id=auth.uid() OR public.get_user_role()='ADMIN' OR bta_private.teaches_group(group_id));
CREATE POLICY "Group assignments" ON public.assignments AS RESTRICTIVE FOR ALL TO authenticated
 USING(bta_private.assignment_access(teacher_id,group_ids)) WITH CHECK(bta_private.assignment_access(teacher_id,group_ids));
CREATE POLICY "Group submissions" ON public.submissions AS RESTRICTIVE FOR ALL TO authenticated
 USING(EXISTS(SELECT 1 FROM public.assignments a WHERE a.id=assignment_id))
 WITH CHECK(EXISTS(SELECT 1 FROM public.assignments a WHERE a.id=assignment_id));
CREATE POLICY "Group subjects" ON public.subjects AS RESTRICTIVE FOR SELECT TO authenticated
 USING(public.get_user_role()='ADMIN' OR teacher_id=auth.uid()
 OR (public.get_user_role()='STUDENT' AND EXISTS(SELECT 1 FROM public.teacher_groups tg
   WHERE tg.teacher_id=subjects.teacher_id AND tg.group_id=bta_private.my_group())));
-- Students must be able to evaluate teacher membership for subject visibility,
-- but may only see memberships of their own group.
CREATE POLICY "Students see own group teachers" ON public.teacher_groups FOR SELECT TO authenticated
 USING(group_id=bta_private.my_group());

CREATE FUNCTION bta_private.validate_group_links() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_TABLE_NAME='profiles' THEN
   IF TG_OP='UPDATE' AND NEW.group_id IS DISTINCT FROM OLD.group_id
     AND coalesce(auth.role(),'')<>'service_role' AND public.get_user_role() IS DISTINCT FROM 'ADMIN' THEN
     RAISE EXCEPTION 'ჯგუფის შეცვლა მხოლოდ ადმინისტრატორს შეუძლია';
   END IF;
   IF NEW.role='STUDENT' AND (TG_OP='INSERT' OR NEW.group_id IS DISTINCT FROM OLD.group_id) THEN
     IF NOT EXISTS(SELECT 1 FROM public.college_groups WHERE id=NEW.group_id AND active) THEN
       RAISE EXCEPTION 'აირჩიეთ მოქმედი ჯგუფი';
     END IF;
   END IF;
 ELSIF TG_TABLE_NAME='teacher_groups' THEN
   IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=NEW.teacher_id AND role='TEACHER') THEN
     RAISE EXCEPTION 'ჯგუფს მხოლოდ მასწავლებელი შეიძლება მიენიჭოს';
   END IF;
 ELSIF TG_TABLE_NAME='assignments' THEN
   IF TG_OP='INSERT' OR NEW.group_ids IS DISTINCT FROM OLD.group_ids OR NEW.teacher_id IS DISTINCT FROM OLD.teacher_id THEN
     IF cardinality(NEW.group_ids)=0 OR EXISTS(SELECT 1 FROM unnest(NEW.group_ids) gid
       WHERE NOT EXISTS(SELECT 1 FROM public.college_groups g JOIN public.teacher_groups tg ON tg.group_id=g.id
       WHERE g.id=gid AND g.active AND tg.teacher_id=NEW.teacher_id)) THEN
       RAISE EXCEPTION 'აირჩიეთ მასწავლებლის მინიმუმ ერთი მოქმედი ჯგუფი';
     END IF;
     IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM public.submissions s JOIN public.profiles p ON p.id=s.student_id
       WHERE s.assignment_id=OLD.id AND p.group_id=ANY(OLD.group_ids) AND NOT(p.group_id=ANY(NEW.group_ids))) THEN
       RAISE EXCEPTION 'ჩაბარების მქონე ჯგუფის მოხსნა დაუშვებელია';
     END IF;
   END IF;
   IF EXISTS(SELECT 1 FROM unnest(NEW.allowed_formats) fmt CROSS JOIN LATERAL unnest(string_to_array(fmt,',')) ext
     WHERE btrim(ext) NOT IN ('.pdf','.doc','.docx','.ppt','.pptx','.xls','.xlsx','.jpg','.jpeg','.png','.webp','.txt','.zip','.rar','.7z')) THEN
     RAISE EXCEPTION 'არასწორი ფაილის ფორმატი';
   END IF;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION bta_private.validate_group_links() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_student_group BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION bta_private.validate_group_links();
CREATE TRIGGER validate_teacher_group BEFORE INSERT OR UPDATE ON public.teacher_groups FOR EACH ROW EXECUTE FUNCTION bta_private.validate_group_links();
CREATE TRIGGER validate_assignment_groups BEFORE INSERT OR UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION bta_private.validate_group_links();

-- Atomic group edit + teacher membership replacement; only an active admin.
CREATE FUNCTION public.save_college_group(p_id UUID,p_code TEXT,p_type TEXT,p_programme TEXT,p_active BOOLEAN,p_teachers UUID[])
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result UUID;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_confirmed_email() OR public.get_user_role() IS DISTINCT FROM 'ADMIN' THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(p_teachers) t WHERE NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=t AND role='TEACHER')) THEN RAISE EXCEPTION 'არასწორი მასწავლებელი'; END IF;
 IF p_id IS NULL THEN
  INSERT INTO public.college_groups(code,programme_type,programme_name,active) VALUES(btrim(p_code),p_type,btrim(p_programme),p_active) RETURNING id INTO result;
 ELSE
  UPDATE public.college_groups SET code=btrim(p_code),programme_type=p_type,programme_name=btrim(p_programme),active=p_active WHERE id=p_id RETURNING id INTO result;
  IF result IS NULL THEN RAISE EXCEPTION 'ჯგუფი ვერ მოიძებნა'; END IF;
 END IF;
 DELETE FROM public.teacher_groups WHERE group_id=result AND NOT(teacher_id=ANY(coalesce(p_teachers,'{}')));
 INSERT INTO public.teacher_groups(teacher_id,group_id) SELECT DISTINCT t,result FROM unnest(p_teachers) t ON CONFLICT DO NOTHING;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.save_college_group(UUID,TEXT,TEXT,TEXT,BOOLEAN,UUID[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_college_group(UUID,TEXT,TEXT,TEXT,BOOLEAN,UUID[]) TO authenticated;

-- Attachments follow the same group restrictions as their assignments.
CREATE OR REPLACE FUNCTION public.can_read_homework_file(object_name TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND public.has_confirmed_email() AND (
 public.get_user_role()='ADMIN' OR split_part(object_name,'/',1)=auth.uid()::text
 OR EXISTS(SELECT 1 FROM public.assignments a WHERE public.homework_storage_path(a.attachment_url)=object_name
   AND bta_private.assignment_access(a.teacher_id,a.group_ids))
 OR EXISTS(SELECT 1 FROM public.submissions s JOIN public.assignments a ON a.id=s.assignment_id
   WHERE public.homework_storage_path(s.file_url)=object_name AND a.teacher_id=auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.can_read_homework_file(TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_read_homework_file(TEXT) TO authenticated;
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
      SELECT array_agg(lower(ltrim(btrim(ext), '.'))) INTO v_formats
        FROM unnest(v_assignment.allowed_formats) AS format CROSS JOIN LATERAL unnest(string_to_array(format, ',')) ext;
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
REVOKE ALL ON FUNCTION public.enforce_submission_rules() FROM PUBLIC,anon,authenticated;
COMMIT;
