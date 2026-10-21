BEGIN;
ALTER TABLE public.profiles ADD COLUMN teaching_subjects TEXT[];
UPDATE public.profiles p SET teaching_subjects=coalesce(
 (SELECT array_agg(s.name ORDER BY s.name) FROM public.subjects s WHERE s.teacher_id=p.id),
 CASE WHEN nullif(btrim(p.subject),'') IS NOT NULL THEN ARRAY[btrim(p.subject)] ELSE '{}'::text[] END)
WHERE p.role='TEACHER';

CREATE FUNCTION bta_private.prepare_teacher_subjects() RETURNS TRIGGER LANGUAGE plpgsql SET search_path='' AS $$
DECLARE item TEXT; names TEXT[]:='{}'; seen TEXT[]:='{}'; source TEXT[];
BEGIN
 IF NEW.role<>'TEACHER' THEN NEW.teaching_subjects:=NULL; RETURN NEW; END IF;
 source:=NEW.teaching_subjects;
 IF TG_OP='UPDATE' THEN
   IF NEW.teaching_subjects IS NOT DISTINCT FROM OLD.teaching_subjects AND NEW.subject IS DISTINCT FROM OLD.subject THEN
     source:=CASE WHEN nullif(btrim(NEW.subject),'') IS NULL THEN '{}'::text[] ELSE ARRAY[btrim(NEW.subject)] END;
   END IF;
 END IF;
 IF source IS NULL THEN source:=CASE WHEN nullif(btrim(NEW.subject),'') IS NULL THEN '{}'::text[] ELSE ARRAY[btrim(NEW.subject)] END; END IF;
 FOREACH item IN ARRAY source LOOP
   IF item IS NULL OR length(btrim(item)) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'საგნის დასახელება უნდა შეიცავდეს 1–100 სიმბოლოს'; END IF;
   item:=btrim(item);
   IF NOT(lower(item)=ANY(seen)) THEN names:=array_append(names,item); seen:=array_append(seen,lower(item)); END IF;
 END LOOP;
 IF cardinality(names)>12 THEN RAISE EXCEPTION 'დასაშვებია მაქსიმუმ 12 საგანი'; END IF;
 NEW.teaching_subjects:=names;
 NEW.subject:=nullif(array_to_string(names,' · '),'');
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION bta_private.prepare_teacher_subjects() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER prepare_teacher_subjects BEFORE INSERT OR UPDATE OF role,subject,teaching_subjects ON public.profiles
 FOR EACH ROW EXECUTE FUNCTION bta_private.prepare_teacher_subjects();

CREATE OR REPLACE FUNCTION public.sync_teacher_subject()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item TEXT; old_names TEXT[];
BEGIN
 IF NEW.role<>'TEACHER' THEN RETURN NEW; END IF;
 -- Preserve the subject ID on a single unused subject rename.
 IF TG_OP='UPDATE' THEN
   old_names:=coalesce(OLD.teaching_subjects,CASE WHEN OLD.subject IS NULL THEN '{}'::text[] ELSE ARRAY[OLD.subject] END);
   IF cardinality(old_names)=1 AND cardinality(NEW.teaching_subjects)=1 AND old_names[1] IS DISTINCT FROM NEW.teaching_subjects[1] THEN
     UPDATE public.subjects s SET name=NEW.teaching_subjects[1]
       WHERE s.teacher_id=NEW.id AND lower(btrim(s.name))=lower(btrim(old_names[1]))
       AND NOT EXISTS(SELECT 1 FROM public.assignments a WHERE a.subject_id=s.id)
       AND NOT EXISTS(SELECT 1 FROM public.subjects other WHERE other.teacher_id=NEW.id AND lower(btrim(other.name))=lower(btrim(NEW.teaching_subjects[1])));
   END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.subjects s JOIN public.assignments a ON a.subject_id=s.id
   WHERE s.teacher_id=NEW.id AND NOT EXISTS(SELECT 1 FROM unnest(NEW.teaching_subjects) n WHERE lower(btrim(n))=lower(btrim(s.name)))) THEN
   RAISE EXCEPTION 'საგანს უკვე აქვს დავალებები. შეინარჩუნეთ იგი სიაში; ახალი საგანი დაამატეთ ცალკე.';
 END IF;
 DELETE FROM public.subjects s WHERE s.teacher_id=NEW.id AND NOT EXISTS(
   SELECT 1 FROM unnest(NEW.teaching_subjects) n WHERE lower(btrim(n))=lower(btrim(s.name)));
 FOREACH item IN ARRAY coalesce(NEW.teaching_subjects,'{}') LOOP
   INSERT INTO public.subjects(name,teacher_id,color,icon) SELECT item,NEW.id,'indigo','BookOpen'
     WHERE NOT EXISTS(SELECT 1 FROM public.subjects WHERE teacher_id=NEW.id AND lower(btrim(name))=lower(item));
 END LOOP;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_teacher_subject() FROM PUBLIC,anon,authenticated;
DROP TRIGGER sync_teacher_subject ON public.profiles;
CREATE TRIGGER sync_teacher_subject AFTER INSERT OR UPDATE OF role,subject,teaching_subjects ON public.profiles
 FOR EACH ROW EXECUTE FUNCTION public.sync_teacher_subject();
COMMIT;
