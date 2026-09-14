-- Fix for infinite recursion in profiles table
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers can view their students" ON profiles;

-- Create a SECURITY DEFINER function to securely get the user's role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Add fixed policies
CREATE POLICY "Admins can view all profiles" ON profiles FOR ALL USING (
  public.get_user_role() = 'ADMIN'
);

CREATE POLICY "Teachers can view their students" ON profiles FOR SELECT USING (
  public.get_user_role() = 'TEACHER'
);
