BEGIN;
-- Supabase default privileges explicitly grant anon execution in addition to
-- PUBLIC. Revoke both; authenticated callers still need these guarded helpers.
REVOKE EXECUTE ON FUNCTION public.get_my_account_state() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_account_states() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_confirmed_email() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_read_homework_file(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_delete_homework_file(TEXT) FROM PUBLIC, anon;

-- Trigger functions are invoked by Postgres, never directly by API users.
REVOKE EXECUTE ON FUNCTION public.enforce_submission_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_submission_rules() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_unauthorized_profile_updates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_confirmed_profile_email() FROM PUBLIC, anon, authenticated;
COMMIT;
